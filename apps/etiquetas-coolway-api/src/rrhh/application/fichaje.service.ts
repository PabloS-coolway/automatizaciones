import { Inject, Injectable } from '@nestjs/common';
import { MARCAJE_LABELS, type Marcaje } from '@yorga/contracts';
import { TIME_ENTRY_REPOSITORY, TimeEntryRepository, TimeEntryRow } from './ports';
import { RrhhError } from './rrhh.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { PrismaService } from '../../infrastructure/db/prisma.service';
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
  type EstadoJornada,
  type Fichaje,
  type FichajeCrudo,
} from '../domain/fichaje';
import { minutosExtra } from '../domain/horario';

/** Error de fichaje (transición imposible). Extiende RrhhError → el controller lo traduce a 400. */
export class FichajeError extends RrhhError {}

const ESTADO_HUMANO: Record<EstadoJornada, string> = {
  FUERA: 'fuera de jornada',
  TRABAJANDO: 'trabajando',
  EN_PAUSA: 'en pausa',
};

/** "Mi jornada de hoy": estado + marcajes posibles + fichajes del día + minutos trabajados. */
export interface Jornada {
  fecha: Date;
  estado: EstadoJornada;
  posibles: Marcaje[];
  minutosTrabajados: number;
  fichajes: TimeEntryRow[];
}

/** Empleado (id + nombre) para acotar el cuadro de mando a la rama visible. */
export interface EmpleadoBasico {
  id: number;
  fullName: string;
}

export interface Panel {
  ahora: { employeeId: number; fullName: string; estado: EstadoJornada; minutosTrabajados: number }[];
  incidencias: { employeeId: number; fullName: string; fecha: string }[];
}

export interface DiaJornada {
  fecha: string;
  minutosTrabajados: number;
  minutosExtra: number;
  fichajes: TimeEntryRow[];
}

/** Detalle de un día para la revisión de RRHH: cada marcaje con si está anulado, + minutos efectivos. */
export interface DiaDetalle {
  fecha: string;
  minutosTrabajados: number;
  entradas: { row: TimeEntryRow; anulado: boolean }[];
}

/** Parámetros de una corrección: añadir un marcaje que faltó, o anular uno erróneo. */
export interface Correccion {
  action: 'ADD' | 'VOID';
  kind?: string;
  at?: Date;
  targetId?: number;
  note?: string;
}

const toCrudo = (e: TimeEntryRow): FichajeCrudo => ({ id: e.id, kind: e.kind, at: e.at, correctsId: e.correctsId });

/** Último instante de una lista de fichajes efectivos (para computar un día ya cerrado), o `porDefecto`. */
function ultimoInstante(efectivos: Fichaje[], porDefecto: Date): Date {
  return efectivos.reduce((max, f) => (f.at > max ? f.at : max), porDefecto);
}

/** Ventana [00:00, 24:00) del día de `d` en hora local del servidor. */
function rangoDiaDe(d: Date): { desde: Date; hasta: Date } {
  const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);
  return { desde, hasta };
}

/**
 * REQ-008 Fase 2 (Slice 1) · Fichaje de jornada. La hora la pone el SERVIDOR. Antes de registrar, valida contra
 * el estado actual (reconstruido de los fichajes del día): no se puede entrar dos veces ni salir sin haber
 * entrado — así el registro no miente. Solo-añadir: nada se edita ni se borra.
 */
