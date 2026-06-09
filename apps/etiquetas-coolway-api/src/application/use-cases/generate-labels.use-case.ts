import { LabelRow, MissingCode } from '../../domain/model/label';
import { LabelVariant } from '../../domain/model/types';
import { buildLabels } from '../../domain/services/label-builder';
import { MasterIndex } from '../../domain/services/master-index';
import { reconcile, Reconciliation } from '../../domain/services/reconciliation';
import { MasterReaderPort } from '../ports/master-reader.port';
import { OrderReaderPort } from '../ports/order-reader.port';

export interface GenerateLabelsInput {
  /** Uno o varios PDFs de pedido (modo batch). */
  orderSources: string[];
  masterSource: string;
  variant: LabelVariant;
  importadoPor?: string;
}

/** Resultado de etiquetas de UN pedido. */
export interface OrderLabels {
  orderNumber: string;
  variant: LabelVariant;
  importadoPor?: string;
  rows: LabelRow[];
  missing: MissingCode[];
  reconciliation: Reconciliation;
}

/**
 * Caso de uso (núcleo, sin framework): lee el maestro UNA vez y procesa N pedidos
 * con la misma variante/importado por (bloques por cliente, como pide Silvia).
 * No serializa ni escribe: devuelve datos; la interfaz (CLI/HTTP) decide el output.
 */
export class GenerateLabelsUseCase {
  constructor(
    private readonly orderReader: OrderReaderPort,
    private readonly masterReader: MasterReaderPort,
  ) {}

  async generate(input: GenerateLabelsInput): Promise<OrderLabels[]> {
    const master = new MasterIndex(await this.masterReader.read(input.masterSource));

    const results: OrderLabels[] = [];
    for (const source of input.orderSources) {
      const order = await this.orderReader.read(source);
      const { rows, missing } = buildLabels(order, master, input.variant, input.importadoPor);
      results.push({
        orderNumber: order.orderNumber,
        variant: input.variant,
        importadoPor: input.importadoPor,
        rows,
        missing,
        reconciliation: reconcile(order, rows),
      });
    }
    return results;
  }
}
