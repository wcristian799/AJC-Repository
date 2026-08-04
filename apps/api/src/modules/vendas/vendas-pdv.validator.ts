import { BadRequestException } from '@nestjs/common';

export const PDV_PAYMENT_CODES = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'] as const;
export const PDV_FREE_CODES = ['idoso', 'pcd', 'crianca', 'outro'] as const;

export type PdvPaymentCode = (typeof PDV_PAYMENT_CODES)[number];

export type PdvConfig = {
  schemaVersion: 1;
  canalPadrao: string;
  caixa: {
    tipo: string;
    referenciaPadrao: string;
    exigirAbertura: boolean;
    valorAberturaPadrao: number | null;
  };
  formasPagamento: Array<{
    codigo: PdvPaymentCode;
    nome: string;
    ativo: boolean;
    permiteTroco: boolean;
    parcelasMax: number;
    acrescimoPercentual: number | null;
  }>;
  classes: Array<{ codigo: string; nome: string; descricao: string; corPulseira: string | null; ativo: boolean }>;
  gratuidades: Array<{ codigo: string; nome: string; documentoExigido: string; ativo: boolean }>;
  fiscal: {
    pdvPermiteEscolha: boolean;
    pdvPadraoEmitir: boolean;
    portalObrigatorio: boolean;
    agenteOpcional: boolean;
    integracaoAtiva: boolean;
  };
  impressao: { habilitada: boolean; modeloHomologado: string | null };
};

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export function validatePdvConfig(value: unknown): asserts value is PdvConfig {
  const config = record(value);
  if (!config || config.schemaVersion !== 1) throw new BadRequestException('Configuracao do PDV invalida');
  const caixa = record(config.caixa);
  const fiscal = record(config.fiscal);
  const impressao = record(config.impressao);
  if (!String(config.canalPadrao ?? '').trim() || !caixa || !fiscal || !impressao) {
    throw new BadRequestException('Estrutura obrigatoria do PDV ausente');
  }
  const payments = Array.isArray(config.formasPagamento) ? config.formasPagamento : [];
  if (!payments.length) throw new BadRequestException('Cadastre ao menos uma forma de pagamento');
  const paymentCodes = new Set<string>();
  for (const raw of payments) {
    const item = record(raw);
    const code = String(item?.codigo ?? '');
    if (!PDV_PAYMENT_CODES.includes(code as PdvPaymentCode) || paymentCodes.has(code)) {
      throw new BadRequestException('Forma de pagamento invalida ou duplicada');
    }
    paymentCodes.add(code);
    const installments = Number(item?.parcelasMax);
    if (!String(item?.nome ?? '').trim() || !Number.isInteger(installments) || installments < 1 || installments > 24) {
      throw new BadRequestException('Dados da forma de pagamento invalidos');
    }
    if (item?.acrescimoPercentual !== null && (!Number.isFinite(Number(item?.acrescimoPercentual)) || Number(item?.acrescimoPercentual) < 0)) {
      throw new BadRequestException('Acrescimo da forma de pagamento invalido');
    }
  }
  const classes = Array.isArray(config.classes) ? config.classes : [];
  if (!classes.length) throw new BadRequestException('Cadastre ao menos uma classe de passagem');
  const classCodes = new Set<string>();
  for (const raw of classes) {
    const item = record(raw);
    const code = String(item?.codigo ?? '').trim();
    if (!code || classCodes.has(code) || !String(item?.nome ?? '').trim()) {
      throw new BadRequestException('Classe de passagem invalida ou duplicada');
    }
    classCodes.add(code);
  }
  const free = Array.isArray(config.gratuidades) ? config.gratuidades : [];
  const freeCodes = new Set<string>();
  for (const raw of free) {
    const item = record(raw);
    const code = String(item?.codigo ?? '');
    if (!PDV_FREE_CODES.includes(code as (typeof PDV_FREE_CODES)[number]) || freeCodes.has(code) || !String(item?.nome ?? '').trim()) {
      throw new BadRequestException('Gratuidade invalida ou duplicada');
    }
    freeCodes.add(code);
  }
  if (!String(caixa.tipo ?? '').trim() || !String(caixa.referenciaPadrao ?? '').trim()) {
    throw new BadRequestException('Configuracao de caixa invalida');
  }
}

export function reconcilePdvPayments(
  total: number,
  payments: Array<{ formaPagamento: string; valor: number; parcelas?: number }>,
  config: PdvConfig,
) {
  if (total === 0) {
    if (payments.some((item) => Number(item.valor) > 0)) throw new BadRequestException('Venda isenta nao recebe pagamento');
    return { totalInformado: 0, troco: 0, items: [] as Array<{ formaPagamento: PdvPaymentCode; valorInformado: number; valorAplicado: number; troco: number; parcelas: number }> };
  }
  if (!payments.length) throw new BadRequestException('Informe o pagamento da venda');
  let remaining = roundMoney(total);
  const items = payments.map((payment) => {
    const rule = config.formasPagamento.find((item) => item.codigo === payment.formaPagamento && item.ativo);
    if (!rule) throw new BadRequestException('Forma de pagamento indisponivel');
    const informed = roundMoney(Number(payment.valor));
    const installments = Number(payment.parcelas ?? 1);
    if (!(informed > 0) || !Number.isInteger(installments) || installments < 1 || installments > rule.parcelasMax) {
      throw new BadRequestException('Valor ou parcelas do pagamento invalidos');
    }
    if (installments > 1 && rule.acrescimoPercentual === null) {
      throw new BadRequestException('Acrescimo do parcelamento ainda nao configurado');
    }
    const applied = roundMoney(Math.min(informed, remaining));
    const change = roundMoney(informed - applied);
    if (change > 0 && !rule.permiteTroco) throw new BadRequestException('Somente a forma configurada para troco pode exceder o saldo');
    remaining = roundMoney(remaining - applied);
    return { formaPagamento: rule.codigo, valorInformado: informed, valorAplicado: applied, troco: change, parcelas: installments };
  });
  if (remaining !== 0) throw new BadRequestException('A soma dos pagamentos nao confere com o total');
  return {
    totalInformado: roundMoney(items.reduce((sum, item) => sum + item.valorInformado, 0)),
    troco: roundMoney(items.reduce((sum, item) => sum + item.troco, 0)),
    items,
  };
}

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
