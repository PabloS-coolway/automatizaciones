import { Prisma } from '@prisma/client';

export const SURTIDO_REPOSITORY = Symbol('SURTIDO_REPOSITORY');

/** Una entrada del catálogo de surtidos: un código dentro de un grupo (prefijo de referencia). */
export interface SurtidoRow {
  id: number;
  grupo: string;
  codigo: string;
}

/** Puerto: catálogo de surtidos por grupo (Postgres). Sólo la app escribe. */
export interface SurtidoRepository {
  findAll(): Promise<SurtidoRow[]>;
  findById(id: number): Promise<SurtidoRow | null>;
  findByGrupoCodigo(grupo: string, codigo: string): Promise<SurtidoRow | null>;
  create(grupo: string, codigo: string, tx?: Prisma.TransactionClient): Promise<SurtidoRow>;
  delete(id: number, tx?: Prisma.TransactionClient): Promise<void>;
}
