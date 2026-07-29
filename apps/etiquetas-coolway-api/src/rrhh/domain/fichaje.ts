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

/** Marcaje meta que ANULA otro fichaje (kind especial, fuera de la máquina de estados de jornada). */
export const VOID = 'VOID';

/** Un fichaje tal como está guardado (incluye anulaciones), antes de calcular los efectivos. */
export interface FichajeCrudo {
  id: number;
  kind: string;
  at: Date;
  correctsId: number | null;
}

/** IDs anulados por un asiento VOID. */
function idsAnulados(crudos: FichajeCrudo[]): Set<number> {
  const anulados = new Set<number>();
  for (const c of crudos) if (c.kind === VOID && c.correctsId != null) anulados.add(c.correctsId);
  return anulados;
}

/**
 * Fichajes **efectivos**: los marcajes reales que quedan tras aplicar las correcciones (se descartan los
 * anulados por un VOID y los propios asientos VOID). Es lo único sobre lo que se computa estado y minutos —
 * así una corrección se refleja sin borrar el original (append-only).
 */
export function fichajesEfectivos(crudos: FichajeCrudo[]): Fichaje[] {
  const anulados = idsAnulados(crudos);
  return crudos
    .filter((c) => c.kind !== VOID && !anulados.has(c.id) && esMarcaje(c.kind))
    .map((c) => ({ kind: c.kind as Marcaje, at: c.at }));
}

/** ¿Está este fichaje anulado por una corrección? (para pintarlo tachado en la revisión de RRHH). */
export function estaAnulado(id: number, crudos: FichajeCrudo[]): boolean {
  return idsAnulados(crudos).has(id);
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

/**
 * Instante en que, colocando un OUT, la jornada del día sumaría exactamente `objetivoMin` minutos trabajados.
 * Sólo tiene sentido con la jornada **abierta** (estado final TRABAJANDO): sirve para "cerrar con la jornada
 * teórica" cuando alguien se dejó el fichaje abierto (p.ej. de un día para otro) y el tiempo real mentiría.
 * Devuelve `null` si no hay un tramo de trabajo abierto. Respeta las pausas: sólo rellena el tramo abierto.
 */
export function instanteCierrePorMinutos(fichajes: Fichaje[], objetivoMin: number): Date | null {
  let estado: EstadoJornada = 'FUERA';
  let inicioTramo: Date | null = null;
  let msCerrados = 0;
  for (const f of ordenados(fichajes)) {
    const siguiente = siguienteEstado(estado, f.kind);
    if (!siguiente) continue;
    if (siguiente === 'TRABAJANDO' && estado !== 'TRABAJANDO') inicioTramo = f.at;
    if (estado === 'TRABAJANDO' && siguiente !== 'TRABAJANDO') {
      if (inicioTramo) msCerrados += f.at.getTime() - inicioTramo.getTime();
      inicioTramo = null;
    }
    estado = siguiente;
  }
  if (estado !== 'TRABAJANDO' || !inicioTramo) return null; // no hay tramo abierto que cerrar
  const minCerrados = Math.round(msCerrados / 60000);
  const restanteMin = Math.max(0, objetivoMin - minCerrados); // lo que falta para el objetivo, en el tramo abierto
  return new Date(inicioTramo.getTime() + restanteMin * 60000);
}

/** Clave de día local (YYYY-MM-DD) del instante — para agrupar la jornada por fecha. */
export function claveDia(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Agrupa fichajes por día local, cada grupo ya ordenado por hora. */
export function agruparPorDia(fichajes: Fichaje[]): Map<string, Fichaje[]> {
  const mapa = new Map<string, Fichaje[]>();
  for (const f of ordenados(fichajes)) {
    const k = claveDia(f.at);
    const arr = mapa.get(k) ?? [];
    arr.push(f);
    mapa.set(k, arr);
  }
  return mapa;
}

/**
 * ¿La jornada de ese día quedó **sin cerrar**? Lo está si, reproducida la secuencia, el estado final NO es
 * FUERA (entró y no salió, o se quedó en pausa). Es la incidencia que el cuadro de mando debe cazar: un día
 * sin cerrar es justo el caso en que el cómputo mentiría si nadie lo revisa.
 */
export function jornadaSinCerrar(fichajesDelDia: Fichaje[]): boolean {
  return estadoActual(fichajesDelDia) !== 'FUERA';
}
