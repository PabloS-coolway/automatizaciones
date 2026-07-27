import {
  agruparPorDia,
  claveDia,
  esMarcaje,
  estaAnulado,
  estadoActual,
  fichajesEfectivos,
  jornadaSinCerrar,
  marcajesPosibles,
  minutosTrabajados,
  siguienteEstado,
  VOID,
  type Fichaje,
  type FichajeCrudo,
} from '../src/rrhh/domain/fichaje';

const t = (hhmm: string): Date => new Date(`2026-07-27T${hhmm}:00`);
const f = (kind: Fichaje['kind'], hhmm: string): Fichaje => ({ kind, at: t(hhmm) });

describe('fichaje · máquina de estados', () => {
  it('transiciones válidas e inválidas', () => {
    expect(siguienteEstado('FUERA', 'IN')).toBe('TRABAJANDO');
    expect(siguienteEstado('FUERA', 'OUT')).toBeNull(); // no se puede salir sin entrar
    expect(siguienteEstado('TRABAJANDO', 'IN')).toBeNull(); // no se entra dos veces
    expect(siguienteEstado('TRABAJANDO', 'BREAK_START')).toBe('EN_PAUSA');
    expect(siguienteEstado('EN_PAUSA', 'BREAK_END')).toBe('TRABAJANDO');
    expect(siguienteEstado('EN_PAUSA', 'OUT')).toBe('FUERA'); // se puede cerrar desde la pausa
    expect(siguienteEstado('EN_PAUSA', 'BREAK_START')).toBeNull();
  });

  it('marcajesPosibles refleja el estado (para pintar botones)', () => {
    expect(marcajesPosibles('FUERA')).toEqual(['IN']);
    expect(marcajesPosibles('TRABAJANDO').sort()).toEqual(['BREAK_START', 'OUT']);
    expect(marcajesPosibles('EN_PAUSA').sort()).toEqual(['BREAK_END', 'OUT']);
  });

  it('estadoActual reproduce la secuencia (desordenada) y descarta imposibles', () => {
    // Llegan desordenados; un IN repetido (imposible) se ignora.
    const fichajes = [f('OUT', '17:00'), f('IN', '09:00'), f('IN', '09:05'), f('BREAK_START', '13:00'), f('BREAK_END', '14:00')];
    expect(estadoActual(fichajes)).toBe('FUERA');
    expect(estadoActual([f('IN', '09:00'), f('BREAK_START', '13:00')])).toBe('EN_PAUSA');
    expect(estadoActual([])).toBe('FUERA');
  });

  it('esMarcaje valida el tipo', () => {
    expect(esMarcaje('IN')).toBe(true);
    expect(esMarcaje('FICHAR')).toBe(false);
  });
});

describe('fichaje · minutos trabajados', () => {
  it('resta la pausa y NO cuenta el tiempo fuera', () => {
    // 09:00–13:00 (240) + 14:00–17:00 (180) = 420; la pausa 13:00–14:00 no cuenta.
    const jornada = [f('IN', '09:00'), f('BREAK_START', '13:00'), f('BREAK_END', '14:00'), f('OUT', '17:00')];
    expect(minutosTrabajados(jornada, t('18:00'))).toBe(420);
  });

  it('con la jornada abierta cuenta hasta AHORA', () => {
    expect(minutosTrabajados([f('IN', '09:00')], t('09:30'))).toBe(30);
  });

  it('en pausa no corre el reloj', () => {
    // Entró 09:00, pausa a las 09:30; "ahora" 10:00 → sólo 30 min (la pausa no suma).
    expect(minutosTrabajados([f('IN', '09:00'), f('BREAK_START', '09:30')], t('10:00'))).toBe(30);
  });

  it('sin fichajes o estando fuera → 0', () => {
    expect(minutosTrabajados([], t('12:00'))).toBe(0);
    expect(minutosTrabajados([f('IN', '09:00'), f('OUT', '09:00')], t('12:00'))).toBe(0);
  });
});

describe('fichaje · agrupación y jornadas sin cerrar', () => {
  it('claveDia da la fecha local YYYY-MM-DD', () => {
    expect(claveDia(new Date('2026-07-27T09:00:00'))).toBe('2026-07-27');
  });

  it('agruparPorDia separa los marcajes por fecha', () => {
    const grupos = agruparPorDia([
      { kind: 'IN', at: new Date('2026-07-26T09:00:00') },
      { kind: 'OUT', at: new Date('2026-07-26T17:00:00') },
      { kind: 'IN', at: new Date('2026-07-27T09:00:00') },
    ]);
    expect([...grupos.keys()].sort()).toEqual(['2026-07-26', '2026-07-27']);
    expect(grupos.get('2026-07-26')).toHaveLength(2);
  });

  it('jornadaSinCerrar: entrar y no salir = sin cerrar; ciclo completo = cerrada', () => {
    expect(jornadaSinCerrar([f('IN', '09:00')])).toBe(true);
    expect(jornadaSinCerrar([f('IN', '09:00'), f('BREAK_START', '13:00')])).toBe(true); // se quedó en pausa
    expect(jornadaSinCerrar([f('IN', '09:00'), f('OUT', '17:00')])).toBe(false);
    expect(jornadaSinCerrar([])).toBe(false);
  });
});

describe('fichaje · efectivos (correcciones)', () => {
  const crudo = (id: number, kind: string, hhmm: string, correctsId: number | null = null): FichajeCrudo => ({ id, kind, at: t(hhmm), correctsId });

  it('un VOID saca del cómputo el fichaje que referencia, y se excluye a sí mismo', () => {
    const crudos = [crudo(1, 'IN', '09:00'), crudo(2, 'OUT', '13:00'), crudo(3, 'IN', '15:00'), crudo(4, VOID, '15:00', 3)];
    const efectivos = fichajesEfectivos(crudos);
    expect(efectivos.map((e) => e.kind)).toEqual(['IN', 'OUT']); // el IN de las 15:00 y el propio VOID fuera
    expect(estaAnulado(3, crudos)).toBe(true);
    expect(estaAnulado(1, crudos)).toBe(false);
  });

  it('sin correcciones, los efectivos son todos los marcajes reales', () => {
    const crudos = [crudo(1, 'IN', '09:00'), crudo(2, 'OUT', '17:00')];
    expect(fichajesEfectivos(crudos)).toHaveLength(2);
  });
});
