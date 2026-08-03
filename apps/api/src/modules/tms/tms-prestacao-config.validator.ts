import { BadRequestException } from '@nestjs/common';

type Item = { codigo?: unknown; nome?: unknown; ativo?: unknown };

export function validateTmsPrestacaoConfig(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Configuracao da prestacao invalida');
  const config = value as Record<string, unknown>;
  if (config.schemaVersion !== 1) fail('schemaVersion da prestacao deve ser 1');
  if (typeof config.timezone !== 'string' || !config.timezone.trim()) fail('timezone obrigatorio');
  validateCatalog(config.formasPagamento, 'formasPagamento');
  validateCatalog(config.categoriasReceita, 'categoriasReceita');
  validateCatalog(config.categoriasDespesa, 'categoriasDespesa');
  if (!Array.isArray(config.intertrechos)) fail('intertrechos deve ser uma lista');
  if (!Array.isArray(config.comissoesAgencia)) fail('comissoesAgencia deve ser uma lista');
  const routes = new Set<string>();
  for (const raw of config.intertrechos as Array<Record<string,unknown>>) {
    const origin = typeof raw.origemSigla === 'string' ? raw.origemSigla.trim() : '';
    const destination = typeof raw.destinoSigla === 'string' ? raw.destinoSigla.trim() : '';
    if (!origin || !destination || origin === destination) fail('Intertrecho invalido');
    const key = `${origin}|${destination}`;
    if (routes.has(key)) fail(`Intertrecho duplicado: ${key}`);
    routes.add(key);
  }
  const agencies = new Set<string>();
  for (const raw of config.comissoesAgencia as Array<Record<string,unknown>>) {
    const name = typeof raw.agenciaNome === 'string' ? raw.agenciaNome.trim() : '';
    const percentage = Number(raw.percentual);
    if (!name || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) fail('Comissao de agencia invalida');
    if (agencies.has(name.toLocaleLowerCase('pt-BR'))) fail(`Agencia duplicada: ${name}`);
    agencies.add(name.toLocaleLowerCase('pt-BR'));
  }
  return config;
}

function validateCatalog(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length === 0) fail(`${field} deve ter ao menos um item`);
  const codes = new Set<string>();
  for (const raw of value as Item[]) {
    const code = typeof raw?.codigo === 'string' ? raw.codigo.trim() : '';
    const name = typeof raw?.nome === 'string' ? raw.nome.trim() : '';
    if (!/^[a-z0-9_]+$/.test(code) || !name) fail(`Item invalido em ${field}`);
    if (codes.has(code)) fail(`Codigo duplicado em ${field}: ${code}`);
    codes.add(code);
    if (raw.ativo !== undefined && typeof raw.ativo !== 'boolean') fail(`ativo invalido em ${field}`);
  }
}

function fail(message: string): never { throw new BadRequestException(message); }
