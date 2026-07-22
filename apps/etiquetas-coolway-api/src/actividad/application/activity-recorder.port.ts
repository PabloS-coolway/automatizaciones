import { Prisma } from '@prisma/client';

export const ACTIVITY_RECORDER = Symbol('ACTIVITY_RECORDER');

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type ActivityEntity = 'USER' | 'ROLE' | 'DESTINATION' | 'MASTER_IMPORT' | 'REFERENCE';

/** Quién hace el cambio (del JWT). El email es un snapshot; el id puede quedar null si el usuario se borra. */
export interface Actor {
  userId?: number | null;
  email: string;
}

/** Una entrada del log, antes de persistirla. `before`/`after` es el estado antes→después. */
export interface ActivityRecord {
  actor: Actor;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  before?: unknown;
  after?: unknown;
  summary: string;
}

/**
 * REQ-007 · Puerto de auditoría. Se llama desde los casos de uso de escritura (que conocen el antes→después).
 * Acepta un cliente de transacción para escribir el log **dentro de la misma transacción** que el cambio:
 * mejor no hacer el cambio que auditarlo mal. Append-only: sólo escribe.
 */
export interface ActivityRecorder {
  record(entry: ActivityRecord, tx?: Prisma.TransactionClient): Promise<void>;
}
