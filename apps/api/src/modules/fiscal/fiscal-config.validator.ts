import { BadRequestException } from '@nestjs/common';
import { BpeIntegrationConfig } from './fiscal.types';

export function validateBpeConfig(value: unknown): asserts value is BpeIntegrationConfig {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.provider !== 'ns') {
    throw new BadRequestException('Configuracao de BP-e invalida ou com provider nao suportado');
  }
  if (typeof value.habilitada !== 'boolean') throw new BadRequestException('habilitada deve ser booleana');
  if (!['homologacao', 'producao'].includes(String(value.ambiente))) {
    throw new BadRequestException('Ambiente do BP-e deve ser homologacao ou producao');
  }
  const operation = requireRecord(value.operacao, 'operacao');
  integerBetween(operation.pollingSegundos, 2, 60, 'pollingSegundos');
  integerBetween(operation.tentativasConsulta, 1, 30, 'tentativasConsulta');
  integerBetween(operation.retryMinutos, 1, 1440, 'retryMinutos');
  integerBetween(operation.maxTentativas, 1, 30, 'maxTentativas');

  if (!value.habilitada) return;

  integerBetween(value.serie, 0, 999, 'serie');
  integerBetween(value.numeroInicial, 1, 999999999, 'numeroInicial');
  requiredText(value.versaoLayout, 'versaoLayout');
  requiredText(value.modal, 'modal');
  requiredText(value.verProc, 'verProc');
  requiredText(value.tpBPe, 'tpBPe');
  requiredText(value.indPres, 'indPres');

  const issuer = requireRecord(value.emitente, 'emitente');
  digits(issuer.cnpj, 14, 'CNPJ do emitente');
  requiredText(issuer.ie, 'IE do emitente');
  requiredText(issuer.razaoSocial, 'razao social do emitente');
  requiredText(issuer.crt, 'CRT do emitente');
  const address = requireRecord(issuer.endereco, 'endereco do emitente');
  requiredText(address.logradouro, 'logradouro do emitente');
  requiredText(address.numero, 'numero do emitente');
  requiredText(address.bairro, 'bairro do emitente');
  digits(address.codigoIbge, 7, 'codigo IBGE do emitente');
  requiredText(address.municipio, 'municipio do emitente');
  if (!/^[A-Z]{2}$/.test(String(address.uf ?? ''))) throw new BadRequestException('UF do emitente invalida');

  const routes = requireArray(value.rotas, 'rotas');
  if (!routes.length) throw new BadRequestException('Cadastre ao menos um percurso fiscal');
  unique(routes, (item) => `${field(item, 'origemSigla')}-${field(item, 'destinoSigla')}`, 'Percurso fiscal duplicado');
  for (const item of routes) {
    const route = requireRecord(item, 'percurso fiscal');
    requiredText(route.origemSigla, 'origem do percurso');
    requiredText(route.destinoSigla, 'destino do percurso');
    requiredText(route.cPercurso, 'cPercurso');
    requiredText(route.xPercurso, 'xPercurso');
    requiredText(route.tpViagem, 'tpViagem');
    requiredText(route.tpServ, 'tpServ');
    requiredText(route.tpTrecho, 'tpTrecho');
  }

  const classes = requireArray(value.classes, 'classes');
  if (!classes.length) throw new BadRequestException('Mapeie as classes para tpAcomodacao');
  unique(classes, (item) => field(item, 'classe'), 'Classe fiscal duplicada');
  for (const item of classes) {
    const entry = requireRecord(item, 'classe fiscal');
    requiredText(entry.classe, 'classe');
    requiredText(entry.tpAcomodacao, 'tpAcomodacao');
  }

  const payments = requireArray(value.pagamentos, 'pagamentos');
  if (!payments.length) throw new BadRequestException('Mapeie os meios de pagamento para tPag');
  unique(payments, (item) => field(item, 'formaPagamento'), 'Forma de pagamento fiscal duplicada');
  for (const item of payments) {
    const entry = requireRecord(item, 'pagamento fiscal');
    requiredText(entry.formaPagamento, 'formaPagamento');
    requiredText(entry.tPag, 'tPag');
  }

  requiredText(value.componenteTarifa, 'componenteTarifa');
  requiredText(value.tipoDocumentoPassageiroPadrao, 'tipoDocumentoPassageiroPadrao');
  if (!isRecord(value.impostos) || !Object.keys(value.impostos).length) {
    throw new BadRequestException('A tributacao do BP-e deve ser publicada pelo contador');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) throw new BadRequestException(`${label} invalido`);
  return value;
}
function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new BadRequestException(`${label} deve ser uma lista`);
  return value;
}
function requiredText(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} obrigatorio`);
}
function digits(value: unknown, length: number, label: string) {
  if (!new RegExp(`^[0-9]{${length}}$`).test(String(value ?? '').replace(/\D/g, ''))) {
    throw new BadRequestException(`${label} deve conter ${length} digitos`);
  }
}
function integerBetween(value: unknown, min: number, max: number, label: string) {
  if (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new BadRequestException(`${label} deve estar entre ${min} e ${max}`);
  }
}
function field(value: unknown, key: string) {
  return isRecord(value) ? String(value[key] ?? '').trim() : '';
}
function unique(items: unknown[], key: (item: unknown) => string, message: string) {
  const values = items.map(key);
  if (new Set(values).size !== values.length) throw new BadRequestException(message);
}
