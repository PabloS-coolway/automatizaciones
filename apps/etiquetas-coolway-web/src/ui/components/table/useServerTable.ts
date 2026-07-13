import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReferenceDto, ReferenceFacetColumn, ReferenceFiltersDto, ReferenceSortColumn } from '@yorga/contracts';
import { REFERENCE_FACET_COLUMNS, REFERENCE_SORT_COLUMNS } from '@yorga/contracts';
import type { MaestroGateway } from '../../../application/ports/maestro-gateway.port';
import { Column, ColumnFilter, Facet, Filters, SortState, TableModel } from './types';

const PAGE_SIZE = 100;

/** Traduce el estado de la tabla (filtros + orden) a los filtros que entiende la API. */
export function toApiFilters(filters: Filters, sort: SortState | null, search: string): ReferenceFiltersDto {
  const out: ReferenceFiltersDto = {};
  if (search.trim()) out.search = search.trim();

  for (const [key, f] of Object.entries(filters)) {
    if (f.selected) {
      // Ojo: `[]` (nada marcado) SÍ viaja. Es "no quiero ninguno" (0 filas), no "sin filtro".
      if ((REFERENCE_FACET_COLUMNS as readonly string[]).includes(key)) {
        out[key as ReferenceFacetColumn] = f.selected;
      }
    } else if (f.text?.trim()) {
      if (key === 'ref' || key === 'sku' || key === 'ean13' || key === 'upc') out[key] = f.text.trim();
    }
  }

  if (sort && (REFERENCE_SORT_COLUMNS as readonly string[]).includes(sort.key)) {
    out.sort = sort.key as ReferenceSortColumn;
    out.dir = sort.dir;
  }
  return out;
}

/**
 * Motor de tabla CONTRA EL SERVIDOR (fase 3 de REQ-002), para el maestro (5.736 SKU).
 *
 * Produce el mismo `TableModel` que `useMemoryTable`, así que la `DataTable` no cambia. La diferencia
 * es dónde se filtra: aquí, en la BD. Filtrar en el navegador sólo miraría las 100 filas de la página
 * y diría "3 resultados" cuando puede haber 70 — un resultado FALSO con apariencia de correcto.
 */
export function useServerTable(
  gateway: MaestroGateway,
  columns: Column<ReferenceDto>[],
  search: string,
  onError: (msg: string) => void,
): TableModel<ReferenceDto> {
  const [rows, setRows] = useState<ReferenceDto[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sort, setSort] = useState<SortState | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  const [facetsCache, setFacetsCache] = useState<Record<string, Facet[]>>({});
  const [refresco, setRefresco] = useState(0); // se incrementa para forzar una recarga

  const apiFilters = useMemo(() => toApiFilters(filters, sort, search), [filters, sort, search]);
  const clave = JSON.stringify(apiFilters); // dispara la recarga sólo cuando el filtro cambia de verdad

  // Al cambiar filtros u orden se vuelve a la página 1: si no, te quedas en una página que ya no existe.
  useEffect(() => setPage(1), [clave]);

  // Las facetas dependen de los filtros: si cambian, las cacheadas ya no valen.
  useEffect(() => setFacetsCache({}), [clave]);

  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    gateway
      .listReferences(apiFilters, PAGE_SIZE, (page - 1) * PAGE_SIZE)
      .then((p) => {
        if (!vivo.current) return;
        setRows(p.items);
        setFilteredCount(p.total);
        setTotalCount(p.grandTotal);
      })
      .catch((e) => onError((e as Error).message))
      .finally(() => vivo.current && setLoading(false));
    // `clave` es el filtro serializado: evita recargar por identidades nuevas del mismo objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, page, gateway, refresco]);

  /** Se pide al abrir el desplegable (no se pueden deducir de la página). */
  const requestFacets = useCallback(
    (key: string) => {
      if (!(REFERENCE_FACET_COLUMNS as readonly string[]).includes(key)) return;
      if (facetsCache[key]) return; // ya las tenemos para este filtro
      gateway
        .getFacets(key as ReferenceFacetColumn, apiFilters)
        .then((f) => vivo.current && setFacetsCache((prev) => ({ ...prev, [key]: f.values })))
        .catch((e) => onError((e as Error).message));
    },
    [gateway, apiFilters, facetsCache, onError],
  );

  const setColumnFilter = useCallback((key: string, filter: ColumnFilter | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!filter) delete next[key];
      else next[key] = filter;
      return next;
    });
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }, []);

  return {
    columns,
    rows,
    filteredCount,
    totalCount,
    loading,
    sort,
    toggleSort,
    filters,
    setColumnFilter,
    clearFilters: () => setFilters({}),
    activeFilterCount: Object.keys(filters).length,
    facets: (key) => facetsCache[key] ?? [],
    requestFacets,
    reload: () => {
      setFacetsCache({}); // tras cargar el maestro, los valores del desplegable pueden haber cambiado
      setRefresco((n) => n + 1);
    },
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(filteredCount / PAGE_SIZE)),
    // Sólo tenemos la página cargada: exportar "todo lo filtrado" exigiría traerse los 5.736.
    // Mentir aquí sería peor: se devuelve lo que hay y la página no ofrece exportar (ver fase 4).
    allFilteredRows: () => rows,
  };
}
