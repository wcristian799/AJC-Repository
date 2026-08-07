export interface SaveCampoAplicativoInput {
  nome: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
}

export interface SaveCampoContextoInput {
  usuarioId: string;
  aplicativoCodigo?: string;
  localOperacionalId?: string;
  viagemId?: string;
  inicioEm: string;
  fimEm?: string;
  ativo?: boolean;
  observacao?: string;
  clientUuid?: string;
}

export interface RegisterCampoDispositivoInput {
  identificador: string;
  plataforma: string;
  modelo?: string;
  versaoSistema?: string;
  versaoAplicativo?: string;
}

export interface PortariaQuery {
  busca?: string;
  situacao?: "patio" | "saida" | "todas";
  localId?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: string;
  porPagina?: string;
}

export interface PortariaEntradaInput {
  placa: string;
  empresaNome: string;
  empresaTipo?: "cliente" | "fornecedor";
  empresaId?: string;
  motoristaNome?: string;
  localOperacionalId: string;
  fotoUrl?: string;
  fotoHash?: string;
  ocorridoEm?: string;
  clientUuid: string;
}

export interface PortariaSaidaInput {
  fotoUrl?: string;
  fotoHash?: string;
  ocorridoEm?: string;
  clientUuid: string;
}

export interface VehicleChecklistInput {
  etapa: "recebimento" | "embarque" | "entrega";
  itens: Record<string, boolean | string | number>;
  avarias?: Array<Record<string, unknown>>;
  quilometragem?: number;
  horimetro?: number;
  fotos?: Array<{ angulo:string; url:string; hash:string }>;
  recebedorNome?: string;
  recebedorDocumento?: string;
  assinaturaUrl?: string;
  assinaturaHash?: string;
  cidadeSigla?: string;
  clientUuid: string;
}
