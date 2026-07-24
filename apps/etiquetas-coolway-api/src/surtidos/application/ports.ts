import { Prisma } from '@prisma/client';
import { Surtido } from '../domain/surtido';

export const SURTIDO_REPOSITORY = Symbol('SURTIDO_REPOSITORY');

/** Puerto: catálogo de surtidos (Postgres). Sólo la app escribe. `tx` permite escribir dentro de una transacción. */
export interface SurtidoRepository {
  findAll(): Promise<(Surtido & { id: number })[]>;
  findByRef(ref: string): Promise<(Surtido & { id: number }) | null>;
  findById(id: number): Promise<(Surtido & { id: number }) | null>;
  create(s: Surtido, tx?: Prisma.TransactionClient): Promise<Surtido & { id: number }>;
  update(id: number, surtido: string, tx?: Prisma.TransactionClient): Promise<Surtido & { id: number }>;
  delete(id: number, tx?: Prisma.TransactionClient): Promise<void>;
}
