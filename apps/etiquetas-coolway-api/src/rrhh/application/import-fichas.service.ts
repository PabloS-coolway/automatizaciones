import { Inject, Injectable } from '@nestjs/common';
import { FichaImportadaDto, FichaSaltadaDto, ImportFichasResultDto } from '@yorga/contracts';
import { PASSWORD_HASHER, PasswordHasher } from '../../auth/application/ports';
import { generarPasswordTemporal } from '../../auth/infrastructure/usuarios-excel-reader';
import { FichaFila } from '../infrastructure/fichas-rrhh-excel-reader';
import { FICHAS_IMPORT_REPOSITORY, FichaEmpleadoData, FichasImportRepository } from './fichas-import.port';

/** Rol de login por defecto de las fichas importadas (rol de sistema, siempre existe). */
const ROL_DEFECTO = 'operador';

/** Convierte una fecha YYYY-MM-DD (o `null`) a Date en UTC, para persistirla sin desfase de zona horaria. */
function aFecha(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

/**
 * REQ-012 · Importador de fichas de RRHH (las 12 columnas de Ángeles). Por cada trabajador hace upserts
 * **idempotentes**: la empresa (por código), la zona, el centro (con su zona), los catálogos (categoría,
 * contrato, sección), el usuario de login (contraseña temporal) y la ficha de empleado, identificada por su
 * **clave de negocio (empresa + código)**. Reimportar el mismo fichero ACTUALIZA, no duplica. Las filas
 * inválidas se saltan con su motivo, sin abortar el resto.
 */
@Injectable()
export class ImportFichasService {
  constructor(
    @Inject(FICHAS_IMPORT_REPOSITORY) private readonly repo: FichasImportRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async importar(filas: FichaFila[]): Promise<ImportFichasResultDto> {
    const creados: FichaImportadaDto[] = [];
    const actualizados: FichaImportadaDto[] = [];
    const saltados: FichaSaltadaDto[] = [];

    for (const f of filas) {
      const base = { fila: f.fila, empresa: f.empresaCodigo, codigo: f.empleadoCodigo, nombre: f.nombre };
      const saltar = (motivo: string) => saltados.push({ ...base, motivo });

      if (!f.empresaCodigo) { saltar('sin código de empresa'); continue; }
      if (!f.empleadoCodigo) { saltar('sin código de empleado'); continue; }
      if (!f.nombre) { saltar('sin nombre de empleado'); continue; }

      try {
        // Estructura y catálogos (idempotentes por su clave).
        const company = await this.repo.upsertCompany(f.empresaCodigo, f.empresaNombre || f.empresaCodigo);
        const zone = f.zona ? await this.repo.upsertZone(f.zona) : null;
        const center = f.grupo ? await this.repo.upsertCenter(f.grupo, f.grupo, zone?.id ?? null) : null;
        const contractType = f.contrato ? await this.repo.upsertContractType(f.contrato) : null;
        const seccion = f.seccion ? await this.repo.upsertSeccion(f.seccion) : null;
        const categoria = f.categoria ? await this.repo.upsertCategoria(f.categoria) : null;

        const datos: FichaEmpleadoData = {
          fullName: f.nombre,
          dni: f.dni || null,
          categoriaId: categoria?.id ?? null,
          contractTypeId: contractType?.id ?? null,
          seccionId: seccion?.id ?? null,
          companyId: company.id,
          employeeCode: f.empleadoCodigo,
          centerId: center?.id ?? null,
          hiredAt: aFecha(f.fechaAlta),
          fechaAntiguedad: aFecha(f.fechaAntiguedad),
        };

        // ¿Ya existe la ficha por su clave de negocio? → actualizar (idempotencia).
        const existente = await this.repo.findEmployeeByBusinessKey(company.id, f.empleadoCodigo);
        if (existente) {
          await this.repo.updateEmployee(existente.id, datos);
          actualizados.push({ ...base, email: f.email || null });
          continue;
        }

        // Ficha nueva: necesita un usuario de login (Employee ↔ User es 1:1).
        if (!f.email) { saltar('sin correo: no se puede crear el login del empleado'); continue; }
        const usuario = await this.repo.findUserByEmail(f.email);
        let userId: number;
        let passwordTemporal: string | undefined;
        if (usuario) {
          if (usuario.hasEmployee) { saltar(`el correo "${f.email}" ya tiene ficha de empleado`); continue; }
          userId = usuario.id;
        } else {
          passwordTemporal = generarPasswordTemporal();
          const passwordHash = await this.hasher.hash(passwordTemporal);
          const nuevo = await this.repo.createUser({ email: f.email, name: f.nombre, passwordHash, role: ROL_DEFECTO });
          userId = nuevo.id;
        }
        await this.repo.createEmployee(userId, datos);
        creados.push({ ...base, email: f.email, passwordTemporal });
      } catch (e) {
        saltar(`no se pudo importar: ${(e as Error).message}`);
      }
    }

    return {
      creados,
      actualizados,
      saltados,
      totales: { creados: creados.length, actualizados: actualizados.length, saltados: saltados.length },
    };
  }
}
