import { diasSolicitados, esUnSoloDia } from '../src/domain/ausencia-dias';

describe('domain · ausencia-dias (resumen de la solicitud)', () => {
  it('cuenta los días naturales inclusive', () => {
    expect(diasSolicitados('2026-08-01', '2026-08-05', false)).toBe(5);
    expect(diasSolicitados('2026-08-03', '2026-08-03', false)).toBe(1);
  });

  it('medio día = 0,5 SÓLO si es un único día', () => {
    expect(diasSolicitados('2026-08-03', '2026-08-03', true)).toBe(0.5);
    // medio día marcado en un rango de varios días NO reduce: sigue contando los días completos
    expect(diasSolicitados('2026-08-03', '2026-08-05', true)).toBe(3);
  });

  it('devuelve null si las fechas no son válidas o el inicio es posterior al fin', () => {
    expect(diasSolicitados('', '', false)).toBeNull();
    expect(diasSolicitados('2026-08-05', '2026-08-01', false)).toBeNull();
    expect(diasSolicitados('2026-8-1', '2026-08-05', false)).toBeNull();
  });

  it('esUnSoloDia distingue un día de un rango', () => {
    expect(esUnSoloDia('2026-08-03', '2026-08-03')).toBe(true);
    expect(esUnSoloDia('2026-08-03', '2026-08-04')).toBe(false);
    expect(esUnSoloDia('', '')).toBe(false);
  });
});
