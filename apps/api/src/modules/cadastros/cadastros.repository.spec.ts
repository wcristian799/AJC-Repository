import { BadRequestException } from "@nestjs/common";
import { normalizeCidadeInput, normalizeCidadeSigla, sanitizeCapacidadePax } from "./cadastros.repository";

describe("cadastro de cidades", () => {
  it("normaliza sigla, nome e UF sem inventar valores", () => {
    expect(normalizeCidadeInput({
      sigla: "  mcp ",
      nome: "  Melgaco   Centro  ",
      uf: "pa",
      codigoIbge: " 1504402 ",
      isBase: false,
      ativo: true,
    }, true)).toEqual({
      sigla: "MCP",
      nome: "Melgaco Centro",
      uf: "PA",
      codigoIbge: "1504402",
      isBase: false,
      ativo: true,
    });
  });

  it("rejeita sigla fora do contrato operacional", () => {
    expect(() => normalizeCidadeSigla("cidade-grande")).toThrow("Sigla deve ter de 2 a 4");
  });

  it("rejeita UF invalida", () => {
    expect(() => normalizeCidadeInput({ sigla: "MCP", nome: "Melgaco", uf: "PARA" }, true))
      .toThrow("UF deve conter duas letras");
  });

  it("rejeita codigo IBGE incompleto", () => {
    expect(() => normalizeCidadeInput({ sigla: "MCP", nome: "Melgaco", uf: "PA", codigoIbge: "150" }, true))
      .toThrow("Codigo IBGE deve conter sete digitos");
  });
});

describe("sanitizeCapacidadePax", () => {
  it("preserva o contrato estruturado usado pelo formulario de embarcacoes", () => {
    expect(
      sanitizeCapacidadePax({
        classes: ["rede", "suite_master"],
        capacidadePorClasse: {
          rede: { supported: true, capacidade: 120, ocupacaoPessoas: 1 },
          suite_master: { supported: true, capacidade: 6, ocupacaoPessoas: 2 },
        },
      }),
    ).toEqual({
      classes: ["rede", "suite_master"],
      capacidadePorClasse: {
        rede: { supported: true, capacidade: 120, ocupacaoPessoas: 1 },
        suite_master: { supported: true, capacidade: 6, ocupacaoPessoas: 2 },
      },
    });
  });

  it("aceita classe suportada ainda sem capacidade confirmada", () => {
    expect(
      sanitizeCapacidadePax({
        classes: ["camarote"],
        capacidadePorClasse: {
          camarote: { supported: true, capacidade: null },
        },
      }),
    ).toEqual({
      classes: ["camarote"],
      capacidadePorClasse: { camarote: { supported: true, capacidade: null } },
    });
  });

  it("mantem compatibilidade com o formato plano legado", () => {
    expect(sanitizeCapacidadePax({ rede: 100, suite_master: 4 })).toEqual({
      rede: 100,
      suite_master: 4,
    });
  });

  it("rejeita capacidade negativa", () => {
    expect(() =>
      sanitizeCapacidadePax({
        classes: ["rede"],
        capacidadePorClasse: { rede: { capacidade: -1 } },
      }),
    ).toThrow(BadRequestException);
  });
});
