import type { ImportReportDto, MaestroStatsDto, ReferencesPageDto, SeedReportDto } from '@yorga/contracts';

/** Puerto de salida: lectura y actualización del maestro (BD) para la sección "Base de datos". */
export interface MaestroGateway {
  getStats(): Promise<MaestroStatsDto>;
  listReferences(search: string, take: number, skip: number): Promise<ReferencesPageDto>;
  /** Actualiza códigos a partir de los exports de prepedidos (EAN.xlsm + UPC.xlsm). */
  importCodes(ean: File, upc: File): Promise<ImportReportDto>;
  /** Carga el maestro completo (REFERENCIAS COOLWAY.xlsx). */
  seedMaster(master: File): Promise<SeedReportDto>;
}
