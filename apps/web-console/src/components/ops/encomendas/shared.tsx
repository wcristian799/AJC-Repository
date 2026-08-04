import type { ReactNode } from "react";
import { AlertTriangle, Percent, ShieldAlert, Tag as TagIcon } from "lucide-react";
import { Tag, brl } from "@/components/ops/primitives";
import type { EncomendaConfigUi, PrecoEncomendaResultado } from "./types";

export function PrecoDestaque({ resultado, trecho, tamanho }: { resultado: PrecoEncomendaResultado | null; trecho: string; tamanho: string }) {
  if (!resultado) return <div className="rounded-xl bg-[color:color-mix(in_oklab,var(--danger)_8%,transparent)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)]"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Preço indisponível</p><Tag tone="danger">cadastro obrigatório</Tag></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Publique em Cadastros a tabela do trecho, os tamanhos e o percentual. O despacho fica bloqueado para não cobrar um valor inventado.</p></div>;
  const percentual = resultado.modo === "percentual";
  return <div className="rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_9%,transparent)] p-5 ring-1 ring-[color:var(--hairline-brand)]"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">Preço calculado</p><Tag tone={percentual ? "warning" : "brand"}>{percentual ? <><Percent className="h-3 w-3"/> percentual</> : <><TagIcon className="h-3 w-3"/> fixo · {tamanho}</>}</Tag></div><p className="big-numeric mt-3 text-4xl text-[color:var(--brand)]">{brl(resultado.preco)}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{percentual ? `${resultado.percentual}% sobre o valor declarado acima de ${brl(resultado.limiteFixo)}.` : `Valor fixo publicado para ${trecho} e tamanho ${tamanho}, até ${brl(resultado.limiteFixo)}.`}</p><p className="mt-2"><Tag tone="neutral">tabela v{resultado.tabelaVersao}</Tag></p></div>;
}

export function TermoDC({ config }: { config: EncomendaConfigUi }) {
  if (!config.termo.publicado) return <div className="rounded-xl bg-[color:color-mix(in_oklab,var(--warning)_9%,transparent)] p-5 ring-1 ring-[color:color-mix(in_oklab,var(--warning)_28%,transparent)]"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[color:var(--warning)]"/><h3 className="font-semibold">Termo jurídico ainda não publicado</h3></div><p className="mt-2 text-sm text-muted-foreground">Cadastre o texto final e as cláusulas em Cadastros › Configurações operacionais. A assinatura de DC permanece bloqueada até a publicação; nenhum texto provisório é apresentado ao cliente.</p></div>;
  return <div className="surface-card p-5"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[color:var(--brand)]"/><h3 className="font-display text-lg">{config.termo.titulo}</h3><Tag tone="success">publicado</Tag></div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{config.termo.texto}</p><ul className="mt-4 space-y-2">{config.termo.clausulas.map((item) => <li key={item} className="flex gap-2 text-sm text-foreground/85"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]"/><span>{item}</span></li>)}</ul></div>;
}

export function ResumoLinha({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-[color:var(--hairline)] py-2.5 last:border-0"><span className="text-xs text-muted-foreground">{label}</span><span className="max-w-[65%] text-right text-sm font-medium text-foreground">{children}</span></div>;
}
