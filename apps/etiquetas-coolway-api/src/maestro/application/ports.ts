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
  /** REQ-003 · la del PDF y la del código de barras (vacías en calzado: valen lo mismo que `size`). */
  tallaSap?: string;
  tallaTiendas?: string;
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

/** Identifica una fila del maestro. La identidad del SKU es (ref, talla). */
export interface RefSize {
  ref: string;
  size: string;
}

/** Una fila del maestro que se borró por haber quedado huérfana (ver `SeedReport.removed`). */
export interface RemovedRow {
  style: string;
  color: string;
  ref: string;
  size: string;
}

/** Puerto: repositorio del maestro (Postgres). */
export interface ReferenceRepository {
  count(): Promise<number>;
  upsertMany(refs: MasterReference[]): Promise<number>; // nº de filas procesadas
  /**
   * Upsert tolerante: una fila que falle (p.ej. EAN13 duplicado) no aborta el resto, pero se reporta.
   * REQ-009 · `colorWebProtegidas`: filas cuyo color web NO se pisó por estar editado a mano (el Excel
   * traía otro valor). Se reporta para que la carga no mienta.
   */
  upsertManySeed(rows: SeedRow[]): Promise<{ ok: number; failures: SeedFailure[]; colorWebProtegidas: number }>;
  /** Todas las filas del maestro (identidad + producto), para detectar huérfanas. */
  allKeys(): Promise<(RefSize & { style: string; color: string })[]>;
  /** Borra las filas indicadas por (ref, talla). Devuelve cuántas se borraron. */
  deleteMany(keys: RefSize[]): Promise<number>;
  /** REQ-009 · Valores de "color web" que ya existen (para no crear uno nuevo por un typo). */
  existingColorWebValues(): Promise<string[]>;
  /**
   * REQ-009 · Fija el "color web" de una referencia+color en TODAS sus tallas y lo marca como editado a
   * mano (para que la reimportación lo respete). Devuelve cuántas filas cambió y el valor previo.
   */
  updateColorWebByRefColor(
    ref: string,
    color: string,
    value: string,
    editedBy: string,
  ): Promise<{ updated: number; before: string | null }>;
}
