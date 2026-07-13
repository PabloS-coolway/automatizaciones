import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Column, DataTable, useMemoryTable } from '../src/ui/components/table';

interface Fila {
  modelo: string;
  talla: string;
}

const FILAS: Fila[] = [
  { modelo: 'GOAL', talla: '40' },
  { modelo: 'GOAL', talla: '41' },
  { modelo: 'BECKS', talla: '42' },
];

const COLUMNAS: Column<Fila>[] = [
  { key: 'modelo', label: 'modelo', value: (r) => r.modelo },
  { key: 'talla', label: 'talla', value: (r) => r.talla },
];

/** Monta la tabla de verdad (hook + componente), como la ve el usuario. */
function Tabla({ filas = FILAS }: { filas?: Fila[] }) {
  const model = useMemoryTable(filas, COLUMNAS);
  return <DataTable model={model} allRows={filas} rowKey={(r) => `${r.modelo}-${r.talla}`} />;
}

const filasPintadas = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const abrirFiltro = (columna: string) => fireEvent.click(screen.getByLabelText(`Filtrar por ${columna}`));
/** El desplegable abierto. Hay que acotar aquí: "GOAL" también aparece en las celdas de la tabla. */
const desplegable = () => within(screen.getByRole('tooltip'));
const marcar = (valor: string | RegExp) => fireEvent.click(desplegable().getByRole('checkbox', { name: valor }));

describe('DataTable', () => {
  it('pinta las filas y el contador de totales', () => {
    render(<Tabla />);
    expect(filasPintadas()).toHaveLength(3);
    expect(screen.getByText('3 filas')).toBeDefined();
  });

  it('ordena al pulsar la cabecera (asc → desc)', () => {
    render(<Tabla />);
    const cabecera = screen.getByLabelText('Ordenar por modelo');

    fireEvent.click(cabecera);
    expect(filasPintadas()[0].textContent).toContain('BECKS');

    fireEvent.click(cabecera);
    expect(filasPintadas()[0].textContent).toContain('GOAL');
  });

  it('el desplegable ofrece los valores con su recuento', () => {
    render(<Tabla />);
    abrirFiltro('modelo');

    // GOAL sale 2 veces (2 filas) y BECKS 1: el recuento va junto al valor, como en Excel.
    expect(desplegable().getByRole('checkbox', { name: /GOAL\s*2/ })).toBeDefined();
    expect(desplegable().getByRole('checkbox', { name: /BECKS\s*1/ })).toBeDefined();
  });

  it('al marcar un valor, la tabla filtra y el contador dice "N de M"', () => {
    render(<Tabla />);
    abrirFiltro('modelo');

    // Todo viene marcado: desmarcar GOAL deja sólo BECKS.
    marcar(/GOAL/);

    expect(filasPintadas()).toHaveLength(1);
    expect(filasPintadas()[0].textContent).toContain('BECKS');
    expect(screen.getByText(/de\s*3\s*filas/)).toBeDefined();
  });

  it('BUG DE LA FASE 1: "(Seleccionar todo)" se puede DESMARCAR y deja la tabla vacía', () => {
    render(<Tabla />);
    abrirFiltro('modelo');

    const todos = desplegable().getByRole('checkbox', { name: '(Seleccionar todo)' }) as HTMLInputElement;
    expect(todos.checked).toBe(true);

    fireEvent.click(todos);

    // Antes reaparecían las 3 filas (la selección vacía se tomaba como "sin filtro").
    expect(screen.getByText('Sin resultados.')).toBeDefined();
    expect(filasPintadas()).toHaveLength(1); // sólo la fila del mensaje vacío
  });

  it('tras desmarcar todo se pueden marcar sólo los valores que interesan (el gesto de Excel)', () => {
    render(<Tabla />);
    abrirFiltro('modelo');

    marcar('(Seleccionar todo)'); // vaciar
    marcar(/GOAL/); // marcar sólo GOAL

    expect(filasPintadas()).toHaveLength(2);
    expect(filasPintadas().every((f) => f.textContent?.includes('GOAL'))).toBe(true);
  });

  it('"Quitar filtros" vuelve a mostrarlo todo', () => {
    render(<Tabla />);
    abrirFiltro('modelo');
    marcar(/GOAL/);
    expect(filasPintadas()).toHaveLength(1);

    fireEvent.click(screen.getByText(/Quitar 1 filtro/));
    expect(filasPintadas()).toHaveLength(3);
  });

  it('columnas casi únicas → filtro de texto "contiene", no casillas', () => {
    // 80 valores distintos: un desplegable de casillas no serviría.
    const muchas = Array.from({ length: 80 }, (_, i) => ({ modelo: `M${i}`, talla: '40' }));
    render(<Tabla filas={muchas} />);
    abrirFiltro('modelo');

    const caja = desplegable().getByLabelText('Filtrar: contiene');
    fireEvent.change(caja, { target: { value: 'M7' } });

    // M7, M70..M79 → 11 filas
    expect(filasPintadas()).toHaveLength(11);
  });
});
