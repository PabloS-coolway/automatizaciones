import { MasterReference } from '../../domain/model/reference';

/** De dónde se carga el maestro: la base de datos (Postgres) o un Excel subido. */
export type MasterSource = { kind: 'db' } | { kind: 'file'; path: string };

/** Puerto: entrega las filas del maestro, sea cual sea su origen. */
export interface MasterProvider {
  load(source: MasterSource): Promise<MasterReference[]>;
}

export const MASTER_PROVIDER = Symbol('MASTER_PROVIDER');
