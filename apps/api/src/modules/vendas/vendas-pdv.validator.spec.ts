import { BadRequestException } from '@nestjs/common';
import { PdvConfig, reconcilePdvPayments, validatePdvConfig } from './vendas-pdv.validator';

const config: PdvConfig = {
  schemaVersion: 1,
  canalPadrao: 'pdv',
  caixa: { tipo: 'porto', referenciaPadrao: 'Bilheteria', exigirAbertura: true, valorAberturaPadrao: null },
  formasPagamento: [
    { codigo: 'dinheiro', nome: 'Dinheiro', ativo: true, permiteTroco: true, parcelasMax: 1, acrescimoPercentual: 0 },
    { codigo: 'pix', nome: 'Pix', ativo: true, permiteTroco: false, parcelasMax: 1, acrescimoPercentual: 0 },
    { codigo: 'cartao_credito', nome: 'Credito', ativo: true, permiteTroco: false, parcelasMax: 2, acrescimoPercentual: null },
  ],
  classes: [{ codigo: 'rede', nome: 'Rede', descricao: '', corPulseira: null, ativo: true }],
  gratuidades: [{ codigo: 'idoso', nome: 'Idoso', documentoExigido: 'Documento', ativo: true }],
  fiscal: { pdvPermiteEscolha: true, pdvPadraoEmitir: false, portalObrigatorio: true, agenteOpcional: true, integracaoAtiva: false },
  impressao: { habilitada: false, modeloHomologado: null },
};

describe('PDV operacional', () => {
  it('aceita multipagamento conciliado e calcula troco apenas em dinheiro', () => {
    const result = reconcilePdvPayments(150, [
      { formaPagamento: 'pix', valor: 50 },
      { formaPagamento: 'dinheiro', valor: 120 },
    ], config);
    expect(result.troco).toBe(20);
    expect(result.items.map((item) => item.valorAplicado)).toEqual([50, 100]);
  });

  it('recusa excedente em forma sem troco', () => {
    expect(() => reconcilePdvPayments(100, [{ formaPagamento: 'pix', valor: 120 }], config)).toThrow(BadRequestException);
  });

  it('bloqueia parcelamento sem acrescimo publicado', () => {
    expect(() => reconcilePdvPayments(100, [{ formaPagamento: 'cartao_credito', valor: 100, parcelas: 2 }], config)).toThrow(BadRequestException);
  });

  it('valida o contrato versionado', () => {
    expect(() => validatePdvConfig(config)).not.toThrow();
  });
});
