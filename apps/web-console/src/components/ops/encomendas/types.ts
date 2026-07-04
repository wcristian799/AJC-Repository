export type EncomendaTamanho = "P" | "M" | "G";
export type EncomendaPagador = "remetente" | "destinatario";
export type EncomendaStatus = "recebido" | "conferido" | "embarcado" | "em_viagem" | "desembarcado" | "entregue";

export type EncomendaUi = {
  id: string;
  apiId?: string;
  codigo: string;
  remetenteId: string;
  remetente: string;
  destinatario: string;
  destinatarioContato: string;
  trecho: string;
  tamanho: EncomendaTamanho;
  peso: number;
  valorDeclarado: number;
  valorCobrado: number;
  modoPreco: "fixo" | "percentual";
  quemPaga: EncomendaPagador;
  dcId: string;
  status: EncomendaStatus;
  viagemId?: string;
  conteudo: string;
  criadoEm: string;
  notificado: boolean;
  sincronizado: boolean;
};

export type DeclaracaoConteudoUi = {
  id: string;
  encomendaId: string;
  descricao: string;
  valorDeclarado: number;
  textoTermoVersao: string;
  assinaturaOk: boolean;
  aceiteEm: string;
  dispositivo: string;
};

export type ViagemEncomendaUi = {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  status: "planejada" | "em_curso" | "concluida" | "cancelada" | string;
  escalas: Array<{ cidade: string; horaPrevista: string; horaReal?: string }>;
  embarcacaoNome: string;
};

export type PrecoEncomendaResultado = {
  preco: number;
  modo: "fixo" | "percentual";
  limiteFixo: number;
  percentual?: number;
};

export type PrecoEncomendaTabela = {
  trecho: string;
  origemSigla: string;
  destinoSigla: string;
  p: number;
  m: number;
  g: number;
  percentual: number;
};

export type ClienteEncomendaUi = {
  id: string;
  nome: string;
  documento: string;
  cidade: string;
};
