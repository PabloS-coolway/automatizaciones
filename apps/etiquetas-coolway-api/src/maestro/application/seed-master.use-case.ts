import { buildSku, isValidEan13, isValidUpc } from '../domain/codes';
import { MasterFileReader, ReferenceRepository, SeedFailure, SeedRow } from './ports';

export interface SeedReport {
  rows: number; // filas leídas del Excel
  valid: number; // filas con style/color/ref/talla (las demás se ignoran)
  upserted: number; // filas guardadas
  failed: number; // filas rechazadas (p.ej. EAN13 duplicado)
  created: number;
  updated: number;
  total: number; // total de SKU en el maestro tras la carga
  issues: SeedFailure[]; // QUÉ filas se quedaron fuera y por qué (se reporta, no se oculta)
}

/**
 * Carga el Excel maestro completo (REFERENCIAS COOLWAY) en Postgres.
 * Upsert por (ref, talla): es idempotente y no borra nada.
 * Los códigos con formato inválido se guardan como vacíos (nunca se inventan);
 * las filas que la BD rechace se cuentan en `failed` sin abortar el resto.
 */
export class SeedMasterUseCase {
  constructor(
    private readonly reader: MasterFileReader,
    private readonly repo: ReferenceRepository,
  ) {}

  async execute(input: { source: string }): Promise<SeedReport> {
    const rows = await this.reader.read(input.source);

    const clean: SeedRow[] = rows
      .filter((r) => r.style && r.color && r.ref && r.size)
      .map((r) => ({
        style: r.style,
        color: r.color,
        ref: r.ref,
        size: r.size,
        sku: r.sku || buildSku(r.ref, r.size),
        ean13: isValidEan13(r.ean13) ? r.ean13 : undefined,
        upc: isValidUpc(r.upc) ? r.upc : undefined,
        colorNameWeb: r.colorNameWeb,
      }));

    const before = await this.repo.count();
    const { ok, failures } = await this.repo.upsertManySeed(clean);
    const total = await this.repo.count();
    const created = total - before;

    return {
      rows: rows.length,
      valid: clean.length,
      upserted: ok,
      failed: failures.length,
      created,
      updated: ok - created,
      total,
      issues: failures,
    };
  }
}
