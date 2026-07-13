import type {
  FacetsDto,
  ImportReportDto,
  MaestroStatsDto,
  ReferenceFacetColumn,
  ReferenceFiltersDto,
  ReferencesPageDto,
  SeedReportDto,
} from '@yorga/contracts';
import type { MaestroGateway } from '../application/ports/maestro-gateway.port';
import { apiFetch, errorMessage } from './api-client';

/**
 * Serializa los filtros a query string.
 * ⚠️ Un array VACÍO se manda como `style=` (valor vacío): significa "no quiero ningún valor" → 0 filas.
 * Si se omitiera, el servidor lo leería como "sin filtro" y devolvería TODO — el bug que ya tuvimos.
 */
export function filtersToParams(f: ReferenceFiltersDto): URLSearchParams {
  const p = new URLSearchParams();
  const valores = (k: 'style' | 'color' | 'size' | 'colorNameWeb') => {
    const v = f[k];
    if (!v) return;
    if (v.length === 0) p.append(k, '');
    else v.forEach((x) => p.append(k, x));
  };
  valores('style');
  valores('color');
  valores('size');
  valores('colorNameWeb');

  for (const k of ['search', 'ref', 'sku', 'ean13', 'upc', 'sort', 'dir'] as const) {
    const v = f[k];
    if (v) p.set(k, String(v));
  }
  return p;
}

/** Adapter: lee/actualiza el maestro de la API HTTP (con el token de sesión). */
export class HttpMaestroGateway implements MaestroGateway {
  async getStats(): Promise<MaestroStatsDto> {
    const res = await apiFetch('/maestro/stats');
    if (!res.ok) throw new Error('No se pudo cargar el resumen del maestro.');
    return res.json();
  }

  async listReferences(filters: ReferenceFiltersDto, take: number, skip: number): Promise<ReferencesPageDto> {
    const params = filtersToParams(filters);
    params.set('take', String(take));
    params.set('skip', String(skip));
    const res = await apiFetch(`/maestro/references?${params}`);
    if (!res.ok) throw new Error('No se pudieron cargar las referencias.');
    return res.json();
  }

  async getFacets(column: ReferenceFacetColumn, filters: ReferenceFiltersDto): Promise<FacetsDto> {
    const params = filtersToParams(filters);
    params.set('column', column);
    const res = await apiFetch(`/maestro/facets?${params}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los valores del filtro.'));
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

  async seedMaster(master: File): Promise<SeedReportDto> {
    const fd = new FormData();
    fd.append('master', master);
    const res = await apiFetch('/maestro/seed', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'Error al cargar el maestro.'));
    return res.json();
  }
}
