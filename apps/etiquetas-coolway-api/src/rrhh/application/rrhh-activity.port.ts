import { Prisma } from '@prisma/client';

export const RRHH_ACTIVITY_RECORDER = Symbol('RRHH_ACTIVITY_RECORDER');

/** Una entrada del log de actividad de RRHH, antes de persistirla. `before`/`after` = estado antes→después. */
export interface RrhhActivityRecord {
  actorEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'EMPLEADO' | 'CENTRO' | 'DEPARTAMENTO' | 'FICHAJE' | 'AUSENCIA' | 'TIPO_AUSENCIA';
  entityId: string;
  before?: unknown;
  after?: unknown;
  summary: string;
}

/**
 * REQ-008 Fase 1 · Log de actividad PROPIO de RRHH (append-only, independiente del panel). Se llama desde el
 * servicio, dentro de la misma transacción que la mutación: la ficha y su rastro entran juntos o no entran.
 */
export interface RrhhActivityRecorder {
  record(entry: RrhhActivityRecord, tx?: Prisma.TransactionClient): Promise<void>;
}
