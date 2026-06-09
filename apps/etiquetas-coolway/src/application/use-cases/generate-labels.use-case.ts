import { MissingCode } from '../../domain/model/label';
import { LabelVariant } from '../../domain/model/types';
import { buildLabels } from '../../domain/services/label-builder';
import { MasterIndex } from '../../domain/services/master-index';
import { reconcile, Reconciliation } from '../../domain/services/reconciliation';
import { LabelFile, LabelWriterPort } from '../ports/label-writer.port';
import { MasterReaderPort } from '../ports/master-reader.port';
import { OrderReaderPort } from '../ports/order-reader.port';

export interface GenerateLabelsInput {
  orderSource: string;
  masterSource: string;
  variant: LabelVariant;
  importadoPor?: string;
  outputPath: string;
}

export interface GenerateLabelsResult {
  file: LabelFile;
  missing: MissingCode[];
  reconciliation: Reconciliation;
}

/**
 * Caso de uso (núcleo de aplicación, sin framework): orquesta lectura → reglas → cuadre → escritura.
 * Depende solo de puertos; los adapters concretos se inyectan desde infraestructura.
 */
export class GenerateLabelsUseCase {
  constructor(
    private readonly orderReader: OrderReaderPort,
    private readonly masterReader: MasterReaderPort,
    private readonly labelWriter: LabelWriterPort,
  ) {}

  async execute(input: GenerateLabelsInput): Promise<GenerateLabelsResult> {
    const order = await this.orderReader.read(input.orderSource);
    const master = new MasterIndex(await this.masterReader.read(input.masterSource));

    const { rows, missing } = buildLabels(order, master, input.variant, input.importadoPor);
    const reconciliation = reconcile(order, rows);

    const file: LabelFile = { orderNumber: order.orderNumber, rows, reconciliation };
    await this.labelWriter.write(file, input.outputPath);

    return { file, missing, reconciliation };
  }
}
