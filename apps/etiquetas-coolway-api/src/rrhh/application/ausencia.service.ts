import { Inject, Injectable } from '@nestjs/common';
import { CreateAbsenceTypeDto, SolicitarAusenciaDto, UpdateAbsenceTypeDto } from '@yorga/contracts';
import {
  ABSENCE_REPOSITORY,
  ABSENCE_TYPE_REPOSITORY,
  AbsenceRepository,
  AbsenceRow,
  AbsenceTypeRepository,
  AbsenceTypeRow,
  EMPLOYEE_REPOSITORY,
  EmployeeRepository,
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from './ports';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { FILE_STORAGE, FileStorage } from './file-storage.port';
import { RrhhActor, RrhhError } from './rrhh.service';

/** Justificantes: tipos y tamaño permitidos (dato sensible; se acota qué entra). */
const MIME_PERMITIDOS: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_BYTES = 10 * 1024 * 1024;

/** Un fichero subido (lo mínimo del Multer.File). */
export interface FicheroSubido {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
import { diasSolicitados, haySolape, rangoValido, saldoVacaciones, type Saldo } from '../domain/ausencia';

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
    @Inject(EMPLOYEE_REPOSITORY) private readonly empleados: EmployeeRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notif: NotificationRepository,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  /** Adjunta (o reemplaza) el justificante de una ausencia. Valida tipo (PDF/JPG/PNG) y tamaño (≤10MB). */
  async adjuntar(absenceId: number, file: FicheroSubido, actor: RrhhActor): Promise<AbsenceRow> {
    const ausencia = await this.repo.findById(absenceId);
    if (!ausencia) throw new RrhhError(`No existe la solicitud #${absenceId}.`);
    const ext = MIME_PERMITIDOS[file.mimetype];
    if (!ext) throw new RrhhError('Formato no permitido: sube un PDF o una imagen (JPG/PNG).');
    if (file.size > MAX_BYTES || file.buffer.length > MAX_BYTES) throw new RrhhError('El justificante no puede superar 10 MB.');

    const nombre = String(file.originalname ?? `justificante.${ext}`).replace(/[^\w.\-]+/g, '_').slice(-120);
    const key = `justificantes/${absenceId}/${randomUUID()}.${ext}`;
    await this.storage.put(key, file.buffer, file.mimetype);
    const actualizada = await this.repo.setAttachment(absenceId, key, nombre);
    await this.actividad.record({ actorEmail: actor.email, action: 'UPDATE', entity: 'AUSENCIA', entityId: String(absenceId), summary: `Adjuntó el justificante de la ausencia de ${ausencia.employeeName}` });
    return actualizada;
  }

  /** Devuelve el justificante (buffer + nombre) para servirlo por la API. El control de acceso lo hace el controller. */
  async descargarJustificante(absenceId: number): Promise<{ buffer: Buffer; nombre: string }> {
    const ausencia = await this.repo.findById(absenceId);
    if (!ausencia) throw new RrhhError(`No existe la solicitud #${absenceId}.`);
    if (!ausencia.attachmentKey) throw new RrhhError('Esa solicitud no tiene justificante.');
    const buffer = await this.storage.get(ausencia.attachmentKey);
    return { buffer, nombre: ausencia.attachmentName ?? 'justificante' };
  }

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

  /** Saldo de vacaciones del año: cupo anual − días de ausencias que computan saldo (aprobadas). */
  async saldo(employeeId: number, annualLeaveDays: number | null, year: number): Promise<Saldo> {
    const inicio = new Date(Date.UTC(year, 0, 1));
    const fin = new Date(Date.UTC(year, 11, 31));
    const abs = (await this.repo.listForEmployeesBetween([employeeId], inicio, fin, ['APPROVED', 'PENDING'])).filter((a) => a.computesBalance);
    const dias = (a: AbsenceRow) => diasSolicitados({ start: a.startDate, end: a.endDate }, a.halfDay);
    const disfrutados = abs.filter((a) => a.status === 'APPROVED').reduce((s, a) => s + dias(a), 0);
    const pendientes = abs.filter((a) => a.status === 'PENDING').reduce((s, a) => s + dias(a), 0);
    return saldoVacaciones(annualLeaveDays ?? 0, disfrutados, pendientes);
  }

  /** Calendario de equipo: ausencias aprobadas y pendientes de `employeeIds` que tocan `[desde, hasta]`. */
  calendario(employeeIds: number[], desde: Date, hasta: Date): Promise<AbsenceRow[]> {
    return this.repo.listForEmployeesBetween(employeeIds, desde, hasta, ['APPROVED', 'PENDING']);
  }

  /** Días (por empleado) cubiertos por una ausencia APROBADA en `[desde, hasta]`, para coordinar con el fichaje. */
  async diasConAusenciaAprobada(employeeIds: number[], desde: Date, hasta: Date): Promise<AbsenceRow[]> {
    return this.repo.listForEmployeesBetween(employeeIds, desde, hasta, ['APPROVED']);
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
    const solicitante = await this.empleados.findById(employeeId);
    return this.prisma.$transaction(async (tx) => {
      const creada = await this.repo.create({ employeeId, typeId: tipo.id, startDate: start, endDate: end, halfDay: !!dto.halfDay, reason: dto.reason?.trim() || undefined, status }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'CREATE', entity: 'AUSENCIA', entityId: String(creada.id), after: creada, summary: `Solicitó ${tipo.name} (${diasSolicitados({ start, end }, !!dto.halfDay)} día/s) del ${dto.startDate} al ${dto.endDate}` },
        tx,
      );
      // Aviso in-app a quien debe aprobar: el responsable si lo tiene; si NO, a RRHH/ADMIN (para que no
      // se queden solicitudes sin nadie a quien avise el sistema).
      if (status === 'PENDING') {
        const mensaje = `${solicitante?.fullName ?? 'Un empleado'} ha solicitado ${tipo.name} del ${dto.startDate} al ${dto.endDate}.`;
        const destinatarios = solicitante?.managerId
          ? [solicitante.managerId]
          : (await this.empleados.findAll()).filter((e) => e.active && (e.rrhhRole === 'RRHH' || e.rrhhRole === 'ADMIN') && e.id !== employeeId).map((e) => e.id);
        for (const destino of destinatarios) {
          await this.notif.create({ employeeId: destino, message: mensaje, link: '/ausencias' }, tx);
        }
      }
      return creada;
    });
  }

  /**
   * Cancela (borrado LÓGICO → estado CANCELLED) una solicitud. La autorización (quién puede y en qué estado) la
   * hace el controller; aquí se aplica el cambio, se audita y —si la cancela otro (un admin), no el propio
   * empleado— se le avisa. Deja de contar para saldo, calendario y solapes (esos sólo miran PENDING/APPROVED).
   */
  async anular(id: number, actor: RrhhActor, avisarEmpleado: boolean): Promise<AbsenceRow> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new RrhhError(`No existe la solicitud #${id}.`);
    if (actual.status === 'CANCELLED' || actual.status === 'REJECTED') throw new RrhhError('Esa solicitud ya no está activa.');
    return this.prisma.$transaction(async (tx) => {
      const anulada = await this.repo.decidir(id, { status: 'CANCELLED', decidedByEmail: actor.email, decidedAt: new Date() }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'AUSENCIA', entityId: String(id), before: actual, after: anulada, summary: `Canceló la ausencia de ${actual.employeeName} (${actual.typeName})` },
        tx,
      );
      if (avisarEmpleado) {
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        await this.notif.create({ employeeId: actual.employeeId, message: `Tu ausencia de ${actual.typeName} del ${iso(actual.startDate)} al ${iso(actual.endDate)} ha sido CANCELADA.`, link: '/ausencias' }, tx);
      }
      return anulada;
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
      // Aviso in-app al empleado con la decisión.
      await this.notif.create({ employeeId: actual.employeeId, message: `Tu solicitud de ${actual.typeName} (${diasSolicitados({ start: actual.startDate, end: actual.endDate }, actual.halfDay)} día/s) ha sido ${aprobar ? 'APROBADA' : 'RECHAZADA'}.`, link: '/ausencias' }, tx);
      return decidida;
    });
  }
}
