export interface CreateBilheteInput {
  viagemId: string;
  clienteId?: string;
  passageiroNome?: string;
  passageiroDocumento?: string;
  classe: string;
  subtipo?: string;
  tipo?: 'online' | 'pdv' | 'totem' | 'contrato' | 'cortesia' | 'gratuidade';
  canal?: string;
  itemPrecoId?: string;
  precoPago?: number;
  assento?: string;
  caixaId?: string;
  formaPagamento?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'contrato' | 'cortesia' | 'gratuidade';
  cortesiaCodigo?: string;
  gratuidadeTipo?: 'idoso' | 'pcd' | 'crianca' | 'outro';
  documentoUrl?: string;
  observacoes?: string;
  emitirBpe?: boolean;
  origemSigla?: string;
  destinoSigla?: string;
  clientUuid?: string;
}

export interface CreatePdvVendaItemInput {
  classe: string;
  itemPrecoId?: string;
  passageiroNome?: string;
  passageiroDocumento?: string;
  tipo?: 'pdv' | 'cortesia' | 'gratuidade';
  cortesiaCodigo?: string;
  gratuidadeTipo?: 'idoso' | 'pcd' | 'crianca' | 'outro';
  documentoUrl?: string;
  observacoes?: string;
}

export interface CreatePdvVendaInput {
  caixaId: string;
  viagemId: string;
  origemSigla: string;
  destinoSigla: string;
  clienteId?: string;
  canal?: string;
  emitirBpe?: boolean;
  itens: CreatePdvVendaItemInput[];
  pagamentos: Array<{
    formaPagamento: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
    valor: number;
    parcelas?: number;
  }>;
  clientUuid: string;
}

export interface CreateCortesiaInput {
  viagemId: string;
  classe?: string;
  motivo?: string;
  observacoes?: string;
  clientUuid?: string;
}

export interface ValidarBilheteInput {
  qrToken?: string;
  clientUuid?: string;
  latitude?: number;
  longitude?: number;
  dispositivo?: string;
  validadoEm?: string;
}
