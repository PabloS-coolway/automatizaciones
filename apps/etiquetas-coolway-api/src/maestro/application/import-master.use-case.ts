import { isValidEan13, isValidUpc, mergeCodes, MergeIssue } from '../domain/codes';
import { CodesFileReader, ReferenceRepository } from './ports';

export interface ImportReport {
  eanRows: number;
  upcRows: number;
  merged: number;
  upserted: number;
  created: number;
  updated: number;
  skipped: number; // sin ningún código válido
  issues: MergeIssue[];
}

/**
 * Importa EAN.xlsm + UPC.xlsm al maestro (Postgres): une por (ref,talla),
 * calcula SKU, valida formatos y hace upsert. Devuelve un informe.
 */
export class ImportMasterUseCase {
  constructor(
    private readonly reader: CodesFileReader,
    private readonly repo: ReferenceRepository,
  ) {}

  async execute(input: { eanSource: string; upcSource: string }): Promise<ImportReport> {
    const ean = await this.reader.read(input.eanSource, 'EAN');
    const upc = await this.reader.read(input.upcSource, 'UPC');
    const { references, issues } = mergeCodes(ean, upc);

    // Solo se persisten códigos con formato válido; los inválidos quedan en el informe.
    const clean = references
      .map((r) => ({ ...r, ean13: isValidEan13(r.ean13) ? r.ean13 : undefined, upc: isValidUpc(r.upc) ? r.upc : undefined }))
      .filter((r) => r.ean13 || r.upc);

    const before = await this.repo.count();
    const upserted = await this.repo.upsertMany(clean);
    const after = await this.repo.count();
    const created = after - before;

    return {
      eanRows: ean.length,
      upcRows: upc.length,
      merged: references.length,
      upserted,
      created,
      updated: upserted - created,
      skipped: references.length - clean.length,
      issues,
    };
  }
}
