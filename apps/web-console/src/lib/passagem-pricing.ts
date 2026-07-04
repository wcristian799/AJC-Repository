import type { PrecoPassagemMatrizApi } from "@/lib/ajc-api";

export type VendaClasseBasicaId = "rede" | "vip" | "camarote";

export type PrecoPassagemResumo = {
  rede: number;
  vip: number;
  camaroteRoyal: number;
};

const CLASS_KEYS: Record<VendaClasseBasicaId, string[]> = {
  rede: ["rede", "rede:inteira", "rede:1_pessoa"],
  vip: ["rede_sala_vip", "rede_sala_vip:inteira", "rede_sala_vip:1_pessoa"],
  camarote: [
    "suite_master",
    "suite_master:2_pessoas",
    "suite_master_vip",
    "suite_master_vip:2_pessoas",
    "mega_suite",
    "mega_suite:2_pessoas",
    "suite_comum",
    "suite_comum:2_pessoas",
    "camarote",
    "camarote:2_pessoas",
  ],
};

export function precoPassagemPorClasseApi(
  matriz: PrecoPassagemMatrizApi[],
  origemSigla: string,
  destinoSigla: string,
  classe: string,
) {
  const trecho = matriz.find((item) => item.origemSigla === origemSigla && item.destinoSigla === destinoSigla);
  if (!trecho) return 0;
  const keys = [classe, `${classe}:inteira`, `${classe}:1_pessoa`, `${classe}:2_pessoas`];
  for (const key of keys) {
    const value = Number(trecho.classes[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function precoPassagemPorClasse(
  matriz: PrecoPassagemMatrizApi[],
  origemSigla: string,
  destinoSigla: string,
  classeId: VendaClasseBasicaId,
) {
  const trecho = matriz.find((item) => item.origemSigla === origemSigla && item.destinoSigla === destinoSigla);
  if (!trecho) return 0;
  for (const key of CLASS_KEYS[classeId]) {
    const value = Number(trecho.classes[key] ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function resumoPrecoPassagem(
  matriz: PrecoPassagemMatrizApi[],
  origemSigla: string,
  destinoSigla: string,
): PrecoPassagemResumo {
  return {
    rede: precoPassagemPorClasse(matriz, origemSigla, destinoSigla, "rede"),
    vip: precoPassagemPorClasse(matriz, origemSigla, destinoSigla, "vip"),
    camaroteRoyal: precoPassagemPorClasse(matriz, origemSigla, destinoSigla, "camarote"),
  };
}