@Injectable()
export class FichajeService {
  constructor(
    @Inject(TIME_ENTRY_REPOSITORY) private readonly repo: TimeEntryRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  async fichar(employeeId: number, kind: Marcaje, source: 'WEB' | 'MOBILE' = 'WEB'): Promise<Jornada> {
    const { desde, hasta } = rangoDiaDe(new Date());
    const hoy = await this.repo.listBetween(employeeId, desde, hasta);
    const estado = estadoActual(fichajesEfectivos(hoy.map(toCrudo)));
    if (!siguienteEstado(estado, kind)) {
      throw new FichajeError(`No puedes «${MARCAJE_LABELS[kind]}» ahora mismo: estás ${ESTADO_HUMANO[estado]}.`);
    }
    await this.repo.add({ employeeId, kind, source });
    return this.jornadaHoy(employeeId);
  }

  async jornadaHoy(employeeId: number): Promise<Jornada> {
    const ahora = new Date();
    const { desde, hasta } = rangoDiaDe(ahora);
    const fichajes = await this.repo.listBetween(employeeId, desde, hasta);
    const efectivos = fichajesEfectivos(fichajes.map(toCrudo));
    const estado = estadoActual(efectivos);
    return {
      fecha: desde,
      estado,
      posibles: marcajesPosibles(estado),
      minutosTrabajados: minutosTrabajados(efectivos, ahora),
      fichajes,
    };
  }

  /**
   * Cuadro de mando acotado a `empleados` (la rama que ve quien pregunta): quién está fichado **ahora** (estado
   * ≠ FUERA hoy) y qué **jornadas de días anteriores quedaron sin cerrar** (últimos 7 días). Una sola consulta.
   */
  async panel(empleados: EmpleadoBasico[]): Promise<Panel> {
    const ahora = new Date();
    const { desde: hoy0, hasta: mañana0 } = rangoDiaDe(ahora);
    const desde7 = new Date(hoy0);
    desde7.setDate(desde7.getDate() - 7);

    const ids = empleados.map((e) => e.id);
    const rows = await this.repo.listBetweenMany(ids, desde7, mañana0);
    const porEmp = new Map<number, FichajeCrudo[]>();
    for (const r of rows) {
      const arr = porEmp.get(r.employeeId) ?? [];
      arr.push(toCrudo(r));
      porEmp.set(r.employeeId, arr);
    }

    const panel: Panel = { ahora: [], incidencias: [] };
    for (const e of empleados) {
      const suyos = porEmp.get(e.id) ?? [];
      const hoy = fichajesEfectivos(suyos.filter((c) => c.at >= hoy0));
      const estado = estadoActual(hoy);
      if (estado !== 'FUERA') {
        panel.ahora.push({ employeeId: e.id, fullName: e.fullName, estado, minutosTrabajados: minutosTrabajados(hoy, ahora) });
      }
      // Días anteriores: agrupar los efectivos por día y ver cuáles no cerraron.
      const anteriores = fichajesEfectivos(suyos.filter((c) => c.at < hoy0));
      for (const [fecha, delDia] of agruparPorDia(anteriores)) {
        if (jornadaSinCerrar(delDia)) panel.incidencias.push({ employeeId: e.id, fullName: e.fullName, fecha });
      }
    }
    return panel;
  }

  /**
   * Histórico personal en `[desde, hasta)`, agrupado por día (minutos trabajados + horas extra + marcajes),
   * más reciente primero. `weeklyMinutes` es la jornada teórica semanal del empleado (para las extras).
   */
  async historico(employeeId: number, desde: Date, hasta: Date, weeklyMinutes: number | null = null): Promise<DiaJornada[]> {
    const rows = await this.repo.listBetween(employeeId, desde, hasta);
    const porFila = new Map<string, TimeEntryRow[]>();
    for (const r of rows) {
      const k = claveDia(r.at);
      const arr = porFila.get(k) ?? [];
      arr.push(r);
      porFila.set(k, arr);
    }
    const dias: DiaJornada[] = [];
    for (const [fecha, filas] of porFila) {
      const efectivos = fichajesEfectivos(filas.map(toCrudo));
      // El día ya cerrado: se computa hasta su último marcaje EFECTIVO (no hasta "ahora").
      const ultimo = ultimoInstante(efectivos, filas[0].at);
      const trabajados = minutosTrabajados(efectivos, ultimo);
      dias.push({ fecha, minutosTrabajados: trabajados, minutosExtra: minutosExtra(trabajados, weeklyMinutes), fichajes: filas });
    }
    return dias.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /** Detalle de un día para revisión/corrección: cada marcaje (con si está anulado) + minutos efectivos. */
  async diaDetalle(employeeId: number, fecha: Date): Promise<DiaDetalle> {
    const { desde, hasta } = rangoDiaDe(fecha);
    const rows = await this.repo.listBetween(employeeId, desde, hasta);
    const crudos = rows.map(toCrudo);
    const efectivos = fichajesEfectivos(crudos);
    return {
      fecha: claveDia(desde),
      minutosTrabajados: minutosTrabajados(efectivos, ultimoInstante(efectivos, desde)),
      entradas: rows.map((row) => ({ row, anulado: estaAnulado(row.id, crudos) })),
    };
  }

  /**
   * Corrección de fichajes **con traza** (solo RRHH). Append-only: no se edita ni se borra el original. **ADD**
   * inserta un marcaje que faltó; **VOID** inserta un asiento que ANULA uno erróneo (referenciándolo). Todo
   * queda en el log de RRHH, en la misma transacción. Devuelve el día afectado ya recomputado.
   */
  async corregir(employeeId: number, c: Correccion, actor: { email: string }): Promise<DiaDetalle> {
    if (c.action === 'ADD') {
      if (!c.kind || !esMarcaje(c.kind)) throw new FichajeError(`Marcaje no válido para la corrección: "${c.kind}".`);
      if (!c.at || Number.isNaN(c.at.getTime())) throw new FichajeError('Falta la hora del marcaje a añadir.');
      const at = c.at;
      await this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.add({ employeeId, kind: c.kind!, source: 'CORRECTION', at, actorEmail: actor.email, note: c.note }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'FICHAJE', entityId: String(creado.id), after: creado, summary: `Añadió el marcaje «${MARCAJE_LABELS[c.kind as Marcaje]}» del ${claveDia(at)}` },
          tx,
        );
      });
      return this.diaDetalle(employeeId, at);
    }

    // VOID
    if (!c.targetId) throw new FichajeError('Falta el fichaje a anular.');
    const target = await this.repo.findById(c.targetId);
    if (!target || target.employeeId !== employeeId) throw new FichajeError('Ese fichaje no existe o no es de ese empleado.');
    if (target.kind === VOID) throw new FichajeError('No se puede anular un asiento de anulación.');
    await this.prisma.$transaction(async (tx) => {
      const anulacion = await this.repo.add(
        { employeeId, kind: VOID, source: 'CORRECTION', at: target.at, actorEmail: actor.email, note: c.note, correctsId: target.id },
        tx,
      );
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'FICHAJE', entityId: String(target.id), before: target, after: anulacion, summary: `Anuló el marcaje «${MARCAJE_LABELS[target.kind as Marcaje] ?? target.kind}» del ${claveDia(target.at)}` },
        tx,
      );
    });
    return this.diaDetalle(employeeId, target.at);
  }
}
