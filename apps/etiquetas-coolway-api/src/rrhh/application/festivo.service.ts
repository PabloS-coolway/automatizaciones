import { Inject, Injectable } from '@nestjs/common';
import { CreateHolidayDto, CreateHolidaysBulkDto, HolidaysBulkResultDto } from '@yorga/contracts';
import { HOLIDAY_REPOSITORY, HolidayRepository, HolidayRow } from './ports';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { RrhhActor, RrhhError } from './rrhh.service';

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → Date (sólo día, UTC). Lanza si el formato no es válido. */
function parseDia(s: string): Date {
  if (!RE_DIA.test(String(s))) throw new RrhhError(`Fecha inválida "${s}" (usa YYYY-MM-DD).`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new RrhhError(`Fecha inválida "${s}".`);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * REQ-008 · Festivos por centro (o globales). Son **informativos**: las vacaciones se cuentan en días
 * naturales, así que un festivo no descuenta saldo; se pintan en el calendario y ayudan a coordinar. Un
 * festivo se identifica por (fecha, centro): no se duplica. Todo alta/baja queda auditada.
 */
@Injectable()
export class FestivoService {
  constructor(
    @Inject(HOLIDAY_REPOSITORY) private readonly repo: HolidayRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
  ) {}

  listBetween(desde: Date, hasta: Date, centerId?: number | null): Promise<HolidayRow[]> {
    return this.repo.listBetween(desde, hasta, centerId);
  }

  /** Festivos de un año completo (opcionalmente acotados a un centro + globales). */
  listAnio(year: number, centerId?: number | null): Promise<HolidayRow[]> {
    return this.repo.listBetween(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31)), centerId);
  }

  async crear(dto: CreateHolidayDto, actor: RrhhActor): Promise<HolidayRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El festivo necesita un nombre.');
    const date = parseDia(dto.date);
    const centerId = dto.centerId ?? null;
    if (await this.repo.exists(date, centerId)) {
      throw new RrhhError(`Ya hay un festivo el ${iso(date)}${centerId ? ' en ese centro' : ' (global)'}.`);
    }
    const creado = await this.repo.create({ date, name, centerId });
    await this.actividad.record({
      actorEmail: actor.email,
      action: 'CREATE',
      entity: 'FESTIVO',
      entityId: String(creado.id),
      after: creado,
      summary: `Añadió el festivo "${name}" del ${iso(date)}${creado.centerName ? ` (${creado.centerName})` : ' (global)'}`,
    });
    return creado;
  }

  /** Alta masiva: crea los válidos, salta los duplicados/erróneos y devuelve el detalle. */
  async crearBulk(dto: CreateHolidaysBulkDto, actor: RrhhActor): Promise<HolidaysBulkResultDto> {
    const centerId = dto.centerId ?? null;
    const saltados: { date: string; motivo: string }[] = [];
    let creados = 0;
    for (const f of dto.festivos ?? []) {
      const name = String(f.name ?? '').trim();
      try {
        if (!name) throw new RrhhError('sin nombre');
        const date = parseDia(f.date);
        if (await this.repo.exists(date, centerId)) {
          saltados.push({ date: f.date, motivo: 'ya existía' });
          continue;
        }
        await this.repo.create({ date, name, centerId });
        creados++;
      } catch (e) {
        saltados.push({ date: f.date, motivo: e instanceof RrhhError ? e.message : 'inválido' });
      }
    }
    if (creados > 0) {
      await this.actividad.record({
        actorEmail: actor.email,
        action: 'CREATE',
        entity: 'FESTIVO',
        entityId: 'bulk',
        summary: `Cargó ${creados} festivo(s)${centerId ? ' de un centro' : ' globales'}${saltados.length ? ` (saltó ${saltados.length})` : ''}`,
      });
    }
    return { creados, saltados };
  }

  async borrar(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new RrhhError(`No existe el festivo #${id}.`);
    await this.repo.delete(id);
    await this.actividad.record({
      actorEmail: actor.email,
      action: 'DELETE',
      entity: 'FESTIVO',
      entityId: String(id),
      before: actual,
      summary: `Borró el festivo "${actual.name}" del ${iso(actual.date)}`,
    });
  }
}
