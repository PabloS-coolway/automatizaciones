/**
 * REQ-008 Fase 2 (Slice 1) · Fichaje de jornada — máquina de estados y cómputo, **puros**.
 *
 * El registro de fichajes es **solo-añadir**: la verdad es la secuencia de marcajes. De ella se derivan el
 * estado actual y los minutos trabajados. Es la regla sensible del módulo (si dejara marcar dos entradas
 * seguidas, el cómputo mentiría), así que vive aislada, testeada, sin BD ni framework.
 */

export const MARCAJES = ['IN', 'OUT', 'BREAK_START', 'BREAK_END'] as const;
export type Marcaje = (typeof MARCAJES)[number];

export const ESTADOS = ['FUERA', 'TRABAJANDO', 'EN_PAUSA'] as const;
export type EstadoJornada = (typeof ESTADOS)[number];

export function esMarcaje(x: string): x is Marcaje {
  return (MARCAJES as readonly string[]).includes(x);
}

/** Un marcaje ya ocurrido: su tipo y su instante (del servidor). */
export interface Fichaje {
  kind: Marcaje;
  at: Date;
}

/**
 * Transiciones VÁLIDAS. Lo que no esté aquí se rechaza (no se puede entrar dos veces, ni salir sin haber
 * entrado, ni empezar una pausa fuera de la jornada). Es lo que impide que el registro mienta.
 */
const TRANSICIONES: Record<EstadoJornada, Partial<Record<Marcaje, EstadoJornada>>> = {
  FUERA: { IN: 'TRABAJANDO' },
  TRABAJANDO: { OUT: 'FUERA', BREAK_START: 'EN_PAUSA' },
  EN_PAUSA: { BREAK_END: 'TRABAJANDO', OUT: 'FUERA' }, // se puede cerrar la jornada desde la pausa
};

/** Estado tras aplicar `marcaje` a `estado`, o `null` si esa transición no es válida. */
export function siguienteEstado(estado: EstadoJornada, marcaje: Marcaje): EstadoJornada | null {
  return TRANSICIONES[estado][marcaje] ?? null;
}

/** Marcajes que se pueden hacer ahora mismo desde `estado` (para pintar los botones). */
export function marcajesPosibles(estado: EstadoJornada): Marcaje[] {
  return MARCAJES.filter((m) => siguienteEstado(estado, m) !== null);
}

/** Estado actual reproduciendo la secuencia de fichajes (ordenada por hora). Ignora marcajes imposibles. */
export function estadoActual(fichajes: Fichaje[]): EstadoJornada {
  let estado: EstadoJornada = 'FUERA';
  for (const f of ordenados(fichajes)) {
    const siguiente = siguienteEstado(estado, f.kind);
    if (siguiente) estado = siguiente;
  }
  return estado;
}

/**
 * Minutos trabajados según la secuencia: suma los tramos entre una entrada/fin-de-pausa y el siguiente
 * fin-de-tramo (pausa o salida). Si la jornada sigue abierta (TRABAJANDO), cuenta hasta `ahora`. La pausa
 * NO computa. Robusto ante marcajes imposibles (los salta, igual que `estadoActual`).
 */
export function minutosTrabajados(fichajes: Fichaje[], ahora: Date): number {
  let estado: EstadoJornada = 'FUERA';
  let inicioTramo: Date | null = null;
  let ms = 0;

  for (const f of ordenados(fichajes)) {
    const siguiente = siguienteEstado(estado, f.kind);
    if (!siguiente) continue;
    if (siguiente === 'TRABAJANDO' && estado !== 'TRABAJANDO') inicioTramo = f.at; // empieza a contar
    if (estado === 'TRABAJANDO' && siguiente !== 'TRABAJANDO') {
      if (inicioTramo) ms += f.at.getTime() - inicioTramo.getTime(); // cierra el tramo
      inicioTramo = null;
    }
    estado = siguiente;
  }
  if (estado === 'TRABAJANDO' && inicioTramo) ms += ahora.getTime() - inicioTramo.getTime(); // tramo abierto

  return Math.max(0, Math.round(ms / 60000));
}

function ordenados(fichajes: Fichaje[]): Fichaje[] {
  return [...fichajes].sort((a, b) => a.at.getTime() - b.at.getTime());
}
