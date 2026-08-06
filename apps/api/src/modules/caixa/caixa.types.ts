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
  competencia?: string;
  planoContaId?: string;
  centroCustoId?: string;
  viagemId?: string;
  parcelaNumero?: number;
  parcelasTotal?: number;
  documentoNome?: string;
  documentoUrl?: string;
  documentoHash?: string;
  clientUuid?: string;
}

export interface FinanceiroTitulosFiltro {
  tipo?: 'receber' | 'pagar';
  de?: string;
  ate?: string;
  status?: string;
  busca?: string;
  planoContaId?: string;
  centroCustoId?: string;
  page?: number;
  pageSize?: number;
}

export interface LiquidarTituloInput {
  valor?: number;
  dataLiquidacao?: string;
  formaPagamento?: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'contrato' | 'cortesia' | 'gratuidade';
  caixaMovimentoId?: string;
  observacao?: string;
  clientUuid?: string;
}

export interface CriarComissaoInput {
  agenteId: string;
  tituloReceberId?: string;
  viagemId?: string;
  baseValor: number;
  percentual: number;
  clientUuid?: string;
}

export interface CriarFaturaInput {
  tipo: 'emitida' | 'recebida';
  cnpjEmitente?: string;
  cnpjDestinatario?: string;
  numero?: string;
  chaveAcesso?: string;
  emissao?: string;
  vencimento?: string;
  valor: number;
  status?: string;
  tituloId?: string;
  arquivoUrl?: string;
  arquivoHash?: string;
  observacao?: string;
  clientUuid?: string;
}
