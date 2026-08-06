import { validateEncomendasConfig } from './encomendas-config.validator';

const valid = {
  limiteValorFixo: 1000,
  limitePesoEncomenda: 30,
  tamanhos: [{ codigo: 'P', nome: 'Pequena', pesoMaxKg: 10, ativo: true }],
  formasPagamento: [{ codigo: 'pix', nome: 'Pix', ativo: true }],
  prazoRecebimentoDias: 0,
  exigeFotoEncomenda: true,
  exigeDocumento: true,
  termo: { publicado: false, titulo: 'DC', texto: '', clausulas: [] },
};

describe('validateEncomendasConfig', () => {
  it('aceita termo ainda nao publicado sem inventar texto juridico', () => {
    expect(() => validateEncomendasConfig(valid)).not.toThrow();
  });

  it('bloqueia publicacao do termo vazio', () => {
    expect(() => validateEncomendasConfig({ ...valid, termo: { ...valid.termo, publicado: true } })).toThrow();
  });

  it('bloqueia codigos de tamanho duplicados', () => {
    expect(() => validateEncomendasConfig({ ...valid, tamanhos: [...valid.tamanhos, { ...valid.tamanhos[0] }] })).toThrow();
  });
});
