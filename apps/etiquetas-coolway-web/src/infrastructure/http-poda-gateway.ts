import type { PodaResponse } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: poda de ficheros de SAP contra la API HTTP (REQ-005). */
export class HttpPodaGateway {
  async podar(borrador: File, ficheros: File[]): Promise<PodaResponse> {
    const fd = new FormData();
    fd.append('borrador', borrador);
    ficheros.forEach((f) => fd.append('ficheros', f));

    const res = await apiFetch('/poda', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron podar los ficheros.'));
    return res.json();
  }
}
