export type AlertaOperacionalSeveridade = 'info' | 'warning' | 'danger';
export type AlertaOperacionalStatus = 'aberto' | 'resolvido' | 'cancelado';

export type CreateAlertaOperacionalInput = {
  titulo?: string;
  detalhe?: string;
  severidade?: AlertaOperacionalSeveridade;
  modulo?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  clientUuid?: string | null;
};

export type UpdateAlertaOperacionalInput = {
  titulo?: string;
  detalhe?: string;
  severidade?: AlertaOperacionalSeveridade;
  status?: AlertaOperacionalStatus;
  modulo?: string | null;
  entidade?: string | null;
  entidadeId?: string | null;
  clientUuid?: string | null;
};
