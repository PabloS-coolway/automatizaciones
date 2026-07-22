/** REQ-007 · Log de actividad (auditoría). Contratos API↔web. */

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type ActivityEntity = 'USER' | 'ROLE' | 'DESTINATION' | 'MASTER_IMPORT';

/** Una entrada del log tal como la ve la web. `before`/`after` es el estado antes→después (redactado). */
export interface ActivityEntryDto {
  id: number;
  createdAt: string;
  actorEmail: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  summary: string;
  before: unknown | null;
  after: unknown | null;
}

export interface ActivityListResponse {
  entries: ActivityEntryDto[];
  total: number;
}
