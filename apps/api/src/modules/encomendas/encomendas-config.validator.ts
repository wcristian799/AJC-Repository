import { BadRequestException } from '@nestjs/common';

export type EncomendasConfig = {
  limiteValorFixo: number;
  tamanhos: Array<{ codigo: string; nome: string; pesoMaxKg: number; ativo: boolean }>;
  formasPagamento: Array<{ codigo: string; nome: string; ativo: boolean }>;
  prazoRecebimentoDias: number;
  exigeFotoEncomenda: boolean;
  exigeDocumento: boolean;
  termo: { publicado: boolean; titulo: string; texto: string; clausulas: string[] };
};

export function validateEncomendasConfig(value: unknown): asserts value is EncomendasConfig {
  const config = record(value, 'Configuracao de encomendas invalida');
  positive(config.limiteValorFixo, 'limiteValorFixo');
  integer(config.prazoRecebimentoDias, 'prazoRecebimentoDias', 0, 365);
  if (typeof config.exigeFotoEncomenda !== 'boolean' || typeof config.exigeDocumento !== 'boolean') {
    throw new BadRequestException('exigeFotoEncomenda e exigeDocumento devem ser booleanos');
  }
  const tamanhos = array(config.tamanhos, 'Cadastre ao menos um tamanho');
  if (!tamanhos.length) throw new BadRequestException('Cadastre ao menos um tamanho');
  const sizeCodes = new Set<string>();
  for (const raw of tamanhos) {
    const item = record(raw, 'Tamanho invalido');
    const codigo = code(item.codigo, 'codigo do tamanho');
    if (sizeCodes.has(codigo)) throw new BadRequestException(`Tamanho duplicado: ${codigo}`);
    sizeCodes.add(codigo);
    text(item.nome, 'nome do tamanho');
    positive(item.pesoMaxKg, `pesoMaxKg de ${codigo}`);
    if (typeof item.ativo !== 'boolean') throw new BadRequestException(`ativo de ${codigo} deve ser booleano`);
  }
  const payments = array(config.formasPagamento, 'Cadastre formas de pagamento');
  if (!payments.some((item) => record(item, 'Forma de pagamento invalida').ativo === true)) {
    throw new BadRequestException('Mantenha ao menos uma forma de pagamento ativa');
  }
  const paymentCodes = new Set<string>();
  for (const raw of payments) {
    const item = record(raw, 'Forma de pagamento invalida');
    const codigo = code(item.codigo, 'codigo da forma de pagamento');
    if (paymentCodes.has(codigo)) throw new BadRequestException(`Forma de pagamento duplicada: ${codigo}`);
    paymentCodes.add(codigo);
    text(item.nome, 'nome da forma de pagamento');
    if (typeof item.ativo !== 'boolean') throw new BadRequestException(`ativo de ${codigo} deve ser booleano`);
  }
  const termo = record(config.termo, 'Termo da DC invalido');
  if (typeof termo.publicado !== 'boolean') throw new BadRequestException('termo.publicado deve ser booleano');
  text(termo.titulo, 'titulo do termo');
  if (typeof termo.texto !== 'string') throw new BadRequestException('termo.texto deve ser texto');
  if (!Array.isArray(termo.clausulas) || termo.clausulas.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new BadRequestException('termo.clausulas deve conter apenas textos preenchidos');
  }
  if (termo.publicado && (!termo.texto.trim() || termo.clausulas.length === 0)) {
    throw new BadRequestException('Para publicar o termo, informe o texto e ao menos uma clausula');
  }
}

function record(value: unknown, message: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException(message);
  return value as Record<string, any>;
}
function array(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new BadRequestException(message);
  return value;
}
function text(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${label} obrigatorio`);
}
function code(value: unknown, label: string) {
  text(value, label);
  const normalized = String(value).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,24}$/.test(normalized)) throw new BadRequestException(`${label} invalido`);
  return normalized;
}
function positive(value: unknown, label: string) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw new BadRequestException(`${label} deve ser maior que zero`);
}
function integer(value: unknown, label: string, min: number, max: number) {
  if (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new BadRequestException(`${label} deve estar entre ${min} e ${max}`);
  }
}
