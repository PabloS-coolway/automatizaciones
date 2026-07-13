import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Column, useMemoryTable, tipoDeFiltro, VACIO } from '../src/ui/components/table';

interface Fila {
  modelo: string;
  color: string;
  talla: string;
  upc?: string;
}

const FILAS: Fila[] = [
  { modelo: 'GOAL', color: 'RED', talla: '40', upc: '111111111111' },
  { modelo: 'GOAL', color: 'RED', talla: '41' },
  { modelo: 'GOAL', color: 'BLU', talla: '42', upc: '222222222222' },
  { modelo: 'BECKS', color: 'BLK', talla: '40', upc: '333333333333' },
  { modelo: 'BECKS', color: 'BLK', talla: '9' }, // talla "9": comprueba que ordena como número
];

const COLUMNAS: Column<Fila>[] = [
  { key: 'modelo', label: 'modelo', value: (r) => r.modelo },
  { key: 'color', label: 'color', value: (r) => r.color },
  { key: 'talla', label: 'talla', value: (r) => r.talla },
  { key: 'upc', label: 'upc', value: (r) => r.upc },
];

const tabla = () => renderHook(() => useMemoryTable(FILAS, COLUMNAS));

describe('useMemoryTable · filtro por columna', () => {
  it('filtra por los valores marcados', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));

    expect(result.current.filteredCount).toBe(3);
    expect(result.current.totalCount).toBe(5); // "N de M": el total NO cambia al filtrar
    expect(result.current.rows.every((r) => r.modelo === 'GOAL')).toBe(true);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('una selección VACÍA es un filtro (0 filas), no "sin filtro"', () => {
    // El bug que se coló en la fase 1: al desmarcar "(Seleccionar todo)" reaparecían todas las filas.
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: [] }));

    expect(result.current.filteredCount).toBe(0);
    expect(result.current.activeFilterCount).toBe(1);
  });

  it('pasar `undefined` sí quita el filtro', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));
    act(() => result.current.setColumnFilter('modelo', undefined));

    expect(result.current.filteredCount).toBe(5);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('filtro de texto: "contiene"', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('upc', { text: '2222' }));

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.rows[0].talla).toBe('42');
  });

  it('las celdas vacías se filtran como "(vacío)"', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('upc', { selected: [VACIO] }));

    // Las dos filas sin UPC: justo la pregunta de Silvia ("¿qué no puedo etiquetar?").
    expect(result.current.filteredCount).toBe(2);
    expect(result.current.rows.every((r) => !r.upc)).toBe(true);
  });

  it('los filtros de varias columnas se acumulan (AND)', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));
    act(() => result.current.setColumnFilter('color', { selected: ['RED'] }));

    expect(result.current.filteredCount).toBe(2);
    expect(result.current.activeFilterCount).toBe(2);
  });

  it('clearFilters los quita todos', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));
    act(() => result.current.clearFilters());

    expect(result.current.filteredCount).toBe(5);
    expect(result.current.activeFilterCount).toBe(0);
  });
});

describe('useMemoryTable · facetas (los valores del desplegable)', () => {
  it('lista los valores distintos con su recuento', () => {
    const { result } = tabla();
    expect(result.current.facets('modelo')).toEqual([
      { value: 'BECKS', count: 2 },
      { value: 'GOAL', count: 3 },
    ]);
  });

  it('COMO EXCEL: las facetas de una columna respetan los filtros de las DEMÁS', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));

    // Filtrado GOAL, el desplegable de color sólo debe ofrecer los colores de GOAL (no BLK, que es BECKS).
    expect(result.current.facets('color').map((f) => f.value)).toEqual(['BLU', 'RED']);
  });

  it('las facetas de una columna IGNORAN su propio filtro (si no, no podrías re-marcar valores)', () => {
    const { result } = tabla();
    act(() => result.current.setColumnFilter('modelo', { selected: ['GOAL'] }));

    // Aunque sólo esté marcado GOAL, el desplegable de modelo sigue ofreciendo BECKS.
    expect(result.current.facets('modelo').map((f) => f.value)).toEqual(['BECKS', 'GOAL']);
  });

  it('el vacío aparece como un valor más "(vacío)"', () => {
    const { result } = tabla();
    expect(result.current.facets('upc').find((f) => f.value === VACIO)).toEqual({ value: VACIO, count: 2 });
  });
});

describe('useMemoryTable · orden', () => {
  it('asc → desc → sin orden (se puede volver al original, como Excel)', () => {
    const { result } = tabla();

    act(() => result.current.toggleSort('modelo'));
    expect(result.current.sort).toEqual({ key: 'modelo', dir: 'asc' });
    expect(result.current.rows[0].modelo).toBe('BECKS');

    act(() => result.current.toggleSort('modelo'));
    expect(result.current.sort).toEqual({ key: 'modelo', dir: 'desc' });
    expect(result.current.rows[0].modelo).toBe('GOAL');

    act(() => result.current.toggleSort('modelo'));
    expect(result.current.sort).toBeNull();
    expect(result.current.rows.map((r) => r.talla)).toEqual(['40', '41', '42', '40', '9']); // orden original
  });

  it('las tallas se ordenan como NÚMEROS (9 antes que 40), no como texto', () => {
    const { result } = tabla();
    act(() => result.current.toggleSort('talla'));
    expect(result.current.rows.map((r) => r.talla)).toEqual(['9', '40', '40', '41', '42']);
  });
});

describe('useMemoryTable · paginación', () => {
  const muchas = Array.from({ length: 120 }, (_, i) => ({ modelo: 'GOAL', color: 'RED', talla: String(i) }));

  it('pagina y vuelve a la página 1 al filtrar (si no, te quedas mirando una página vacía)', () => {
    const { result } = renderHook(() => useMemoryTable(muchas, COLUMNAS, { pageSize: 50 }));
    expect(result.current.totalPages).toBe(3);

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setColumnFilter('talla', { selected: ['7'] }));
    expect(result.current.page).toBe(1);
    expect(result.current.filteredCount).toBe(1);
  });

  it('allFilteredRows devuelve TODAS las filas filtradas, no sólo la página (es lo que se exporta)', () => {
    const { result } = renderHook(() => useMemoryTable(muchas, COLUMNAS, { pageSize: 50 }));
    expect(result.current.rows).toHaveLength(50);
    expect(result.current.allFilteredRows()).toHaveLength(120);
  });
});

describe('tipoDeFiltro · lo decide la cardinalidad', () => {
  it('pocos valores distintos → casillas; casi únicos → texto', () => {
    const pocos = Array.from({ length: 500 }, (_, i) => ({ modelo: 'GOAL', color: 'RED', talla: String(i % 10) }));
    const unicos = Array.from({ length: 500 }, (_, i) => ({ modelo: 'GOAL', color: 'RED', talla: String(i) }));

    expect(tipoDeFiltro(COLUMNAS[2], pocos)).toBe('values'); // 10 tallas → desplegable
    expect(tipoDeFiltro(COLUMNAS[2], unicos)).toBe('text'); // 500 valores → "contiene"
  });

  it('se puede forzar el tipo en la columna', () => {
    const col: Column<Fila> = { key: 'talla', label: 'talla', value: (r) => r.talla, filter: 'none' };
    expect(tipoDeFiltro(col, FILAS)).toBe('none');
  });
});
