import { BpeCancelResponse, BpeDownloadResponse, BpeIssueResponse, BpeStatusResponse } from './fiscal.types';

export class NsBpeClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(environment: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = (environment.BPE_NS_BASE_URL || 'https://bpe.ns.eti.br/v1').replace(/\/$/, '');
    this.token = environment.BPE_NS_TOKEN?.trim() ?? '';
  }

  isConfigured() {
    return Boolean(this.token);
  }

  issue(payload: Record<string, unknown>) {
    return this.post<BpeIssueResponse>('/bpe/issue', payload);
  }

  status(cnpj: string, nsNRec: string) {
    return this.post<BpeStatusResponse>('/bpe/issue/status', { CNPJ: cnpj, nsNRec });
  }

  download(chBPe: string, tpAmb: 1 | 2) {
    return this.post<BpeDownloadResponse>('/bpe/get', { chBPe, tpDown: 'XP', tpAmb: String(tpAmb) });
  }

  cancel(input: { chBPe: string; tpAmb: 1 | 2; dhEvento: string; nProt: string; xJust: string }) {
    return this.post<BpeCancelResponse>('/bpe/cancel', input);
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    if (!this.token) throw new Error('BPE_NS_TOKEN nao configurado');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ 'X-AUTH-TOKEN': this.token, ...body }),
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`NS BP-e retornou conteudo invalido (${response.status})`);
      }
      if (!response.ok) {
        throw new Error(`NS BP-e indisponivel (${response.status}): ${extractReason(parsed)}`);
      }
      return parsed as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function extractReason(value: unknown) {
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return String(record.motivo ?? record.message ?? 'falha sem detalhe');
  }
  return 'falha sem detalhe';
}
