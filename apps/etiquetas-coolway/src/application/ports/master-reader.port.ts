import { MasterReference } from '../../domain/model/reference';

/** Puerto de entrada: cargar las filas del maestro (Excel del Drive hoy; API Drive mañana). */
export interface MasterReaderPort {
  read(source: string): Promise<MasterReference[]>;
}

export const MASTER_READER = Symbol('MASTER_READER');
