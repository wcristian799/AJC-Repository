import type { PrecoItemApi } from "@/lib/ajc-api";
import type { EncomendaTamanho, PrecoEncomendaResultado, PrecoEncomendaTabela } from "./types";

export const ENCOMENDA_TAMANHOS: { id: EncomendaTamanho; label: string; pesoMax: number }[] = [
  { id: "P", label: "P - ate 10 kg", pesoMax: 10 },
  { id: "M", label: "M - ate 20 kg", pesoMax: 20 },
  { id: "G", label: "G - ate 30 kg", pesoMax: 30 },
];

export const ENCOMENDA_FLUXO = [
  "recebido",
  "conferido",
  "embarcado",
  "em_viagem",
  "desembarcado",
  "entregue",
] as const;

export const DC_TERMO_VERSAO = "DC-TERMO-v1";

export const DC_TERMO_PLACEHOLDER =
  "Declaro que as informacoes prestadas sobre conteudo, valor e destinatario sao verdadeiras, assumindo responsabilidade por divergencias, itens proibidos ou ausencia de nota fiscal quando aplicavel.";

export const DC_CLAUSULAS = [
  "A AJC nao responde por conteudo divergente do declarado pelo cliente.",
  "O reembolso, quando devido, fica limitado ao valor declarado no despacho.",
  "Itens proibidos, perigosos ou sem documentacao podem ter embarque recusado.",
  "A declaracao assinada fica anexada ao envio para auditoria e prova legal.",
];

export function buildPrecoEncomendaTabela(items: PrecoItemApi[]): PrecoEncomendaTabela[] {
  const grouped = new Map<string, PrecoEncomendaTabela>();
  for (const item of items) {
    if (item.tipo !== "encomenda" || !item.origemSigla || !item.destinoSigla) continue;
    const key = `${item.origemSigla}->${item.destinoSigla}`;
    const current =
      grouped.get(key) ??
      {
        trecho: `${item.origemSigla} -> ${item.destinoSigla}`,
        origemSigla: item.origemSigla,
        destinoSigla: item.destinoSigla,
        p: 0,
        m: 0,
        g: 0,
        percentual: 0,
      };
    if (item.tamanho === "P" && item.valor !== null) current.p = item.valor;
    if (item.tamanho === "M" && item.valor !== null) current.m = item.valor;
    if (item.tamanho === "G" && item.valor !== null) current.g = item.valor;
    if (item.percentual !== null) current.percentual = item.percentual;
    grouped.set(key, current);
  }
  const rows = [...grouped.values()].filter((row) => row.p || row.m || row.g || row.percentual);
  return rows;
}

export function calcularPrecoEncomenda(
  tabela: PrecoEncomendaTabela[],
  args: { trecho: string; tamanho: EncomendaTamanho; valorDeclarado: number; limiteFixo: number },
): PrecoEncomendaResultado | null {
  const row = tabela.find((p) => p.trecho === args.trecho);
  if (!row || !Number.isFinite(args.limiteFixo) || args.limiteFixo <= 0) return null;
  if (args.valorDeclarado <= args.limiteFixo) {
    const preco = args.tamanho === "P" ? row.p : args.tamanho === "M" ? row.m : row.g;
    return { preco, modo: "fixo", limiteFixo: args.limiteFixo };
  }
  return {
    preco: Math.round(args.valorDeclarado * (row.percentual / 100)),
    modo: "percentual",
    limiteFixo: args.limiteFixo,
    percentual: row.percentual,
  };
}

export function sugerirTamanhoPorPeso(peso: number): EncomendaTamanho {
  if (peso <= 10) return "P";
  if (peso <= 20) return "M";
  return "G";
}
