import { Injectable } from '@nestjs/common';
import { PurchaseOrder } from '../../domain/model/order';
import { OrderReaderPort } from '../../application/ports/order-reader.port';
import { extractPdfLayoutText } from './pdf-text-extractor';
import { parseSapOrderText } from './sap-order-parser';

/** Adapter de entrada: PDF de pedido de compra SAP → PurchaseOrder. */
@Injectable()
export class PdfOrderReader implements OrderReaderPort {
  async read(source: string): Promise<PurchaseOrder> {
    const text = extractPdfLayoutText(source);
    return parseSapOrderText(text);
  }
}
