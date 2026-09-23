import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { crearManejadorMcp } from '../src/mcp/interface/http/mcp-http';
import { LecturaMaestroPort } from '../src/mcp/application/ports';

/**
 * El endpoint de verdad (SDK de MCP + HTTP), sobre un puerto falso: comprueba el control de acceso y que
 * una conversación MCP completa (initialize → tools/list → tools/call) funciona sin estado.
 */
const lectura: LecturaMaestroPort = {
  estadisticas: async () => ({ total: 2, conEan: 2, conUpc: 0, models: [{ style: 'GOAL', count: 2 }] }),
  contar: async () => 0,
  referencias: async () => ({ total: 0, grandTotal: 2, items: [] }),
  facetas: async (column) => ({ column, values: [] }),
  skus: async () => ({ total: 0, filas: [], completo: true }),
  destinos: async () => [],
  surtidos: async () => [],
};

describe('MCP HTTP · /api/mcp', () => {
  let server: Server;
  let url: string;
  let tokens: string | undefined;

  beforeAll(async () => {
    const manejar = crearManejadorMcp({ lectura, leerTokens: () => tokens });
    server = createServer((req, res) => void manejar(req, res));
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/mcp`;
  });
  afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

  const rpc = (body: unknown, auth?: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });

  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } } };

  it('sin MCP_TOKENS → 503 (deshabilitado, no abierto)', async () => {
    tokens = undefined;
    const r = await rpc(initialize, 'Bearer cualquiera');
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: { message: string } }).error.message).toMatch(/MCP_TOKENS/);
  });

  it('sin token → 401; token malo → 401', async () => {
    tokens = 'bueno';
    expect((await rpc(initialize)).status).toBe(401);
    const malo = await rpc(initialize, 'Bearer malo');
    expect(malo.status).toBe(401);
    expect(malo.headers.get('www-authenticate')).toBe('Bearer');
  });

  it('GET y DELETE → 405 (sin estado: no hay canal SSE ni sesión), y siguen exigiendo token', async () => {
    tokens = 'bueno';
    expect((await fetch(url, { method: 'GET' })).status).toBe(401);
    const get = await fetch(url, { method: 'GET', headers: { Authorization: 'Bearer bueno', Accept: 'text/event-stream' } });
    expect(get.status).toBe(405);
    expect(get.headers.get('allow')).toBe('POST, OPTIONS');
    expect((await fetch(url, { method: 'DELETE', headers: { Authorization: 'Bearer bueno' } })).status).toBe(405);
  });

  it('OPTIONS (preflight CORS) responde 204 sin pedir token', async () => {
    const r = await fetch(url, { method: 'OPTIONS' });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('con token bueno: initialize, tools/list y tools/call funcionan (sin sesión)', async () => {
    tokens = 'otro, bueno';
    const ini = await rpc(initialize, 'Bearer bueno');
    expect(ini.status).toBe(200);
    const iniJson = (await ini.json()) as { result: { serverInfo: { name: string }; instructions: string } };
    expect(iniJson.result.serverInfo.name).toBe('maestro-coolway');
    expect(iniJson.result.instructions).toMatch(/NUNCA se inventan/);

    const lista = (await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, 'Bearer bueno')).json()) as {
      result: { tools: { name: string; annotations?: { readOnlyHint?: boolean } }[] };
    };
    expect(lista.result.tools.map((t) => t.name)).toContain('skus_maestro');
    expect(lista.result.tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);

    const llamada = (await (
      await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'estadisticas_maestro', arguments: {} } }, 'Bearer bueno')
    ).json()) as { result: { content: { text: string }[]; isError?: boolean } };
    expect(llamada.result.isError).toBeFalsy();
    expect(JSON.parse(llamada.result.content[0].text)).toEqual(expect.objectContaining({ referencias: 2, modelos: 1 }));
  });

  it('un argumento inválido vuelve como error de la herramienta, no tumba el servidor', async () => {
    tokens = 'bueno';
    const r = (await (
      await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'facetas', arguments: { columna: 'passwordHash' } } }, 'Bearer bueno')
    ).json()) as { result?: { isError?: boolean }; error?: unknown };
    expect(r.result?.isError === true || r.error !== undefined).toBe(true);
  });
});
