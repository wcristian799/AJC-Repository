import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import { Client as MinioClient } from 'minio';

export type FiscalParty = {
  nome?: string;
  documento?: string;
  telefone?: string;
};

export type FiscalExtraction = {
  tipo: 'NFe' | 'NFCe' | 'DC';
  numero?: string;
  chaveAcesso?: string;
  valor?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  pagamento?: 'CIF' | 'FOB';
  remetente: FiscalParty;
  destinatario: FiscalParty;
  xmlLido: boolean;
};

export type UploadedDocument = {
  bucket: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  hash: string;
  bytes: number;
  extraction: FiscalExtraction;
};

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class TmsDocumentService {
  private readonly bucket = 'documentos-fiscais';

  async uploadAndExtract(file: UploadedFile): Promise<UploadedDocument> {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo da NF/DC obrigatorio');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Arquivo deve ter ate 10 MB');
    const mimeType = normalizeMime(file.mimetype, file.originalname);
    if (!['application/xml', 'application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
      throw new BadRequestException('Formato invalido. Envie XML, PDF, JPG ou PNG');
    }
    const extraction = mimeType === 'application/xml'
      ? extractNfe(file.buffer.toString('utf8'))
      : emptyExtraction();
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const objectKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName(file.originalname)}`;
    const clients = this.createClients();
    let lastError: unknown;
    for (const client of clients) {
      try {
        if (!(await client.bucketExists(this.bucket))) await client.makeBucket(this.bucket, process.env.OBJECT_STORAGE_REGION || 'us-east-1');
        await client.putObject(this.bucket, objectKey, file.buffer, file.size, {
          'Content-Type': mimeType,
          'X-Amz-Meta-Sha256': hash,
        });
        return { bucket: this.bucket, objectKey, fileName: file.originalname, mimeType, hash, bytes: file.size, extraction };
      } catch (error) {
        lastError = error;
      }
    }
    throw new ServiceUnavailableException(`Object storage indisponivel: ${lastError instanceof Error ? lastError.message : 'falha desconhecida'}`);
  }

  private createClients() {
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
    const uniqueCredentials = resolveStorageCredentials(process.env);
    if (!endpoint || !uniqueCredentials.length) {
      throw new ServiceUnavailableException('Object storage nao configurado para receber NF/DC');
    }
    const url = new URL(endpoint);
    return uniqueCredentials.map(([accessKey, secretKey]) => new MinioClient({
      endPoint: url.hostname,
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
      useSSL: url.protocol === 'https:',
      accessKey,
      secretKey,
      region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
    }));
  }
}

export function resolveStorageCredentials(environment: NodeJS.ProcessEnv): Array<[string, string]> {
  const credentials = [
    [environment.OBJECT_STORAGE_ACCESS_KEY, environment.OBJECT_STORAGE_SECRET_KEY],
    [environment.MINIO_ROOT_USER, environment.MINIO_ROOT_PASSWORD],
  ].filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]));
  return credentials.filter((entry, index) => credentials.findIndex((candidate) => candidate[0] === entry[0] && candidate[1] === entry[1]) === index);
}

export function extractNfe(xml: string): FiscalExtraction {
  let parsed: Record<string, unknown>;
  try {
    parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false }).parse(xml);
  } catch {
    throw new BadRequestException('XML invalido ou corrompido');
  }
  const infNFe = findNode(parsed, 'infNFe');
  if (!infNFe) throw new BadRequestException('O XML nao contem uma NF-e/NFC-e valida');
  const ide = objectValue(infNFe.ide);
  const emit = objectValue(infNFe.emit);
  const dest = objectValue(infNFe.dest);
  const total = objectValue(objectValue(infNFe.total).ICMSTot);
  const transp = objectValue(infNFe.transp);
  const volumes = arrayValue(transp.vol).map(objectValue);
  const model = textValue(ide.mod);
  const key = textValue(infNFe['@_Id']).replace(/^NFe/, '') || undefined;
  const freight = textValue(transp.modFrete);
  const totalVolumes = sumNumbers(volumes.map((volume) => numberValue(volume.qVol)));
  const pesoTotal = sumNumbers(volumes.map((volume) => numberValue(volume.pesoB) ?? numberValue(volume.pesoL)));
  return {
    tipo: model === '65' ? 'NFCe' : 'NFe',
    numero: textValue(ide.nNF) || key,
    chaveAcesso: key,
    valor: numberValue(total.vNF),
    pesoTotal,
    totalVolumes: totalVolumes ? Math.max(1, Math.round(totalVolumes)) : undefined,
    pagamento: freight === '0' ? 'CIF' : ['1', '4'].includes(freight) ? 'FOB' : undefined,
    remetente: partyFrom(emit, 'emit'),
    destinatario: partyFrom(dest, 'dest'),
    xmlLido: true,
  };
}

function partyFrom(node: Record<string, unknown>, addressKey: string): FiscalParty {
  const address = objectValue(node[`ender${addressKey[0].toUpperCase()}${addressKey.slice(1)}`]);
  return {
    nome: textValue(node.xNome) || undefined,
    documento: textValue(node.CNPJ) || textValue(node.CPF) || undefined,
    telefone: textValue(address.fone) || undefined,
  };
}

function findNode(value: unknown, key: string): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record[key] && typeof record[key] === 'object') return objectValue(record[key]);
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findNode(item, key);
        if (found) return found;
      }
    } else {
      const found = findNode(child, key);
      if (found) return found;
    }
  }
  return null;
}

function emptyExtraction(): FiscalExtraction {
  return { tipo: 'NFe', remetente: {}, destinatario: {}, xmlLido: false };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function textValue(value: unknown): string {
  return value === undefined || value === null ? '' : String(value).trim();
}

function numberValue(value: unknown): number | undefined {
  const parsed = Number(textValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sumNumbers(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => value !== undefined);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) : undefined;
}

function normalizeMime(mime: string, name: string) {
  const extension = name.toLowerCase().split('.').pop();
  if (extension === 'xml' || mime.includes('xml')) return 'application/xml';
  if (extension === 'pdf' || mime === 'application/pdf') return 'application/pdf';
  if (extension === 'png' || mime === 'image/png') return 'image/png';
  if (['jpg', 'jpeg'].includes(extension ?? '') || mime === 'image/jpeg') return 'image/jpeg';
  return mime;
}

function safeName(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || 'documento';
}
