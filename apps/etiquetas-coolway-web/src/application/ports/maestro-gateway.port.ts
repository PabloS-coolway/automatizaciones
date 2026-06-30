import type { MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';

/** Puerto de salida: lectura del maestro (BD) para la sección "Base de datos". */
export interface MaestroGateway {
  getStats(): Promise<MaestroStatsDto>;
  listReferences(search: string, take: number, skip: number): Promise<ReferencesPageDto>;
}
