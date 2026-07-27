import { Inject, Injectable } from '@nestjs/common';
import { MARCAJE_LABELS, type Marcaje } from '@yorga/contracts';
import { TIME_ENTRY_REPOSITORY, TimeEntryRepository, TimeEntryRow } from './ports';
import { RrhhError } from './rrhh.service';
import {
  estadoActual,
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
}
