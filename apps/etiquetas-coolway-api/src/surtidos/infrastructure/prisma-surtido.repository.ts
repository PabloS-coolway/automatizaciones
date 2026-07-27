import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { SurtidoRepository, SurtidoRow } from '../application/ports';

const SELECT = { id: true, grupo: true, codigo: true } as const;

/** Adapter: catálogo de surtidos por grupo sobre Postgres (Prisma · tabla `poda_surtido`). */
@Injectable()
export class PrismaSurtidoRepository implements SurtidoRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<SurtidoRow[]> {
    return this.prisma.podaSurtido.findMany({ orderBy: [{ grupo: 'asc' }, { codigo: 'asc' }], select: SELECT });
  }

  findById(id: number): Promise<SurtidoRow | null> {
    return this.prisma.podaSurtido.findUnique({ where: { id }, select: SELECT });
  }

  findByGrupoCodigo(grupo: string, codigo: string): Promise<SurtidoRow | null> {
    return this.prisma.podaSurtido.findUnique({ where: { grupo_codigo: { grupo, codigo } }, select: SELECT });
  }

  create(grupo: string, codigo: string, tx?: Prisma.TransactionClient): Promise<SurtidoRow> {
    return (tx ?? this.prisma).podaSurtido.create({ data: { grupo, codigo }, select: SELECT });
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).podaSurtido.delete({ where: { id } });
  }
}
