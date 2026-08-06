export type BpeEnvironment = 'homologacao' | 'producao';

export interface BpeRouteConfig {
  origemSigla: string;
  destinoSigla: string;
  cPercurso: string;
  xPercurso: string;
  tpViagem: string;
  tpServ: string;
  tpTrecho: string;
}

export interface BpeClassConfig {
  classe: string;
  tpAcomodacao: string;
}

export interface BpePaymentConfig {
  formaPagamento: string;
  tPag: string;
}

export interface BpeIntegrationConfig {
  schemaVersion: 1;
  provider: 'ns';
  habilitada: boolean;
  ambiente: BpeEnvironment;
  versaoLayout: string;
  serie: number | null;
  numeroInicial: number | null;
  modal: string;
  verProc: string;
  tpBPe: string;
  indPres: string;
  emitente: {
    cnpj: string;
    ie: string;
    razaoSocial: string;
    im: string;
    cnae: string;
    crt: string;
    tar: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      codigoIbge: string;
      municipio: string;
      uf: string;
    };
  };
  rotas: BpeRouteConfig[];
  classes: BpeClassConfig[];
  pagamentos: BpePaymentConfig[];
  componenteTarifa: string | null;
  tipoDocumentoPassageiroPadrao: string | null;
  impostos: Record<string, unknown>;
  operacao: {
    pollingSegundos: number;
    tentativasConsulta: number;
    retryMinutos: number;
    maxTentativas: number;
  };
}

export interface BpeIssueResponse {
  status: number;
  motivo?: string;
  nsNRec?: string | number;
  erros?: unknown;
}

export interface BpeStatusResponse {
  status: number;
  motivo?: string;
  chBPe?: string;
  cStat?: string | number;
  xMotivo?: string;
  nProt?: string;
  dhRecbto?: string;
  xml?: string;
  erro?: { cStat?: string | number; xMotivo?: string };
}

export interface BpeDownloadResponse {
  status: number;
  motivo?: string;
  chBPe?: string;
  xml?: string;
  pdf?: string;
}

export interface BpeCancelResponse {
  status: number;
  motivo?: string;
  retEvento?: {
    cStat?: string | number;
    xMotivo?: string;
    chBPe?: string;
    dhRegEvento?: string;
    nProt?: string;
    xml?: string;
  };
}
