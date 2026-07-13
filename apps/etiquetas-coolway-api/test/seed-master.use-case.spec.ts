import { SeedMasterUseCase, findSharedEan13 } from '../src/maestro/application/seed-master.use-case';
import { MasterFileReader, ReferenceRepository, SeedFailure, SeedRow, SeedRowInput } from '../src/maestro/application/ports';

const fila = (p: Partial<SeedRow>): SeedRow => ({
  style: 'GOAL',
  color: 'RED',
  ref: '7603298',
  size: '40',
  sku: '7603298-40',
  ...p,
});

describe('findSharedEan13 · qué EAN repetido es un problema y cuál no', () => {
  it('NO avisa de la re-referenciación: mismo modelo+color con dos refs comparte código legítimamente', () => {
    // GOAL MIX se re-referenció en SAP (7643409 ↔ 7673119) y conserva su EAN. Es correcto.
    const filas = [
      fila({ style: 'GOAL', color: 'MIX', ref: '7673119', size: '36', ean13: '8433852502965' }),
      fila({ style: 'GOAL', color: 'MIX', ref: '7643409', size: '36', ean13: '8433852502965' }),
    ];
    expect(findSharedEan13(filas)).toEqual([]);
  });

  it('SÍ avisa cuando el mismo EAN está en PRODUCTOS distintos (en caja sería ambiguo)', () => {
    const filas = [
      fila({ style: 'BECKS', color: 'BUR', ref: '7693165', size: '36', ean13: '8433852544569' }),
      fila({ style: 'BECKS', color: 'RED', ref: '7653165', size: '36', ean13: '8433852544569' }),
    ];
    const avisos = findSharedEan13(filas);

    expect(avisos).toHaveLength(1);
    expect(avisos[0].ean13).toBe('8433852544569');
    expect(avisos[0].rows.map((r) => r.color)).toEqual(['BUR', 'RED']);
  });

  it('ignora las filas sin EAN (no se inventa nada: no son duplicados)', () => {
    const filas = [fila({ ean13: undefined }), fila({ ref: '8603810', ean13: undefined })];
    expect(findSharedEan13(filas)).toEqual([]);
  });

  it('un EAN usado una sola vez no es aviso', () => {
    expect(findSharedEan13([fila({ ean13: '8433852502965' })])).toEqual([]);
  });
});

describe('SeedMasterUseCase · carga del maestro', () => {
  const reader = (rows: SeedRowInput[]): MasterFileReader => ({ read: async () => rows });

  /** Repo en memoria: guarda todo salvo las refs que se le digan que rechace (p.ej. error de BD). */
  const repo = (rechaza: string[] = []) => {
    const guardadas: SeedRow[] = [];
    let previas = 0;
    const r: ReferenceRepository = {
      count: async () => (guardadas.length ? guardadas.length : previas),
      upsertMany: async () => 0,
      upsertManySeed: async (rows) => {
        const failures: SeedFailure[] = [];
        for (const row of rows) {
          if (rechaza.includes(row.ref)) {
            failures.push({ style: row.style, color: row.color, ref: row.ref, size: row.size, reason: 'rejected' });
          } else guardadas.push(row);
        }
        return { ok: guardadas.length, failures };
      },
    };
    return { r, guardadas, setPrevias: (n: number) => (previas = n) };
  };

  it('compone el SKU cuando el Excel no lo trae (nunca se inventa un CÓDIGO, el SKU sí se calcula)', async () => {
    const { r, guardadas } = repo();
    await new SeedMasterUseCase(reader([{ style: 'GOAL', color: 'RED', ref: '7603298', size: '40' }]), r).execute({
      source: 'x.xlsx',
    });
    expect(guardadas[0].sku).toBeTruthy();
  });

  it('un EAN13 con formato inválido se guarda VACÍO (no se inventa el código)', async () => {
    const { r, guardadas } = repo();
    await new SeedMasterUseCase(
      // "ice green" es un caso real del maestro: una celda desplazada.
      reader([{ style: 'DUCK', color: 'KAK', ref: '8663596', size: '46', ean13: 'ice green', upc: '12345' }]),
      r,
    ).execute({ source: 'x.xlsx' });

    expect(guardadas[0].ean13).toBeUndefined();
    expect(guardadas[0].upc).toBeUndefined(); // UPC de 5 dígitos: tampoco es válido
  });

  it('ignora las filas sin modelo/color/ref/talla y lo refleja en el informe', async () => {
    const { r } = repo();
    const informe = await new SeedMasterUseCase(
      reader([
        { style: 'GOAL', color: 'RED', ref: '7603298', size: '40' },
        { style: '', color: 'RED', ref: '7603298', size: '41' }, // sin modelo → fuera
      ]),
      r,
    ).execute({ source: 'x.xlsx' });

    expect(informe.rows).toBe(2);
    expect(informe.valid).toBe(1);
  });

  it('una fila rechazada por la BD no tumba el resto, y se reporta', async () => {
    const { r } = repo(['8603810']);
    const informe = await new SeedMasterUseCase(
      reader([
        { style: 'GOAL', color: 'RED', ref: '7603298', size: '40' },
        { style: 'GOAL', color: 'BLU', ref: '8603810', size: '41' },
      ]),
      r,
    ).execute({ source: 'x.xlsx' });

    expect(informe.upserted).toBe(1);
    expect(informe.failed).toBe(1);
    expect(informe.issues[0].ref).toBe('8603810');
  });

  it('el informe incluye los avisos de EAN compartido entre productos distintos', async () => {
    const { r } = repo();
    const informe = await new SeedMasterUseCase(
      reader([
        { style: 'BECKS', color: 'BUR', ref: '7693165', size: '36', ean13: '8433852544569' },
        { style: 'BECKS', color: 'RED', ref: '7653165', size: '36', ean13: '8433852544569' },
      ]),
      r,
    ).execute({ source: 'x.xlsx' });

    // Entran las dos filas (el EAN repetido ya no rechaza)…
    expect(informe.upserted).toBe(2);
    expect(informe.failed).toBe(0);
    // …pero se avisa, para que se corrija en origen.
    expect(informe.sharedEan13).toHaveLength(1);
    expect(informe.sharedEan13[0].ean13).toBe('8433852544569');
  });
});
