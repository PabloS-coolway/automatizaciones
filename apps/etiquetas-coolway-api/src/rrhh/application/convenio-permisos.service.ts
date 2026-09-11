import { Inject, Injectable } from '@nestjs/common';
import { EmpleadoPermisosDto } from '@yorga/contracts';
import { resolverPermisos } from '../domain/convenio-permisos';
import { CONVENIO_PERMISOS_REPOSITORY, ConvenioPermisosRepository } from './convenio-permisos.port';

/**
 * REQ-012 · Resuelve los permisos EFECTIVOS de un empleado (zona → convenio → permisos, con fallback global).
 * Orquesta el puerto; la regla vive en `domain/convenio-permisos`.
 */
@Injectable()
export class ConvenioPermisosService {
  constructor(
    @Inject(CONVENIO_PERMISOS_REPOSITORY) private readonly repo: ConvenioPermisosRepository,
  ) {}

  /** `null` si el empleado no existe (el controlador lo traduce a 404). */
  async permisosDeEmpleado(employeeId: number): Promise<EmpleadoPermisosDto | null> {
    const chain = await this.repo.findEmployeeChain(employeeId);
    if (!chain) return null;

    // Sin convenio asignado → no consultamos filas; entra directo al fallback global (lista vacía).
    const convenioPermisos = chain.convenio ? await this.repo.listConvenioPermisos(chain.convenio.id) : [];
    const catalogoGlobal = await this.repo.listGlobalAbsenceTypes();

    const { fuente, permisos } = resolverPermisos(convenioPermisos, catalogoGlobal);
    return { employeeId, zona: chain.zona, convenio: chain.convenio, fuente, permisos };
  }
}
