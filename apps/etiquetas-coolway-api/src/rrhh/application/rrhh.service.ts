import { Inject, Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from '@yorga/contracts';
import { EMPLOYEE_REPOSITORY, EmployeeRepository, EmployeeRow } from './ports';
import { empleadosVisibles, esRrhhRole } from '../domain/rrhh-org';

/** Error de negocio de RRHH (el controller lo traduce a 400). */
export class RrhhError extends Error {}

/**
 * REQ-008 · Fase 0 — servicio del módulo RRHH. El alta enlaza con un usuario que YA existe (identidad
 * compartida por correo); RRHH no crea logins. El listado respeta la visibilidad jerárquica.
 */
@Injectable()
export class RrhhService {
  constructor(@Inject(EMPLOYEE_REPOSITORY) private readonly repo: EmployeeRepository) {}

  /** Ficha del empleado que corresponde a un usuario del login (o null si ese usuario no es empleado). */
  me(userId: number): Promise<EmployeeRow | null> {
    return this.repo.findByUserId(userId);
  }

  /** La plantilla que `actor` puede ver: RRHH/Admin todos, Manager su rama, Empleado sólo a sí mismo. */
  async listVisible(actor: EmployeeRow): Promise<EmployeeRow[]> {
    const all = await this.repo.findAll();
    const visibles = empleadosVisibles(
      { id: actor.id, rrhhRole: actor.rrhhRole },
      all.map((e) => ({ id: e.id, managerId: e.managerId })),
    );
    return all.filter((e) => visibles.has(e.id));
  }

  async crear(dto: CreateEmployeeDto): Promise<EmployeeRow> {
    const email = String(dto.email ?? '').trim();
    const fullName = String(dto.fullName ?? '').trim();
    if (!email) throw new RrhhError('Falta el correo del usuario a enlazar.');
    if (!fullName) throw new RrhhError('El nombre del empleado no puede quedar vacío.');
    const rrhhRole = dto.rrhhRole ?? 'EMPLEADO';
    if (!esRrhhRole(rrhhRole)) throw new RrhhError(`Rol RRHH no válido: "${rrhhRole}".`);

    // Identidad compartida: el empleado se enlaza a un usuario existente. RRHH NO crea logins.
    const userId = await this.repo.findUserIdByEmail(email);
    if (!userId) throw new RrhhError(`No hay ningún usuario con el correo "${email}". Créalo antes en Usuarios.`);
    if (await this.repo.findByUserId(userId)) throw new RrhhError(`El usuario "${email}" ya tiene ficha de empleado.`);
    if (dto.managerId != null && !(await this.repo.findById(dto.managerId))) {
      throw new RrhhError(`El responsable #${dto.managerId} no existe.`);
    }

    return this.repo.create({
      userId,
      fullName,
      rrhhRole,
      position: dto.position?.trim() || undefined,
      managerId: dto.managerId ?? undefined,
    });
  }
}
