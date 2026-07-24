import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { Surtido } from '../domain/surtido';
import { SurtidoRepository } from '../application/ports';

const SELECT = { id: true, ref: true, surtido: true } as const;

/** Adapter: catálogo de surtidos sobre Postgres (Prisma). */
@Injectable()
export class PrismaSurtidoRepository implements SurtidoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<(Surtido & { id: number })[]> {
    return this.prisma.surtido.findMany({ orderBy: { ref: 'asc' }, select: SELECT });
  }

  findByRef(ref: string): Promise<(Surtido & { id: number }) | null> {
    return this.prisma.surtido.findUnique({ where: { ref }, select: SELECT });
  }

  findById(id: number): Promise<(Surtido & { id: number }) | null> {
    return this.prisma.surtido.findUnique({ where: { id }, select: SELECT });
  }

  create(s: Surtido, tx?: Prisma.TransactionClient): Promise<Surtido & { id: number }> {
    return (tx ?? this.prisma).surtido.create({ data: s, select: SELECT });
  }

  update(id: number, surtido: string, tx?: Prisma.TransactionClient): Promise<Surtido & { id: number }> {
    return (tx ?? this.prisma).surtido.update({ where: { id }, data: { surtido }, select: SELECT });
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).surtido.delete({ where: { id } });
  }
}
