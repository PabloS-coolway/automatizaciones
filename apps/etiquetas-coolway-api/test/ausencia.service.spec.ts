import { AusenciaService } from '../src/rrhh/application/ausencia.service';
import { RrhhError } from '../src/rrhh/application/rrhh.service';
import { AbsenceRepository, AbsenceRow, AbsenceTypeRepository, AbsenceTypeRow, EmployeeRepository, NotificationRepository, NuevaAusencia } from '../src/rrhh/application/ports';
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
        id: seq++, employeeId: n.employeeId, employeeName: 'Ana', department: null, typeId: n.typeId, typeName: 'Vacaciones', computesBalance: true,
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
    listForEmployeesBetween: async (ids, desde, hasta, statuses) => filas.filter((f) => ids.includes(f.employeeId) && statuses.includes(f.status) && f.startDate <= hasta && f.endDate >= desde),
  };
}

/** Empleados de mentira: por defecto sin responsable (no dispara notificación al jefe). */
function empFake(managerId: number | null = null): EmployeeRepository {
  const base = { id: 1, userId: 1, fullName: 'Ana', email: 'ana@y.com', position: null, rrhhRole: 'EMPLEADO' as const, managerId, active: true, department: null, departmentId: null, center: null, centerId: null, brand: null, weeklyMinutes: null, annualLeaveDays: null };
  return {
    findByUserId: async () => null,
    findById: async () => base,
    findAll: async () => [base],
    findUserIdByEmail: async () => null,
    create: async () => base,
    update: async () => base,
  };
}

/** Notificaciones de mentira: registra las creadas. */
function notifFake(): NotificationRepository & { creadas: { employeeId: number; message: string }[] } {
  const creadas: { employeeId: number; message: string }[] = [];
  return {
    creadas,
    create: async (d) => {
      creadas.push({ employeeId: d.employeeId, message: d.message });
      return { id: creadas.length, employeeId: d.employeeId, message: d.message, link: d.link ?? null, read: false, createdAt: new Date() };
    },
    listForEmployee: async () => [],
    countUnread: async () => 0,
    markRead: async () => undefined,
    markAllRead: async () => undefined,
  };
}

const dd = '2026-08-';

describe('AusenciaService · solicitar', () => {
  it('con tipo que requiere aprobación queda PENDING y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('PENDING');
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'AUSENCIA' });
  });

  it('con tipo que NO requiere aprobación queda APPROVED al vuelo', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ requiresApproval: false })), ausRepo(), empFake(), notifFake(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('APPROVED');
  });

  it('rechaza rango inválido y tipo inexistente', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}05`, endDate: `${dd}01` }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.solicitar(1, { typeId: 99, startDate: `${dd}01`, endDate: `${dd}05` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('NO deja solicitar si solapa con una ausencia ya aprobada', async () => {
    const repo = ausRepo();
    repo.filas.push({ id: 1, employeeId: 1, employeeName: 'Ana', department: null, typeId: 1, typeName: 'Vacaciones', computesBalance: true, startDate: new Date(`${dd}10T00:00:00Z`), endDate: new Date(`${dd}15T00:00:00Z`), halfDay: false, reason: null, status: 'APPROVED', decidedByEmail: null, decidedAt: null, decisionNote: null, createdAt: new Date() });
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}12`, endDate: `${dd}18` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · decidir', () => {
  it('aprobar cambia a APPROVED y audita; rechazar a REJECTED', async () => {
    const repo = ausRepo();
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    const aprobada = await svc.decidir(1, true, actor, 'ok');
    expect(aprobada.status).toBe('APPROVED');
    expect(registros.some((r) => r.entity === 'AUSENCIA' && r.summary.includes('Aprobó'))).toBe(true);
  });

  it('NO aprueba si solapa con otra aprobada del mismo empleado', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), recorderSpy().recorder, db);
    // #1 aprobada 10–15; #2 pendiente 12–18 → aprobar #2 debe fallar.
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}10`, endDate: `${dd}15` }, actor);
    await svc.decidir(1, true, actor, undefined);
    // La segunda no puede ni solicitarse por solape; la insertamos como PENDING directamente para probar decidir.
    repo.filas.push({ id: 99, employeeId: 1, employeeName: 'Ana', department: null, typeId: 1, typeName: 'Vacaciones', computesBalance: true, startDate: new Date(`${dd}12T00:00:00Z`), endDate: new Date(`${dd}18T00:00:00Z`), halfDay: false, reason: null, status: 'PENDING', decidedByEmail: null, decidedAt: null, decisionNote: null, createdAt: new Date() });
    await expect(svc.decidir(99, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });

  it('al decidir avisa al empleado (notificación in-app)', async () => {
    const repo = ausRepo();
    const notif = notifFake();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notif, recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.decidir(1, true, actor, undefined);
    expect(notif.creadas.some((n) => n.employeeId === 1 && /APROBADA/.test(n.message))).toBe(true);
  });

  it('al solicitar con responsable, avisa al responsable', async () => {
    const notif = notifFake();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(7), notif, recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    expect(notif.creadas.some((n) => n.employeeId === 7)).toBe(true); // el jefe (id 7)
  });

  it('no se decide dos veces', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.decidir(1, false, actor, undefined);
    await expect(svc.decidir(1, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · saldo', () => {
  it('resta del cupo anual los días aprobados que computan saldo', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}03`, endDate: `${dd}07` }, actor); // 5 días
    await svc.decidir(1, true, actor, undefined); // aprobada
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}20`, endDate: `${dd}21` }, actor); // 2 días, pendiente
    const s = await svc.saldo(1, 23, 2026);
    expect(s.anual).toBe(23);
    expect(s.disfrutados).toBe(5);
    expect(s.pendientes).toBe(2);
    expect(s.restante).toBe(18); // 23 - 5
  });
});

describe('AusenciaService · tipos', () => {
  it('no borra un tipo con usos', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ usos: 3 })), ausRepo(), empFake(), notifFake(), recorderSpy().recorder, db);
    await expect(svc.borrarTipo(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('crea un tipo y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), recorder, db);
    await svc.crearTipo({ name: 'Mudanza', requiresApproval: true }, actor);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'TIPO_AUSENCIA' });
  });
});
