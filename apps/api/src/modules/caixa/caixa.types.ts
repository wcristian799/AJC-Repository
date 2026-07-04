export interface AbrirCaixaInput {
  tipo?: string;
  referencia?: string;
  valorAbertura?: number;
}

export interface MovimentoCaixaInput {
  tipo?: 'venda_passagem' | 'despacho_carga' | 'sangria' | 'suprimento' | 'outro';
  formaPagamento?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'contrato' | 'cortesia' | 'gratuidade';
  valor?: number;
  bilheteId?: string;
  cargaId?: string;
  observacao?: string;
  clientUuid?: string;
}

export interface FinanceiroTituloInput {
  tipo: 'receber' | 'pagar';
  descricao: string;
  parteNome: string;
  vencimento: string;
  valor: number;
  status?: 'aberto' | 'vence_semana' | 'vencida' | 'pago' | 'recebido' | 'cancelado';
  origem?: string;
  observacao?: string;
  clienteId?: string;
  fornecedorId?: string;
  agenteId?: string;
  caixaMovimentoId?: string;
  cargaId?: string;
  bilheteId?: string;
  cotacaoId?: string;
  clientUuid?: string;
}
