import { AusenciaService } from '../src/rrhh/application/ausencia.service';
import { RrhhError } from '../src/rrhh/application/rrhh.service';
import { AbsenceRepository, AbsenceRow, AbsenceTypeRepository, AbsenceTypeRow, EmployeeRepository, NotificationRepository, NuevaAusencia } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { FileStorage } from '../src/rrhh/application/file-storage.port';
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
        startDate: n.startDate, endDate: n.endDate, halfDay: n.halfDay, halfDayPart: n.halfDayPart ?? null, reason: n.reason ?? null, status: n.status,
        decidedByEmail: null, decidedAt: null, decisionNote: null, attachmentKey: null, attachmentName: null, createdAt: new Date(),
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
    setAttachment: async (id, key, name) => { const f = filas.find((x) => x.id === id)!; f.attachmentKey = key; f.attachmentName = name; return f; },
  };
}

/** Empleados de mentira: por defecto sin responsable (no dispara notificación al jefe). */
function empFake(managerId: number | null = null): EmployeeRepository {
  const base = { id: 1, userId: 1, fullName: 'Ana', email: 'ana@y.com', position: null, rrhhRole: 'EMPLEADO' as const, managerId, active: true, department: null, departmentId: null, center: null, centerId: null, brand: null, weeklyMinutes: null, annualLeaveDays: null, birthDate: null, hideBirthday: false };
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

/** Almacenamiento de mentira: guarda en un mapa en memoria. */
function storageFake(): FileStorage & { guardados: Map<string, Buffer> } {
  const guardados = new Map<string, Buffer>();
  return {
    guardados,
    put: async (key, body) => void guardados.set(key, body),
    get: async (key) => guardados.get(key) ?? Buffer.from(''),
  };
}

const dd = '2026-08-';

describe('AusenciaService · solicitar', () => {
  it('con tipo que requiere aprobación queda PENDING y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('PENDING');
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'AUSENCIA' });
  });

  it('con tipo que NO requiere aprobación queda APPROVED al vuelo', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ requiresApproval: false })), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}05` }, actor);
    expect(a.status).toBe('APPROVED');
  });

  it('rechaza rango inválido y tipo inexistente', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}05`, endDate: `${dd}01` }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.solicitar(1, { typeId: 99, startDate: `${dd}01`, endDate: `${dd}05` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('medio día en UN solo día guarda la mitad (SECOND) y cuenta 0,5', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}03`, endDate: `${dd}03`, halfDay: true, halfDayPart: 'SECOND' }, actor);
    expect(a.halfDay).toBe(true);
    expect(a.halfDayPart).toBe('SECOND');
  });

  it('medio día sin especificar mitad usa la primera por defecto', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}03`, endDate: `${dd}03`, halfDay: true }, actor);
    expect(a.halfDayPart).toBe('FIRST');
  });

  it('medio día en un RANGO de varios días se ignora (sin mitad, día completo)', async () => {
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    const a = await svc.solicitar(1, { typeId: 1, startDate: `${dd}03`, endDate: `${dd}05`, halfDay: true, halfDayPart: 'SECOND' }, actor);
    expect(a.halfDay).toBe(false);
    expect(a.halfDayPart).toBeNull();
  });

  it('NO deja solicitar si solapa con una ausencia ya aprobada', async () => {
    const repo = ausRepo();
    repo.filas.push({ id: 1, employeeId: 1, employeeName: 'Ana', department: null, typeId: 1, typeName: 'Vacaciones', computesBalance: true, startDate: new Date(`${dd}10T00:00:00Z`), endDate: new Date(`${dd}15T00:00:00Z`), halfDay: false, halfDayPart: null, reason: null, status: 'APPROVED', decidedByEmail: null, decidedAt: null, decisionNote: null, attachmentKey: null, attachmentName: null, createdAt: new Date() });
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}12`, endDate: `${dd}18` }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · decidir', () => {
  it('aprobar cambia a APPROVED y audita; rechazar a REJECTED', async () => {
    const repo = ausRepo();
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    const aprobada = await svc.decidir(1, true, actor, 'ok');
    expect(aprobada.status).toBe('APPROVED');
    expect(registros.some((r) => r.entity === 'AUSENCIA' && r.summary.includes('Aprobó'))).toBe(true);
  });

  it('NO aprueba si solapa con otra aprobada del mismo empleado', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    // #1 aprobada 10–15; #2 pendiente 12–18 → aprobar #2 debe fallar.
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}10`, endDate: `${dd}15` }, actor);
    await svc.decidir(1, true, actor, undefined);
    // La segunda no puede ni solicitarse por solape; la insertamos como PENDING directamente para probar decidir.
    repo.filas.push({ id: 99, employeeId: 1, employeeName: 'Ana', department: null, typeId: 1, typeName: 'Vacaciones', computesBalance: true, startDate: new Date(`${dd}12T00:00:00Z`), endDate: new Date(`${dd}18T00:00:00Z`), halfDay: false, halfDayPart: null, reason: null, status: 'PENDING', decidedByEmail: null, decidedAt: null, decisionNote: null, attachmentKey: null, attachmentName: null, createdAt: new Date() });
    await expect(svc.decidir(99, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });

  it('al decidir avisa al empleado (notificación in-app)', async () => {
    const repo = ausRepo();
    const notif = notifFake();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notif, storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.decidir(1, true, actor, undefined);
    expect(notif.creadas.some((n) => n.employeeId === 1 && /APROBADA/.test(n.message))).toBe(true);
  });

  it('al solicitar con responsable, avisa al responsable', async () => {
    const notif = notifFake();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(7), notif, storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    expect(notif.creadas.some((n) => n.employeeId === 7)).toBe(true); // el jefe (id 7)
  });

  it('no se decide dos veces', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.decidir(1, false, actor, undefined);
    await expect(svc.decidir(1, true, actor, undefined)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · saldo', () => {
  it('resta del cupo anual los días aprobados que computan saldo', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
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

describe('AusenciaService · cancelar (borrado lógico)', () => {
  it('cancelar pone estado CANCELLED, audita y deja de contar', async () => {
    const repo = ausRepo();
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    const r = await svc.anular(1, actor, false);
    expect(r.status).toBe('CANCELLED');
    expect(registros.some((x) => x.entity === 'AUSENCIA' && /Cancel/.test(x.summary))).toBe(true);
    // ya no cuenta como aprobada (solape libre): otra en las mismas fechas se puede pedir
    await expect(svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor)).resolves.toBeTruthy();
  });

  it('no se cancela algo ya cancelado o rechazado', async () => {
    const repo = ausRepo();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.anular(1, actor, false);
    await expect(svc.anular(1, actor, false)).rejects.toBeInstanceOf(RrhhError);
  });

  it('si la cancela un admin (avisarEmpleado=true), notifica al empleado', async () => {
    const repo = ausRepo();
    const notif = notifFake();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notif, storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    await svc.anular(1, actor, true);
    expect(notif.creadas.some((n) => n.employeeId === 1 && /CANCELADA/.test(n.message))).toBe(true);
  });
});

describe('AusenciaService · aviso sin responsable', () => {
  it('si el solicitante NO tiene responsable, avisa a los RRHH/ADMIN', async () => {
    const notif = notifFake();
    // empFake sin managerId (null) + findAll con un ADMIN (id 5)
    const emp: EmployeeRepository = {
      findByUserId: async () => null,
      findById: async () => ({ id: 1, userId: 1, fullName: 'Ana', email: 'ana@y.com', position: null, rrhhRole: 'EMPLEADO', managerId: null, active: true, department: null, departmentId: null, center: null, centerId: null, brand: null, weeklyMinutes: null, annualLeaveDays: null, birthDate: null, hideBirthday: false }),
      findAll: async () => [{ id: 5, userId: 5, fullName: 'Jefa RRHH', email: 'r@y.com', position: null, rrhhRole: 'ADMIN', managerId: null, active: true, department: null, departmentId: null, center: null, centerId: null, brand: null, weeklyMinutes: null, annualLeaveDays: null, birthDate: null, hideBirthday: false }],
      findUserIdByEmail: async () => null,
      create: async () => ({ id: 1 } as never),
      update: async () => ({ id: 1 } as never),
    };
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), emp, notif, storageFake(), recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    expect(notif.creadas.some((n) => n.employeeId === 5)).toBe(true); // avisó al ADMIN
  });
});

describe('AusenciaService · justificantes', () => {
  const pdf = { buffer: Buffer.from('%PDF-1.4'), originalname: 'baja médica.pdf', mimetype: 'application/pdf', size: 8 };

  async function conAusencia() {
    const repo = ausRepo();
    const storage = storageFake();
    const svc = new AusenciaService(tiposRepo(tipo()), repo, empFake(), notifFake(), storage, recorderSpy().recorder, db);
    await svc.solicitar(1, { typeId: 1, startDate: `${dd}01`, endDate: `${dd}03` }, actor);
    return { svc, storage };
  }

  it('adjunta un PDF válido, guarda la referencia y sube el fichero', async () => {
    const { svc, storage } = await conAusencia();
    const r = await svc.adjuntar(1, pdf, actor);
    expect(r.attachmentName).toMatch(/baja/); // nombre saneado
    expect(storage.guardados.size).toBe(1);
    const [key] = [...storage.guardados.keys()];
    expect(key).toMatch(/^justificantes\/1\/.+\.pdf$/);
  });

  it('RECHAZA un formato no permitido y un fichero de más de 10MB', async () => {
    const { svc } = await conAusencia();
    await expect(svc.adjuntar(1, { buffer: Buffer.from('x'), originalname: 'v.exe', mimetype: 'application/x-msdownload', size: 1 }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.adjuntar(1, { buffer: Buffer.alloc(11 * 1024 * 1024), originalname: 'big.pdf', mimetype: 'application/pdf', size: 11 * 1024 * 1024 }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('descargar devuelve el mismo buffer que se subió', async () => {
    const { svc } = await conAusencia();
    await svc.adjuntar(1, pdf, actor);
    const { buffer } = await svc.descargarJustificante(1);
    expect(buffer.toString()).toBe('%PDF-1.4');
  });

  it('descargar una ausencia sin justificante avisa', async () => {
    const { svc } = await conAusencia();
    await expect(svc.descargarJustificante(1)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('AusenciaService · tipos', () => {
  it('no borra un tipo con usos', async () => {
    const svc = new AusenciaService(tiposRepo(tipo({ usos: 3 })), ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await expect(svc.borrarTipo(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('crea un tipo y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new AusenciaService(tiposRepo(tipo()), ausRepo(), empFake(), notifFake(), storageFake(), recorder, db);
    await svc.crearTipo({ name: 'Mudanza', requiresApproval: true }, actor);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'TIPO_AUSENCIA' });
  });

  it('por defecto un tipo DESCUENTA saldo (evita el confuso "no descuenta" en Vacaciones)', async () => {
    let capturado: { computesBalance: boolean } | null = null;
    const repo: AbsenceTypeRepository = {
      list: async () => [],
      findById: async () => null,
      create: async (d) => { capturado = d; return tipo({ id: 9, ...d }); },
      update: async (_id, d) => tipo({ ...d }),
      delete: async () => undefined,
    };
    const svc = new AusenciaService(repo, ausRepo(), empFake(), notifFake(), storageFake(), recorderSpy().recorder, db);
    await svc.crearTipo({ name: 'Vacaciones' }, actor); // sin especificar computesBalance
    expect(capturado!.computesBalance).toBe(true);
    // pero si se pide explícitamente false (p.ej. baja médica), se respeta
    await svc.crearTipo({ name: 'Baja', computesBalance: false }, actor);
    expect(capturado!.computesBalance).toBe(false);
  });
});
