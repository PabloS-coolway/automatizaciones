import type { ImportReportDto, MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';
import type { MaestroGateway } from '../application/ports/maestro-gateway.port';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: lee/actualiza el maestro de la API HTTP (con el token de sesión). */
export class HttpMaestroGateway implements MaestroGateway {
  async getStats(): Promise<MaestroStatsDto> {
    const res = await apiFetch('/maestro/stats');
    if (!res.ok) throw new Error('No se pudo cargar el resumen del maestro.');
    return res.json();
  }

  async listReferences(search: string, take: number, skip: number): Promise<ReferencesPageDto> {
    const params = new URLSearchParams({ search, take: String(take), skip: String(skip) });
    const res = await apiFetch(`/maestro/references?${params}`);
    if (!res.ok) throw new Error('No se pudieron cargar las referencias.');
    return res.json();
  }

  async importCodes(ean: File, upc: File): Promise<ImportReportDto> {
    const fd = new FormData();
    fd.append('ean', ean);
    fd.append('upc', upc);
    const res = await apiFetch('/maestro/import', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'Error al importar los códigos.'));
    return res.json();
  }
}
