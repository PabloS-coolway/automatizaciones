import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { FileStorage } from '../application/file-storage.port';

/**
 * Adapter de **desarrollo**: guarda los ficheros en disco local (bajo `baseDir`). NO usar en producción
 * (App Platform tiene disco efímero): en prod se usa Spaces. Permite verificar el flujo completo sin
 * credenciales cloud. La `key` puede llevar `/`: se crean los subdirectorios.
 */
export class LocalFileStorage implements FileStorage {
  constructor(private readonly baseDir: string) {}

  private ruta(key: string): string {
    // Evita salir del baseDir (defensivo): resuelve y comprueba prefijo.
    const abs = resolve(this.baseDir, key);
    if (!abs.startsWith(resolve(this.baseDir))) throw new Error('Clave de fichero no válida.');
    return abs;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const ruta = this.ruta(key);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.ruta(key));
  }

  static enDirectorio(dir = join(process.cwd(), 'uploads')): LocalFileStorage {
    return new LocalFileStorage(dir);
  }
}

/** Almacenamiento DESHABILITADO (prod sin Spaces configurado): falla claro en vez de perder ficheros en silencio. */
export class DisabledFileStorage implements FileStorage {
  async put(): Promise<void> {
    throw new Error('Almacenamiento de ficheros no configurado (define SPACES_* para subir justificantes).');
  }
  async get(): Promise<Buffer> {
    throw new Error('Almacenamiento de ficheros no configurado.');
  }
}
