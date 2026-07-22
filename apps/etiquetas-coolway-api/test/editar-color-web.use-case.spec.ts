import {
  ColorWebInvalidoError,
  EditarColorWebUseCase,
  type TransactionRunner,
} from '../src/maestro/application/editar-color-web.use-case';
import { ReferenceRepository } from '../src/maestro/application/ports';
import { ActivityRecord, ActivityRecorder } from '../src/actividad/application/activity-recorder.port';

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

/** Runner de transacción de mentira: ejecuta el callback con un `tx` cualquiera (no hay BD en el test). */
const db: TransactionRunner = { $transaction: async (fn) => fn({} as never) };

/** Recorder de mentira que va guardando lo que se registra, para comprobar el rastro. */
function recorderSpy() {
  const registros: ActivityRecord[] = [];
  const recorder: ActivityRecorder = { record: async (e) => void registros.push(e) };
  return { recorder, registros };
}

const actor = { userId: 7, email: 'silvia@coolway.com' };

describe('EditarColorWebUseCase · REQ-009 (editar color web con permiso por rol)', () => {
  it('propaga a todas las tallas del (ref, color) y devuelve cuántas cambió', async () => {
    const uc = new EditarColorWebUseCase(repo(), recorderSpy().recorder, db);
    const r = await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MARINO', actor });
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
      recorderSpy().recorder,
      db,
    );
    await expect(
      uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MRINO', actor }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
    expect(intentado).toBe(false);
  });

  it('acepta un valor NUEVO sólo si se pide explícitamente', async () => {
    const uc = new EditarColorWebUseCase(
      repo({ updateColorWebByRefColor: async () => ({ updated: 2, before: null }) }),
      recorderSpy().recorder,
      db,
    );
    const r = await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'VERDE MENTA', nuevo: true, actor });
    expect(r.updated).toBe(2);
  });

  it('marca la edición con QUIÉN la hizo (el email del actor)', async () => {
    let editor = '';
    const uc = new EditarColorWebUseCase(
      repo({
        updateColorWebByRefColor: async (_ref, _color, _value, editedBy) => {
          editor = editedBy;
          return { updated: 1, before: 'ROJO' };
        },
      }),
      recorderSpy().recorder,
      db,
    );
    await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'ROJO', actor });
    expect(editor).toBe('silvia@coolway.com');
  });

  it('si no cambia ninguna fila (ref/color inexistente) → error y NO registra un cambio fantasma', async () => {
    const { recorder, registros } = recorderSpy();
    const uc = new EditarColorWebUseCase(
      repo({ updateColorWebByRefColor: async () => ({ updated: 0, before: null }) }),
      recorder,
      db,
    );
    await expect(
      uc.execute({ ref: 'NOPE', color: 'RED', colorNameWeb: 'ROJO', actor }),
    ).rejects.toBeInstanceOf(ColorWebInvalidoError);
    expect(registros).toHaveLength(0); // no se audita un cambio que no ocurrió
  });

  it('vacío o sin ref/color → error de negocio (lo traduce el controller a 400, no un 500)', async () => {
    const uc = new EditarColorWebUseCase(repo(), recorderSpy().recorder, db);
    await expect(uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: '   ', actor })).rejects.toBeInstanceOf(
      ColorWebInvalidoError,
    );
    await expect(uc.execute({ ref: '', color: 'RED', colorNameWeb: 'ROJO', actor })).rejects.toBeInstanceOf(
      ColorWebInvalidoError,
    );
  });

  it('REQ-007 · deja el rastro en el log de actividad: actor, entidad REFERENCE y antes→después', async () => {
    const { recorder, registros } = recorderSpy();
    const uc = new EditarColorWebUseCase(
      repo({ updateColorWebByRefColor: async () => ({ updated: 3, before: 'ROJO' }) }),
      recorder,
      db,
    );
    await uc.execute({ ref: '7603298', color: 'RED', colorNameWeb: 'AZUL MARINO', actor });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      actor: { userId: 7, email: 'silvia@coolway.com' },
      action: 'UPDATE',
      entity: 'REFERENCE',
      entityId: '7603298/RED',
      before: { colorNameWeb: 'ROJO' },
      after: { colorNameWeb: 'AZUL MARINO' },
    });
  });
});
