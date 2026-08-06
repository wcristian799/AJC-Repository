import { buildBpePayload, modulo11 } from './bpe-payload.builder';
import { validBpeConfig } from './fiscal-test.fixtures';

describe('buildBpePayload', () => {
  it('monta o contrato NS com chave de 44 digitos e dados reais do trecho', () => {
    const result = buildBpePayload(validBpeConfig(), {
      fiscalId: '5a55ceab-a2bd-4680-b71d-f7c8e7b7169c',
      numero: 1,
      passageiroNome: 'Maria da Silva',
      passageiroDocumento: '123.456.789-01',
      classe: 'rede',
      precoPago: 85,
      troco: 0,
      origemSigla: 'BEL', origemNome: 'Belem', origemUf: 'PA', origemCodigoIbge: '1501402',
      destinoSigla: 'ALM', destinoNome: 'Almeirim', destinoUf: 'PA', destinoCodigoIbge: '1500503',
      dataHoraEmbarque: '2026-08-11T20:00:00.000Z',
      pagamentos: [{ formaPagamento: 'pix', valor: 85 }],
    }, new Date('2026-08-05T15:00:00.000Z'));
    expect(result.accessKeyPreview).toMatch(/^\d{44}$/);
    expect(modulo11(result.accessKeyPreview.slice(0, -1))).toBe(result.accessKeyPreview.slice(-1));
    const inf = result.payload.BPe.infBPe as Record<string, any>;
    expect(inf.ide).toMatchObject({ mod: '63', tpAmb: '2', cMunIni: '1501402', cMunFim: '1500503' });
    expect(inf.infPassagem).toMatchObject({ cLocOrig: '1501402', cLocDest: '1500503' });
    expect(inf.infViagem).toMatchObject({ cPercurso: '1', tpAcomodacao: '1' });
    expect(inf.pag).toEqual({ tPag: '17', vPag: '85.00' });
  });
});
