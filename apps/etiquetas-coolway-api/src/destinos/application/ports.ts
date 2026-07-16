import { Destination } from '../domain/destination';

export const DESTINATION_REPOSITORY = Symbol('DESTINATION_REPOSITORY');

/** Puerto: catálogo de destinos (Postgres). Sólo la app escribe. */
export interface DestinationRepository {
  /** Todos, incluidos los inactivos (para la pantalla de administración). */
  findAll(): Promise<(Destination & { id: number })[]>;
  /** Sólo los ACTIVOS: es lo que se ofrece al generar etiquetas. */
  findActive(): Promise<Destination[]>;
  findByCode(code: string): Promise<Destination | null>;
  create(d: Omit<Destination, 'active'>): Promise<Destination & { id: number }>;
  update(id: number, data: Partial<Omit<Destination, 'code'>>): Promise<Destination & { id: number }>;
  findById(id: number): Promise<(Destination & { id: number }) | null>;
}
