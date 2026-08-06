import { validateFinanceiroConfig } from './financeiro-config.validator';

const valid = {
  schemaVersion: 1,
  comissoes: { base: 'recebido', status: ['em_aberto', 'liberada', 'pago'], permitirRepasseManual: true },
  dre: { modo: 'caixa', periodicidade: 'mensal' },
  faturas: { rastreamento: 'interno', provedor: null },
  categorias: [],
};

describe('validateFinanceiroConfig', () => {
  it('aceita a configuração mínima auditável', () => {
    expect(() => validateFinanceiroConfig(valid)).not.toThrow();
  });

  it('exige recebimento efetivo como base da comissão', () => {
    expect(() => validateFinanceiroConfig({ ...valid, comissoes: { ...valid.comissoes, base: 'faturado' } })).toThrow();
  });

  it('exige provedor quando rastreamento externo é escolhido', () => {
    expect(() => validateFinanceiroConfig({ ...valid, faturas: { rastreamento: 'integracao', provedor: null } })).toThrow();
  });
});
