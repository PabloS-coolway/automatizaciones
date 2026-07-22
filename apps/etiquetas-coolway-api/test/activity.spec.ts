import { DestinationsService } from '../src/destinos/application/destinations.service';
import { DestinationRepository } from '../src/destinos/application/ports';
import { RolesService } from '../src/auth/application/roles.service';
import { RoleRecord, RoleRepository } from '../src/auth/application/role.port';

const ACTOR = { userId: 7, email: 'admin@coolway.co' };

// Un prisma falso cuyo $transaction ejecuta el callback con un tx marcado, para verificar que el registro
// va DENTRO de la transacción (recibe ese mismo tx).
const TX = { __tx: true };
const prismaFake = { $transaction: async (fn: (tx: unknown) => unknown) => fn(TX) } as never;

function destRepo(): DestinationRepository {
  return {
    findAll: jest.fn(async () => []),
    findActive: jest.fn(async () => []),
    findByCode: jest.fn(async () => null),
    findById: jest.fn(async () => ({ id: 2, code: 'USA', name: 'USA', variant: 'EAN' as const, importadoPor: 'x', active: true })),
    create: jest.fn(async (d) => ({ ...d, id: 99, active: true })),
    update: jest.fn(async (id, data) => ({ id, code: 'USA', name: 'USA', variant: 'EAN' as const, importadoPor: 'x', active: true, ...data })),
  };
}

describe('REQ-007 · el log se escribe en cada mutación (y dentro de la transacción)', () => {
  it('crear un destino registra un CREATE con el estado resultante', async () => {
    const recorder = { record: jest.fn() };
    const s = new DestinationsService(destRepo(), recorder as never, prismaFake);
    await s.create({ code: 'JAPON', name: 'Japón', variant: 'EAN', importadoPor: 'JP' }, ACTOR);

    expect(recorder.record).toHaveBeenCalledTimes(1);
    const [entry, tx] = recorder.record.mock.calls[0];
    expect(entry).toMatchObject({ action: 'CREATE', entity: 'DESTINATION', actor: ACTOR });
    expect(entry.after).toMatchObject({ code: 'JAPON' });
    expect(tx).toBe(TX); // ← se registra DENTRO de la transacción del cambio
  });

  it('editar un destino registra un UPDATE con antes→después', async () => {
    const recorder = { record: jest.fn() };
    const s = new DestinationsService(destRepo(), recorder as never, prismaFake);
    await s.update(2, { name: 'Estados Unidos' }, ACTOR);

    const [entry] = recorder.record.mock.calls[0];
    expect(entry).toMatchObject({ action: 'UPDATE', entity: 'DESTINATION' });
    expect(entry.before).toBeDefined();
    expect(entry.after).toMatchObject({ name: 'Estados Unidos' });
  });

  it('crear/editar un ROL también deja su entrada', async () => {
    const roles: RoleRecord[] = [
      { id: 1, key: 'admin', name: 'Admin', features: ['roles.gestionar'], active: true, system: true },
    ];
    const repo: RoleRepository = {
      findAll: jest.fn(async () => roles),
      findByKey: jest.fn(async () => null),
      findById: jest.fn(async () => roles[0]),
      featuresOf: jest.fn(async () => []),
      create: jest.fn(async (d) => ({ ...d, id: 5, active: true, system: false })),
      update: jest.fn(async (_id, data) => ({ ...roles[0], ...data })),
    };
    const recorder = { record: jest.fn() };
    const s = new RolesService(repo, recorder as never, prismaFake);

    await s.create({ key: 'contable', name: 'Contable', features: ['maestro.ver'] }, ACTOR);
    expect(recorder.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'ROLE' }),
      TX,
    );

    await s.update(1, { name: 'Administrador' }, ACTOR);
    expect(recorder.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'UPDATE', entity: 'ROLE' }),
      TX,
    );
  });

  it('ROMPER A PROPÓSITO: si un usecase deja de registrar, este test cae', async () => {
    // Garantía de que ninguna mutación se escapa sin auditar: se exige la llamada al recorder.
    const recorder = { record: jest.fn() };
    const s = new DestinationsService(destRepo(), recorder as never, prismaFake);
    await s.create({ code: 'X', name: 'X', variant: 'EAN', importadoPor: 'x' }, ACTOR);
    expect(recorder.record).toHaveBeenCalled();
  });
});
