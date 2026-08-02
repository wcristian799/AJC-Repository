import { BadRequestException } from '@nestjs/common';
import { validateTmsControlConfig } from './tms-control-config.validator';

const valid = {
  schemaVersion: 1,
  timezone: 'America/Sao_Paulo',
  atualizacaoSegundos: 30,
  diasPassadosPadrao: 30,
  diasFuturosPadrao: 60,
  itensPorPagina: 20,
  maximoPorPagina: 100,
  limiteExportacao: 5000,
  limiteEventosPorVolume: 100,
  limiteDivergenciasPainel: 20,
};

describe('validateTmsControlConfig', () => {
  it('aceita uma configuracao operacional valida', () => {
    expect(() => validateTmsControlConfig(valid)).not.toThrow();
  });

  it('rejeita atualizacao excessiva', () => {
    expect(() => validateTmsControlConfig({ ...valid, atualizacaoSegundos: 2 })).toThrow(BadRequestException);
  });

  it('rejeita pagina padrao maior que o maximo', () => {
    expect(() => validateTmsControlConfig({ ...valid, itensPorPagina: 100, maximoPorPagina: 50 })).toThrow(
      'itensPorPagina nao pode superar maximoPorPagina',
    );
  });

  it('rejeita timezone inexistente', () => {
    expect(() => validateTmsControlConfig({ ...valid, timezone: 'Atlantis/Porto' })).toThrow('timezone invalido');
  });
});
