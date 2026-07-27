import type { PodaResponse, SociedadCodigo } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: poda de ficheros de SAP contra la API HTTP (REQ-005 · sociedad REQ-010 · surtidos REQ-011). */
export class HttpPodaGateway {
  async podar(
    borrador: File,
    ficheros: File[],
    sociedad?: SociedadCodigo,
    aplicarSurtidos?: boolean,
  ): Promise<PodaResponse> {
    const fd = new FormData();
    fd.append('borrador', borrador);
    ficheros.forEach((f) => fd.append('ficheros', f));
    if (sociedad) fd.append('sociedad', sociedad);
    if (aplicarSurtidos) fd.append('aplicarSurtidos', 'true');

    const res = await apiFetch('/poda', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron podar los ficheros.'));
    return res.json();
  }
}
