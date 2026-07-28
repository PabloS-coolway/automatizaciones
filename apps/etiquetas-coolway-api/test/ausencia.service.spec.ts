import { AusenciaService } from '../src/rrhh/application/ausencia.service';
import { RrhhError } from '../src/rrhh/application/rrhh.service';
import { AbsenceRepository, AbsenceRow, AbsenceTypeRepository, AbsenceTypeRow, NuevaAusencia } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { PrismaService } from '../src/infrastructure/db/prisma.service';

const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as unknown as PrismaService;
const actor = { email: 'jefe@y.com' };

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

const tipo = (p: Partial<AbsenceTypeRow> = {}): AbsenceTypeRow => ({
  id: 1, name: 'Vacaciones', computesBalance: true, requiresApproval: true, requiresAttachment: false, active: true, usos: 0, ...p,
});

function tiposRepo(t: AbsenceTypeRow): AbsenceTypeRepository {
  return {
    list: async () => [t],
    findById: async (id) => (id === t.id ? t : null),
    create: async (d) => tipo({ id: 9, ...d }),
    update: async (_id, d) => tipo({ ...t, ...d }),
    delete: async () => undefined,
  };
}

function ausRepo(): AbsenceRepository & { filas: AbsenceRow[] } {
  const filas: AbsenceRow[] = [];
  let seq = 1;
  return {
    filas,
    create: async (n: NuevaAusencia) => {
      const fila: AbsenceRow = {
        id: seq++, employeeId: n.employeeId, employeeName: 'Ana', typeId: n.typeId, typeName: 'Vacaciones',
        startDate: n.startDate, endDate: n.endDate, halfDay: n.halfDay, reason: n.reason ?? null, status: n.status,
        decidedByEmail: null, decidedAt: null, decisionNote: null, createdAt: new Date(),
      };
      filas.push(fila);
      return fila;
    },
    findById: async (id) => filas.find((f) => f.id === id) ?? null,
    decidir: async (id, d) => {
      const f = filas.find((x) => x.id === id)!;
      Object.assign(f, d);
      return f;
    },
    listByEmployee: async (eid) => filas.filter((f) => f.employeeId === eid),
    listByStatusForEmployees: async (ids, status) => filas.filter((f) => ids.includes(f.employeeId) && f.status === status),
    listApprovedByEmployee: async (eid) => filas.filter((f) => f.employeeId === eid && f.status === 'APPROVED'),
  };
}

const dd = '2026-08-';

describe('AusenciaService · solicitar', () => {
  it('con tipo que requiere aprobación queda PENDING y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('PENDING');
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'AUSENCIA' });
  });

  it('con tipo que NO requiere aprobación queda APPROVED al vuelo', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ requiresApproval: false })), ausRepo(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('APPROVED');
  });

  it('rechaza rango inválido y tipo inexistente', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}05`, endDate: `${dd}01` }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.solicitar(1, { typeId: 99, startDate: `${dd}01`, endDate: `${dd}05` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('NO deja solicitar si solapa con una ausencia ya aprobada', async () => {
    const repo = ausRepo();
    repo.filas.push({ id: 1, employeeId: 1, employeeName: 'Ana', typeId: 1, typeName: 'Vacaciones', startDate: new Date(`${dd}10T00:00:00Z`), endDate: new Date(`${dd}15T00:00:00Z`), halfDay: false, reason: null, status: 'APPROVED', decidedByEmail: null, decidedAt: null, decisionNote: null, createdAt: new Date() });
    const svc = new AusenciaService(tiposRepo(tipo()), repo, recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}12`, endDate: `${dd}18` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · decidir', () => {
  it('aprobar cambia a APPROVED y audita; rechazar a REJECTED', async () => {
    const repo = ausRepo();
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    const aprobada = await svc.decidir(1, true, actor, 'ok');
    expect(aprobada.status).toBe('APPROVED');
    expect(registros.some((r) => r.entity === 'AUSENCIA' && r.summary.includes('Aprobó'))).toBe(true);
  });

  it('NO aprueba si solapa con otra aprobada del mismo empleado', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, recorderSpy().recorder, db);
    // #1 aprobada 10–15; #2 pendiente 12–18 → aprobar #2 debe fallar.
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}10`, endDate: `${dd}15` }, actor);
    await svc.decidir(1, true, actor, undefined);
    // La segunda no puede ni solicitarse por solape; la insertamos como PENDING directamente para probar decidir.
    repo.filas.push({ id: 99, employeeId: 1, employeeName: 'Ana', typeId: 1, typeName: 'Vacaciones', startDate: new Date(`${dd}12T00:00:00Z`), endDate: new Date(`${dd}18T00:00:00Z`), halfDay: false, reason: null, status: 'PENDING', decidedByEmail: null, decidedAt: null, decisionNote: null, createdAt: new Date() });
    await expect(svc.decidir(99, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });

  it('no se decide dos veces', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.decidir(1, false, actor, undefined);
    await expect(svc.decidir(1, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · tipos', () => {
  it('no borra un tipo con usos', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ usos: 3 })), ausRepo(), recorderSpy().recorder, db);
    await expect(svc.borrarTipo(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('crea un tipo y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), recorder, db);
    await svc.crearTipo({ name: 'Mudanza', requiresApproval: true }, actor);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'TIPO_AUSENCIA' });
  });
});
