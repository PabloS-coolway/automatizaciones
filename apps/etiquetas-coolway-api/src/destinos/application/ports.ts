import { Prisma } from '@prisma/client';
import { Destination } from '../domain/destination';

export const DESTINATION_REPOSITORY = Symbol('DESTINATION_REPOSITORY');

/** Puerto: catálogo de destinos (Postgres). Sólo la app escribe. `tx` permite escribir dentro de una transacción. */
export interface DestinationRepository {
  /** Todos, incluidos los inactivos (para la pantalla de administración). */
  findAll(): Promise<(Destination & { id: number })[]>;
  /** Sólo los ACTIVOS: es lo que se ofrece al generar etiquetas. */
  findActive(): Promise<Destination[]>;
  findByCode(code: string): Promise<Destination | null>;
  create(d: Omit<Destination, 'active'>, tx?: Prisma.TransactionClient): Promise<Destination & { id: number }>;
  update(id: number, data: Partial<Omit<Destination, 'code'>>, tx?: Prisma.TransactionClient): Promise<Destination & { id: number }>;
  findById(id: number): Promise<(Destination & { id: number }) | null>;
}
