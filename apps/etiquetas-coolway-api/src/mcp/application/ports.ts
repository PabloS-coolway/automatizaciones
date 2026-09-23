import { MaestroStatsDto, ReferenceFiltersDto, ReferencesPageDto } from '@yorga/contracts';
import { FacetColumnLectura, SkuCompacto } from '../../maestro/application/maestro-query.service';

/**
 * Puerto: TODO lo que el MCP de lectura puede consultar. Es deliberadamente pequeño y SÓLO de lectura:
 * maestro de referencias, destinos y surtidos. Nada de RRHH, usuarios, roles ni actividad (auditoría):
 * si un día hace falta, se decide aquí, a la vista, no colándolo por una herramienta.
 */
export interface LecturaMaestroPort {
  estadisticas(): Promise<MaestroStatsDto>;
  contar(filtros: ReferenceFiltersDto): Promise<number>;
  referencias(filtros: ReferenceFiltersDto, take: number, skip: number): Promise<ReferencesPageDto>;
  facetas(columna: FacetColumnLectura, filtros: ReferenceFiltersDto): Promise<{ column: FacetColumnLectura; values: { value: string; count: number }[] }>;
  skus(filtros: ReferenceFiltersDto, max: number): Promise<{ total: number; filas: SkuCompacto[]; completo: boolean }>;
  destinos(): Promise<DestinoLectura[]>;
  surtidos(): Promise<SurtidoLectura[]>;
}

export interface DestinoLectura {
  code: string;
  name: string;
  variant: string;
  importadoPor: string;
  active: boolean;
}

export interface SurtidoLectura {
  grupo: string;
  codigo: string;
}
