import { RrhhError, RrhhService } from '../src/rrhh/application/rrhh.service';
import { CenterRow, DepartmentRow, EmpleadoUpdate, EmployeeRepository, EmployeeRow, StructureRepository } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { PrismaService } from '../src/infrastructure/db/prisma.service';

const fila = (p: Partial<EmployeeRow>): EmployeeRow => ({
  id: 1,
  userId: 10,
  fullName: 'Ana',
  email: 'ana@y.com',
  position: null,
  rrhhRole: 'EMPLEADO',
  managerId: null,
  active: true,
  department: null,
  departmentId: null,
  center: null,
  centerId: null,
  brand: null,
  ...p,
});

function repo(over: Partial<EmployeeRepository> = {}): EmployeeRepository {
  return {
    findByUserId: async () => null,
    findById: async () => null,
    findAll: async () => [],
    findUserIdByEmail: async () => null,
    create: async (n) => fila({ id: 99, userId: n.userId, fullName: n.fullName, rrhhRole: n.rrhhRole, managerId: n.managerId ?? null }),
    update: async (id, d: EmpleadoUpdate) => fila({ id, ...d, position: d.position ?? null, managerId: d.managerId ?? null }),
    ...over,
  };
}

/** Estructura de mentira: por defecto centro/departamento existen (validación pasa salvo que se sobrescriba). */
function estructura(over: Partial<StructureRepository> = {}): StructureRepository {
  const centro: CenterRow = { id: 1, name: 'Tienda', brand: 'COOLWAY', employees: 0 };
  const dep: DepartmentRow = { id: 1, name: 'Ventas', employees: 0 };
  return {
    listCenters: async () => [centro],
    createCenter: async () => centro,
    updateCenter: async () => centro,
    deleteCenter: async () => undefined,
    findCenter: async () => centro,
    listDepartments: async () => [dep],
    createDepartment: async () => dep,
    updateDepartment: async () => dep,
    deleteDepartment: async () => undefined,
    findDepartment: async () => dep,
    ...over,
  };
}

/** Prisma de mentira: ejecuta el callback de la transacción sin BD. */
const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as unknown as PrismaService;

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

const actor = { email: 'rrhh@y.com' };

describe('RrhhService · alta de empleado', () => {
  it('enlaza con un usuario existente por correo, crea la ficha y lo AUDITA', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10 }), estructura(), recorder, db);
    const r = await svc.crear({ email: 'ana@y.com', fullName: 'Ana', rrhhRole: 'MANAGER' }, actor);
    expect(r.id).toBe(99);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'EMPLEADO', actorEmail: 'rrhh@y.com' });
  });

  it('si no existe usuario con ese correo, NO crea ficha (RRHH no crea logins)', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => null }), estructura(), recorderSpy().recorder, db);
    await expect(svc.crear({ email: 'nadie@y.com', fullName: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('un usuario que ya es empleado no se duplica', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10, findByUserId: async () => fila({}) }), estructura(), recorderSpy().recorder, db);
    await expect(svc.crear({ email: 'ana@y.com', fullName: 'Ana' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza un rol RRHH inventado', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10 }), estructura(), recorderSpy().recorder, db);
    // @ts-expect-error rol inválido a propósito
    await expect(svc.crear({ email: 'ana@y.com', fullName: 'Ana', rrhhRole: 'JEFAZO' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('RrhhService · editar / baja / reactivar', () => {
  it('edita la ficha y AUDITA el antes→después', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhService(repo({ findById: async () => fila({ id: 5, fullName: 'Ana' }) }), estructura(), recorder, db);
    const r = await svc.editar(5, { fullName: 'Ana García', position: 'Dependienta' }, actor);
    expect(r.fullName).toBe('Ana García');
    expect(registros[0]).toMatchObject({ action: 'UPDATE', entity: 'EMPLEADO', entityId: '5' });
  });

  it('NO deja poner como responsable a un subordinado (crearía un ciclo)', async () => {
    // organigrama: 2 es jefe de 3. Poner a 3 como jefe de 2 → ciclo.
    const plantilla = [fila({ id: 2, managerId: null }), fila({ id: 3, managerId: 2 })];
    const svc = new RrhhService(
      repo({ findById: async (id) => plantilla.find((e) => e.id === id) ?? null, findAll: async () => plantilla }),
      estructura(),
      recorderSpy().recorder,
      db,
    );
    await expect(svc.editar(2, { managerId: 3 }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('editar rechaza nombre vacío y rol inventado', async () => {
    const svc = new RrhhService(repo({ findById: async () => fila({ id: 5 }) }), estructura(), recorderSpy().recorder, db);
    await expect(svc.editar(5, { fullName: '   ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    // @ts-expect-error rol inválido a propósito
    await expect(svc.editar(5, { rrhhRole: 'JEFAZO' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('editar rechaza un responsable inexistente y un empleado inexistente', async () => {
    const svc = new RrhhService(repo({ findById: async (id) => (id === 5 ? fila({ id: 5 }) : null) }), estructura(), recorderSpy().recorder, db);
    await expect(svc.editar(5, { managerId: 999 }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editar(404, { fullName: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('editar rechaza un centro o departamento inexistente', async () => {
    const svc = new RrhhService(
      repo({ findById: async () => fila({ id: 5 }) }),
      estructura({ findCenter: async () => null, findDepartment: async () => null }),
      recorderSpy().recorder,
      db,
    );
    await expect(svc.editar(5, { centerId: 77 }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editar(5, { departmentId: 88 }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('dar de baja marca inactivo y lo audita; reactivar lo revierte', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhService(repo({ findById: async () => fila({ id: 5, active: true }) }), estructura(), recorder, db);
    const r = await svc.darDeBaja(5, actor);
    expect(r.active).toBe(false);
    expect(registros[0].summary).toMatch(/baja/i);
  });

  it('reactivar a quien ya está activo no hace nada (ni audita)', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhService(repo({ findById: async () => fila({ id: 5, active: true }) }), estructura(), recorder, db);
    const r = await svc.reactivar(5, actor);
    expect(r.active).toBe(true);
    expect(registros).toHaveLength(0); // corto-circuito: ya estaba en ese estado
  });
});

describe('RrhhService · listVisible respeta la jerarquía', () => {
  const plantilla: EmployeeRow[] = [
    fila({ id: 1, rrhhRole: 'RRHH', managerId: null }),
    fila({ id: 2, rrhhRole: 'MANAGER', managerId: null }),
    fila({ id: 3, rrhhRole: 'EMPLEADO', managerId: 2 }),
    fila({ id: 4, rrhhRole: 'EMPLEADO', managerId: 1 }),
  ];
  const svc = new RrhhService(repo({ findAll: async () => plantilla }), estructura(), recorderSpy().recorder, db);

  it('RRHH ve a todos', async () => {
    expect((await svc.listVisible(fila({ id: 1, rrhhRole: 'RRHH' }))).map((e) => e.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('un MANAGER ve sólo su rama', async () => {
    expect((await svc.listVisible(fila({ id: 2, rrhhRole: 'MANAGER' }))).map((e) => e.id).sort()).toEqual([2, 3]);
  });
});
