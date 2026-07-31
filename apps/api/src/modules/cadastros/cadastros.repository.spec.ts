import { BadRequestException } from "@nestjs/common";
import { sanitizeCapacidadePax } from "./cadastros.repository";

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
