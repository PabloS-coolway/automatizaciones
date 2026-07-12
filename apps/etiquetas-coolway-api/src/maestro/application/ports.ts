import { CodeRow, MasterReference } from '../domain/codes';

/** Puerto: leer un export de códigos (EAN.xlsm / UPC.xlsm). */
export interface CodesFileReader {
  read(source: string, codeColumn: 'EAN' | 'UPC'): Promise<CodeRow[]>;
}

/** Fila del Excel maestro completo (REFERENCIAS COOLWAY): trae también el color web. */
export interface SeedRow extends MasterReference {
  colorNameWeb?: string;
}

/** Puerto: leer el Excel maestro completo (REFERENCIAS COOLWAY.xlsx). */
export interface MasterFileReader {
  read(source: string): Promise<SeedRowInput[]>;
}

/** Lo que devuelve el lector del Excel maestro (el SKU puede venir vacío y se compone). */
export interface SeedRowInput {
  style: string;
  color: string;
  ref: string;
  size: string;
  sku?: string;
  ean13?: string;
  upc?: string;
  colorNameWeb?: string;
}

/**
 * Fila del maestro que NO se pudo guardar. Se reporta siempre: una fila rechazada
 * es una talla que luego faltará al generar etiquetas (RF-12: se avisa, no se inventa).
 */
export interface SeedFailure {
  style: string;
  color: string;
  ref: string;
  size: string;
  reason: 'duplicate_ean13' | 'rejected';
  detail?: string;
}

/** Puerto: repositorio del maestro (Postgres). */
export interface ReferenceRepository {
  count(): Promise<number>;
  upsertMany(refs: MasterReference[]): Promise<number>; // nº de filas procesadas
  /** Upsert tolerante: una fila que falle (p.ej. EAN13 duplicado) no aborta el resto, pero se reporta. */
  upsertManySeed(rows: SeedRow[]): Promise<{ ok: number; failures: SeedFailure[] }>;
}
