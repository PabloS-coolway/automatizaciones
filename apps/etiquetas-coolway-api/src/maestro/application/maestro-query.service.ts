import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  FacetsDto,
  MaestroStatsDto,
  REFERENCE_FACET_COLUMNS,
  REFERENCE_SORT_COLUMNS,
  ReferenceFacetColumn,
  ReferenceFiltersDto,
  ReferencesPageDto,
  SortDir,
  VALOR_VACIO,
} from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';

/** Orden por defecto (el de siempre): por modelo, color, referencia y talla. */
const ORDEN_POR_DEFECTO: Prisma.ReferenceOrderByWithRelationInput[] = [
  { style: 'asc' },
  { color: 'asc' },
  { ref: 'asc' },
  { size: 'asc' },
];

/** Filtro de valores marcados: `(vacío)` significa NULL en la BD. */
function porValores(valores: string[] | undefined, campo: string): Prisma.ReferenceWhereInput | undefined {
  if (!valores) return undefined;
  // Selección vacía = "no quiero ninguno" → no debe pasar ninguna fila (no es "sin filtro").
  if (valores.length === 0) return { [campo]: { in: [] } } as Prisma.ReferenceWhereInput;

  const concretos = valores.filter((v) => v !== VALOR_VACIO);
  const incluyeVacio = valores.includes(VALOR_VACIO);

  const or: Prisma.ReferenceWhereInput[] = [];
  if (concretos.length) or.push({ [campo]: { in: concretos } } as Prisma.ReferenceWhereInput);
  if (incluyeVacio) or.push({ OR: [{ [campo]: null }, { [campo]: '' }] } as Prisma.ReferenceWhereInput);
  return or.length === 1 ? or[0] : { OR: or };
}

const contiene = (v: string | undefined, campo: string): Prisma.ReferenceWhereInput | undefined =>
  v?.trim() ? ({ [campo]: { contains: v.trim(), mode: 'insensitive' } } as Prisma.ReferenceWhereInput) : undefined;

/**
 * Traduce los filtros de la UI a un `where` de Prisma.
 * `excepto` deja fuera el filtro de una columna: es lo que hace que su desplegable siga ofreciendo
 * todos sus valores (si no, al marcar GOAL desaparecería BECKS y no podrías volver a marcarlo).
 */
export function buildWhere(f: ReferenceFiltersDto, excepto?: string): Prisma.ReferenceWhereInput {
  const and: Prisma.ReferenceWhereInput[] = [];

  const q = f.search?.trim();
  if (q) {
    and.push({
      OR: [
        { ref: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { ean13: { contains: q } },
        { upc: { contains: q } },
        { style: { contains: q, mode: 'insensitive' } },
        { color: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const trozos: (Prisma.ReferenceWhereInput | undefined)[] = [
    excepto === 'style' ? undefined : porValores(f.style, 'style'),
    excepto === 'color' ? undefined : porValores(f.color, 'color'),
    excepto === 'size' ? undefined : porValores(f.size, 'size'),
    excepto === 'colorNameWeb' ? undefined : porValores(f.colorNameWeb, 'colorNameWeb'),
    excepto === 'ref' ? undefined : contiene(f.ref, 'ref'),
    excepto === 'sku' ? undefined : contiene(f.sku, 'sku'),
    excepto === 'ean13' ? undefined : contiene(f.ean13, 'ean13'),
    excepto === 'upc' ? undefined : contiene(f.upc, 'upc'),
  ];

  for (const t of trozos) if (t) and.push(t);
  return and.length ? { AND: and } : {};
}

/**
 * Orden pedido por el cliente, SÓLO si la columna está en la lista blanca.
 * Es seguridad, no cosmética: pasar el `orderBy` tal cual desde la UI sería inyectable.
 */
export function buildOrderBy(sort?: string, dir?: string): Prisma.ReferenceOrderByWithRelationInput[] {
  const columna = REFERENCE_SORT_COLUMNS.find((c) => c === sort);
  if (!columna) return ORDEN_POR_DEFECTO;
  const sentido: SortDir = dir === 'desc' ? 'desc' : 'asc';
  return [{ [columna]: sentido } as Prisma.ReferenceOrderByWithRelationInput];
}

/** ¿Es una columna con autofiltro de casillas? (evita agrupar por una columna arbitraria) */
export function esColumnaDeFacetas(col: string): col is ReferenceFacetColumn {
  return (REFERENCE_FACET_COLUMNS as readonly string[]).includes(col);
}

/** Consultas de lectura del maestro (Postgres) para la UI. */
@Injectable()
export class MaestroQuery {
  constructor(private readonly prisma: PrismaService) {}

  async stats(): Promise<MaestroStatsDto> {
    const [total, conEan, conUpc] = await this.prisma.$transaction([
      this.prisma.reference.count(),
      this.prisma.reference.count({ where: { ean13: { not: null } } }),
      this.prisma.reference.count({ where: { upc: { not: null } } }),
    ]);
    const models = await this.prisma.$queryRaw<{ style: string; count: number }[]>`
      SELECT style, COUNT(*)::int AS count FROM reference GROUP BY style ORDER BY style`;
    return { total, conEan, conUpc, models };
  }

  async references(filters: ReferenceFiltersDto, take: number, skip: number): Promise<ReferencesPageDto> {
    const where = buildWhere(filters);
    const [total, grandTotal, items] = await this.prisma.$transaction([
      this.prisma.reference.count({ where }),
      this.prisma.reference.count(), // sin filtrar: para el "N de M"
      this.prisma.reference.findMany({
        where,
        take,
        skip,
        orderBy: buildOrderBy(filters.sort, filters.dir),
        select: { style: true, color: true, ref: true, size: true, sku: true, ean13: true, upc: true, colorNameWeb: true },
      }),
    ]);
    return { total, grandTotal, items };
  }

  /**
   * Valores del desplegable de una columna, con los filtros de las DEMÁS ya aplicados (como Excel).
   * No se pueden deducir de la página: con 100 filas en pantalla no se sabe qué colores tiene GOAL.
   */
  async facets(column: ReferenceFacetColumn, filters: ReferenceFiltersDto): Promise<FacetsDto> {
    const grupos = await this.prisma.reference.groupBy({
      by: [column],
      where: buildWhere(filters, column),
      _count: { _all: true },
    });

    const values = grupos
      .map((g) => ({
        value: (g as Record<string, unknown>)[column] as string | null,
        count: (g._count as { _all: number })._all,
      }))
      .map((v) => ({ value: v.value === null || v.value === '' ? VALOR_VACIO : v.value, count: v.count }))
      .sort((a, b) => a.value.localeCompare(b.value, 'es', { numeric: true, sensitivity: 'base' }));

    return { column, values };
  }
}
