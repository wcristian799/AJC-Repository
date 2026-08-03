import { BadRequestException } from "@nestjs/common";
import { validateTmsUnitizacaoConfig } from "./tms-unitizacao-config.validator";

const valid = {
  schemaVersion: 1,
  timezone: "America/Sao_Paulo",
  unitizacoes: [
    {
      codigo: "MP",
      nome: "Multi-palete",
      descricao: "Uma carga em mais de um palete.",
      ativo: true,
    },
    {
      codigo: "PD",
      nome: "Palete dedicado",
      descricao: "Uma carga em um palete.",
      ativo: true,
    },
    {
      codigo: "PC",
      nome: "Palete compartilhado",
      descricao: "Cargas compartilham um palete.",
      ativo: true,
    },
  ],
  recebimento: {
    exigirEvidencia: true,
    minimoEvidencias: 1,
    permitirAvulsa: true,
  },
  reimpressao: { somenteDiaOperacional: true, exigirJustificativa: true },
  etiqueta: {
    copiasPadrao: 1,
    larguraMm: null,
    alturaMm: null,
    perfilImpressora: null,
    protocolo: null,
  },
  offline: { habilitado: true, maximoPendencias: 500 },
};

describe("validateTmsUnitizacaoConfig", () => {
  it("aceita configuracao completa sem inventar hardware", () =>
    expect(() => validateTmsUnitizacaoConfig(valid)).not.toThrow());
  it("rejeita ausencia de um tipo operacional", () =>
    expect(() =>
      validateTmsUnitizacaoConfig({
        ...valid,
        unitizacoes: valid.unitizacoes.slice(0, 2),
      }),
    ).toThrow(BadRequestException));
  it("rejeita evidencia obrigatoria com minimo zero", () =>
    expect(() =>
      validateTmsUnitizacaoConfig({
        ...valid,
        recebimento: { ...valid.recebimento, minimoEvidencias: 0 },
      }),
    ).toThrow("minimoEvidencias"));
  it("rejeita protocolo desconhecido", () =>
    expect(() =>
      validateTmsUnitizacaoConfig({
        ...valid,
        etiqueta: { ...valid.etiqueta, protocolo: "DESCONHECIDO" },
      }),
    ).toThrow("protocolo"));
});
