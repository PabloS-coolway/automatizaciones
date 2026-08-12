import { BadRequestException, Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportUsuariosResultDto, UsuarioImportadoDto, UsuarioSaltadoDto } from '@yorga/contracts';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from '../../auth/application/ports';
import { ROLE_REPOSITORY, RoleRepository } from '../../auth/application/role.port';
import { CurrentUser, RequireFeature } from '../../auth/interface/http/decorators';
import { JwtPayload } from '../../auth/application/auth.service';
import { ACTIVITY_RECORDER, ActivityRecorder } from '../../actividad/application/activity-recorder.port';
import { RrhhService } from '../../rrhh/application/rrhh.service';
import {
  generarPasswordTemporal,
  leerUsuariosDesdeBuffer,
  UsuariosExcelInvalidoError,
} from '../../auth/infrastructure/usuarios-excel-reader';

const MIME_EXCEL = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // algunos navegadores mandan esto para .xlsx
]);

/**
 * MEJ · Import masivo de usuarios desde un Excel (el listado que pasa RRHH con todos los empleados). Por cada
 * fila: crea el **usuario del login** con una **contraseña temporal generada** (que se devuelve para repartir; la
 * cambia al entrar) y **su ficha de empleado** (RRHH), enlazada por correo. Salta —sin cortar— las filas
 * inválidas o duplicadas, y dice por qué. Vive en la capa HTTP porque orquesta auth + RRHH.
 */
@RequireFeature('usuarios.gestionar')
@Controller('users')
export class ImportUsuariosController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly rrhh: RrhhService,
  ) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async importar(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() me: JwtPayload): Promise<ImportUsuariosResultDto> {
    if (!file) throw new BadRequestException('Falta el fichero Excel (campo "file").');
    if (file.mimetype && !MIME_EXCEL.has(file.mimetype)) throw new BadRequestException('El fichero debe ser un Excel (.xlsx).');

    let filas;
    try {
      filas = await leerUsuariosDesdeBuffer(file.buffer);
    } catch (e) {
      if (e instanceof UsuariosExcelInvalidoError) throw new BadRequestException(e.message);
      throw e;
    }

    // Roles válidos (por clave o por nombre, sin distinguir mayúsculas) para resolver la columna "rol".
    const rolesValidos = await this.roles.findAll();
    const porClaveONombre = new Map<string, string>();
    for (const r of rolesValidos) {
      porClaveONombre.set(r.key.toLowerCase(), r.key);
      porClaveONombre.set(r.name.trim().toLowerCase(), r.key);
    }
    const ROL_DEFECTO = porClaveONombre.get('operador') ?? rolesValidos[0]?.key;

    const creados: UsuarioImportadoDto[] = [];
    const saltados: UsuarioSaltadoDto[] = [];
    const vistos = new Set<string>();

    for (const f of filas) {
      const saltar = (motivo: string) => saltados.push({ fila: f.fila, email: f.email, motivo });
      if (!f.nombre) { saltar('falta el nombre'); continue; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { saltar('email con formato no válido'); continue; }
      if (vistos.has(f.email)) { saltar('repetido en el propio Excel'); continue; }
      vistos.add(f.email);
      if (await this.users.findByEmail(f.email)) { saltar('ya existe un usuario con ese email'); continue; }

      const rol = f.rol ? porClaveONombre.get(f.rol.trim().toLowerCase()) : ROL_DEFECTO;
      if (!rol) { saltar(`rol «${f.rol}» no existe`); continue; }

      const passwordTemporal = generarPasswordTemporal();
      try {
        const passwordHash = await this.hasher.hash(passwordTemporal);
        await this.users.create({ email: f.email, name: f.nombre, passwordHash, role: rol });
        // Ficha de empleado (RRHH), enlazada por correo. Si falla, el usuario queda igualmente creado.
        let fichaCreada = false;
        try {
          await this.rrhh.crear({ email: f.email, fullName: f.nombre }, { email: me.email });
          fichaCreada = true;
        } catch {
          fichaCreada = false;
        }
        creados.push({ email: f.email, name: f.nombre, role: rol, passwordTemporal, fichaCreada });
      } catch (e) {
        saltar(`no se pudo crear: ${(e as Error).message}`);
      }
    }

    if (creados.length > 0) {
      const conFicha = creados.filter((c) => c.fichaCreada).length;
      await this.actividad.record({
        actor: { userId: me.sub, email: me.email },
        action: 'CREATE',
        entity: 'USER',
        entityId: 'import',
        summary: `Importó ${creados.length} usuario(s) desde Excel (${conFicha} con ficha RRHH${saltados.length ? `, ${saltados.length} saltado(s)` : ''})`,
      });
    }

    return { creados, saltados };
  }
}
