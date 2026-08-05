import { validateVeiculosOrigensConfig } from './veiculos-config.validator';

describe('configuracao de origens de veiculos', () => {
  const valid = {
    schemaVersion: 1 as const,
    origens: [{ codigo: 'gerente_porto', nome: 'Gerente do Porto', ativo: true }],
    origemPadrao: 'gerente_porto',
  };

  it('aceita catalogo editavel valido', () => {
    expect(validateVeiculosOrigensConfig(valid)).toEqual(valid);
  });

  it('rejeita codigo duplicado', () => {
    expect(() => validateVeiculosOrigensConfig({ ...valid, origens: [...valid.origens, ...valid.origens] }))
      .toThrow('duplicado');
  });

  it('exige origem padrao ativa', () => {
    expect(() => validateVeiculosOrigensConfig({ ...valid, origemPadrao: 'inexistente' }))
      .toThrow('padrao');
  });
});
