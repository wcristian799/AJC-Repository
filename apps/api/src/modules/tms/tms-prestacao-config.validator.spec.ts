import { validateTmsPrestacaoConfig } from './tms-prestacao-config.validator';

describe('validateTmsPrestacaoConfig', () => {
  const valid = { schemaVersion: 1, timezone: 'America/Sao_Paulo', formasPagamento:[{codigo:'pix',nome:'PIX',ativo:true}], categoriasReceita:[{codigo:'passagens',nome:'Passagens',ativo:true}], categoriasDespesa:[{codigo:'mao_obra',nome:'Mao de obra',ativo:true}], intertrechos:[], comissoesAgencia:[] };
  it('aceita catalogos configuraveis sem valores de negocio', () => expect(validateTmsPrestacaoConfig(valid)).toBe(valid));
  it('rejeita codigos duplicados', () => expect(() => validateTmsPrestacaoConfig({...valid, formasPagamento:[valid.formasPagamento[0], valid.formasPagamento[0]]})).toThrow('duplicado'));
});
