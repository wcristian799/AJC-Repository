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
  rotaTemplateId?: string;
  configVersaoId?: string;
  cicloUuid?: string;
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
  rotaTemplateId?: string;
  configVersaoId?: string;
  cicloUuid?: string | null;
}

export interface TransicionarViagemInput {
  acao?: 'iniciar' | 'concluir' | 'cancelar';
  motivo?: string;
  clientUuid?: string;
}

export interface NotifyEscalasInput {
  escalaIds?: string[];
  clientUuid?: string;
}
