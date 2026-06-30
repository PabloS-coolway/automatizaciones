import { Injectable } from '@nestjs/common';
import { MasterReference } from '../../domain/model/reference';
import { MasterProvider, MasterSource } from '../../application/ports/master-provider.port';
import { ExcelMasterReader } from '../excel/excel-master-reader.adapter';
import { DbMasterReader } from '../db/db-master-reader';

/** Despacha la carga del maestro según el origen: BD (Postgres) o Excel subido. */
@Injectable()
export class DefaultMasterProvider implements MasterProvider {
  constructor(
    private readonly excel: ExcelMasterReader,
    private readonly db: DbMasterReader,
  ) {}

  load(source: MasterSource): Promise<MasterReference[]> {
    return source.kind === 'db' ? this.db.readAll() : this.excel.read(source.path);
  }
}
