import type { PrecoItemApi } from "@/lib/ajc-api";
import type { PrecoEncomendaResultado, PrecoEncomendaTabela } from "./types";

export function buildPrecoEncomendaTabela(items: PrecoItemApi[]): PrecoEncomendaTabela[] {
  const grouped = new Map<string, PrecoEncomendaTabela>();
  for (const item of items) {
    if (item.tipo !== "encomenda" || !item.origemSigla || !item.destinoSigla) continue;
    const key = `${item.origemSigla}->${item.destinoSigla}`;
    const row = grouped.get(key) ?? { trecho: `${item.origemSigla} -> ${item.destinoSigla}`, origemSigla: item.origemSigla, destinoSigla: item.destinoSigla, valores: {}, percentual: 0, versao: item.versao };
    if (item.tamanho && item.valor !== null) row.valores[item.tamanho] = item.valor;
    if (item.percentual !== null) row.percentual = item.percentual;
    grouped.set(key, row);
  }
  return [...grouped.values()].filter((row) => Object.keys(row.valores).length || row.percentual > 0);
}

export function calcularPrecoEncomenda(tabela: PrecoEncomendaTabela[], args: { trecho: string; tamanho: string; valorDeclarado: number; limiteFixo: number }): PrecoEncomendaResultado | null {
  const row = tabela.find((item) => item.trecho === args.trecho);
  if (!row || !Number.isFinite(args.limiteFixo) || args.limiteFixo <= 0 || args.valorDeclarado <= 0) return null;
  if (args.valorDeclarado <= args.limiteFixo) {
    const preco = row.valores[args.tamanho];
    return Number.isFinite(preco) ? { preco, modo: "fixo", limiteFixo: args.limiteFixo, tabelaVersao: row.versao } : null;
  }
  if (!Number.isFinite(row.percentual) || row.percentual <= 0) return null;
  return { preco: Math.round(args.valorDeclarado * row.percentual) / 100, modo: "percentual", limiteFixo: args.limiteFixo, percentual: row.percentual, tabelaVersao: row.versao };
}

export function sugerirTamanhoPorPeso(tamanhos: Array<{ codigo: string; pesoMaxKg: number; ativo: boolean }>, peso: number) {
  return [...tamanhos].filter((item) => item.ativo).sort((a, b) => a.pesoMaxKg - b.pesoMaxKg).find((item) => peso <= item.pesoMaxKg)?.codigo ?? null;
}
