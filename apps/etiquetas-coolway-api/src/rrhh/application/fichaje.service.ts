import { Inject, Injectable } from '@nestjs/common';
import { MARCAJE_LABELS, type Marcaje } from '@yorga/contracts';
import { TIME_ENTRY_REPOSITORY, TimeEntryRepository, TimeEntryRow } from './ports';
import { RrhhError } from './rrhh.service';
import {
  agruparPorDia,
  claveDia,
  estadoActual,
  jornadaSinCerrar,
  marcajesPosibles,
  minutosTrabajados,
  siguienteEstado,
  type EstadoJornada,
  type Fichaje,
} from '../domain/fichaje';

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
  fichajes: TimeEntryRow[];
}

const toFichaje = (e: TimeEntryRow): Fichaje => ({ kind: e.kind as Marcaje, at: e.at });

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
  constructor(@Inject(TIME_ENTRY_REPOSITORY) private readonly repo: TimeEntryRepository) {}

  async fichar(employeeId: number, kind: Marcaje, source: 'WEB' | 'MOBILE' = 'WEB'): Promise<Jornada> {
    const { desde, hasta } = rangoDiaDe(new Date());
    const hoy = await this.repo.listBetween(employeeId, desde, hasta);
    const estado = estadoActual(hoy.map(toFichaje));
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
    const estado = estadoActual(fichajes.map(toFichaje));
    return {
      fecha: desde,
      estado,
      posibles: marcajesPosibles(estado),
      minutosTrabajados: minutosTrabajados(fichajes.map(toFichaje), ahora),
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
    const porEmp = new Map<number, Fichaje[]>();
    for (const r of rows) {
      const arr = porEmp.get(r.employeeId) ?? [];
      arr.push(toFichaje(r));
      porEmp.set(r.employeeId, arr);
    }

    const panel: Panel = { ahora: [], incidencias: [] };
    for (const e of empleados) {
      const suyos = porEmp.get(e.id) ?? [];
      const hoy = suyos.filter((f) => f.at >= hoy0);
      const estado = estadoActual(hoy);
      if (estado !== 'FUERA') {
        panel.ahora.push({ employeeId: e.id, fullName: e.fullName, estado, minutosTrabajados: minutosTrabajados(hoy, ahora) });
      }
      const anteriores = suyos.filter((f) => f.at < hoy0);
      for (const [fecha, delDia] of agruparPorDia(anteriores)) {
        if (jornadaSinCerrar(delDia)) panel.incidencias.push({ employeeId: e.id, fullName: e.fullName, fecha });
      }
    }
    return panel;
  }

  /** Histórico personal en `[desde, hasta)`, agrupado por día (minutos trabajados + marcajes), más reciente primero. */
  async historico(employeeId: number, desde: Date, hasta: Date): Promise<DiaJornada[]> {
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
      // El día ya cerrado: se computa hasta su último marcaje (no hasta "ahora").
      const ultimo = filas.reduce((max, r) => (r.at > max ? r.at : max), filas[0].at);
      dias.push({ fecha, minutosTrabajados: minutosTrabajados(filas.map(toFichaje), ultimo), fichajes: filas });
    }
    return dias.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
}
