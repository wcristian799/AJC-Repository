import { BpeIntegrationConfig } from './fiscal.types';

export function validBpeConfig(): BpeIntegrationConfig {
  return {
    schemaVersion: 1,
    provider: 'ns',
    habilitada: true,
    ambiente: 'homologacao',
    versaoLayout: '1.00',
    serie: 900,
    numeroInicial: 1,
    modal: '1',
    verProc: 'AJC-1.0',
    tpBPe: '0',
    indPres: '1',
    emitente: {
      cnpj: '10736847000192', ie: '123456789', razaoSocial: 'AJC Navegacao Ltda', im: '', cnae: '', crt: '3', tar: '',
      endereco: { logradouro: 'Rua Fiscal', numero: '1', bairro: 'Centro', codigoIbge: '1501402', municipio: 'Belem', uf: 'PA' },
    },
    rotas: [{ origemSigla: 'BEL', destinoSigla: 'ALM', cPercurso: '1', xPercurso: 'Belem - Almeirim', tpViagem: '00', tpServ: '4', tpTrecho: '1' }],
    classes: [{ classe: 'rede', tpAcomodacao: '1' }],
    pagamentos: [{ formaPagamento: 'pix', tPag: '17' }],
    componenteTarifa: '01',
    tipoDocumentoPassageiroPadrao: '1',
    impostos: { ICMS: { ICMSSN: { CST: '90', indSN: '1' } } },
    operacao: { pollingSegundos: 5, tentativasConsulta: 8, retryMinutos: 5, maxTentativas: 5 },
  };
}
