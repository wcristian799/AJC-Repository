import { type ReactNode } from "react";
import { motion } from "motion/react";
import { Percent, Tag as TagIcon, ShieldAlert, AlertTriangle } from "lucide-react";
import { CountUp } from "@/components/ops/motion-bits";
import { Tag } from "@/components/ops/primitives";
import { DC_CLAUSULAS, DC_TERMO_PLACEHOLDER } from "./pricing";
import type { PrecoEncomendaResultado } from "./types";

/**
 * Preço em destaque (campo "gigante") — deixa ÓBVIO se a cobrança é FIXA (P/M/G)
 * ou PERCENTUAL sobre o valor declarado (> R$ 1.000). B.1 / B.3.
 */
export function PrecoDestaque({
  resultado,
  trecho,
  tamanho,
}: {
  resultado: PrecoEncomendaResultado | null;
  trecho: string;
  tamanho: string;
}) {
  if (!resultado) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[color:color-mix(in_oklab,var(--danger)_8%,transparent)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Preco da encomenda
          </p>
          <Tag tone="danger">configuracao obrigatoria</Tag>
        </div>
        <p className="mt-3 text-sm font-medium text-[color:var(--danger)]">Tabela de encomendas indisponivel para cobranca.</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Publique `tamanhos_encomenda.limiteFixo` e a tabela ativa de precos de encomenda no backend para liberar despacho/cotacao.
        </p>
      </div>
    );
  }
  const percentual = resultado.modo === "percentual";
  const tone = percentual ? "var(--warning)" : "var(--brand)";
  return (
    <motion.div
      key={resultado.modo}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl p-5 ring-1"
      style={{ background: `color-mix(in oklab, ${tone} 10%, transparent)`, borderColor: "transparent", boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} 30%, transparent)` }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Preço da encomenda
        </p>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1"
          style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)`, borderColor: "transparent" }}
        >
          {percentual ? <Percent className="h-3 w-3" /> : <TagIcon className="h-3 w-3" />}
          {percentual ? "Percentual da nota/declaração" : `Tabela fixa · ${tamanho}`}
        </span>
      </div>

      <p className="big-numeric mt-2 text-5xl leading-none" style={{ color: tone }}>
        <CountUp to={resultado.preco} prefix="R$ " />
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
        {percentual
          ? `Acima de R$ ${resultado.limiteFixo.toLocaleString("pt-BR")} de valor declarado → ${resultado.percentual?.toLocaleString("pt-BR")}% sobre o valor declarado (independe do tamanho).`
          : `Até R$ ${resultado.limiteFixo.toLocaleString("pt-BR")} de valor declarado → preço fixo por tamanho no trecho ${trecho}.`}
      </p>

      {percentual && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: tone }}>
          <ShieldAlert className="h-3.5 w-3.5" />
          Caixa pequena pode conter alto valor — cobrança proporcional ao declarado.
        </p>
      )}
      <p className="mt-2 inline-flex items-center"><Tag tone="brand">tabela versionada</Tag></p>
    </motion.div>
  );
}

/**
 * Termo da Declaração de Conteúdo com a cláusula de exclusão de
 * responsabilidade (A.2). Texto integral 🔶 pendente (Lucas).
 */
export function TermoDC({ compact = false }: { compact?: boolean }) {
  return (
    <div className="surface-card brand-rail brand-rail-left p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-[color:var(--brand)]" />
        <h3 className="font-display text-lg">Termo · Declaração de Conteúdo</h3>
        <Tag tone="warning">🔶 texto pendente (Lucas)</Tag>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{DC_TERMO_PLACEHOLDER}</p>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--danger)]">
        Cláusula de exclusão de responsabilidade
      </p>
      <ul className="mt-2 space-y-2">
        {(compact ? DC_CLAUSULAS.slice(0, 3) : DC_CLAUSULAS).map((c, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground/85">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning)]" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha rótulo→valor para resumos compactos. */
export function ResumoLinha({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  );
}
