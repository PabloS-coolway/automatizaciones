import type { MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';
import type { MaestroGateway } from '../application/ports/maestro-gateway.port';

/** Adapter: lee el maestro de la API HTTP. */
export class HttpMaestroGateway implements MaestroGateway {
  constructor(private readonly baseUrl = '/api') {}

  async getStats(): Promise<MaestroStatsDto> {
    const res = await fetch(`${this.baseUrl}/maestro/stats`);
    if (!res.ok) throw new Error('No se pudo cargar el resumen del maestro.');
    return res.json();
  }

  async listReferences(search: string, take: number, skip: number): Promise<ReferencesPageDto> {
    const params = new URLSearchParams({ search, take: String(take), skip: String(skip) });
    const res = await fetch(`${this.baseUrl}/maestro/references?${params}`);
    if (!res.ok) throw new Error('No se pudieron cargar las referencias.');
    return res.json();
  }
}
