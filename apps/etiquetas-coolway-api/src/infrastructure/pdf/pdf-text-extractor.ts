import { execFileSync } from 'node:child_process';

/**
 * Extrae el texto (preservando layout) de un PDF.
 *
 * ⚠️ Usa `pdftotext -layout` (poppler-utils) por fiabilidad inmediata sobre el PDF de SAP.
 * Está aislado tras esta función: migrar a una librería pura de Node (pdfjs-dist) no afecta
 * al parser ni al dominio. Requiere `pdftotext` instalado en el entorno.
 */
export function extractPdfLayoutText(pdfPath: string): string {
  try {
    return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(
      `No se pudo extraer texto de "${pdfPath}". ¿Está instalado pdftotext (poppler-utils)? Detalle: ${
        (err as Error).message
      }`,
    );
  }
}
