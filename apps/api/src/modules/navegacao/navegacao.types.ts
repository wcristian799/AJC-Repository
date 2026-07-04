export interface ViagemEscalaInput {
  cidadeSigla: string;
  dataHoraPrevista?: string;
  observacao?: string;
}

export interface CreateViagemInput {
  embarcacaoId: string;
  origemSigla: string;
  destinoSigla?: string;
  dataHoraSaida: string;
  dataHoraRetorno?: string;
  capacidadePaxDisponivel?: Record<string, unknown>;
  observacoes?: string;
  clientUuid?: string;
  escalas: ViagemEscalaInput[];
}

export interface NotifyEscalasInput {
  escalaIds?: string[];
  clientUuid?: string;
}
