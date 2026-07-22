import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LabelVariant } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { Destination } from '../domain/destination';
import { DestinationRepository } from '../application/ports';

type Fila = { id: number; code: string; name: string; variant: string; importadoPor: string; active: boolean };

/** La `variant` se guarda como texto en la BD; el dominio ya garantiza que es una válida. */
const aDominio = (f: Fila) => ({ ...f, variant: f.variant as LabelVariant });

/** Adapter: catálogo de destinos sobre Postgres (Prisma). */
@Injectable()
export class PrismaDestinationRepository implements DestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<(Destination & { id: number })[]> {
    const filas = await this.prisma.destination.findMany({ orderBy: [{ active: 'desc' }, { code: 'asc' }] });
    return filas.map(aDominio);
  }

  async findActive(): Promise<Destination[]> {
    const filas = await this.prisma.destination.findMany({ where: { active: true }, orderBy: { code: 'asc' } });
    return filas.map(aDominio);
  }

  async findByCode(code: string): Promise<Destination | null> {
    const f = await this.prisma.destination.findUnique({ where: { code } });
    return f ? aDominio(f) : null;
  }

  async findById(id: number): Promise<(Destination & { id: number }) | null> {
    const f = await this.prisma.destination.findUnique({ where: { id } });
    return f ? aDominio(f) : null;
  }

  async create(d: Omit<Destination, 'active'>, tx?: Prisma.TransactionClient): Promise<Destination & { id: number }> {
    return aDominio(await (tx ?? this.prisma).destination.create({ data: { ...d, active: true } }));
  }

  async update(id: number, data: Partial<Omit<Destination, 'code'>>, tx?: Prisma.TransactionClient): Promise<Destination & { id: number }> {
    return aDominio(await (tx ?? this.prisma).destination.update({ where: { id }, data }));
  }
}
