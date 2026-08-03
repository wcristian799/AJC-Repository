export interface DocumentoFiscalInput {
  tipo: "NFe" | "NFCe" | "DC";
  numero?: string;
  valor?: number;
  arquivoUrl?: string;
  arquivoHash?: string;
  origem?: "cliente" | "agente" | "manual";
}

export interface CreateCargaInput {
  viagemId: string;
  clienteRemetenteId: string;
  destinatarioId?: string;
  destinatarioNome?: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla: string;
  tipoRecebimento?: "porto_balsa" | "direto";
  categoria?: "carga" | "encomenda";
  valorDeclarado?: number;
  valorCobrado?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  numeroDocumento?: string;
  numeroPedido?: string;
  documentoIds?: string[];
  observacoes?: string;
  clientUuid?: string;
  documento?: DocumentoFiscalInput;
}

export interface RegistroPortariaInput {
  placa?: string;
  empresa: string;
  motoristaNome?: string;
  tipo?: "veiculo_carga" | "veiculo_transporte" | "pessoa";
  fotoUrl?: string;
  clientUuid?: string;
}

export interface EntregaInput {
  viagemId?: string;
  cidadeSigla: string;
  volumeIds: string[];
  recebedorNome?: string;
  recebedorDoc?: string;
  recebedorAvulso?: boolean;
  justificativa?: string;
  assinaturaUrl?: string;
  assinaturaHash?: string;
  foto1Url?: string;
  foto2Url?: string;
  foto1Hash?: string;
  foto2Hash?: string;
  clientUuid?: string;
}

export interface SaveDeclaracaoConteudoInput {
  descricaoInformada?: string;
  valorDeclarado?: number;
  assinaturaUrl?: string;
  assinaturaHash?: string;
  dispositivo?: string;
  aceiteEm?: string;
}

export interface AllocatePaleteInput {
  viagemId: string;
  cidadeDestinoSigla: string;
  volumeIds?: string[];
  clientUuid?: string;
}

export interface PrintEtiquetaInput {
  tipo?: "impressao" | "reimpressao";
  printerModel?: string;
  printerMac?: string;
  clientUuid?: string;
}

export interface SaveLocalOperacionalInput {
  codigo: string;
  nome: string;
  tipo: "porto" | "patio" | "embarcacao" | "outro";
  cidadeSigla?: string;
  embarcacaoId?: string;
  ativo?: boolean;
}

export interface SavePaleteInput {
  proprietario: "AJC" | "terceiro";
  clienteProprietarioId?: string;
  fornecedorProprietarioId?: string;
  localOperacionalId: string;
  ativo?: boolean;
}

export interface OpenConferenciaInput {
  viagemId: string;
  paleteId?: string;
  localOperacionalId: string;
  cidadeDestinoSigla: string;
  tipoUnitizacao: "AVULSA" | "MP" | "PD" | "PC";
  clientUuid?: string;
}

export interface AddConferenciaItemInput {
  documentoFiscalId: string;
  quantidadeInformada: number;
  justificativa?: string;
  clientUuid?: string;
}

export interface ScanConferenciaVolumeInput {
  volumeUuid: string;
  clientUuid?: string;
}

export interface CloseConferenciaInput {
  estadoComposicao?: "parcial" | "completo";
  evidencias?: Array<{
    url: string;
    hash: string;
    nome?: string;
    mime?: string;
  }>;
  observacao?: string;
  clientUuid?: string;
}

export interface ReleasePaleteInput {
  localOperacionalId: string;
  motivo: string;
  clientUuid?: string;
}

export interface PrintTargetEtiquetaInput extends PrintEtiquetaInput {
  alvoTipo: "palete" | "volume";
  alvoId: string;
  conferenciaId?: string;
  justificativa?: string;
  etiquetaOriginalId?: string;
}

export interface ConferirDocumentoInput {
  status: "conferida" | "divergente";
  observacao?: string;
  clientUuid?: string;
}

export interface CreateDocumentoInput {
  uploadId: string;
  viagemId: string;
  clienteRemetenteId?: string;
  remetenteNome: string;
  remetenteDocumento?: string;
  remetenteTelefone?: string;
  tipo: "NFe" | "NFCe" | "DC";
  pagamento?: "CIF" | "FOB";
  numero: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla?: string;
  valor?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  destinatarioNome?: string;
  destinatarioDocumento?: string;
  destinatarioTelefone?: string;
  agendadoPara?: string;
  tipoUnitizacao?: "AVULSA" | "MP" | "PD" | "PC";
  clientUuid?: string;
}

export interface TmsControlQuery {
  busca?: string;
  embarcacaoId?: string;
  cidadeSigla?: string;
  status?: "planejada" | "em_curso" | "concluida" | "cancelada";
  dataInicio?: string;
  dataFim?: string;
  pagina?: string;
  porPagina?: string;
}

export interface TmsControlVolumesQuery {
  busca?: string;
  cidadeSigla?: string;
  status?: string;
  pagina?: string;
  porPagina?: string;
}

export interface PrestacaoReceitaInput {
  id?: string;
  categoria: string;
  formaPagamento: string;
  descricao?: string;
  valor: number;
  origemSigla?: string;
  destinoSigla?: string;
  agencia?: string;
}

export interface PrestacaoDespesaInput {
  id?: string;
  categoria: string;
  escopo: 'cidade' | 'viagem';
  cidadeSigla?: string;
  descricao: string;
  valor: number;
}

export interface PrestacaoContasItem {
  caixaInicial?: number;
  receitas: PrestacaoReceitaInput[];
  despesas: PrestacaoDespesaInput[];
  observacoes?: string;
  localFechamento?: string;
  semMovimento?: boolean;
}

export interface SavePrestacaoContasInput {
  viagemId: string;
  clientUuid?: string;
  itens: PrestacaoContasItem;
  anexos?: unknown[];
}

export interface ConferirPrestacaoContasInput {
  observacao?: string;
  clientUuid?: string;
}
