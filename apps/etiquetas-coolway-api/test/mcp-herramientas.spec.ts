import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_POR_PAGINA, MAX_SKUS, aFiltros, definirHerramientas, INSTRUCCIONES_SERVIDOR } from '../src/mcp/application/herramientas';
import { LecturaMaestroPort } from '../src/mcp/application/ports';
import { LecturaMaestroAdapter } from '../src/mcp/infrastructure/lectura-maestro.adapter';

/** Puerto falso: devuelve datos fijos y deja ver con qué filtros se le llamó. */
function lecturaFalsa(over: Partial<LecturaMaestroPort> = {}): jest.Mocked<LecturaMaestroPort> {
  return {
    estadisticas: jest.fn().mockResolvedValue({ total: 10, conEan: 9, conUpc: 4, models: [{ style: 'GOAL', count: 6 }, { style: 'BECKS', count: 4 }] }),
    contar: jest.fn().mockImplementation(async (f) => (f.sinEan ? 1 : f.sinUpc ? 6 : 3)),
    referencias: jest.fn().mockResolvedValue({
      total: 1,
      grandTotal: 10,
      items: [{ style: 'GOAL', color: 'BLK', ref: '7612345', size: '40', sku: 'SKU1', ean13: null, upc: '012345678905', colorNameWeb: 'Black', season: 'SS26' }],
    }),
    facetas: jest.fn().mockImplementation(async (column) => ({
      column,
      values: column === 'season' ? [{ value: '(vacío)', count: 2 }, { value: 'SS26', count: 8 }] : [{ value: '(vacío)', count: 3 }, { value: 'Black', count: 7 }],
    })),
    skus: jest.fn().mockResolvedValue({ total: 1, filas: [{ sku: 'SKU1', ean13: null, upc: null, style: 'GOAL', color: 'BLK', size: '40', season: 'SS26' }], completo: true }),
    destinos: jest.fn().mockResolvedValue([
      { code: 'USA', name: 'Estados Unidos', variant: 'UPC', importadoPor: 'X', active: true },
      { code: 'OLD', name: 'Viejo', variant: 'EAN', importadoPor: 'Y', active: false },
    ]),
    surtidos: jest.fn().mockResolvedValue([{ grupo: '76', codigo: '0G2' }, { grupo: '86', codigo: 'A01' }]),
    ...over,
  } as jest.Mocked<LecturaMaestroPort>;
}

const herramienta = (l: LecturaMaestroPort, nombre: string) => {
  const h = definirHerramientas(l).find((x) => x.nombre === nombre);
  if (!h) throw new Error(`no existe ${nombre}`);
  return h;
};

describe('MCP de lectura · ALCANCE (falla si alguien amplía la lista sin decidirlo)', () => {
  const nombres = definirHerramientas(lecturaFalsa()).map((h) => h.nombre);

  it('expone EXACTAMENTE estas herramientas', () => {
    expect(nombres.sort()).toEqual(
      ['buscar_referencias', 'estadisticas_maestro', 'facetas', 'listar_destinos', 'listar_surtidos', 'skus_maestro'].sort(),
    );
  });

  it('ninguna herramienta toca RRHH, usuarios, roles ni actividad, ni escribe', () => {
    const prohibido = /rrhh|usuario|user|rol|emplead|fichaj|ausenc|festiv|activ|auditor|login|password|crear|editar|borrar|actualizar|importar|cargar/i;
    for (const h of definirHerramientas(lecturaFalsa())) {
      expect(h.nombre).not.toMatch(prohibido);
    }
  });

  it('el código del MCP no importa módulos de RRHH, auth ni actividad', () => {
    const raiz = join(__dirname, '..', 'src', 'mcp');
    const ficheros = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? ficheros(join(dir, f)) : [join(dir, f)]));
    for (const f of ficheros(raiz)) {
      const imports = readFileSync(f, 'utf8').match(/from '[^']+'/g) ?? [];
      for (const i of imports) expect(i).not.toMatch(/rrhh|auth|actividad|usuario/);
    }
  });

  it('las instrucciones dejan claro que los códigos no se inventan y lo que falta se reporta', () => {
    expect(INSTRUCCIONES_SERVIDOR).toMatch(/ÚNICA autoridad/);
    expect(INSTRUCCIONES_SERVIDOR).toMatch(/NUNCA se inventan/);
    expect(INSTRUCCIONES_SERVIDOR).toMatch(/REPORTA/);
  });
});

