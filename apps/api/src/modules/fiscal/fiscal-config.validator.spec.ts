import { BadRequestException } from '@nestjs/common';
import { validateBpeConfig } from './fiscal-config.validator';
import { validBpeConfig } from './fiscal-test.fixtures';

describe('validateBpeConfig', () => {
  it('permite salvar o cadastro incompleto enquanto a integracao esta desabilitada', () => {
    const config = validBpeConfig();
    config.habilitada = false;
    config.emitente.cnpj = '';
    config.rotas = [];
    expect(() => validateBpeConfig(config)).not.toThrow();
  });

  it('aceita uma configuracao fiscal completa sem inventar codigos', () => {
    expect(() => validateBpeConfig(validBpeConfig())).not.toThrow();
  });

  it('bloqueia a ativacao sem tributacao publicada', () => {
    const config = validBpeConfig();
    config.impostos = {};
    expect(() => validateBpeConfig(config)).toThrow(BadRequestException);
  });
});
