import { CodeRow, MasterReference } from '../domain/codes';

/** Puerto: leer un export de códigos (EAN.xlsm / UPC.xlsm). */
export interface CodesFileReader {
  read(source: string, codeColumn: 'EAN' | 'UPC'): Promise<CodeRow[]>;
}

/** Puerto: repositorio del maestro (Postgres). */
export interface ReferenceRepository {
  count(): Promise<number>;
  upsertMany(refs: MasterReference[]): Promise<number>; // nº de filas procesadas
}
