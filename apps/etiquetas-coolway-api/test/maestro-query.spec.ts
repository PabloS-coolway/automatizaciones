import { VALOR_VACIO } from '@yorga/contracts';
import { MaestroQuery, buildOrderBy, buildWhere, esColumnaDeFacetas } from '../src/maestro/application/maestro-query.service';

describe('buildOrderBy · lista blanca (esto es SEGURIDAD, no cosmética)', () => {
  it('ordena por una columna permitida, en el sentido pedido', () => {
    expect(buildOrderBy('ean13', 'desc')).toEqual([{ ean13: 'desc' }]);
    expect(buildOrderBy('size', 'asc')).toEqual([{ size: 'asc' }]);
  });

  it('una columna NO permitida se ignora y cae al orden por defecto (no se pasa al orderBy)', () => {
    // Si esto se colara, el cliente podría ordenar por columnas que no exponemos.
    expect(buildOrderBy('passwordHash', 'asc')).toEqual([{ style: 'asc' }, { color: 'asc' }, { ref: 'asc' }, { size: 'asc' }]);
    expect(buildOrderBy('id); DROP TABLE reference;--', 'asc')[0]).toEqual({ style: 'asc' });
  });

  it('sin orden pedido → el de siempre (modelo, color, ref, talla)', () => {
    expect(buildOrderBy(undefined, undefined)).toEqual([
      { style: 'asc' },
      { color: 'asc' },
      { ref: 'asc' },
      { size: 'asc' },
    ]);
  });

  it('un sentido inválido no rompe: se asume ascendente', () => {
    expect(buildOrderBy('style', 'lo-que-sea')).toEqual([{ style: 'asc' }]);
  });
});

describe('buildWhere · filtros por columna', () => {
  it('sin filtros → where vacío (no se inventa ninguna condición)', () => {
    expect(buildWhere({})).toEqual({});
  });

  it('filtro de casillas → IN con los valores marcados', () => {
    expect(buildWhere({ style: ['GOAL', 'BECKS'] })).toEqual({ AND: [{ style: { in: ['GOAL', 'BECKS'] } }] });
  });

  it('selección VACÍA → no pasa ninguna fila (NO es "sin filtro")', () => {
    // El mismo bug que tuvimos en el front, ahora en la BD: `[]` significa "ninguno".
    expect(buildWhere({ style: [] })).toEqual({ AND: [{ style: { in: [] } }] });
  });

  it('"(vacío)" filtra por celdas sin valor: es la pregunta real ("¿qué no puedo etiquetar?")', () => {
    expect(buildWhere({ colorNameWeb: [VALOR_VACIO] })).toEqual({
      AND: [{ OR: [{ colorNameWeb: null }, { colorNameWeb: '' }] }],
    });
  });

  it('"(vacío)" junto a valores concretos → los dos casos (OR)', () => {
    expect(buildWhere({ color: ['RED', VALOR_VACIO] })).toEqual({
      AND: [{ OR: [{ color: { in: ['RED'] } }, { OR: [{ color: null }, { color: '' }] }] }],
    });
  });

  it('filtro de texto → "contiene", sin distinguir mayúsculas', () => {
    expect(buildWhere({ ean13: '8433' })).toEqual({ AND: [{ ean13: { contains: '8433', mode: 'insensitive' } }] });
  });

  it('varios filtros se acumulan (AND)', () => {
    const where = buildWhere({ style: ['GOAL'], size: ['42'] });
    expect(where.AND).toHaveLength(2);
  });

  it('la búsqueda global sigue mirando en varias columnas a la vez', () => {
    const where = buildWhere({ search: 'GOAL' });
    expect((where.AND as unknown[])[0]).toHaveProperty('OR');
  });

  it('`excepto` deja fuera el filtro de esa columna (lo que hace que su desplegable no se vacíe)', () => {
    // Sin esto, al marcar GOAL desaparecería BECKS del desplegable y no podrías volver a marcarlo.
    expect(buildWhere({ style: ['GOAL'] }, 'style')).toEqual({});
    // …pero los filtros de las OTRAS columnas sí se aplican (facetas cruzadas, como Excel).
    expect(buildWhere({ style: ['GOAL'], size: ['42'] }, 'style')).toEqual({ AND: [{ size: { in: ['42'] } }] });
  });
});

describe('esColumnaDeFacetas · lista blanca de columnas agrupables', () => {
  it('acepta las de pocos valores y rechaza el resto', () => {
    expect(esColumnaDeFacetas('style')).toBe(true);
    expect(esColumnaDeFacetas('size')).toBe(true);
    expect(esColumnaDeFacetas('sku')).toBe(false); // 5.736 valores: un desplegable no sirve
    expect(esColumnaDeFacetas('id')).toBe(false);
  });
});

describe('MaestroQuery · lo que se le pide a la BD', () => {
  const prisma = () => ({
    reference: {
      count: jest.fn().mockResolvedValue(7),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([
        { style: 'GOAL', _count: { _all: 3 } },
        { style: 'BECKS', _count: { _all: 1 } },
        { style: null, _count: { _all: 2 } },
      ]),
    },
    $transaction: (ps: Promise<unknown>[]) => Promise.all(ps),
  });

  it('references devuelve el total filtrado Y el total sin filtrar (para el "N de M")', async () => {
    const p = prisma();
    const page = await new MaestroQuery(p as never).references({ style: ['GOAL'] }, 100, 0);

    expect(page.total).toBe(7);
    expect(page.grandTotal).toBe(7);
    // El count del "N de M" se pide SIN where: si no, siempre serían iguales y no diría nada.
    expect(p.reference.count).toHaveBeenCalledWith(); // segunda llamada, sin argumentos
  });

  it('references pagina y ordena con lo validado', async () => {
    const p = prisma();
    await new MaestroQuery(p as never).references({ sort: 'ean13', dir: 'desc' }, 50, 100);

    expect(p.reference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 100, orderBy: [{ ean13: 'desc' }] }),
    );
  });

  it('facets agrupa por la columna y traduce el NULL a "(vacío)"', async () => {
    const p = prisma();
    const facetas = await new MaestroQuery(p as never).facets('style', {});

    expect(p.reference.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['style'] }));
    expect(facetas.values).toEqual([
      { value: '(vacío)', count: 2 },
      { value: 'BECKS', count: 1 },
      { value: 'GOAL', count: 3 },
    ]);
  });

  it('facets IGNORA el filtro de su propia columna (facetas cruzadas)', async () => {
    const p = prisma();
    await new MaestroQuery(p as never).facets('style', { style: ['GOAL'], size: ['42'] });

    expect(p.reference.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ size: { in: ['42'] } }] } }),
    );
  });
});