describe('MCP de lectura · herramientas', () => {
  it('estadisticas_maestro: totales coherentes (con + sin = total) y temporadas sin el "(vacío)"', async () => {
    const r = (await herramienta(lecturaFalsa(), 'estadisticas_maestro').ejecutar({})) as Record<string, unknown>;
    expect(r).toEqual(
      expect.objectContaining({
        referencias: 10,
        modelos: 2,
        conEan: 9,
        sinEan: 1,
        conUpc: 4,
        sinUpc: 6,
        sinColorWeb: 3,
        coloresWebDistintos: 1,
        temporadas: [{ temporada: 'SS26', filas: 8 }],
        sinTemporada: 2,
      }),
    );
  });

  it('buscar_referencias: traduce filtros, pagina y devuelve un EAN ausente como null (no lo rellena)', async () => {
    const l = lecturaFalsa();
    const r = (await herramienta(l, 'buscar_referencias').ejecutar({ style: 'GOAL', season: ['SS26'], sinEan: true, pagina: 3, porPagina: 20 })) as {
      total: number; pagina: number; paginas: number; filas: { ean13: unknown; season: unknown }[];
    };
    expect(l.referencias).toHaveBeenCalledWith({ style: ['GOAL'], season: ['SS26'], sinEan: true }, 20, 40);
    expect(r.total).toBe(1);
    expect(r.pagina).toBe(3);
    expect(r.paginas).toBe(1);
    expect(r.filas[0].ean13).toBeNull();
    expect(r.filas[0].season).toBe('SS26');
  });

  it(`buscar_referencias: porPagina se topa en ${MAX_POR_PAGINA} y los valores raros caen al defecto`, async () => {
    const l = lecturaFalsa();
    await herramienta(l, 'buscar_referencias').ejecutar({ porPagina: 5000 });
    expect(l.referencias).toHaveBeenLastCalledWith({}, MAX_POR_PAGINA, 0);
    await herramienta(l, 'buscar_referencias').ejecutar({ porPagina: -1, pagina: 'x' });
    expect(l.referencias).toHaveBeenLastCalledWith({}, 50, 0);
  });

  it('aFiltros: sinColorWeb = color web "(vacío)"; combinarlo con un color web es un error explícito', () => {
    expect(aFiltros({ sinColorWeb: true })).toEqual({ colorNameWeb: ['(vacío)'] });
    expect(() => aFiltros({ sinColorWeb: true, colorNameWeb: 'Black' })).toThrow(/No combines/);
    expect(aFiltros({ style: [], texto: '  ', ean13: ' 8433 ' })).toEqual({ ean13: '8433' });
  });

  it('facetas: sólo columnas de la lista blanca', async () => {
    const l = lecturaFalsa();
    const r = (await herramienta(l, 'facetas').ejecutar({ columna: 'season', style: 'GOAL' })) as { distintos: number };
    expect(l.facetas).toHaveBeenCalledWith('season', { style: ['GOAL'] });
    expect(r.distintos).toBe(2);
    await expect(herramienta(l, 'facetas').ejecutar({ columna: 'passwordHash' })).rejects.toThrow(/no permitida/);
  });

  it('listar_destinos: todos o sólo activos, con los campos acordados', async () => {
    const l = lecturaFalsa();
    expect(await herramienta(l, 'listar_destinos').ejecutar({})).toEqual(expect.objectContaining({ total: 2 }));
    expect(await herramienta(l, 'listar_destinos').ejecutar({ soloActivos: true })).toEqual({
      total: 1,
      destinos: [{ code: 'USA', name: 'Estados Unidos', variant: 'UPC', importadoPor: 'X', active: true }],
    });
  });

  it('listar_surtidos: filtra por grupo', async () => {
    expect(await herramienta(lecturaFalsa(), 'listar_surtidos').ejecutar({ grupo: '86' })).toEqual({ total: 1, surtidos: [{ grupo: '86', codigo: 'A01' }] });
  });

  it(`skus_maestro: pide hasta ${MAX_SKUS} con sólo season/style y devuelve { total, filas }`, async () => {
    const l = lecturaFalsa();
    const r = await herramienta(l, 'skus_maestro').ejecutar({ season: 'SS26', texto: 'ignorado' });
    expect(l.skus).toHaveBeenCalledWith({ season: ['SS26'] }, MAX_SKUS);
    expect(r).toEqual({ total: 1, filas: [expect.objectContaining({ sku: 'SKU1', ean13: null })] });
  });

  it('skus_maestro: si supera el tope, ERROR claro (nunca una lista incompleta que parezca completa)', async () => {
    const l = lecturaFalsa({ skus: jest.fn().mockResolvedValue({ total: 25_000, filas: [], completo: false }) });
    await expect(herramienta(l, 'skus_maestro').ejecutar({})).rejects.toThrow(/25000 filas.*tope/);
  });
});

describe('LecturaMaestroAdapter · reutiliza consultas y repositorios existentes', () => {
  it('delega en MaestroQuery y copia sólo los campos acordados de destinos y surtidos', async () => {
    const maestro = { stats: jest.fn(), count: jest.fn(), references: jest.fn(), facets: jest.fn(), skus: jest.fn() };
    const destinos = { findAll: jest.fn().mockResolvedValue([{ id: 1, code: 'USA', name: 'EEUU', variant: 'UPC', importadoPor: 'X', active: true, secreto: 'no' }]) };
    const surtidos = { findAll: jest.fn().mockResolvedValue([{ id: 9, grupo: '76', codigo: '0G2' }]) };
    const a = new LecturaMaestroAdapter(maestro as never, destinos as never, surtidos as never);

    await a.estadisticas();
    await a.contar({ sinEan: true });
    await a.referencias({}, 10, 0);
    await a.facetas('season', {});
    await a.skus({}, 5);
    expect(maestro.stats).toHaveBeenCalled();
    expect(maestro.count).toHaveBeenCalledWith({ sinEan: true });
    expect(maestro.references).toHaveBeenCalledWith({}, 10, 0);
    expect(maestro.facets).toHaveBeenCalledWith('season', {});
    expect(maestro.skus).toHaveBeenCalledWith({}, 5);
    expect(await a.destinos()).toEqual([{ code: 'USA', name: 'EEUU', variant: 'UPC', importadoPor: 'X', active: true }]);
    expect(await a.surtidos()).toEqual([{ grupo: '76', codigo: '0G2' }]);
  });
});
