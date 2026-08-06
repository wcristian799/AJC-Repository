import { createHash } from 'node:crypto';
import { Client as MinioClient } from 'minio';
import { resolveStorageCredentials } from '../tms/tms-document.service';

export class FiscalStorageService {
  readonly bucket = 'bpe-documentos';

  async put(key: string, content: Buffer, mime: string) {
    if (!content.length) throw new Error('Documento fiscal vazio');
    const hash = createHash('sha256').update(content).digest('hex');
    let lastError: unknown;
    for (const client of this.clients()) {
      try {
        if (!(await client.bucketExists(this.bucket))) {
          await client.makeBucket(this.bucket, process.env.OBJECT_STORAGE_REGION || 'us-east-1');
        }
        await client.putObject(this.bucket, key, content, content.length, {
          'Content-Type': mime,
          'X-Amz-Meta-Sha256': hash,
        });
        return { bucket: this.bucket, key, hash };
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Object storage indisponivel para BP-e: ${lastError instanceof Error ? lastError.message : 'falha desconhecida'}`);
  }

  async presignedGet(key: string, expiresSeconds = 300) {
    let lastError: unknown;
    for (const client of this.clients()) {
      try {
        return await client.presignedGetObject(this.bucket, key, expiresSeconds);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Nao foi possivel gerar o download fiscal: ${lastError instanceof Error ? lastError.message : 'falha desconhecida'}`);
  }

  private clients() {
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
    const credentials = resolveStorageCredentials(process.env);
    if (!endpoint || !credentials.length) throw new Error('Object storage nao configurado para BP-e');
    const url = new URL(endpoint);
    return credentials.map(([accessKey, secretKey]) => new MinioClient({
      endPoint: url.hostname,
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
      useSSL: url.protocol === 'https:',
      accessKey,
      secretKey,
      region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
    }));
  }
}
