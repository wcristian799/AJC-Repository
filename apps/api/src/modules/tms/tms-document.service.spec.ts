import { BadRequestException } from '@nestjs/common';
import { extractNfe } from './tms-document.service';

describe('extractNfe', () => {
  it('extrai emitente, destinatario, totais, volumes e frete da NF-e', () => {
    const result = extractNfe(`<?xml version="1.0"?>
      <nfeProc><NFe><infNFe Id="NFe15260812345678000199550010000001231000001234">
        <ide><mod>55</mod><nNF>123</nNF></ide>
        <emit><CNPJ>12345678000199</CNPJ><xNome>Comercial Ribeira Ltda</xNome><enderEmit><fone>91999990000</fone></enderEmit></emit>
        <dest><CPF>12345678901</CPF><xNome>Maria da Silva</xNome><enderDest><fone>91988880000</fone></enderDest></dest>
        <total><ICMSTot><vNF>1540.75</vNF></ICMSTot></total>
        <transp><modFrete>0</modFrete><vol><qVol>3</qVol><pesoB>82.5</pesoB></vol></transp>
      </infNFe></NFe></nfeProc>`);
    expect(result).toMatchObject({
      tipo: 'NFe', numero: '123', valor: 1540.75, pesoTotal: 82.5,
      totalVolumes: 3, pagamento: 'CIF', xmlLido: true,
      remetente: { nome: 'Comercial Ribeira Ltda', documento: '12345678000199', telefone: '91999990000' },
      destinatario: { nome: 'Maria da Silva', documento: '12345678901', telefone: '91988880000' },
    });
    expect(result.chaveAcesso).toHaveLength(44);
  });

  it('recusa XML que nao e NF-e/NFC-e', () => {
    expect(() => extractNfe('<documento><numero>123</numero></documento>')).toThrow(BadRequestException);
  });
});
