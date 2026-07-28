import { proximosCumpleanos } from '../src/rrhh/domain/cumpleanos';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const emp = (id: number, fullName: string, birth: string | null) => ({ id, fullName, birthDate: birth ? d(birth) : null });

describe('proximosCumpleanos', () => {
  const hoy = d('2026-07-28');

  it('incluye los que cumplen dentro de la ventana, ordenados por cercanía', () => {
    const r = proximosCumpleanos(
      [emp(1, 'Ana', '1990-08-01'), emp(2, 'Beto', '1985-07-28'), emp(3, 'Cira', '2000-12-25')],
      hoy,
      30,
    );
    expect(r.map((c) => c.fullName)).toEqual(['Beto', 'Ana']); // Cira (dic) fuera de 30 días
    expect(r[0].diasHasta).toBe(0); // Beto cumple hoy
    expect(r[1].diasHasta).toBe(4); // Ana el 1 de agosto
  });

  it('calcula la edad que cumple', () => {
    const r = proximosCumpleanos([emp(1, 'Ana', '1990-08-01')], hoy, 30);
    expect(r[0].edad).toBe(36); // 2026 - 1990
    expect(r[0].fecha).toBe('08-01');
  });

  it('si el cumpleaños ya pasó este año, cuenta el del año que viene (no negativo)', () => {
    const r = proximosCumpleanos([emp(1, 'Ana', '1990-07-01')], hoy, 400);
    expect(r[0].diasHasta).toBeGreaterThan(300); // el próximo 1-jul
  });

  it('sin fecha de nacimiento, no entra', () => {
    expect(proximosCumpleanos([emp(1, 'Ana', null)], hoy, 30)).toHaveLength(0);
  });
});
