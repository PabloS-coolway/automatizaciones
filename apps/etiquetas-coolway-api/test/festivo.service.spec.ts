import { FestivoService } from '../src/rrhh/application/festivo.service';
import { HolidayRepository, HolidayRow } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { RrhhError } from '../src/rrhh/application/rrhh.service';

const actor = { email: 'rrhh@y.com' };

/** Repo de festivos en memoria. La unicidad es por (fecha ISO, centerId). */
function repoFake(): HolidayRepository & { filas: HolidayRow[] } {
  const filas: HolidayRow[] = [];
  let seq = 1;
  const key = (d: Date, c: number | null) => `${d.toISOString().slice(0, 10)}|${c ?? 'G'}`;
  return {
    filas,
    listBetween: async () => filas,
    exists: async (date, centerId) => filas.some((f) => key(f.date, f.centerId) === key(date, centerId)),
    create: async ({ date, name, centerId }) => {
      const fila: HolidayRow = { id: seq++, date, name, centerId, centerName: centerId ? `Centro ${centerId}` : null };
      filas.push(fila);
      return fila;
    },
    delete: async (id) => { const i = filas.findIndex((f) => f.id === id); if (i >= 0) filas.splice(i, 1); },
    findById: async (id) => filas.find((f) => f.id === id) ?? null,
  };
}

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

describe('FestivoService · crear', () => {
  it('crea un festivo global y lo audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new FestivoService(repoFake(), recorder);
    const f = await svc.crear({ date: '2026-01-01', name: 'Año Nuevo' }, actor);
    expect(f.name).toBe('Año Nuevo');
    expect(f.centerId).toBeNull();
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'FESTIVO' });
  });

  it('rechaza fecha con formato inválido', async () => {
    const svc = new FestivoService(repoFake(), recorderSpy().recorder);
    await expect(svc.crear({ date: '01/01/2026', name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza nombre vacío', async () => {
    const svc = new FestivoService(repoFake(), recorderSpy().recorder);
    await expect(svc.crear({ date: '2026-01-01', name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('no duplica un festivo en la misma fecha y ámbito', async () => {
    const svc = new FestivoService(repoFake(), recorderSpy().recorder);
    await svc.crear({ date: '2026-01-06', name: 'Reyes' }, actor);
    await expect(svc.crear({ date: '2026-01-06', name: 'Reyes otra vez' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('el MISMO día puede ser festivo en dos centros distintos (y global aparte)', async () => {
    const svc = new FestivoService(repoFake(), recorderSpy().recorder);
    await svc.crear({ date: '2026-03-19', name: 'San José', centerId: 1 }, actor);
    await svc.crear({ date: '2026-03-19', name: 'San José', centerId: 2 }, actor);
    await svc.crear({ date: '2026-03-19', name: 'San José (global)', centerId: null }, actor);
    // Ninguno choca porque el ámbito (centro) es distinto.
  });
});

describe('FestivoService · crearBulk', () => {
  it('crea los válidos, salta duplicados y erróneos, y devuelve el detalle', async () => {
    const repo = repoFake();
    const svc = new FestivoService(repo, recorderSpy().recorder);
    await svc.crear({ date: '2026-01-01', name: 'Año Nuevo' }, actor); // ya existe
    const r = await svc.crearBulk({
      festivos: [
        { date: '2026-01-01', name: 'Año Nuevo' }, // duplicado → saltado
        { date: '2026-01-06', name: 'Reyes' }, // ok
        { date: 'mal', name: 'Basura' }, // inválido → saltado
        { date: '2026-05-01', name: '' }, // sin nombre → saltado
        { date: '2026-12-25', name: 'Navidad' }, // ok
      ],
    }, actor);
    expect(r.creados).toBe(2);
    expect(r.saltados).toHaveLength(3);
    expect(repo.filas.some((f) => f.name === 'Reyes')).toBe(true);
  });
});

describe('FestivoService · borrar', () => {
  it('borra un festivo existente y lo audita', async () => {
    const repo = repoFake();
    const { recorder, registros } = recorderSpy();
    const svc = new FestivoService(repo, recorder);
    const f = await svc.crear({ date: '2026-01-01', name: 'Año Nuevo' }, actor);
    await svc.borrar(f.id, actor);
    expect(repo.filas).toHaveLength(0);
    expect(registros.some((r) => r.entity === 'FESTIVO' && r.action === 'DELETE')).toBe(true);
  });

  it('rechaza borrar uno inexistente', async () => {
    const svc = new FestivoService(repoFake(), recorderSpy().recorder);
    await expect(svc.borrar(999, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});
