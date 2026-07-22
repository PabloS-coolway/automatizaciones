import { buildSku, isValidEan13, isValidUpc } from '../domain/codes';
import { MasterFileReader, ReferenceRepository, RemovedRow, SeedFailure, SeedRow } from './ports';
import { findOrphanRows } from './orphan-rows';

/** Un EAN13 que aparece en productos distintos (modelo/color). Se avisa, no se rechaza. */
export interface SharedEan13 {
  ean13: string;
  rows: { style: string; color: string; ref: string; size: string }[];
}

export interface SeedReport {
  rows: number; // filas leídas del Excel
  valid: number; // filas con style/color/ref/talla (las demás se ignoran)
  upserted: number; // filas guardadas
  failed: number; // filas rechazadas (errores de BD; el EAN13 repetido ya NO rechaza)
  created: number;
  updated: number;
  total: number; // total de SKU en el maestro tras la carga
  issues: SeedFailure[]; // QUÉ filas se quedaron fuera y por qué (se reporta, no se oculta)
  sharedEan13: SharedEan13[]; // avisos: el mismo código de barras en dos productos distintos
  /**
   * Filas BORRADAS por quedar huérfanas: estaban en la BD, ya no en el Excel, y su producto sí viene
   * en él (típico al corregir una talla). Se reportan SIEMPRE: borrar en silencio es inaceptable.
   */
  removed: RemovedRow[];
  /** REQ-009 · Filas cuyo color web NO se pisó por estar editado a mano (el Excel traía otro valor). */
  colorWebProtegidas: number;
}

/**
 * El EAN13 puede repetirse legítimamente cuando un producto se re-referencia en SAP: mismo
 * modelo+color con dos referencias. Eso NO es un problema y no se avisa.
 *
 * Lo que sí es un error del maestro es que dos PRODUCTOS distintos (modelo o color diferente)
 * compartan código: en caja, ese código de barras sería ambiguo. La fila entra igualmente
 * —el maestro manda—, pero se reporta en cada carga hasta que se corrija en origen (RF-12).
 */
export function findSharedEan13(rows: SeedRow[]): SharedEan13[] {
  const porEan = new Map<string, SeedRow[]>();
  for (const r of rows) {
    if (!r.ean13) continue;
    const list = porEan.get(r.ean13) ?? [];
    list.push(r);
    porEan.set(r.ean13, list);
  }

  const out: SharedEan13[] = [];
  for (const [ean13, rs] of porEan) {
    const productos = new Set(rs.map((r) => `${r.style}|${r.color}`));
    if (productos.size < 2) continue; // mismo producto (re-referenciado): legítimo
    out.push({
      ean13,
      rows: rs.map((r) => ({ style: r.style, color: r.color, ref: r.ref, size: r.size })),
    });
  }
  return out;
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
        tallaSap: r.tallaSap,
        tallaTiendas: r.tallaTiendas,
        sku: r.sku || buildSku(r.ref, r.size),
        ean13: isValidEan13(r.ean13) ? r.ean13 : undefined,
        upc: isValidUpc(r.upc) ? r.upc : undefined,
        colorNameWeb: r.colorNameWeb,
      }));

    const before = await this.repo.count();
    const { ok, failures, colorWebProtegidas } = await this.repo.upsertManySeed(clean);

    // Huérfanas: en la BD, ya no en el Excel, y su producto SÍ viene. Es lo que deja atrás corregir
    // una talla (la fila vieja se quedaba y además ganaba al generar). Se borran y se reportan.
    const orphans = findOrphanRows(await this.repo.allKeys(), clean);
    if (orphans.length) await this.repo.deleteMany(orphans.map((o) => ({ ref: o.ref, size: o.size })));

    const total = await this.repo.count();
    const created = total - before + orphans.length;

    return {
      rows: rows.length,
      valid: clean.length,
      upserted: ok,
      failed: failures.length,
      created,
      updated: ok - created,
      total,
      issues: failures,
      sharedEan13: findSharedEan13(clean),
      removed: orphans,
      colorWebProtegidas,
    };
  }
}
