import { ConvenioPermisosService } from '../src/rrhh/application/convenio-permisos.service';
import {
  ConvenioPermisosRepository,
  EmpleadoConvenioChain,
} from '../src/rrhh/application/convenio-permisos.port';
import { AbsenceTypeInput, ConvenioPermisoInput, resolverPermisos } from '../src/rrhh/domain/convenio-permisos';

const CATALOGO_GLOBAL: AbsenceTypeInput[] = [
  { id: 1, name: 'Vacaciones', computesBalance: true, requiresApproval: true, requiresAttachment: false },
  { id: 2, name: 'Baja médica', computesBalance: false, requiresApproval: false, requiresAttachment: true },
  { id: 3, name: 'Asuntos propios', computesBalance: false, requiresApproval: true, requiresAttachment: false },
];

describe('resolverPermisos (regla pura)', () => {
  it('con convenio que concede permisos: usa esos, con sus parámetros (días máx, remunerado)', () => {
    const permisosConvenio: ConvenioPermisoInput[] = [
      { absenceType: CATALOGO_GLOBAL[2], diasMax: 4, remunerado: true },
    ];
    const { fuente, permisos } = resolverPermisos(permisosConvenio, CATALOGO_GLOBAL);
    expect(fuente).toBe('convenio');
    expect(permisos).toHaveLength(1);
    expect(permisos[0]).toMatchObject({ absenceTypeId: 3, name: 'Asuntos propios', diasMax: 4, remunerado: true });
  });

  it('convenio SIN filas → fallback al catálogo global completo (compat REQ-008), con params en null', () => {
    const { fuente, permisos } = resolverPermisos([], CATALOGO_GLOBAL);
    expect(fuente).toBe('global');
    // Si devolviera un subconjunto, aquí saltaría: exigimos el catálogo ENTERO.
    expect(permisos.map((p) => p.absenceTypeId)).toEqual([1, 2, 3]);
    expect(permisos.every((p) => p.diasMax === null && p.remunerado === null)).toBe(true);
    // No pierde los flags del tipo de ausencia.
    expect(permisos[0]).toMatchObject({ name: 'Vacaciones', computesBalance: true });
  });
});

/** Repo en memoria: prueba la orquestación del servicio sin Prisma. */
class RepoMemoria implements ConvenioPermisosRepository {
  constructor(
    private readonly chains: Record<number, EmpleadoConvenioChain>,
    private readonly permisosPorConvenio: Record<number, ConvenioPermisoInput[]> = {},
  ) {}
  async findEmployeeChain(id: number): Promise<EmpleadoConvenioChain | null> {
    return this.chains[id] ?? null;
  }
  async listConvenioPermisos(convenioId: number): Promise<ConvenioPermisoInput[]> {
    return this.permisosPorConvenio[convenioId] ?? [];
  }
  async listGlobalAbsenceTypes(): Promise<AbsenceTypeInput[]> {
    return CATALOGO_GLOBAL;
  }
}

describe('ConvenioPermisosService · permisosDeEmpleado', () => {
  it('empleado con convenio poblado → permisos del convenio y fuente=convenio', async () => {
    const repo = new RepoMemoria(
      { 10: { employeeId: 10, zona: { id: 5, name: 'VALENCIA' }, convenio: { id: 7, name: 'Comercio Valencia' } } },
      { 7: [{ absenceType: CATALOGO_GLOBAL[0], diasMax: 30, remunerado: true }] },
    );
    const svc = new ConvenioPermisosService(repo);
    const res = await svc.permisosDeEmpleado(10);
    expect(res).toMatchObject({
      employeeId: 10,
      zona: { id: 5, name: 'VALENCIA' },
      convenio: { id: 7, name: 'Comercio Valencia' },
      fuente: 'convenio',
    });
    expect(res!.permisos).toHaveLength(1);
    expect(res!.permisos[0]).toMatchObject({ absenceTypeId: 1, diasMax: 30, remunerado: true });
  });

  it('empleado con convenio VACÍO (sin filas aún) → fallback global, pero conserva el convenio asignado en el DTO', async () => {
    const repo = new RepoMemoria({
      11: { employeeId: 11, zona: { id: 5, name: 'VALENCIA' }, convenio: { id: 7, name: 'Comercio Valencia' } },
    });
    const svc = new ConvenioPermisosService(repo);
    const res = await svc.permisosDeEmpleado(11);
    expect(res!.fuente).toBe('global');
    expect(res!.convenio).toEqual({ id: 7, name: 'Comercio Valencia' }); // informativo: la zona sí tiene convenio
    expect(res!.permisos).toHaveLength(CATALOGO_GLOBAL.length);
  });

  it('empleado sin zona/convenio → fallback global, convenio=null', async () => {
    const repo = new RepoMemoria({ 12: { employeeId: 12, zona: null, convenio: null } });
    const svc = new ConvenioPermisosService(repo);
    const res = await svc.permisosDeEmpleado(12);
    expect(res!.fuente).toBe('global');
    expect(res!.convenio).toBeNull();
    expect(res!.permisos).toHaveLength(CATALOGO_GLOBAL.length);
  });

  it('empleado inexistente → null (el controlador lo traduce a 404)', async () => {
    const svc = new ConvenioPermisosService(new RepoMemoria({}));
    expect(await svc.permisosDeEmpleado(999)).toBeNull();
  });
});
