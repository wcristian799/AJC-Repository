import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { Client as MinioClient } from "minio";
import { resolveStorageCredentials } from "./tms-document.service";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class TmsEvidenceService {
  private readonly bucket = "recebimento-fotos";

  async upload(file: UploadedFile) {
    if (!file?.buffer?.length)
      throw new BadRequestException("Evidencia obrigatoria");
    if (file.size > 12 * 1024 * 1024)
      throw new BadRequestException("Evidencia deve ter ate 12 MB");
    const mime = normalizeMime(file.mimetype, file.originalname);
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
      throw new BadRequestException("Envie uma foto JPG, PNG ou WebP");
    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName(file.originalname)}`;
    let lastError: unknown;
    for (const client of this.clients()) {
      try {
        if (!(await client.bucketExists(this.bucket)))
          await client.makeBucket(
            this.bucket,
            process.env.OBJECT_STORAGE_REGION || "us-east-1",
          );
        await client.putObject(this.bucket, key, file.buffer, file.size, {
          "Content-Type": mime,
          "X-Amz-Meta-Sha256": hash,
        });
        return {
          bucket: this.bucket,
          objetoChave: key,
          url: `s3://${this.bucket}/${key}`,
          hash,
          bytes: file.size,
          nome: file.originalname,
          mime,
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw new ServiceUnavailableException(
      `Object storage indisponivel: ${lastError instanceof Error ? lastError.message : "falha desconhecida"}`,
    );
  }

  private clients() {
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
    const credentials = resolveStorageCredentials(process.env);
    if (!endpoint || !credentials.length)
      throw new ServiceUnavailableException(
        "Object storage nao configurado para evidencias do recebimento",
      );
    const url = new URL(endpoint);
    return credentials.map(
      ([accessKey, secretKey]) =>
        new MinioClient({
          endPoint: url.hostname,
          port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
          useSSL: url.protocol === "https:",
          accessKey,
          secretKey,
          region: process.env.OBJECT_STORAGE_REGION || "us-east-1",
        }),
    );
  }
}

function normalizeMime(mime: string, name: string) {
  const extension = name.toLowerCase().split(".").pop();
  if (["jpg", "jpeg"].includes(extension ?? "") || mime === "image/jpeg")
    return "image/jpeg";
  if (extension === "png" || mime === "image/png") return "image/png";
  if (extension === "webp" || mime === "image/webp") return "image/webp";
  return mime;
}

function safeName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-180) || "evidencia"
  );
}
