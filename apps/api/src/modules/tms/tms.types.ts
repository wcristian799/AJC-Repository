export interface DocumentoFiscalInput {
  tipo: 'NFe' | 'NFCe' | 'DC';
  numero?: string;
  valor?: number;
  arquivoUrl?: string;
  arquivoHash?: string;
  origem?: 'cliente' | 'agente' | 'manual';
}

export interface CreateCargaInput {
  viagemId: string;
  clienteRemetenteId: string;
  destinatarioId?: string;
  destinatarioNome?: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla: string;
  tipoRecebimento?: 'porto_balsa' | 'direto';
  categoria?: 'carga' | 'encomenda';
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
  tipo?: 'veiculo_carga' | 'veiculo_transporte' | 'pessoa';
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
  tipo?: 'impressao' | 'reimpressao';
  printerModel?: string;
  printerMac?: string;
  clientUuid?: string;
}

export interface ConferirDocumentoInput {
  status: 'conferida' | 'divergente';
  observacao?: string;
  clientUuid?: string;
}

export interface CreateDocumentoManualInput {
  clienteRemetenteId: string;
  tipo: 'NFe' | 'NFCe' | 'DC';
  pagamento?: 'CIF' | 'FOB';
  numero: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla?: string;
  valor?: number;
  pesoTotal?: number;
  totalVolumes?: number;
  destinatarioNome?: string;
  destinatarioDocumento?: string;
  destinatarioTelefone?: string;
  arquivoUrl?: string;
  arquivoHash?: string;
  clientUuid?: string;
}

export interface PrestacaoContasItem {
  [key: string]: unknown;
}

export interface SavePrestacaoContasInput {
  viagemId: string;
  totalDeclarado?: number;
  status?: 'rascunho' | 'enviada' | 'conferida';
  itens?: PrestacaoContasItem;
  anexos?: unknown[];
}
