import { FichajeError, FichajeService } from '../src/rrhh/application/fichaje.service';
import { TimeEntryRepository, TimeEntryRow } from '../src/rrhh/application/ports';

/** Repo en memoria: registra fichajes con `at = now()` (o el que se pase) y los devuelve por rango. */
function repoMem(): TimeEntryRepository & { filas: TimeEntryRow[] } {
  const filas: TimeEntryRow[] = [];
  let seq = 1;
  return {
    filas,
    add: async (e) => {
      const fila: TimeEntryRow = { id: seq++, employeeId: e.employeeId, kind: e.kind, at: e.at ?? new Date(), source: e.source, note: e.note ?? null };
      filas.push(fila);
      return fila;
    },
    listBetween: async (employeeId, desde, hasta) =>
      filas.filter((r) => r.employeeId === employeeId && r.at >= desde && r.at < hasta).sort((a, b) => a.at.getTime() - b.at.getTime()),
    listBetweenMany: async (ids, desde, hasta) =>
      filas.filter((r) => ids.includes(r.employeeId) && r.at >= desde && r.at < hasta).sort((a, b) => a.at.getTime() - b.at.getTime()),
  };
}

/** Siembra una fila con hora concreta (para panel/histórico de días pasados). */
function sembrar(repo: ReturnType<typeof repoMem>, employeeId: number, kind: string, at: Date): void {
  repo.filas.push({ id: repo.filas.length + 1, employeeId, kind, at, source: 'WEB', note: null });
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
    const svc = new FichajeService(repoMem());
    await svc.fichar(1, 'IN');
    await svc.fichar(1, 'BREAK_START');
    await svc.fichar(1, 'BREAK_END');
    const j = await svc.fichar(1, 'OUT');
    expect(j.estado).toBe('FUERA');
    expect(j.fichajes).toHaveLength(4);
    expect(j.posibles).toEqual(['IN']);
  });

  it('RECHAZA una transición imposible (salir sin haber entrado)', async () => {
    const svc = new FichajeService(repoMem());
    await expect(svc.fichar(1, 'OUT')).rejects.toBeInstanceOf(FichajeError);
  });

  it('RECHAZA entrar dos veces seguidas', async () => {
    const svc = new FichajeService(repoMem());
    await svc.fichar(1, 'IN');
    await expect(svc.fichar(1, 'IN')).rejects.toBeInstanceOf(FichajeError);
  });

  it('los fichajes de otro empleado no cruzan (aislamiento por empleado)', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo);
    await svc.fichar(1, 'IN');
    // El empleado 2 no ha entrado: su jornada está FUERA y no puede salir.
    const j2 = await svc.jornadaHoy(2);
    expect(j2.estado).toBe('FUERA');
    await expect(svc.fichar(2, 'OUT')).rejects.toBeInstanceOf(FichajeError);
  });

  it('jornadaHoy sin fichajes: FUERA, 0 minutos, sólo puede entrar', async () => {
    const svc = new FichajeService(repoMem());
    const j = await svc.jornadaHoy(1);
    expect(j.estado).toBe('FUERA');
    expect(j.minutosTrabajados).toBe(0);
    expect(j.posibles).toEqual(['IN']);
  });
});

describe('FichajeService · cuadro de mando', () => {
  it('lista quién está fichado ahora y caza las jornadas de días pasados sin cerrar', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo);
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
    const panel = await new FichajeService(repoMem()).panel([]);
    expect(panel).toEqual({ ahora: [], incidencias: [] });
  });
});

describe('FichajeService · histórico', () => {
  it('agrupa por día y computa los minutos de cada jornada, más reciente primero', async () => {
    const repo = repoMem();
    const svc = new FichajeService(repo);
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
});
