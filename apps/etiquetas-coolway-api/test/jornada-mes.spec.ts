import { resumenMensual, type TrabajoDia } from '../src/rrhh/domain/jornada-mes';

const trab = (min: number, extra = 0, abierta = false): TrabajoDia => ({ minutos: min, extra, abierta });

// Julio 2026: mié 1. Días clave: 4 (sáb), 5 (dom), 15 (mié laborable).
describe('domain · resumenMensual', () => {
  const base = { year: 2026, month: 7, festivos: new Map<string, string>(), ausencias: new Map<string, string>() };

  it('un día laborable pasado sin fichajes = FALTA', () => {
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado: new Map() });
    const d15 = dias.find((x) => x.fecha === '2026-07-15')!;
    expect(d15.estado).toBe('FALTA');
  });

  it('sábado y domingo pasados = FIN_SEMANA (no cuentan como falta)', () => {
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado: new Map() });
    expect(dias.find((x) => x.fecha === '2026-07-04')!.estado).toBe('FIN_SEMANA');
    expect(dias.find((x) => x.fecha === '2026-07-05')!.estado).toBe('FIN_SEMANA');
  });

  it('con fichajes cerrados = OK; sin cerrar = INCOMPLETO', () => {
    const trabajado = new Map([['2026-07-15', trab(480)], ['2026-07-16', trab(300, 0, true)]]);
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado });
    expect(dias.find((x) => x.fecha === '2026-07-15')!.estado).toBe('OK');
    expect(dias.find((x) => x.fecha === '2026-07-16')!.estado).toBe('INCOMPLETO');
  });

  it('un festivo o una ausencia justifican el hueco (no es FALTA)', () => {
    const festivos = new Map([['2026-07-15', 'Feria']]);
    const ausencias = new Map([['2026-07-16', 'Vacaciones']]);
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado: new Map(), festivos, ausencias });
    const f = dias.find((x) => x.fecha === '2026-07-15')!;
    const a = dias.find((x) => x.fecha === '2026-07-16')!;
    expect(f.estado).toBe('FESTIVO');
    expect(f.etiqueta).toBe('Feria');
    expect(a.estado).toBe('AUSENCIA');
    expect(a.etiqueta).toBe('Vacaciones');
  });

  it('los fichajes MANDAN: trabajar en festivo se ve como OK, no como festivo', () => {
    const festivos = new Map([['2026-07-15', 'Feria']]);
    const trabajado = new Map([['2026-07-15', trab(240)]]);
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado, festivos });
    expect(dias.find((x) => x.fecha === '2026-07-15')!.estado).toBe('OK');
  });

  it('hoy nunca es FALTA (la jornada aún no acabó); el futuro es FUTURO', () => {
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-15', trabajado: new Map() });
    expect(dias.find((x) => x.fecha === '2026-07-15')!.estado).toBe('HOY');
    expect(dias.find((x) => x.fecha === '2026-07-16')!.estado).toBe('FUTURO');
    expect(dias.find((x) => x.fecha === '2026-07-31')!.estado).toBe('FUTURO');
  });

  it('cubre todos los días del mes', () => {
    const dias = resumenMensual({ ...base, hoyISO: '2026-07-31', trabajado: new Map() });
    expect(dias).toHaveLength(31);
  });
});
