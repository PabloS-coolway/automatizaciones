import { PurchaseOrder } from '../../domain/model/order';

/** Puerto de entrada: obtener un pedido de compra desde su origen (PDF SAP hoy; API mañana). */
export interface OrderReaderPort {
  read(source: string): Promise<PurchaseOrder>;
}

export const ORDER_READER = Symbol('ORDER_READER');
