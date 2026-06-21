/**
 * Enums de domínio do MVP — fonte da verdade em TypeScript, espelhando os
 * `CREATE TYPE` do Postgres (ver docs/fase-0/01-Modelo-de-Dados-MVP.md §2).
 *
 * Regra: nenhum valor de NEGÓCIO (preço, tolerância, texto) vive aqui — só os
 * conjuntos fechados de domínio. Valores configuráveis vão no motor de config.
 */

// ── Pessoas / acesso ────────────────────────────────────────────────
export const TipoPessoa = ['PF', 'PJ'] as const;
export type TipoPessoa = (typeof TipoPessoa)[number];

// ── Navegação ───────────────────────────────────────────────────────
export const TipoEmbarcacao = ['passeio_carga', 'carga'] as const;
export type TipoEmbarcacao = (typeof TipoEmbarcacao)[number];

export const StatusEmbarcacao = ['ativa', 'manutencao', 'alugada'] as const;
export type StatusEmbarcacao = (typeof StatusEmbarcacao)[number];

export const StatusViagem = ['planejada', 'em_curso', 'concluida'] as const;
export type StatusViagem = (typeof StatusViagem)[number];

export const SituacaoViagem = ['no_prazo', 'atencao', 'atrasado'] as const;
export type SituacaoViagem = (typeof SituacaoViagem)[number];

export const StatusEscala = [
  'planejada',
  'notificada',
  'confirmada',
  'cancelada',
] as const;
export type StatusEscala = (typeof StatusEscala)[number];

// ── TMS / Carga ─────────────────────────────────────────────────────
export const TipoRecebimentoCarga = ['porto_balsa', 'direto'] as const;
export type TipoRecebimentoCarga = (typeof TipoRecebimentoCarga)[number];

export const StatusCarga = [
  'aberta',
  'conferida',
  'embarcada',
  'entregue',
  'divergente',
  'cancelada',
] as const;
export type StatusCarga = (typeof StatusCarga)[number];

export const StatusVolume = [
  'recebido',
  'conferido',
  'embarcado',
  'reconferido',
  'desembarcado',
  'entregue',
  'divergente',
] as const;
export type StatusVolume = (typeof StatusVolume)[number];

export const TipoEventoVolume = [
  'recebido',
  'conferido',
  'embarcado',
  'reconferido',
  'desembarcado',
  'entregue',
  'divergencia',
] as const;
export type TipoEventoVolume = (typeof TipoEventoVolume)[number];

export const ProprietarioPalete = ['AJC', 'terceiro'] as const;
export type ProprietarioPalete = (typeof ProprietarioPalete)[number];

export const StatusPalete = ['livre', 'alocado', 'em_transito'] as const;
export type StatusPalete = (typeof StatusPalete)[number];

export const TipoDocumentoFiscal = ['NFe', 'NFCe', 'DC'] as const;
export type TipoDocumentoFiscal = (typeof TipoDocumentoFiscal)[number];

export const StatusDocumentoFiscal = [
  'pendente',
  'conferida',
  'divergente',
] as const;
export type StatusDocumentoFiscal = (typeof StatusDocumentoFiscal)[number];

export const TipoRegistroPortaria = [
  'veiculo_carga',
  'veiculo_transporte',
  'pessoa',
] as const;
export type TipoRegistroPortaria = (typeof TipoRegistroPortaria)[number];

export const StatusPrestacao = ['rascunho', 'enviada', 'conferida'] as const;
export type StatusPrestacao = (typeof StatusPrestacao)[number];

// ── Vendas / Passagens ──────────────────────────────────────────────
export const ClassePassagem = ['rede', 'rede_vip', 'camarote'] as const;
export type ClassePassagem = (typeof ClassePassagem)[number];

export const TipoBilhete = [
  'online',
  'pdv',
  'totem',
  'contrato',
  'cortesia',
  'gratuidade',
] as const;
export type TipoBilhete = (typeof TipoBilhete)[number];

export const StatusBilhete = [
  'emitido',
  'validado',
  'usado',
  'cancelado',
  'reembolsado',
] as const;
export type StatusBilhete = (typeof StatusBilhete)[number];

// 🔶 lista legal de gratuidade a confirmar com jurídico
export const TipoGratuidade = ['idoso', 'pcd', 'crianca', 'outro'] as const;
export type TipoGratuidade = (typeof TipoGratuidade)[number];

// ── CRM ─────────────────────────────────────────────────────────────
export const TipoCotacao = ['encomenda', 'carga', 'veiculo'] as const;
export type TipoCotacao = (typeof TipoCotacao)[number];

export const StatusCotacao = ['aberta', 'convertida', 'expirada'] as const;
export type StatusCotacao = (typeof StatusCotacao)[number];

// ── Preços ──────────────────────────────────────────────────────────
export const TipoTabelaPreco = ['passagem', 'encomenda', 'carga'] as const;
export type TipoTabelaPreco = (typeof TipoTabelaPreco)[number];

// ── Caixa (financeiro mínimo do MVP) ────────────────────────────────
export const StatusCaixa = ['aberto', 'fechado'] as const;
export type StatusCaixa = (typeof StatusCaixa)[number];

export const TipoMovimentoCaixa = [
  'venda_passagem',
  'despacho_carga',
  'sangria',
  'suprimento',
  'outro',
] as const;
export type TipoMovimentoCaixa = (typeof TipoMovimentoCaixa)[number];

export const FormaPagamento = [
  'dinheiro',
  'pix',
  'cartao_credito',
  'cartao_debito',
  'contrato',
  'cortesia',
  'gratuidade',
] as const;
export type FormaPagamento = (typeof FormaPagamento)[number];

// ── Auditoria ───────────────────────────────────────────────────────
export const AcaoAudit = [
  'criar',
  'atualizar',
  'excluir',
  'transicao_status',
  'validar',
  'conferir',
  'entregar',
  'login',
  'config_publicar',
  'reajuste_preco',
] as const;
export type AcaoAudit = (typeof AcaoAudit)[number];

// ── Cidades conhecidas (seed; conjunto pode crescer — é tabela, não enum) ──
export const CIDADES_SEED = [
  { sigla: 'BEL', nome: 'Belém', base: true },
  { sigla: 'BRV', nome: 'Breves', base: false },
  { sigla: 'GUR', nome: 'Gurupá', base: false },
  { sigla: 'ALM', nome: 'Almeirim', base: false },
  { sigla: 'PMZ', nome: 'Porto de Moz', base: false },
  { sigla: 'PRA', nome: 'Prainha', base: false },
  { sigla: 'MTA', nome: 'Monte Alegre', base: false },
  { sigla: 'STM', nome: 'Santarém', base: false },
] as const;
