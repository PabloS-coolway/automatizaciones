import {
  ColorWebInvalidoError,
  EditarColorWebUseCase,
  type ActivityRecorder,
} from '../src/maestro/application/editar-color-web.use-case';
import { ReferenceRepository } from '../src/maestro/application/ports';

/** Repo fake: por defecto existen dos valores y el update afecta 3 tallas. Se sobreescribe por test. */
function repo(over: Partial<ReferenceRepository> = {}): ReferenceRepository {
  return {
    count: async () => 0,
    upsertMany: async () => 0,
    upsertManySeed: async () => ({ ok: 0, failures: [], colorWebProtegidas: 0 }),
    allKeys: async () => [],
    deleteMany: async () => 0,
    existingColorWebValues: async () => ['AZUL MARINO', 'ROJO'],
    updateColorWebByRefColor: async () => ({ updated: 3, before: 'ROJO' }),
    ...over,
  };
}

describe('EditarColorWebUseCase · REQ-009 (editar color web con permiso por rol)', () => {
  it('propaga a todas las tallas del (ref, color) y devuelve cuántas cambió', async () => {
    const uc = new EditarColorWebUseCase(repo());
    const r = await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MARINO', actor: 'a@b.c' });
    expect(r.updated).toBe(3);
    expect(r.colorNameWeb).toBe('AZUL MARINO');
  });

  it('NO acepta un valor que no existe (no se inventa por un typo): ni siquiera intenta escribir', async () => {
    let intentado = false;
    const uc = new EditarColorWebUseCase(
      repo({
        updateColorWebByRefColor: async () => {
          intentado = true;
          return { updated: 1, before: null };
        },
      }),
    );
    await expect(
      uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MRINO', actor: 'a@b.c' }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
    expect(intentado).toBe(false);
  });

  it('acepta un valor NUEVO sólo si se pide explícitamente', async () => {
    const uc = new EditarColorWebUseCase(repo({ updateColorWebByRefColor: async () => ({ updated: 2, before: null }) }));
    const r = await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'VERDE MENTA', nuevo: true, actor: 'a@b.c' });
    expect(r.updated).toBe(2);
  });

  it('marca la edición con QUIÉN la hizo (para el rastro de la fila)', async () => {
    let editor = '';
    const uc = new EditarColorWebUseCase(
      repo({
        updateColorWebByRefColor: async (_ref, _color, _value, editedBy) => {
          editor = editedBy;
          return { updated: 1, before: 'ROJO' };
        },
      }),
    );
    await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'ROJO', actor: 'silvia@coolway.com' });
    expect(editor).toBe('silvia@coolway.com');
  });

  it('si no cambia ninguna fila (ref/color inexistente) → error, no un cambio fantasma', async () => {
    const uc = new EditarColorWebUseCase(repo({ updateColorWebByRefColor: async () => ({ updated: 0, before: null }) }));
    await expect(
      uc.execute({ ref: 'NOPE', color: 'RED', colorNameWeb: 'ROJO', actor: 'a@b.c' }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
  });

  it('vacío o sin ref/color → error de negocio (lo traduce el controller a 400, no un 500)', async () => {
    const uc = new EditarColorWebUseCase(repo());
    await expect(
      uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: '   ', actor: 'a@b.c' }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
    await expect(
      uc.execute({ ref: '', color: 'RED', colorNameWeb: 'ROJO', actor: 'a@b.c' }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
  });

  it('COSTURA REQ-007: deja el rastro en el log de actividad (quién, entidad y antes→después)', async () => {
    const registros: Parameters<ActivityRecorder['record']>[0][] = [];
    const recorder: ActivityRecorder = { record: async (e) => void registros.push(e) };
    const uc = new EditarColorWebUseCase(
      repo({ updateColorWebByRefColor: async () => ({ updated: 3, before: 'ROJO' }) }),
      recorder,
    );
    await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MARINO', actor: 'silvia@coolway.com' });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      actor: 'silvia@coolway.com',
      entity: 'reference',
      action: 'update',
      before: { colorNameWeb: 'ROJO' },
      after: { colorNameWeb: 'AZUL MARINO' },
    });
  });
});
