import { BadRequestException } from '@nestjs/common';

type Stop = { cidadeSigla?: unknown; offsetMinutos?: unknown };
type Route = {
  id?: unknown;
  nome?: unknown;
  origemSigla?: unknown;
  destinoSigla?: unknown;
  diaSemana?: unknown;
  horaSaida?: unknown;
  ativo?: unknown;
  paradas?: unknown;
};

export function validateNavegacaoRoutesConfig(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Configuracao de navegacao invalida');
  }
  const config = value as { schemaVersion?: unknown; rotas?: unknown };
  if (config.schemaVersion !== 1 || !Array.isArray(config.rotas) || config.rotas.length === 0) {
    throw new BadRequestException('schemaVersion 1 e ao menos uma rota sao obrigatorios');
  }
  const ids = new Set<string>();
  for (const raw of config.rotas) {
    const route = raw as Route;
    for (const field of ['id', 'nome', 'origemSigla', 'destinoSigla', 'horaSaida'] as const) {
      if (typeof route[field] !== 'string' || !route[field].trim()) {
        throw new BadRequestException(`${field} obrigatorio em todas as rotas`);
      }
    }
    if (ids.has(route.id as string)) throw new BadRequestException(`Rota duplicada: ${route.id}`);
    ids.add(route.id as string);
    if (!Number.isInteger(route.diaSemana) || Number(route.diaSemana) < 0 || Number(route.diaSemana) > 6) {
      throw new BadRequestException(`diaSemana invalido na rota ${route.id}`);
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(route.horaSaida as string)) {
      throw new BadRequestException(`horaSaida invalida na rota ${route.id}`);
    }
    if (!Array.isArray(route.paradas) || route.paradas.length === 0) {
      throw new BadRequestException(`Ao menos uma parada e obrigatoria na rota ${route.id}`);
    }
    let lastOffset = 0;
    for (const rawStop of route.paradas) {
      const stop = rawStop as Stop;
      if (typeof stop.cidadeSigla !== 'string' || !stop.cidadeSigla.trim()) {
        throw new BadRequestException(`cidadeSigla obrigatoria na rota ${route.id}`);
      }
      if (!Number.isInteger(stop.offsetMinutos) || Number(stop.offsetMinutos) <= lastOffset) {
        throw new BadRequestException(`Offsets devem ser inteiros, positivos e crescentes na rota ${route.id}`);
      }
      lastOffset = Number(stop.offsetMinutos);
    }
  }
}
