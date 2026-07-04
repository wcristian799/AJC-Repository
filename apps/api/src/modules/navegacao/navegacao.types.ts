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

export interface UpdateViagemInput {
  embarcacaoId?: string;
  origemSigla?: string;
  destinoSigla?: string | null;
  dataHoraSaida?: string;
  dataHoraRetorno?: string | null;
  status?: 'planejada' | 'em_curso' | 'concluida' | 'cancelada';
  situacao?: 'no_prazo' | 'atencao' | 'atrasado' | null;
  capacidadePaxDisponivel?: Record<string, unknown>;
  observacoes?: string | null;
  escalas?: ViagemEscalaInput[];
}

export interface NotifyEscalasInput {
  escalaIds?: string[];
  clientUuid?: string;
}
