import { Correccion, FichajeError, FichajeService } from '../src/rrhh/application/fichaje.service';
import { TimeEntryRepository, TimeEntryRow } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { PrismaService } from '../src/infrastructure/db/prisma.service';

/** Repo en memoria: registra fichajes con `at = now()` (o el que se pase) y los devuelve por rango. */
function repoMem(): TimeEntryRepository & { filas: TimeEntryRow[] } {
  const filas: TimeEntryRow[] = [];
  let seq = 1;
  return {
    filas,
    add: async (e) => {
      const fila: TimeEntryRow = {
        id: seq++,
        employeeId: e.employeeId,
        kind: e.kind,
        at: e.at ?? new Date(),
        source: e.source,
        note: e.note ?? null,
        actorEmail: e.actorEmail ?? null,
        correctsId: e.correctsId ?? null,
      };
      filas.push(fila);
      return fila;
    },
    findById: async (id) => filas.find((r) => r.id === id) ?? null,
    listBetween: async (employeeId, desde, hasta) =>
      filas.filter((r) => r.employeeId === employeeId && r.at >= desde && r.at < hasta).sort((a, b) => a.at.getTime() - b.at.getTime()),
    listBetweenMany: async (ids, desde, hasta) =>
      filas.filter((r) => ids.includes(r.employeeId) && r.at >= desde && r.at < hasta).sort((a, b) => a.at.getTime() - b.at.getTime()),
  };
}

/** Prisma de mentira: ejecuta el callback de la transacción sin BD. */
const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as unknown as PrismaService;

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

/** Construye el servicio con recorder espía; devuelve ambos. */
function nuevoServicio(repo: TimeEntryRepository) {
  const { recorder, registros } = recorderSpy();
  return { svc: new FichajeService(repo, recorder, db), registros };
}

const actor = { email: 'rrhh@y.com' };

/** Siembra una fila con hora concreta (para panel/histórico de días pasados). Devuelve su id. */
function sembrar(repo: ReturnType<typeof repoMem>, employeeId: number, kind: string, at: Date): number {
  const id = repo.filas.length + 1;
  repo.filas.push({ id, employeeId, kind, at, source: 'WEB', note: null, actorEmail: null, correctsId: null });
  return id;
}
function conDia(offsetDias: number, hhmm: string): Date {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offsetDias);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

describe('FichajeService', () => {
  it('un ciclo entrar → pausa → volver → salir deja el estado FUERA y 4 fichajes', async () => {
    const svc = new FichajeService(repoMem(), recorderSpy().recorder, db);
    await svc.fichar(1, 'IN');
    await svc.fichar(1, 'BREAK_START');
    await svc.fichar(1, 'BREAK_END');
    const j = await svc.fichar(1, 'OUT');
    expect(j.estado).toBe('FUERA');
    expect(j.fichajes).toHaveLength(4);
    expect(j.posibles).toEqual(['IN']);
  });

  it('RECHAZA una transición imposible (salir sin haber entrado)', async () => {
    const svc = new FichajeService(repoMem(), recorderSpy().recorder, db);
    await expect(svc.fichar(1, 'OUT')).rejects.toBeInstanceOf(FichajeError);
  });

  it('RECHAZA entrar dos veces seguidas', async () => {
    const svc = new FichajeService(repoMem(), recorderSpy().recorder, db);
    await svc.fichar(1, 'IN');
    await expect(svc.fichar(1, 'IN')).rejects.toBeInstanceOf(FichajeError);
  });

  it('los fichajes de otro empleado no cruzan (aislamiento por empleado)', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo, recorderSpy().recorder, db);
    await svc.fichar(1, 'IN');
    // El empleado 2 no ha entrado: su jornada está FUERA y no puede salir.
    const j2 = await svc.jornadaHoy(2);
    expect(j2.estado).toBe('FUERA');
    await expect(svc.fichar(2, 'OUT')).rejects.toBeInstanceOf(FichajeError);
  });

  it('jornadaHoy sin fichajes: FUERA, 0 minutos, sólo puede entrar', async () => {
    const svc = new FichajeService(repoMem(), recorderSpy().recorder, db);
    const j = await svc.jornadaHoy(1);
    expect(j.estado).toBe('FUERA');
    expect(j.minutosTrabajados).toBe(0);
    expect(j.posibles).toEqual(['IN']);
  });
});

describe('FichajeService · cuadro de mando', () => {
  it('lista quién está fichado ahora y caza las jornadas de días pasados sin cerrar', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo, recorderSpy().recorder, db);
    // Empleado 1: entró hoy y sigue dentro → aparece en "ahora".
    sembrar(repo, 1, 'IN', conDia(0, '09:00'));
    // Empleado 2: ayer entró y NO salió → incidencia.
    sembrar(repo, 2, 'IN', conDia(1, '09:00'));
    // Empleado 3: anteayer cerró bien → ni "ahora" ni incidencia.
    sembrar(repo, 3, 'IN', conDia(2, '09:00'));
    sembrar(repo, 3, 'OUT', conDia(2, '17:00'));

    const panel = await svc.panel([
      { id: 1, fullName: 'Uno' },
      { id: 2, fullName: 'Dos' },
      { id: 3, fullName: 'Tres' },
    ]);
    expect(panel.ahora.map((a) => a.employeeId)).toEqual([1]);
    expect(panel.ahora[0].estado).toBe('TRABAJANDO');
    expect(panel.incidencias.map((i) => i.employeeId)).toEqual([2]);
  });

  it('sin empleados visibles, el panel viene vacío', async () => {
    const panel = await new FichajeService(repoMem(), recorderSpy().recorder, db).panel([]);
    expect(panel).toEqual({ ahora: [], incidencias: [] });
  });
});

