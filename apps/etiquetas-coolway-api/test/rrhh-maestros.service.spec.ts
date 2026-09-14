import { RrhhMaestrosService } from '../src/rrhh/application/rrhh-maestros.service';
import { RrhhError } from '../src/rrhh/application/rrhh.service';
import {
  CatalogoRow,
  CompanyRow,
  ConvenioPermisoRow,
  ConvenioPermisoSet,
  ConvenioRow,
  MaestrosRepository,
  ZoneRow,
} from '../src/rrhh/application/ports';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../src/rrhh/application/rrhh-activity.port';
import { PrismaService } from '../src/infrastructure/db/prisma.service';

/** $transaction que sólo ejecuta el callback con un tx vacío (los repos en memoria ignoran el tx). */
const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) } as unknown as PrismaService;

function recorderSpy() {
  const registros: RrhhActivityRecord[] = [];
  const recorder: RrhhActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

const actor = { email: 'rrhh@y.com' };

const company = (p: Partial<CompanyRow> = {}): CompanyRow => ({ id: 1, code: '16', name: 'VANYOR SAU', employees: 0, ...p });
const zone = (p: Partial<ZoneRow> = {}): ZoneRow => ({ id: 1, name: 'VALENCIA', convenioId: null, convenioName: null, centers: 0, ...p });
const convenio = (p: Partial<ConvenioRow> = {}): ConvenioRow => ({ id: 1, code: null, name: 'Comercio Valencia', zonas: 0, ...p });
const cat = (p: Partial<CatalogoRow> = {}): CatalogoRow => ({ id: 1, code: null, name: 'DEPENDIENT', employees: 0, ...p });

/** Repo en memoria: prueba las reglas del servicio (borrado en uso, set de permisos) sin Prisma. */
class RepoMemoria implements MaestrosRepository {
  /** Tipos de ausencia existentes (id → nombre), para validar el set de permisos. */
  absenceTypes = new Map<number, string>([
    [1, 'Vacaciones'],
    [2, 'Baja médica'],
    [3, 'Asuntos propios'],
  ]);
  /** Permisos persistidos por convenio. */
  permisos = new Map<number, ConvenioPermisoSet[]>();

  // Empresas
  listCompanies = async () => [company()];
  findCompany = async () => company();
  createCompany = async (d: { code: string; name: string }) => company({ id: 9, ...d });
  updateCompany = async (id: number, d: { code?: string; name?: string }) => company({ id, ...d });
  deleteCompany = async () => undefined;

  // Zonas
  listZones = async () => [zone()];
  findZone = async () => zone();
  createZone = async (d: { name: string; convenioId: number | null }) => zone({ id: 9, ...d });
  updateZone = async (id: number, d: { name?: string; convenioId?: number | null }) => zone({ id, ...d });
  deleteZone = async () => undefined;

  // Convenios
  listConvenios = async () => [convenio()];
  findConvenio = async (id: number) => convenio({ id });
  createConvenio = async (d: { code: string | null; name: string }) => convenio({ id: 9, ...d });
  updateConvenio = async (id: number, d: { code?: string | null; name?: string }) => convenio({ id, ...d });
  deleteConvenio = async () => undefined;

  // Categorías
  listCategorias = async () => [cat()];
  findCategoria = async () => cat();
  createCategoria = async (d: { code: string | null; name: string }) => cat({ id: 9, ...d });
  updateCategoria = async (id: number, d: { code?: string | null; name?: string }) => cat({ id, ...d });
  deleteCategoria = async () => undefined;

  // Contratos
  listContractTypes = async () => [cat({ code: '100', name: null })];
  findContractType = async () => cat({ code: '100', name: null });
  createContractType = async (d: { code: string; name: string | null }) => cat({ id: 9, ...d });
  updateContractType = async (id: number, d: { code?: string; name?: string | null }) => cat({ id, code: d.code ?? '100', name: d.name ?? null });
  deleteContractType = async () => undefined;

  // Secciones
  listSecciones = async () => [cat({ code: 'S01', name: null })];
  findSeccion = async () => cat({ code: 'S01', name: null });
  createSeccion = async (d: { code: string; name: string | null }) => cat({ id: 9, ...d });
  updateSeccion = async (id: number, d: { code?: string; name?: string | null }) => cat({ id, code: d.code ?? 'S01', name: d.name ?? null });
  deleteSeccion = async () => undefined;

  // Permisos
  listConvenioPermisos = async (convenioId: number): Promise<ConvenioPermisoRow[]> => this.filas(convenioId);
  existingAbsenceTypeIds = async (ids: number[]) => new Set(ids.filter((id) => this.absenceTypes.has(id)));
  replaceConvenioPermisos = async (convenioId: number, permisos: ConvenioPermisoSet[]): Promise<ConvenioPermisoRow[]> => {
    this.permisos.set(convenioId, permisos.map((p) => ({ ...p }))); // reemplazo total
    return this.filas(convenioId);
  };

  private filas(convenioId: number): ConvenioPermisoRow[] {
    return (this.permisos.get(convenioId) ?? []).map((p) => ({
      absenceTypeId: p.absenceTypeId,
      name: this.absenceTypes.get(p.absenceTypeId) ?? `#${p.absenceTypeId}`,
      diasMax: p.diasMax,
      remunerado: p.remunerado,
    }));
  }
}

function svcCon(over: Partial<MaestrosRepository> = {}) {
  const repo = Object.assign(new RepoMemoria(), over) as unknown as MaestrosRepository & RepoMemoria;
  const { recorder, registros } = recorderSpy();
  const svc = new RrhhMaestrosService(repo, recorder, db);
  return { svc, repo, registros };
}

describe('RrhhMaestrosService · borrado bloqueado si está EN USO', () => {
  it('NO borra una empresa con empleados; sí borra una vacía (y audita)', async () => {
    const enUso = svcCon({ findCompany: async () => company({ employees: 4 }) });
    await expect(enUso.svc.borrarEmpresa(1, actor)).rejects.toBeInstanceOf(RrhhError);

    const vacia = svcCon({ findCompany: async () => company({ employees: 0 }) });
    await vacia.svc.borrarEmpresa(1, actor);
    expect(vacia.registros[0]).toMatchObject({ action: 'DELETE', entity: 'EMPRESA' });
  });

  it('NO borra una zona usada por algún centro', async () => {
    const { svc } = svcCon({ findZone: async () => zone({ centers: 2 }) });
    await expect(svc.borrarZona(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('NO borra un convenio usado por alguna zona', async () => {
    const { svc } = svcCon({ findConvenio: async () => convenio({ zonas: 1 }) });
    await expect(svc.borrarConvenio(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('NO borra categoría / tipo-contrato / sección en uso por empleados', async () => {
    const c = svcCon({ findCategoria: async () => cat({ employees: 3 }) });
    await expect(c.svc.borrarCategoria(1, actor)).rejects.toBeInstanceOf(RrhhError);

    const t = svcCon({ findContractType: async () => cat({ code: '100', employees: 1 }) });
    await expect(t.svc.borrarContrato(1, actor)).rejects.toBeInstanceOf(RrhhError);

    const s = svcCon({ findSeccion: async () => cat({ code: 'S01', employees: 5 }) });
    await expect(s.svc.borrarSeccion(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('RrhhMaestrosService · set de permisos de un convenio', () => {
  it('reemplaza el set de forma idempotente (misma entrada → mismo estado)', async () => {
    const { svc, repo, registros } = svcCon();
    const entrada = {
      permisos: [
        { absenceTypeId: 1, diasMax: 30, remunerado: true },
        { absenceTypeId: 3, diasMax: 4, remunerado: false },
      ],
    };
    const r1 = await svc.setPermisosDeConvenio(7, entrada, actor);
    expect(r1).toHaveLength(2);
    expect(r1.find((p) => p.absenceTypeId === 1)).toMatchObject({ name: 'Vacaciones', diasMax: 30, remunerado: true });
    expect(registros[0]).toMatchObject({ action: 'UPDATE', entity: 'CONVENIO_PERMISO', entityId: '7' });

    // Idempotente: repetir no duplica ni cambia el estado.
    const r2 = await svc.setPermisosDeConvenio(7, entrada, actor);
    expect(r2).toHaveLength(2);
    expect(repo.permisos.get(7)).toHaveLength(2);

    // Reemplazo real: un set más pequeño deja sólo lo enviado (borra lo que sobra).
    const r3 = await svc.setPermisosDeConvenio(7, { permisos: [{ absenceTypeId: 1, diasMax: 22, remunerado: null }] }, actor);
    expect(r3).toHaveLength(1);
    expect(r3[0]).toMatchObject({ absenceTypeId: 1, diasMax: 22, remunerado: null });

    // Vaciar: set vacío borra todos.
    const r4 = await svc.setPermisosDeConvenio(7, { permisos: [] }, actor);
    expect(r4).toHaveLength(0);
  });

  it('deduplica por absenceTypeId (gana el último)', async () => {
    const { svc } = svcCon();
    const res = await svc.setPermisosDeConvenio(7, {
      permisos: [
        { absenceTypeId: 2, diasMax: 1, remunerado: false },
        { absenceTypeId: 2, diasMax: 9, remunerado: true },
      ],
    }, actor);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ absenceTypeId: 2, diasMax: 9, remunerado: true });
  });

  it('rechaza si algún absenceTypeId no existe', async () => {
    const { svc } = svcCon();
    await expect(
      svc.setPermisosDeConvenio(7, { permisos: [{ absenceTypeId: 999, diasMax: null, remunerado: null }] }, actor),
    ).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza diasMax negativo', async () => {
    const { svc } = svcCon();
    await expect(
      svc.setPermisosDeConvenio(7, { permisos: [{ absenceTypeId: 1, diasMax: -3, remunerado: null }] }, actor),
    ).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza el set / la consulta de permisos de un convenio inexistente', async () => {
    const { svc } = svcCon({ findConvenio: async () => null });
    await expect(svc.permisosDeConvenio(1)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.setPermisosDeConvenio(1, { permisos: [] }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('RrhhMaestrosService · altas y validaciones básicas', () => {
  it('crea una empresa y la audita; rechaza code/name vacíos', async () => {
    const { svc, registros } = svcCon();
    const c = await svc.crearEmpresa({ code: '16', name: 'VANYOR SAU' }, actor);
    expect(c.id).toBe(9);
    expect(registros[0]).toMatchObject({ action: 'CREATE', entity: 'EMPRESA' });
    await expect(svc.crearEmpresa({ code: '  ', name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.crearEmpresa({ code: '16', name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
  });

  it('valida que el convenio existe al crear una zona con convenioId', async () => {
    const { svc } = svcCon({ findConvenio: async () => null });
    await expect(svc.crearZona({ name: 'CANARIAS', convenioId: 99 }, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('RrhhMaestrosService · CRUD completo de cada entidad (list / crear / editar / borrar)', () => {
  it('empresas: lista, edita y borra (auditando cada acción)', async () => {
    const { svc, registros } = svcCon();
    expect(await svc.listEmpresas()).toHaveLength(1);
    await svc.editarEmpresa(1, { name: 'VANYOR NUEVA' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'EMPRESA' });
    await expect(svc.editarEmpresa(1, { code: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarEmpresa(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'EMPRESA' });
  });

  it('zonas: crea, lista, edita y borra', async () => {
    const { svc, registros } = svcCon();
    await svc.crearZona({ name: 'CANARIAS' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'CREATE', entity: 'ZONA' });
    expect(await svc.listZonas()).toHaveLength(1);
    await svc.editarZona(1, { name: 'CANARIAS-LP', convenioId: 1 }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'ZONA' });
    await expect(svc.crearZona({ name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarZona(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'ZONA' });
  });

  it('convenios: crea, lista, edita, consulta permisos y borra', async () => {
    const { svc, registros } = svcCon();
    await svc.crearConvenio({ name: 'Comercio Madrid' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'CREATE', entity: 'CONVENIO' });
    expect(await svc.listConvenios()).toHaveLength(1);
    await svc.editarConvenio(1, { code: 'CV-1', name: 'Comercio Madrid 2' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'CONVENIO' });
    expect(await svc.permisosDeConvenio(1)).toEqual([]);
    await expect(svc.crearConvenio({ name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarConvenio(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'CONVENIO' });
  });

  it('categorías: crea, lista, edita y borra', async () => {
    const { svc, registros } = svcCon();
    await svc.crearCategoria({ code: 'DEP', name: 'DEPENDIENT' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'CREATE', entity: 'CATEGORIA' });
    expect(await svc.listCategorias()).toHaveLength(1);
    await svc.editarCategoria(1, { name: 'DEPENDIENTE' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'CATEGORIA' });
    await expect(svc.crearCategoria({ name: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarCategoria(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'CATEGORIA' });
  });

  it('tipos de contrato: crea, lista, edita y borra (code obligatorio)', async () => {
    const { svc, registros } = svcCon();
    await svc.crearContrato({ code: '200', name: 'Indefinido' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'CREATE', entity: 'TIPO_CONTRATO' });
    expect(await svc.listContratos()).toHaveLength(1);
    await svc.editarContrato(1, { name: 'Temporal' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'TIPO_CONTRATO' });
    await expect(svc.crearContrato({ code: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarContrato(1, { code: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarContrato(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'TIPO_CONTRATO' });
  });

  it('secciones: crea, lista, edita y borra (code obligatorio)', async () => {
    const { svc, registros } = svcCon();
    await svc.crearSeccion({ code: 'S02', name: 'Almacén' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'CREATE', entity: 'SECCION' });
    expect(await svc.listSecciones()).toHaveLength(1);
    await svc.editarSeccion(1, { name: 'Logística' }, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'UPDATE', entity: 'SECCION' });
    await expect(svc.crearSeccion({ code: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarSeccion(1, { code: '  ' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await svc.borrarSeccion(1, actor);
    expect(registros.at(-1)).toMatchObject({ action: 'DELETE', entity: 'SECCION' });
  });

  it('rechaza editar/borrar entidades inexistentes', async () => {
    const nada = {
      findCompany: async () => null,
      findZone: async () => null,
      findConvenio: async () => null,
      findCategoria: async () => null,
      findContractType: async () => null,
      findSeccion: async () => null,
    };
    const { svc } = svcCon(nada);
    await expect(svc.editarEmpresa(1, { name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarEmpresa(1, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarZona(1, { name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarZona(1, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarConvenio(1, { name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarConvenio(1, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarCategoria(1, { name: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarCategoria(1, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarContrato(1, { code: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarContrato(1, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.editarSeccion(1, { code: 'X' }, actor)).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.borrarSeccion(1, actor)).rejects.toBeInstanceOf(RrhhError);
  });
});
