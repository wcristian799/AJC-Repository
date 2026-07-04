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
  clientUuid?: string;
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
