import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { HerramientaLectura, INSTRUCCIONES_SERVIDOR, definirHerramientas } from '../../application/herramientas';
import { LecturaMaestroPort } from '../../application/ports';
import { comprobarAcceso } from '../../application/token-servicio';

type Req = IncomingMessage & { body?: unknown };

/**
 * MCP remoto de SOLO LECTURA del maestro (Streamable HTTP, sin estado).
 *
 *   POST/GET/DELETE /api/mcp   →  Authorization: Bearer <token de MCP_TOKENS>
 *
 * Va como ruta de Express POR FUERA de Nest (se registra en `main.ts` antes del init para que no la tape
 * el 404 de Nest): así no pasa por el JwtAuthGuard —no es un usuario, es una máquina—, pero exige SU token.
 * Cada petición crea un servidor efímero: sin sesiones, sin estado en memoria entre llamadas.
 */
export function crearServidorMcp(lectura: LecturaMaestroPort, registro?: (e: RegistroLlamada) => void): McpServer {
  const server = new McpServer({ name: 'maestro-coolway', version: '1.0.0' }, { instructions: INSTRUCCIONES_SERVIDOR });
  for (const h of definirHerramientas(lectura)) registrar(server, h, registro);
  return server;
}

export interface RegistroLlamada {
  herramienta: string;
  ok: boolean;
  ms: number;
  error?: string;
}

function registrar(server: McpServer, h: HerramientaLectura, registro?: (e: RegistroLlamada) => void): void {
  // La firma genérica de registerTool infiere tipos a partir del esquema; aquí el tipado útil ya está en
  // `HerramientaLectura`, así que se relaja para no pelear con la inferencia del SDK.
  const registerTool = server.registerTool.bind(server) as unknown as (
    nombre: string,
    config: { description: string; inputSchema: unknown; annotations: Record<string, unknown> },
    cb: (args: Record<string, unknown>) => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>,
  ) => void;

  registerTool(
    h.nombre,
    { description: h.descripcion, inputSchema: h.esquema, annotations: { readOnlyHint: true, openWorldHint: false } },
    async (args) => {
      const t0 = Date.now();
      try {
        const r = await h.ejecutar(args ?? {});
        registro?.({ herramienta: h.nombre, ok: true, ms: Date.now() - t0 });
        return { content: [{ type: 'text', text: JSON.stringify(r) }] };
      } catch (e) {
        const mensaje = (e as Error).message;
        registro?.({ herramienta: h.nombre, ok: false, ms: Date.now() - t0, error: mensaje });
        return { content: [{ type: 'text', text: mensaje }], isError: true };
      }
    },
  );
}

/** Código JSON-RPC por estado HTTP: 400 = JSON ilegible; 401 = sin credencial válida; 503 = deshabilitado. */
const CODIGO_JSONRPC: Record<number, number> = { 400: -32700, 401: -32001, 405: -32000, 503: -32000 };

function responderError(res: ServerResponse, status: number, mensaje: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: CODIGO_JSONRPC[status] ?? -32603, message: mensaje }, id: null }));
}

async function cuerpo(req: Req): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  if (req.method !== 'POST') return undefined;
  const trozos: Buffer[] = [];
  for await (const c of req) trozos.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  const texto = Buffer.concat(trozos).toString('utf8');
  return texto ? JSON.parse(texto) : undefined;
}

export interface OpcionesMcpHttp {
  lectura: LecturaMaestroPort;
  /** Se lee EN CADA petición (no al arrancar): cambiar la variable y reiniciar basta; y es fácil de probar. */
  leerTokens: () => string | undefined;
  registro?: (e: RegistroLlamada) => void;
}

export function crearManejadorMcp({ lectura, leerTokens, registro }: OpcionesMcpHttp) {
  return async function manejar(req: Req, res: ServerResponse): Promise<void> {
    // CORS: esta ruta va por fuera de Nest (y de su enableCors).
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const acceso = comprobarAcceso(req.headers.authorization, leerTokens());
    if (!acceso.ok) return responderError(res, acceso.status, acceso.mensaje);

    // Sin sesión no hay nada que escuchar (GET = canal SSE del servidor) ni que cerrar (DELETE = fin de sesión).
    // La especificación permite 405 aquí; dejar el GET abierto sería una conexión colgada para siempre.
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return responderError(res, 405, 'Este MCP es sin estado: sólo admite POST (JSON-RPC). GET y DELETE no aplican.');
    }

    let body: unknown;
    try {
      body = await cuerpo(req);
    } catch {
      return responderError(res, 400, 'Cuerpo JSON no válido.');
    }

    try {
      const server = crearServidorMcp(lectura, registro);
      // Sin sesión (stateless) y respondiendo JSON en vez de SSE: cada llamada es independiente.
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (e) {
      if (!res.headersSent) responderError(res, 500, `Error interno del MCP: ${(e as Error).message}`);
    }
  };
}
