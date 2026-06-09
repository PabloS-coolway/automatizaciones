import { LabelRow } from '../../domain/model/label';
import { Reconciliation } from '../../domain/services/reconciliation';

export interface LabelFile {
  orderNumber: string;
  rows: LabelRow[];
  reconciliation: Reconciliation;
}

/** Puerto de salida: materializar el fichero de etiquetas (Excel hoy; otro formato mañana). */
export interface LabelWriterPort {
  write(file: LabelFile, destination: string): Promise<void>;
}

export const LABEL_WRITER = Symbol('LABEL_WRITER');
