import { Inject, Injectable } from '@nestjs/common';
import { CreateAbsenceTypeDto, SolicitarAusenciaDto, UpdateAbsenceTypeDto } from '@yorga/contracts';
import {
  ABSENCE_REPOSITORY,
  ABSENCE_TYPE_REPOSITORY,
  AbsenceRepository,
  AbsenceRow,
  AbsenceTypeRepository,
  AbsenceTypeRow,
} from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { RrhhActor, RrhhError } from './rrhh.service';
import { diasSolicitados, haySolape, rangoValido } from '../domain/ausencia';

/** Fecha (sólo día) a partir de 'YYYY-MM-DD'; lanza si no es válida. */
function parseDia(s: string, campo: string): Date {
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new RrhhError(`Fecha inválida en ${campo} (usa YYYY-MM-DD).`);
  return d;
}

/**
 * REQ-008 Fase 3 · Ausencias. El empleado solicita; el responsable/RRHH decide. Regla que no se negocia: **no se
 * aprueba una ausencia que solape con otra ya aprobada** del mismo empleado (el saldo y el calendario mentirían).
 * Los tipos que no requieren aprobación quedan aprobados al solicitarse. Todo queda auditado.
 */
@Injectable()
export class AusenciaService {
  constructor(
    @Inject(ABSENCE_TYPE_REPOSITORY) private readonly tipos: AbsenceTypeRepository,
    @Inject(ABSENCE_REPOSITORY) private readonly repo: AbsenceRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Catálogo de tipos ----

  listTipos(soloActivos = false): Promise<AbsenceTypeRow[]> {
    return this.tipos.list(soloActivos);
  }

  async crearTipo(dto: CreateAbsenceTypeDto, actor: RrhhActor): Promise<AbsenceTypeRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El nombre del tipo no puede quedar vacío.');
    const creado = await this.tipos.create({
      name,
      computesBalance: !!dto.computesBalance,
      requiresApproval: dto.requiresApproval ?? true,
      requiresAttachment: !!dto.requiresAttachment,
    });
    await this.actividad.record({ actorEmail: actor.email, action: 'CREATE', entity: 'TIPO_AUSENCIA', entityId: String(creado.id), after: creado, summary: `Creó el tipo de ausencia ${creado.name}` });
    return creado;
  }

  async editarTipo(id: number, dto: UpdateAbsenceTypeDto, actor: RrhhActor): Promise<AbsenceTypeRow> {
    const actual = await this.tipos.findById(id);
    if (!actual) throw new RrhhError(`No existe el tipo de ausencia #${id}.`);
    const data: Partial<{ name: string; computesBalance: boolean; requiresApproval: boolean; requiresAttachment: boolean; active: boolean }> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre del tipo no puede quedar vacío.');
      data.name = name;
    }
    if (dto.computesBalance !== undefined) data.computesBalance = dto.computesBalance;
    if (dto.requiresApproval !== undefined) data.requiresApproval = dto.requiresApproval;
    if (dto.requiresAttachment !== undefined) data.requiresAttachment = dto.requiresAttachment;
    if (dto.active !== undefined) data.active = dto.active;
    const actualizado = await this.tipos.update(id, data);
    await this.actividad.record({ actorEmail: actor.email, action: 'UPDATE', entity: 'TIPO_AUSENCIA', entityId: String(id), before: actual, after: actualizado, summary: `Editó el tipo de ausencia ${actualizado.name}` });
    return actualizado;
  }

  async borrarTipo(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.tipos.findById(id);
    if (!actual) throw new RrhhError(`No existe el tipo de ausencia #${id}.`);
    if (actual.usos > 0) throw new RrhhError(`El tipo "${actual.name}" tiene ${actual.usos} solicitud(es): desactívalo en vez de borrarlo.`);
    await this.tipos.delete(id);
    await this.actividad.record({ actorEmail: actor.email, action: 'DELETE', entity: 'TIPO_AUSENCIA', entityId: String(id), before: actual, summary: `Borró el tipo de ausencia ${actual.name}` });
  }

  // ---- Solicitudes ----

  misAusencias(employeeId: number): Promise<AbsenceRow[]> {
    return this.repo.listByEmployee(employeeId);
  }

  pendientesDe(employeeIds: number[]): Promise<AbsenceRow[]> {
    return this.repo.listByStatusForEmployees(employeeIds, 'PENDING');
  }

  buscar(id: number): Promise<AbsenceRow | null> {
    return this.repo.findById(id);
  }

  /** El empleado `employeeId` solicita una ausencia. Si el tipo no requiere aprobación, queda aprobada. */
  async solicitar(employeeId: number, dto: SolicitarAusenciaDto, actor: RrhhActor): Promise<AbsenceRow> {
    const tipo = await this.tipos.findById(dto.typeId);
    if (!tipo || !tipo.active) throw new RrhhError('Tipo de ausencia no válido o inactivo.');
    const start = parseDia(dto.startDate, 'la fecha de inicio');
    const end = parseDia(dto.endDate, 'la fecha de fin');
    if (!rangoValido({ start, end })) throw new RrhhError('La fecha de inicio no puede ser posterior a la de fin.');

    // No dejar solapar con lo ya aprobado (aunque quede pendiente, avisamos ya del choque).
    const aprobadas = await this.repo.listApprovedByEmployee(employeeId);
    if (haySolape({ start, end }, aprobadas.map((a) => ({ start: a.startDate, end: a.endDate })))) {
      throw new RrhhError('Ya tienes una ausencia aprobada que solapa con esas fechas.');
    }

    const status = tipo.requiresApproval ? 'PENDING' : 'APPROVED';
    return this.prisma.$transaction(async (tx) => {
      const creada = await this.repo.create({ employeeId, typeId: tipo.id, startDate: start, endDate: end, halfDay: !!dto.halfDay, reason: dto.reason?.trim() || undefined, status }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'CREATE', entity: 'AUSENCIA', entityId: String(creada.id), after: creada, summary: `Solicitó ${tipo.name} (${diasSolicitados({ start, end }, !!dto.halfDay)} día/s) del ${dto.startDate} al ${dto.endDate}` },
        tx,
      );
      return creada;
    });
  }

  /** Aprobar/rechazar. Comprueba solape con aprobadas al aprobar. Devuelve la ausencia decidida. */
  async decidir(id: number, aprobar: boolean, actor: RrhhActor, nota: string | undefined): Promise<AbsenceRow> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new RrhhError(`No existe la solicitud #${id}.`);
    if (actual.status !== 'PENDING') throw new RrhhError('Esa solicitud ya está decidida.');

    if (aprobar) {
      const aprobadas = (await this.repo.listApprovedByEmployee(actual.employeeId)).filter((a) => a.id !== id);
      if (haySolape({ start: actual.startDate, end: actual.endDate }, aprobadas.map((a) => ({ start: a.startDate, end: a.endDate })))) {
        throw new RrhhError('No se puede aprobar: solapa con otra ausencia ya aprobada del mismo empleado.');
      }
    }

    const status = aprobar ? 'APPROVED' : 'REJECTED';
    return this.prisma.$transaction(async (tx) => {
      const decidida = await this.repo.decidir(id, { status, decidedByEmail: actor.email, decidedAt: new Date(), decisionNote: nota?.trim() || undefined }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'UPDATE', entity: 'AUSENCIA', entityId: String(id), before: actual, after: decidida, summary: `${aprobar ? 'Aprobó' : 'Rechazó'} la ausencia de ${actual.employeeName} (${actual.typeName})` },
        tx,
      );
      return decidida;
    });
  }
}
