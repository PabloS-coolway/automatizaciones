import { RrhhError, RrhhService } from '../src/rrhh/application/rrhh.service';
import { EmployeeRepository, EmployeeRow } from '../src/rrhh/application/ports';

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
  center: null,
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
    ...over,
  };
}

describe('RrhhService · alta de empleado (REQ-008 Fase 0)', () => {
  it('enlaza con un usuario existente por correo y crea la ficha', async () => {
    let creado: { userId: number } | null = null;
    const svc = new RrhhService(
      repo({
        findUserIdByEmail: async () => 10,
        create: async (n) => {
          creado = { userId: n.userId };
          return fila({ id: 99, userId: n.userId, fullName: n.fullName, rrhhRole: n.rrhhRole });
        },
      }),
    );
    const r = await svc.crear({ email: 'ana@y.com', fullName: 'Ana', rrhhRole: 'MANAGER' });
    expect(r.id).toBe(99);
    expect(creado).toEqual({ userId: 10 }); // se enlaza al usuario del login
  });

  it('si no existe usuario con ese correo, NO crea ficha (RRHH no crea logins)', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => null }));
    await expect(svc.crear({ email: 'nadie@y.com', fullName: 'X' })).rejects.toBeInstanceOf(RrhhError);
  });

  it('un usuario que ya es empleado no se duplica', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10, findByUserId: async () => fila({}) }));
    await expect(svc.crear({ email: 'ana@y.com', fullName: 'Ana' })).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza un rol RRHH inventado', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10 }));
    // @ts-expect-error rol inválido a propósito
    await expect(svc.crear({ email: 'ana@y.com', fullName: 'Ana', rrhhRole: 'JEFAZO' })).rejects.toBeInstanceOf(RrhhError);
  });

  it('rechaza un responsable inexistente', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10, findById: async () => null }));
    await expect(svc.crear({ email: 'ana@y.com', fullName: 'Ana', managerId: 123 })).rejects.toBeInstanceOf(RrhhError);
  });

  it('nombre vacío o sin correo → error de negocio', async () => {
    const svc = new RrhhService(repo({ findUserIdByEmail: async () => 10 }));
    await expect(svc.crear({ email: 'ana@y.com', fullName: '  ' })).rejects.toBeInstanceOf(RrhhError);
    await expect(svc.crear({ email: '', fullName: 'Ana' })).rejects.toBeInstanceOf(RrhhError);
  });
});

describe('RrhhService · listVisible respeta la jerarquía', () => {
  const plantilla: EmployeeRow[] = [
    fila({ id: 1, rrhhRole: 'RRHH', managerId: null }),
    fila({ id: 2, rrhhRole: 'MANAGER', managerId: null }),
    fila({ id: 3, rrhhRole: 'EMPLEADO', managerId: 2 }),
    fila({ id: 4, rrhhRole: 'EMPLEADO', managerId: 1 }),
  ];
  const svc = new RrhhService(repo({ findAll: async () => plantilla }));

  it('RRHH ve a todos', async () => {
    const r = await svc.listVisible(fila({ id: 1, rrhhRole: 'RRHH' }));
    expect(r.map((e) => e.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('un MANAGER ve sólo su rama', async () => {
    const r = await svc.listVisible(fila({ id: 2, rrhhRole: 'MANAGER' }));
    expect(r.map((e) => e.id).sort()).toEqual([2, 3]); // él y su reporte; no el 4 (rama de RRHH)
  });
});