describe('FichajeService · histórico', () => {
  it('agrupa por día y computa los minutos de cada jornada, más reciente primero', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo, recorderSpy().recorder, db);
    sembrar(repo, 1, 'IN', conDia(2, '09:00'));
    sembrar(repo, 1, 'OUT', conDia(2, '13:00')); // 240 min
    sembrar(repo, 1, 'IN', conDia(1, '09:00'));
    sembrar(repo, 1, 'OUT', conDia(1, '12:00')); // 180 min
    const desde = conDia(5, '00:00');
    const hasta = conDia(0, '00:00');
    const dias = await svc.historico(1, desde, hasta);
    expect(dias).toHaveLength(2);
    expect(dias[0].fecha > dias[1].fecha).toBe(true); // orden descendente
    expect(dias.find((d) => d.fecha === dias[0].fecha)!.minutosTrabajados).toBe(180); // el más reciente (ayer)
    expect(dias[1].minutosTrabajados).toBe(240);
  });

  it('con jornada teórica, marca las horas extra del día (exceso sobre la diaria)', async () => {
    const repo = repoMem();
    const { svc } = nuevoServicio(repo);
    sembrar(repo, 1, 'IN', conDia(1, '08:00'));
    sembrar(repo, 1, 'OUT', conDia(1, '18:00')); // 600 min = 10 h
    const dias = await svc.historico(1, conDia(3, '00:00'), conDia(0, '00:00'), 2400); // teórica 8 h/día
    expect(dias[0].minutosTrabajados).toBe(600);
    expect(dias[0].minutosExtra).toBe(120); // 2 h de más
  });

  it('sin jornada teórica (null), no hay horas extra', async () => {
    const repo = repoMem();
    const { svc } = nuevoServicio(repo);
    sembrar(repo, 1, 'IN', conDia(1, '08:00'));
    sembrar(repo, 1, 'OUT', conDia(1, '20:00'));
    const dias = await svc.historico(1, conDia(3, '00:00'), conDia(0, '00:00'));
    expect(dias[0].minutosExtra).toBe(0);
  });
});

describe('FichajeService · corrección con traza', () => {
  it('AÑADIR un OUT que faltó cierra la jornada y queda auditado', async () => {
    const repo = repoMem();
    const { svc, registros } = nuevoServicio(repo);
    sembrar(repo, 1, 'IN', conDia(1, '09:00')); // ayer entró y no salió → incidencia
    const correccion: Correccion = { action: 'ADD', kind: 'OUT', at: conDia(1, '17:00'), note: 'Olvidó salir' };
    const dia = await svc.corregir(1, correccion, actor);
    expect(dia.minutosTrabajados).toBe(480); // 09:00→17:00
    expect(dia.entradas).toHaveLength(2);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'FICHAJE', actorEmail: 'rrhh@y.com' });
  });

  it('ANULAR un marcaje erróneo lo saca del cómputo pero NO lo borra (append-only + traza)', async () => {
    const repo = repoMem();
    const { svc, registros } = nuevoServicio(repo);
    sembrar(repo, 1, 'IN', conDia(1, '09:00'));
    sembrar(repo, 1, 'OUT', conDia(1, '13:00'));
    const idErroneo = sembrar(repo, 1, 'IN', conDia(1, '15:00')); // entrada fantasma que reabre la jornada
    // Sin corregir: la jornada quedaría reabierta (sin cerrar). La anulamos.
    const dia = await svc.corregir(1, { action: 'VOID', targetId: idErroneo, note: 'Fichaje por error' }, actor);
    expect(dia.minutosTrabajados).toBe(240); // sólo 09:00→13:00; la entrada anulada no cuenta
    expect(dia.entradas.find((e) => e.row.id === idErroneo)!.anulado).toBe(true); // sigue ahí, tachado
    expect(repo.filas).toHaveLength(4); // original + VOID: nada se borró
    expect(registros[0]).toMatchObject({ action: 'DELETE', entity: 'FICHAJE' });
  });

  it('rechaza ADD sin hora/kind válido, y VOID de un fichaje ajeno o inexistente', async () => {
    const repo = repoMem();
    const { svc } = nuevoServicio(repo);
    const idOtro = sembrar(repo, 99, 'IN', conDia(1, '09:00')); // de otro empleado
    await expect(svc.corregir(1, { action: 'ADD', kind: 'OUT' }, actor)).rejects.toBeInstanceOf(FichajeError); // sin at
    await expect(svc.corregir(1, { action: 'VOID', targetId: idOtro }, actor)).rejects.toBeInstanceOf(FichajeError); // ajeno
    await expect(svc.corregir(1, { action: 'VOID', targetId: 9999 }, actor)).rejects.toBeInstanceOf(FichajeError); // inexistente
  });
});
