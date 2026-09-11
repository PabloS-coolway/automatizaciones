import { ImportFichasService } from '../src/rrhh/application/import-fichas.service';
import { FichaEmpleadoData, FichasImportRepository } from '../src/rrhh/application/fichas-import.port';
import { PasswordHasher } from '../src/auth/application/ports';
import { FichaFila } from '../src/rrhh/infrastructure/fichas-rrhh-excel-reader';

/** Repositorio en memoria que SIMULA los upserts idempotentes (por su clave) y el 1:1 usuario↔ficha. */
class FakeRepo implements FichasImportRepository {
  companies = new Map<string, { id: number }>();
  zones = new Map<string, { id: number }>();
  centers = new Map<string, { id: number; zoneId: number | null }>();
  contractTypes = new Map<string, { id: number }>();
  secciones = new Map<string, { id: number }>();
  categorias = new Map<string, { id: number }>();
  users = new Map<string, { id: number; hasEmployee: boolean }>();
  employees = new Map<string, { id: number; userId: number; data: FichaEmpleadoData }>();
  private seq = 0;
  private id() { return ++this.seq; }

  private upsert(map: Map<string, { id: number }>, key: string): Promise<{ id: number }> {
    const found = map.get(key);
    if (found) return Promise.resolve(found);
    const nuevo = { id: this.id() };
    map.set(key, nuevo);
    return Promise.resolve(nuevo);
  }

  upsertCompany(code: string) { return this.upsert(this.companies, code); }
  upsertZone(name: string) { return this.upsert(this.zones, name); }
  async upsertCenter(name: string, _brand: string, zoneId: number | null) {
    const found = this.centers.get(name);
    if (found) { if (zoneId != null) found.zoneId = zoneId; return { id: found.id }; }
    const nuevo = { id: this.id(), zoneId };
    this.centers.set(name, nuevo);
    return { id: nuevo.id };
  }
  upsertContractType(code: string) { return this.upsert(this.contractTypes, code); }
  upsertSeccion(code: string) { return this.upsert(this.secciones, code); }
  upsertCategoria(name: string) { return this.upsert(this.categorias, name); }

  findUserByEmail(email: string) { return Promise.resolve(this.users.get(email) ?? null); }
  createUser(data: { email: string }) {
    const u = { id: this.id(), hasEmployee: false };
    this.users.set(data.email, u);
    return Promise.resolve({ id: u.id });
  }

  private key(companyId: number, employeeCode: string) { return `${companyId}::${employeeCode}`; }
  findEmployeeByBusinessKey(companyId: number, employeeCode: string) {
    const e = this.employees.get(this.key(companyId, employeeCode));
    return Promise.resolve(e ? { id: e.id } : null);
  }
  createEmployee(userId: number, data: FichaEmpleadoData) {
    const e = { id: this.id(), userId, data };
    this.employees.set(this.key(data.companyId, data.employeeCode), e);
    for (const u of this.users.values()) if (u.id === userId) u.hasEmployee = true; // 1:1 usuario↔ficha
    return Promise.resolve({ id: e.id });
  }
  updateEmployee(id: number, data: FichaEmpleadoData) {
    for (const e of this.employees.values()) if (e.id === id) e.data = data;
    return Promise.resolve();
  }
}

const hasher: PasswordHasher = { hash: async (p) => `hash(${p})`, compare: async () => true };

function ficha(p: Partial<FichaFila>): FichaFila {
  return {
    fila: 1,
    empresaCodigo: '105',
    empleadoCodigo: '36',
    nombre: 'GIL, DAVID',
    categoria: 'ENCAR P.EX',
    fechaAlta: '2025-09-08',
    dni: '44526115R',
    seccion: '01',
    contrato: '100',
    fechaAntiguedad: '2016-05-28',
    email: 'david@y.com',
    empresaNombre: 'MAYUKA SLU',
    zona: 'VALENCIA',
    grupo: 'TIENDA SUC.01 ULANKA',
    ...p,
  };
}

describe('ImportFichasService · idempotencia', () => {
  it('reimportar el MISMO fichero actualiza, no duplica', async () => {
    const repo = new FakeRepo();
    const service = new ImportFichasService(repo, hasher);
    const filas = [
      ficha({ fila: 4, empresaCodigo: '16', empleadoCodigo: '20', nombre: 'ROBERT', email: 'robert@y.com', grupo: 'SISTEMAS', zona: '' }),
      ficha({ fila: 13, empresaCodigo: '105', empleadoCodigo: '36', nombre: 'DAVID', email: 'david@y.com' }),
    ];

    const primera = await service.importar(filas);
    expect(primera.totales).toEqual({ creados: 2, actualizados: 0, saltados: 0 });
    expect(repo.employees.size).toBe(2);
    expect(repo.users.size).toBe(2);
    expect(primera.creados[0].passwordTemporal).toBeTruthy(); // se devuelve la contraseña temporal

    const segunda = await service.importar(filas);
    expect(segunda.totales).toEqual({ creados: 0, actualizados: 2, saltados: 0 });
    expect(repo.employees.size).toBe(2); // no se duplican fichas
    expect(repo.users.size).toBe(2); // ni usuarios
    expect(segunda.actualizados[0].passwordTemporal).toBeUndefined(); // en actualización no se genera contraseña
  });

  it('mismo código de empleado en empresas distintas = fichas distintas (clave empresa+código)', async () => {
    const repo = new FakeRepo();
    const service = new ImportFichasService(repo, hasher);
    await service.importar([
      ficha({ empresaCodigo: '105', empleadoCodigo: '36', email: 'a@y.com' }),
      ficha({ empresaCodigo: '120', empleadoCodigo: '36', email: 'b@y.com' }),
    ]);
    expect(repo.employees.size).toBe(2);
    expect(repo.companies.size).toBe(2);
  });

  it('salta filas inválidas con su motivo, sin abortar el resto', async () => {
    const repo = new FakeRepo();
    const service = new ImportFichasService(repo, hasher);
    const res = await service.importar([
      ficha({ empleadoCodigo: '', nombre: 'SIN CODIGO' }),
      ficha({ empresaCodigo: '105', empleadoCodigo: '99', nombre: 'SIN CORREO', email: '' }),
      ficha({ empresaCodigo: '105', empleadoCodigo: '36', nombre: 'OK', email: 'ok@y.com' }),
    ]);
    expect(res.totales.creados).toBe(1);
    expect(res.totales.saltados).toBe(2);
    expect(res.saltados.map((s) => s.motivo)).toEqual([
      'sin código de empleado',
      'sin correo: no se puede crear el login del empleado',
    ]);
  });

  it('no crea una 2ª ficha para un correo que ya tiene empleado (respeta el 1:1)', async () => {
    const repo = new FakeRepo();
    const service = new ImportFichasService(repo, hasher);
    // Mismo correo, dos claves de negocio distintas.
    const res = await service.importar([
      ficha({ empresaCodigo: '105', empleadoCodigo: '36', email: 'dup@y.com' }),
      ficha({ empresaCodigo: '120', empleadoCodigo: '77', email: 'dup@y.com' }),
    ]);
    expect(res.totales.creados).toBe(1);
    expect(res.totales.saltados).toBe(1);
    expect(res.saltados[0].motivo).toMatch(/ya tiene ficha/);
  });
});
