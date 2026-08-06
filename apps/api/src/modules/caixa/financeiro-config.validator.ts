import { BadRequestException } from '@nestjs/common';

export type FinanceiroConfig = {
  schemaVersion: number;
  comissoes: { base: 'recebido'; status: string[]; permitirRepasseManual: boolean };
  dre: { modo: 'caixa' | 'competencia'; periodicidade: 'mensal' };
  faturas: { rastreamento: 'interno' | 'integracao'; provedor: string | null };
  categorias: Array<{ codigo: string; nome: string; tipo: 'receita' | 'despesa'; ativo: boolean }>;
};

export function validateFinanceiroConfig(value: unknown): FinanceiroConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Configuracao financeira invalida');
  const config = value as Record<string, any>;
  if (Number(config.schemaVersion) < 1) throw new BadRequestException('schemaVersion financeiro invalido');
  if (!config.comissoes || config.comissoes.base !== 'recebido') throw new BadRequestException('Comissao deve ser liberada pelo recebimento efetivo');
  if (!Array.isArray(config.comissoes.status) || !['em_aberto','liberada','pago'].every((status) => config.comissoes.status.includes(status))) throw new BadRequestException('Estados obrigatorios de comissao ausentes');
  if (!config.dre || !['caixa','competencia'].includes(config.dre.modo)) throw new BadRequestException('Modo da DRE invalido');
  if (!config.faturas || !['interno','integracao'].includes(config.faturas.rastreamento)) throw new BadRequestException('Rastreamento de faturas invalido');
  if (config.faturas.rastreamento === 'integracao' && !String(config.faturas.provedor ?? '').trim()) throw new BadRequestException('Informe o provedor de rastreamento de faturas');
  if (!Array.isArray(config.categorias)) throw new BadRequestException('Categorias financeiras devem ser uma lista');
  for (const category of config.categorias) {
    if (!String(category.codigo ?? '').trim() || !String(category.nome ?? '').trim() || !['receita','despesa'].includes(category.tipo)) throw new BadRequestException('Categoria financeira invalida');
  }
  return config as FinanceiroConfig;
}
