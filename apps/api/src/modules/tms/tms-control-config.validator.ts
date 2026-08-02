import { BadRequestException } from '@nestjs/common';

export interface TmsControlConfig {
  schemaVersion: 1;
  timezone: string;
  atualizacaoSegundos: number;
  diasPassadosPadrao: number;
  diasFuturosPadrao: number;
  itensPorPagina: number;
  maximoPorPagina: number;
  limiteExportacao: number;
  limiteEventosPorVolume: number;
  limiteDivergenciasPainel: number;
}

export function validateTmsControlConfig(value: unknown): asserts value is TmsControlConfig {
  const config = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  integerBetween(config.schemaVersion, 1, 1, 'schemaVersion');
  if (typeof config.timezone !== 'string' || !config.timezone.trim()) {
    throw new BadRequestException('timezone obrigatorio');
  }
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: config.timezone }).format(new Date());
  } catch {
    throw new BadRequestException('timezone invalido');
  }
  integerBetween(config.atualizacaoSegundos, 10, 300, 'atualizacaoSegundos');
  integerBetween(config.diasPassadosPadrao, 1, 365, 'diasPassadosPadrao');
  integerBetween(config.diasFuturosPadrao, 0, 365, 'diasFuturosPadrao');
  integerBetween(config.itensPorPagina, 5, 100, 'itensPorPagina');
  integerBetween(config.maximoPorPagina, 10, 500, 'maximoPorPagina');
  integerBetween(config.limiteExportacao, 100, 20000, 'limiteExportacao');
  integerBetween(config.limiteEventosPorVolume, 10, 500, 'limiteEventosPorVolume');
  integerBetween(config.limiteDivergenciasPainel, 5, 100, 'limiteDivergenciasPainel');
  if (Number(config.itensPorPagina) > Number(config.maximoPorPagina)) {
    throw new BadRequestException('itensPorPagina nao pode superar maximoPorPagina');
  }
  if (Number(config.maximoPorPagina) > Number(config.limiteExportacao)) {
    throw new BadRequestException('maximoPorPagina nao pode superar limiteExportacao');
  }
}

function integerBetween(value: unknown, min: number, max: number, field: string) {
  if (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new BadRequestException(`${field} deve estar entre ${min} e ${max}`);
  }
}
