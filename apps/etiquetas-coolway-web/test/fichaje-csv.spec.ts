import { describe, expect, it } from 'vitest';
import type { DiaJornadaDto } from '@yorga/contracts';
import { formatearMinutos, historicoACsv } from '../src/domain/fichaje-csv';

const dia = (fecha: string, min: number, extra = 0): DiaJornadaDto => ({ fecha, minutosTrabajados: min, minutosExtra: extra, fichajes: [] });

describe('formatearMinutos', () => {
  it('muestra horas y minutos', () => {
    expect(formatearMinutos(0)).toBe('0m');
    expect(formatearMinutos(35)).toBe('35m');
    expect(formatearMinutos(155)).toBe('2h 35m');
  });
});

describe('historicoACsv', () => {
  it('cabecera + una fila por día, horas con coma decimal (Excel ES) e horas extra', () => {
    const csv = historicoACsv([dia('2026-07-27', 600, 120), dia('2026-07-26', 150)]);
    const lineas = csv.split('\n');
    expect(lineas[0]).toBe('fecha;minutos;horas;extra_min;extra_horas');
    expect(lineas[1]).toBe('2026-07-27;600;10,00;120;2,00');
    expect(lineas[2]).toBe('2026-07-26;150;2,50;0;0,00');
  });

  it('sin días, sólo cabecera', () => {
    expect(historicoACsv([])).toBe('fecha;minutos;horas;extra_min;extra_horas');
  });
});
