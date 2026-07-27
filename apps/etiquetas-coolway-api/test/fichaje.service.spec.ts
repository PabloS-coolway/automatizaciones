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
  };
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
