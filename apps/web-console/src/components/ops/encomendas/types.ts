import type { EncomendaApi, EncomendasConfigApi } from "@/lib/ajc-api";

export type EncomendaUi = EncomendaApi;
export type EncomendaConfigUi = EncomendasConfigApi;
export type ViagemEncomendaUi = {
  id: string; codigo: string; origem: string; destino: string; status: string; embarcacaoNome: string;
  escalas: Array<{ cidade: string; horaPrevista: string; horaReal?: string }>;
};
export type ClienteEncomendaUi = { id: string; nome: string; documento: string; telefone?: string; cidade: string; codigo?: string };
export type PrecoEncomendaTabela = {
  trecho: string; origemSigla: string; destinoSigla: string;
  valores: Record<string, number>; percentual: number; versao: number;
};
export type PrecoEncomendaResultado = { preco: number; modo: "fixo" | "percentual"; limiteFixo: number; percentual?: number; tabelaVersao: number };
