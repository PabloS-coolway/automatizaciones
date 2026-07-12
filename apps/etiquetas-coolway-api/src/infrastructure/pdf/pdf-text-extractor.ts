import { execFileSync } from 'node:child_process';

/**
 * Extrae el texto (preservando layout) de un PDF.
 *
 * ⚠️ Usa `pdftotext -layout` (poppler-utils) por fiabilidad inmediata sobre el PDF de SAP.
 * Está aislado tras esta función: migrar a una librería pura de Node (pdfjs-dist) no afecta
 * al parser ni al dominio. Requiere `pdftotext` instalado en el entorno.
 *
 * `pdftotext` es una dependencia de SISTEMA, no de npm: `npm ci` no la instala.
 */

/** Mensaje único (lo comparten el preflight, el arranque y el error que ve el usuario). */
export const PDFTOTEXT_MISSING_MESSAGE =
  'Falta "pdftotext" (paquete poppler-utils) en el servidor, necesario para leer el PDF del pedido. ' +
  'Instálalo con: sudo apt-get install -y poppler-utils';

/** El binario no está en el sistema. No es un problema del PDF ni del maestro. */
export class PdftotextNotInstalledError extends Error {
  constructor() {
    super(PDFTOTEXT_MISSING_MESSAGE);
    this.name = 'PdftotextNotInstalledError';
  }
}

/** ¿Está `pdftotext` disponible? Para avisar al arrancar en vez de fallar en la primera generación. */
export function isPdftotextInstalled(): boolean {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch (err) {
    // ENOENT = no existe el binario. Cualquier otro fallo significa que está, pero se quejó.
    return (err as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

export function extractPdfLayoutText(pdfPath: string): string {
  try {
    return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') throw new PdftotextNotInstalledError();
    throw new Error(
      `No se pudo extraer texto de "${pdfPath}". Detalle: ${(err as Error).message}`,
    );
  }
}
