import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FileStorage } from '../application/file-storage.port';

/** Config de DigitalOcean Spaces (S3-compatible) desde el entorno. */
export interface SpacesConfig {
  endpoint: string; // p.ej. https://fra1.digitaloceanspaces.com
  region: string; // p.ej. fra1
  bucket: string;
  key: string;
  secret: string;
}

/** Lee la config de Spaces del entorno; `null` si no está completa (→ se usa otro almacenamiento). */
export function spacesConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SpacesConfig | null {
  const endpoint = env.SPACES_ENDPOINT?.trim();
  const bucket = env.SPACES_BUCKET?.trim();
  const key = env.SPACES_KEY?.trim();
  const secret = env.SPACES_SECRET?.trim();
  if (!endpoint || !bucket || !key || !secret) return null;
  return { endpoint, region: env.SPACES_REGION?.trim() || 'us-east-1', bucket, key, secret };
}

/** Adapter: ficheros en DigitalOcean Spaces (S3). Objetos **privados**; se sirven por la API, no por URL. */
export class SpacesFileStorage implements FileStorage {
  private readonly s3: S3Client;
  constructor(private readonly cfg: SpacesConfig) {
    this.s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: { accessKeyId: cfg.key, secretAccessKey: cfg.secret },
      forcePathStyle: false,
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: body, ContentType: contentType, ACL: 'private' }));
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
}
