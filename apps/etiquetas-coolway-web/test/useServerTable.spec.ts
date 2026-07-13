import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReferenceDto } from '@yorga/contracts';
import { Column, toApiFilters, useServerTable } from '../src/ui/components/table';
import { filtersToParams } from '../src/infrastructure/http-maestro-gateway';
import type { MaestroGateway } from '../src/application/ports/maestro-gateway.port';

const COLUMNAS: Column<ReferenceDto>[] = [
  { key: 'style', label: 'modelo', value: (r) => r.style, filter: 'values' },
  { key: 'sku', label: 'SKU', value: (r) => r.sku, filter: 'text' },
];

const fake = () =>
  ({
    getStats: vi.fn(),
    listReferences: vi.fn().mockResolvedValue({ total: 3, grandTotal: 5736, items: [] }),
    getFacets: vi.fn().mockResolvedValue({ column: 'style', values: [{ value: 'GOAL', count: 3 }] }),
    importCodes: vi.fn(),
    seedMaster: vi.fn(),
  }) as unknown as MaestroGateway;

const montar = (g: MaestroGateway) => renderHook(() => useServerTable(g, COLUMNAS, '', () => undefined));

describe('toApiFilters · traduce el estado de la tabla a la API', () => {
  it('los valores marcados viajan como multivalor', () => {
    expect(toApiFilters({ style: { selected: ['GOAL', 'BECKS'] } }, null, '')).toEqual({ style: ['GOAL', 'BECKS'] });
  });

  it('la selección VACÍA también viaja (es "0 filas", no "sin filtro")', () => {
    expect(toApiFilters({ style: { selected: [] } }, null, '')).toEqual({ style: [] });
  });

  it('el texto viaja como "contiene"', () => {
    expect(toApiFilters({ sku: { text: '760' } }, null, '')).toEqual({ sku: '760' });
  });

  it('el orden sólo viaja si la columna está permitida', () => {
    expect(toApiFilters({}, { key: 'ean13', dir: 'desc' }, '')).toEqual({ sort: 'ean13', dir: 'desc' });
    // Una columna que no existe en la BD no se manda (el servidor la ignoraría igual).
    expect(toApiFilters({}, { key: 'inventada', dir: 'asc' }, '')).toEqual({});
  });
});

describe('filtersToParams · serialización a query string', () => {
  it('multivalor → un parámetro repetido', () => {
    expect(filtersToParams({ style: ['GOAL', 'BECKS'] }).toString()).toBe('style=GOAL&style=BECKS');
  });

  it('array VACÍO → `style=` (si se omitiera, el servidor devolvería TODO)', () => {
    expect(filtersToParams({ style: [] }).toString()).toBe('style=');
  });

  it('sin filtros → sin parámetros', () => {
    expect(filtersToParams({}).toString()).toBe('');
  });
});

describe('useServerTable · el maestro se filtra en la BD', () => {
  it('pide la primera página al montar y expone "N de M"', async () => {
    const g = fake();
    const { result } = montar(g);

    await waitFor(() => expect(result.current.filteredCount).toBe(3));
    expect(result.current.totalCount).toBe(5736); // el total SIN filtrar: "3 de 5.736"
    expect(g.listReferences).toHaveBeenCalledWith({}, 100, 0);
  });

  it('al filtrar, vuelve a preguntar A LA BD (no filtra las 100 filas de la página)', async () => {
    const g = fake();
    const { result } = montar(g);
    await waitFor(() => expect(g.listReferences).toHaveBeenCalled());

    act(() => result.current.setColumnFilter('style', { selected: ['GOAL'] }));

    await waitFor(() => expect(g.listReferences).toHaveBeenLastCalledWith({ style: ['GOAL'] }, 100, 0));
  });

  it('al ordenar, el orden se pide a la BD (no se reordena la página)', async () => {
    const g = fake();
    const { result } = montar(g);
    await waitFor(() => expect(g.listReferences).toHaveBeenCalled());

    act(() => result.current.toggleSort('sku'));
    await waitFor(() => expect(g.listReferences).toHaveBeenLastCalledWith({ sort: 'sku', dir: 'asc' }, 100, 0));
  });

  it('las facetas se piden al abrir el desplegable, no antes', async () => {
    const g = fake();
    const { result } = montar(g);
    await waitFor(() => expect(g.listReferences).toHaveBeenCalled());

    expect(g.getFacets).not.toHaveBeenCalled();
    expect(result.current.facets('style')).toEqual([]);

    act(() => result.current.requestFacets!('style'));

    await waitFor(() => expect(result.current.facets('style')).toEqual([{ value: 'GOAL', count: 3 }]));
    expect(g.getFacets).toHaveBeenCalledWith('style', {});
  });

  it('cambiar de página pide el siguiente tramo a la BD', async () => {
    const g = fake();
    const { result } = montar(g);
    await waitFor(() => expect(g.listReferences).toHaveBeenCalled());

    act(() => result.current.setPage(3));
    await waitFor(() => expect(g.listReferences).toHaveBeenLastCalledWith({}, 100, 200));
  });

  it('al cambiar el filtro se vuelve a la página 1 (si no, quedarías en una página inexistente)', async () => {
    const g = fake();
    const { result } = montar(g);
    await waitFor(() => expect(g.listReferences).toHaveBeenCalled());

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setColumnFilter('style', { selected: ['GOAL'] }));
    await waitFor(() => expect(result.current.page).toBe(1));
  });
});

describe('Exportar la vista filtrada (fase 4)', () => {
  it('se exporta con LOS MISMOS filtros y orden que se ven en la tabla', () => {
    // Es el mismo traductor que usa la tabla para pedir los datos: así el Excel y la pantalla
    // no pueden divergir. Si se duplicara la lógica, acabarían diciendo cosas distintas.
    const filtros = toApiFilters(
      { style: { selected: ['GOAL'] }, upc: { text: '8433' } },
      { key: 'size', dir: 'desc' },
      'nilo',
    );
    expect(filtros).toEqual({ search: 'nilo', style: ['GOAL'], upc: '8433', sort: 'size', dir: 'desc' });
  });

  it('la query de exportación lleva esos filtros', () => {
    const p = filtersToParams({ style: ['GOAL'], upc: '8433', sort: 'size', dir: 'desc' });
    expect(p.getAll('style')).toEqual(['GOAL']);
    expect(p.get('upc')).toBe('8433');
    expect(p.get('sort')).toBe('size');
  });
});
