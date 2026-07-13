import type {
  FacetsDto,
  ImportReportDto,
  MaestroStatsDto,
  ReferenceFacetColumn,
  ReferenceFiltersDto,
  ReferencesPageDto,
  SeedReportDto,
} from '@yorga/contracts';

/** Puerto de salida: lectura y actualización del maestro (BD) para la sección "Base de datos". */
export interface MaestroGateway {
  getStats(): Promise<MaestroStatsDto>;
  /** Filtra y ordena EN LA BD: el maestro está paginado y filtrar en cliente daría un resultado falso. */
  listReferences(filters: ReferenceFiltersDto, take: number, skip: number): Promise<ReferencesPageDto>;
  /** Valores del desplegable de una columna, con los filtros de las demás aplicados. */
  getFacets(column: ReferenceFacetColumn, filters: ReferenceFiltersDto): Promise<FacetsDto>;
  /** Excel de LA VISTA FILTRADA. Lo genera el servidor: pueden ser miles de filas. */
  exportReferences(filters: ReferenceFiltersDto): Promise<{ blob: Blob; fileName: string }>;
  /** Actualiza códigos a partir de los exports de prepedidos (EAN.xlsm + UPC.xlsm). */
  importCodes(ean: File, upc: File): Promise<ImportReportDto>;
  /** Carga el maestro completo (REFERENCIAS COOLWAY.xlsx). */
  seedMaster(master: File): Promise<SeedReportDto>;
}
