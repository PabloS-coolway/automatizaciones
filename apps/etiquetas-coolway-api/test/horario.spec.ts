import { jornadaDiariaMin, minutosExtra, minutosTeoricoDiario } from '../src/rrhh/domain/horario';

describe('horario · teórico y horas extra', () => {
  it('la teórica diaria reparte la semanal entre 5 laborables', () => {
    expect(minutosTeoricoDiario(2400)).toBe(480); // 40 h/semana → 8 h/día
    expect(minutosTeoricoDiario(2000)).toBe(400);
  });

  it('las horas extra son el exceso sobre la teórica diaria', () => {
    expect(minutosExtra(540, 2400)).toBe(60); // trabajó 9h con teórica 8h → 1h extra
    expect(minutosExtra(480, 2400)).toBe(0); // justo la jornada → 0
  });

  it('trabajar de menos NO da extra negativa (es otra incidencia)', () => {
    expect(minutosExtra(300, 2400)).toBe(0);
  });

  it('sin horario definido (null), nunca hay extra', () => {
    expect(minutosExtra(600, null)).toBe(0);
  });

  it('la jornada diaria usa la teórica, o 8h por defecto sin horario', () => {
    expect(jornadaDiariaMin(2400)).toBe(480); // 40h/semana → 8h/día
    expect(jornadaDiariaMin(2000)).toBe(400);
    expect(jornadaDiariaMin(null)).toBe(480); // sin horario → 8h por defecto
  });
});
