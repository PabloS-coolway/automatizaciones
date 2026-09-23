import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Tokens de servicio del MCP de lectura (variable `MCP_TOKENS`, separados por comas).
 *
 * No son usuarios de la app: son credenciales de MÁQUINA (p.ej. el agente de consulta "Yorgi"). Por eso no
 * pasan por el login JWT, pero el endpoint NUNCA queda abierto: sin tokens configurados responde 503.
 */
export function parsearTokens(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Saca el token de `Authorization: Bearer <token>`. Cualquier otra forma → cadena vacía. */
export function tokenDeCabecera(cabecera: string | string[] | undefined): string {
  const valor = Array.isArray(cabecera) ? cabecera[0] : cabecera;
  const m = /^Bearer\s+(.+)$/i.exec(String(valor ?? '').trim());
  return m ? m[1].trim() : '';
}

const huella = (s: string): Buffer => createHash('sha256').update(s, 'utf8').digest();

/**
 * ¿Es uno de los tokens configurados? Comparación en tiempo constante: se comparan las HUELLAS (mismo
 * tamaño siempre, así `timingSafeEqual` no filtra la longitud) y se recorren TODOS los tokens sin cortar
 * al primer acierto, para que el tiempo no diga cuál casó ni cuántos hay antes.
 */
export function tokenValido(token: string, configurados: string[]): boolean {
  if (!token) return false;
  const h = huella(token);
  let ok = false;
  for (const c of configurados) {
    if (timingSafeEqual(h, huella(c))) ok = true;
  }
  return ok;
}

export type ResultadoAcceso =
  | { ok: true }
  | { ok: false; status: 401 | 503; mensaje: string };

/** Decide el acceso al MCP a partir de la cabecera y de la configuración. Lógica pura (se prueba sin HTTP). */
export function comprobarAcceso(cabecera: string | string[] | undefined, mcpTokens: string | undefined): ResultadoAcceso {
  const configurados = parsearTokens(mcpTokens);
  if (configurados.length === 0) {
    return {
      ok: false,
      status: 503,
      mensaje: 'MCP de lectura deshabilitado: no hay tokens configurados (variable MCP_TOKENS). No se deja abierto sin credenciales.',
    };
  }
  if (!tokenValido(tokenDeCabecera(cabecera), configurados)) {
    return { ok: false, status: 401, mensaje: 'Token no válido. Envía Authorization: Bearer <token> con uno de los tokens de MCP_TOKENS.' };
  }
  return { ok: true };
}
