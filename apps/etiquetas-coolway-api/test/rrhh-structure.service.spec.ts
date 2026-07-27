import { RrhhStructureService } from '../src/rrhh/application/rrhh-structure.service';
import { RrhhError } from '../src/rrhh/application/rrhh.service';
import { CenterRow, DepartmentRow, StructureRepository } from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { PrismaService } from '../src/infrastructure/db/prisma.service';

const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as unknown as PrismaService;

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

const centro = (p: Partial<CenterRow> = {}): CenterRow => ({ id: 1, name: 'Tienda Centro', brand: 'COOLWAY', employees: 0, ...p });
const dep = (p: Partial<DepartmentRow> = {}): DepartmentRow => ({ id: 1, name: 'Ventas', employees: 0, ...p });

function repo(over: Partial<StructureRepository> = {}): StructureRepository {
  return {
    listCenters: async () => [centro()],
    createCenter: async (d) => centro({ id: 9, ...d }),
    updateCenter: async (id, d) => centro({ id, ...d }),
    deleteCenter: async () => undefined,
    findCenter: async () => centro(),
    listDepartments: async () => [dep()],
    createDepartment: async (d) => dep({ id: 9, ...d }),
    updateDepartment: async (id, d) => dep({ id, ...d }),
    deleteDepartment: async () => undefined,
    findDepartment: async () => dep(),
    ...over,
  };
}

const actor = { email: 'rrhh@y.com' };

describe('RrhhStructureService · centros', () => {
  it('crea un centro con marca y lo AUDITA', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhStructureService(repo(), recorder, db);
    const c = await svc.crearCentro({ name: 'Nueva Tienda', brand: 'coolway' }, actor);
    expect(c.id).toBe(9);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'CENTRO' });
  });

  it('rechaza centro sin nombre o sin marca', async () => {
    const svc = new RrhhStructureService(repo(), recorderSpy().recorder, db);
    await expect(svc.crearCentro({ name: '  ', brand: 'COOLWAY' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.crearCentro({ name: 'X', brand: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('NO borra un centro con empleados asignados (dejaría fichas huérfanas)', async () => {
    const svc = new RrhhStructureService(repo({ findCenter: async () => centro({ employees: 3 }) }), recorderSpy().recorder, db);
    await expect(svc.borrarCentro(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('borra un centro vacío y lo audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhStructureService(repo({ findCenter: async () => centro({ employees: 0 }) }), recorder, db);
    await svc.borrarCentro(1, actor);
    expect(registros[0]).toMatchObject({ action: 'DELETE', entity: 'CENTRO' });
  });

  it('edita un centro y lo audita; rechaza nombre vacío y centro inexistente', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhStructureService(repo(), recorder, db);
    const c = await svc.editarCentro(1, { name: 'Renombrada', brand: 'COOLWAY' }, actor);
    expect(c.name).toBe('Renombrada');
    expect(registros[0]).toMatchObject({ action: 'UPDATE', entity: 'CENTRO' });
    await expect(svc.editarCentro(1, { name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    const svcSinCentro = new RrhhStructureService(repo({ findCenter: async () => null }), recorderSpy().recorder, db);
    await expect(svcSinCentro.editarCentro(9, { name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('lista centros', async () => {
    const svc = new RrhhStructureService(repo(), recorderSpy().recorder, db);
    expect(await svc.listCenters()).toHaveLength(1);
  });
});

describe('RrhhStructureService · departamentos', () => {
  it('crea y audita', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhStructureService(repo(), recorder, db);
    await svc.crearDepartamento({ name: 'Compras' }, actor);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'DEPARTAMENTO' });
  });

  it('NO borra un departamento con empleados', async () => {
    const svc = new RrhhStructureService(repo({ findDepartment: async () => dep({ employees: 2 }) }), recorderSpy().recorder, db);
    await expect(svc.borrarDepartamento(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('edita, borra vacío y lista; rechaza nombre vacío', async () => {
    const { recorder, registros } = recorderSpy();
    const svc = new RrhhStructureService(repo(), recorder, db);
    await svc.editarDepartamento(1, { name: 'Marketing' }, actor);
    expect(registros[0]).toMatchObject({ action: 'UPDATE', entity: 'DEPARTAMENTO' });
    await svc.borrarDepartamento(1, actor);
    expect(registros[1]).toMatchObject({ action: 'DELETE', entity: 'DEPARTAMENTO' });
    expect(await svc.listDepartments()).toHaveLength(1);
    await expect(svc.crearDepartamento({ name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});
