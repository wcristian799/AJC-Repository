export interface PortalViagensQuery {
  origem?: string;
  destino?: string;
  data?: string;
}

export interface PortalPedidoItemInput {
  classe: string;
  subtipo?: string;
  quantidade?: number;
  assento?: string;
}

export interface PortalClienteInput {
  nome?: string;
  documento?: string;
  email?: string;
  whatsapp?: string;
}

export interface CreatePortalPedidoInput {
  viagemId: string;
  itens: PortalPedidoItemInput[];
  cliente?: PortalClienteInput;
  termoAceito?: boolean;
  ttlMinutos?: number;
  clientUuid?: string;
}

export interface CreatePortalPagamentoInput {
  metodo?: 'pix' | 'cartao_credito' | 'cartao_debito';
}

export interface GatewayStubWebhookInput {
  eventId?: string;
  pedidoCodigo?: string;
  gatewayPaymentId?: string;
  status?: 'aprovado' | 'recusado';
  payload?: Record<string, unknown>;
}
