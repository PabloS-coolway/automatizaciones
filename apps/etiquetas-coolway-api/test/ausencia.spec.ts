import { diasDeRango, diasSolicitados, esEstadoAusencia, haySolape, rangoValido, saldoVacaciones, solapa } from '../src/rrhh/domain/ausencia';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const r = (start: string, end: string) => ({ start: d(start), end: d(end) });

describe('ausencia · reglas de fechas', () => {
  it('rangoValido: inicio no posterior al fin', () => {
    expect(rangoValido(r('2026-08-01', '2026-08-05'))).toBe(true);
    expect(rangoValido(r('2026-08-05', '2026-08-01'))).toBe(false);
    expect(rangoValido(r('2026-08-01', '2026-08-01'))).toBe(true);
  });

  it('solapa detecta cruces de rango (inclusive)', () => {
    expect(solapa(r('2026-08-01', '2026-08-05'), r('2026-08-05', '2026-08-10'))).toBe(true); // tocan el día 5
    expect(solapa(r('2026-08-01', '2026-08-04'), r('2026-08-05', '2026-08-10'))).toBe(false);
    expect(solapa(r('2026-08-01', '2026-08-31'), r('2026-08-10', '2026-08-12'))).toBe(true); // contenido
  });

  it('haySolape contra una lista de existentes', () => {
    const existentes = [r('2026-08-10', '2026-08-12'), r('2026-08-20', '2026-08-22')];
    expect(haySolape(r('2026-08-11', '2026-08-11'), existentes)).toBe(true);
    expect(haySolape(r('2026-08-15', '2026-08-16'), existentes)).toBe(false);
  });

  it('diasSolicitados cuenta inclusive; medio día en una jornada = 0,5', () => {
    expect(diasSolicitados(r('2026-08-01', '2026-08-05'), false)).toBe(5);
    expect(diasSolicitados(r('2026-08-01', '2026-08-01'), false)).toBe(1);
    expect(diasSolicitados(r('2026-08-01', '2026-08-01'), true)).toBe(0.5);
    expect(diasSolicitados(r('2026-08-01', '2026-08-03'), true)).toBe(3); // medio día no aplica a rangos
  });

  it('esEstadoAusencia valida el estado', () => {
    expect(esEstadoAusencia('APPROVED')).toBe(true);
    expect(esEstadoAusencia('LO_QUE_SEA')).toBe(false);
  });

  it('diasDeRango enumera cada día YYYY-MM-DD del rango', () => {
    expect(diasDeRango(r('2026-08-01', '2026-08-03'))).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(diasDeRango(r('2026-08-05', '2026-08-05'))).toEqual(['2026-08-05']);
  });

  it('saldoVacaciones: restante = cupo − disfrutados', () => {
    expect(saldoVacaciones(23, 5, 2)).toEqual({ anual: 23, disfrutados: 5, pendientes: 2, restante: 18 });
    expect(saldoVacaciones(22, 0.5, 0).restante).toBe(21.5);
  });
});
