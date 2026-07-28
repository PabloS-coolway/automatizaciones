export const FILE_STORAGE = Symbol('FILE_STORAGE');

/**
 * REQ-008 Fase 3 · Almacenamiento de ficheros (justificantes de ausencia). El fichero NO se expone por URL
 * pública: se sube con `put` y se recupera con `get` para servirlo por la API con control de acceso (dato
 * sensible). Implementaciones: DigitalOcean Spaces (S3) en prod, disco local en desarrollo.
 */
export interface FileStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
}
