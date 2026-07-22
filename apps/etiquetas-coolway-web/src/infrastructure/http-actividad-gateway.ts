import type { ActivityListResponse } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: consulta del log de actividad (REQ-007, feature `actividad.ver`). */
export class HttpActividadGateway {
  async list(pageSize = 200): Promise<ActivityListResponse> {
    const res = await apiFetch(`/actividad?pageSize=${pageSize}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar el log de actividad.'));
    return res.json();
  }
}
