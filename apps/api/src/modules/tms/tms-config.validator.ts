import { BadRequestException } from '@nestjs/common';

export function validateTmsScheduleConfig(value: unknown) {
  const config = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const start = String(config.horaInicio ?? '');
  const end = String(config.horaFim ?? '');
  const interval = Number(config.intervaloMinutos);
  const capacity = Number(config.capacidadePorJanela);
  const refresh = Number(config.atualizacaoSegundos);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) {
    throw new BadRequestException('Horario inicial/final da agenda TMS invalido');
  }
  if (!Number.isInteger(interval) || interval < 5 || interval > 240) throw new BadRequestException('intervaloMinutos deve estar entre 5 e 240');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new BadRequestException('capacidadePorJanela deve estar entre 1 e 100');
  if (!Number.isInteger(refresh) || refresh < 10 || refresh > 300) throw new BadRequestException('atualizacaoSegundos deve estar entre 10 e 300');
}
