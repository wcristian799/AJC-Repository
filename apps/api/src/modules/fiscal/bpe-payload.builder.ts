import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { BpeIntegrationConfig } from './fiscal.types';

export interface BpeSourceData {
  fiscalId: string;
  numero: number;
  passageiroNome: string | null;
  passageiroDocumento: string | null;
  classe: string;
  precoPago: number;
  troco: number;
  origemSigla: string;
  origemNome: string;
  origemUf: string;
  origemCodigoIbge: string | null;
  destinoSigla: string;
  destinoNome: string;
  destinoUf: string;
  destinoCodigoIbge: string | null;
  dataHoraEmbarque: string;
  pagamentos: Array<{ formaPagamento: string; valor: number }>;
}

export function buildBpePayload(config: BpeIntegrationConfig, source: BpeSourceData, issuedAt = new Date()) {
  if (!source.origemCodigoIbge || !source.destinoCodigoIbge) {
    throw new BadRequestException('Origem e destino precisam de codigo IBGE antes da emissao do BP-e');
  }
  const passengerName = source.passageiroNome?.trim();
  const passengerDocument = digits(source.passageiroDocumento);
  if (!passengerName || !passengerDocument) {
    throw new BadRequestException('Nome e documento do passageiro sao obrigatorios para emitir BP-e');
  }
  const route = config.rotas.find(
    (item) => item.origemSigla === source.origemSigla && item.destinoSigla === source.destinoSigla,
  );
  if (!route) throw new BadRequestException(`Percurso fiscal nao configurado para ${source.origemSigla}-${source.destinoSigla}`);
  const accommodation = config.classes.find((item) => item.classe === source.classe);
  if (!accommodation) throw new BadRequestException(`tpAcomodacao nao configurado para ${source.classe}`);
  if (!source.pagamentos.length) throw new BadRequestException('Forma de pagamento do bilhete nao localizada');

  const payments = source.pagamentos.map((payment) => {
    const mapping = config.pagamentos.find((item) => item.formaPagamento === payment.formaPagamento);
    if (!mapping) throw new BadRequestException(`tPag nao configurado para ${payment.formaPagamento}`);
    return { tPag: mapping.tPag, vPag: money(payment.valor) };
  });

  const cUf = source.origemCodigoIbge.slice(0, 2);
  const cBp = accessCode(source.fiscalId, source.numero);
  const keyWithoutDigit = [
    cUf,
    yearMonth(issuedAt),
    digits(config.emitente.cnpj),
    '63',
    String(config.serie).padStart(3, '0'),
    String(source.numero).padStart(9, '0'),
    '1',
    cBp,
  ].join('');
  const cDv = modulo11(keyWithoutDigit);
  const passenger: Record<string, unknown> = { xNome: passengerName };
  if (passengerDocument.length === 11) passenger.CPF = passengerDocument;
  else {
    passenger.tpDoc = config.tipoDocumentoPassageiroPadrao;
    passenger.nDoc = passengerDocument;
  }
  const companion: Record<string, unknown> = { xNome: passengerName };
  if (passengerDocument.length === 11) companion.CPF = passengerDocument;
  if (passengerDocument.length === 14) companion.CNPJ = passengerDocument;

  const infBPe: Record<string, unknown> = {
    versao: config.versaoLayout,
    ide: {
      cUF: cUf,
      tpAmb: config.ambiente === 'producao' ? '1' : '2',
      mod: '63',
      serie: String(config.serie),
      nBP: String(source.numero),
      cBP: cBp,
      cDV: cDv,
      modal: config.modal,
      dhEmi: fiscalDate(issuedAt),
      tpEmis: '1',
      verProc: config.verProc,
      tpBPe: config.tpBPe,
      indPres: config.indPres,
      UFIni: source.origemUf,
      cMunIni: source.origemCodigoIbge,
      UFFim: source.destinoUf,
      cMunFim: source.destinoCodigoIbge,
    },
    emit: compact({
      CNPJ: digits(config.emitente.cnpj),
      IE: digits(config.emitente.ie),
      xNome: config.emitente.razaoSocial,
      IM: digits(config.emitente.im),
      CNAE: digits(config.emitente.cnae),
      CRT: config.emitente.crt,
      enderEmit: {
        xLgr: config.emitente.endereco.logradouro,
        nro: config.emitente.endereco.numero,
        xBairro: config.emitente.endereco.bairro,
        cMun: config.emitente.endereco.codigoIbge,
        xMun: config.emitente.endereco.municipio,
        UF: config.emitente.endereco.uf,
      },
      TAR: config.emitente.tar,
    }),
    comp: companion,
    infPassagem: {
      cLocOrig: source.origemCodigoIbge,
      xLocOrig: source.origemNome,
      cLocDest: source.destinoCodigoIbge,
      xLocDest: source.destinoNome,
      dhEmb: fiscalDate(new Date(source.dataHoraEmbarque)),
      infPassageiro: passenger,
    },
    infViagem: {
      cPercurso: route.cPercurso,
      xPercurso: route.xPercurso,
      tpViagem: route.tpViagem,
      tpServ: route.tpServ,
      tpAcomodacao: accommodation.tpAcomodacao,
      tpTrecho: route.tpTrecho,
      dhViagem: fiscalDate(new Date(source.dataHoraEmbarque)),
    },
    infValorBPe: {
      vBP: money(source.precoPago),
      vDesconto: '0.00',
      vPgto: money(source.precoPago),
      vTroco: money(source.troco),
      Comp: [{ tpComp: config.componenteTarifa, vComp: money(source.precoPago) }],
    },
    imp: config.impostos,
    pag: payments.length === 1 ? payments[0] : payments,
  };
  return {
    payload: { BPe: { infBPe } },
    accessKeyPreview: `${keyWithoutDigit}${cDv}`,
  };
}

export function modulo11(keyWithoutDigit: string) {
  let weight = 2;
  let sum = 0;
  for (let index = keyWithoutDigit.length - 1; index >= 0; index -= 1) {
    sum += Number(keyWithoutDigit[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const value = 11 - (sum % 11);
  return String(value === 10 || value === 11 ? 0 : value);
}

function accessCode(fiscalId: string, number: number) {
  const hash = createHash('sha256').update(`${fiscalId}:${number}`).digest('hex').slice(0, 12);
  return String(Number.parseInt(hash, 16) % 100_000_000).padStart(8, '0');
}
function yearMonth(date: Date) {
  return `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function fiscalDate(date: Date) {
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data fiscal invalida');
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Belem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return `${formatter.format(date).replace(' ', 'T')}-03:00`;
}
function digits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}
function money(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Valor fiscal invalido');
  return value.toFixed(2);
}
function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== null && item !== undefined));
}
