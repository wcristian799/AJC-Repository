import { useState } from "react";
import { Users, Package, Boxes, Car, Paperclip, AlertTriangle } from "lucide-react";
import {
  SectionHeader, StatusChip, brl,
} from "@/components/ops/primitives";
import { PRESTACOES_CONTAS, VIAGENS, type PrestacaoContas, type PrestacaoStatus } from "@/mocks/data";

const STATUS_TONE: Record<PrestacaoStatus, "neutral" | "warning" | "success"> = {
  rascunho: "neutral",
  enviada: "warning",
  conferida: "success",
};
const STATUS_LABEL: Record<PrestacaoStatus, string> = {
  rascunho: "Rascunho (editável)",
  enviada: "Enviada (bloqueada)",
  conferida: "Conferida",
};

/** B.10 — Prestação de contas do gerente da embarcação. */
export function PrestacaoTab() {
  const [sel, setSel] = useState(PRESTACOES_CONTAS[1].id);
  const pc = PRESTACOES_CONTAS.find((p) => p.id === sel) ?? PRESTACOES_CONTAS[0];
  const viagem = VIAGENS.find((v) => v.id === pc.viagemId);
  const divergencia = pc.totalSistema - pc.totalDeclarado;
  const temDivergencia = divergencia !== 0;

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Gerente da embarcação"
        title="Prestação de contas da viagem"
        description="Consolida receitas/despesas da viagem e cruza automaticamente com o contas a receber. Divergência declarado × sistema é sinalizada ao financeiro."
      />

      <div className="flex flex-wrap gap-2">
        {PRESTACOES_CONTAS.map((p) => {
          const v = VIAGENS.find((x) => x.id === p.viagemId);
          const active = p.id === sel;
          return (
            <button
              key={p.id}
              onClick={() => setSel(p.id)}
              className={`flex flex-col items-start rounded-lg px-4 py-2.5 text-left ring-1 transition-colors ${
                active
                  ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-[color:var(--hairline-brand)]"
                  : "bg-[color:var(--muted)] ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
              }`}
            >
              <span className="font-mono text-xs">{v?.codigo}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{p.gerente}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Itens declarado x sistema */}
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{viagem?.origem} → {viagem?.destino} · {viagem?.codigo}</p>
              <h3 className="mt-0.5 font-display text-lg">Itens da viagem</h3>
            </div>
            <StatusChip tone={STATUS_TONE[pc.status]} pulse={pc.status === "enviada"}>{STATUS_LABEL[pc.status]}</StatusChip>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-semibold">Item</th>
                <th className="px-5 py-2.5 text-right font-semibold">Declarado</th>
                <th className="px-5 py-2.5 text-right font-semibold">Sistema</th>
                <th className="px-5 py-2.5 text-right font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody>
              {pc.itens.map((it, i) => {
                const d = it.sistema - it.declarado;
                return (
                  <tr key={i} className="border-b border-[color:var(--hairline)] last:border-0">
                    <td className="px-5 py-3 text-foreground/90">{it.rotulo}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">{brl(it.declarado)}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">{brl(it.sistema)}</td>
                    <td className={`px-5 py-3 text-right font-mono text-xs ${d === 0 ? "text-muted-foreground" : "text-[color:var(--danger)]"}`}>
                      {d === 0 ? "—" : (d > 0 ? "+" : "") + brl(d)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--surface-tint)] font-medium">
                <td className="px-5 py-3.5">Total</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(pc.totalDeclarado)}</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(pc.totalSistema)}</td>
                <td className={`px-5 py-3.5 text-right font-mono text-sm ${temDivergencia ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}`}>
                  {temDivergencia ? (divergencia > 0 ? "+" : "") + brl(divergencia) : "0"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Resumo + divergência */}
        <div className="space-y-4">
          {temDivergencia ? (
            <div className="surface-card brand-rail brand-rail-left flex items-start gap-3 p-5" style={{ background: "color-mix(in oklab, var(--danger) 8%, var(--card))" }}>
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--danger)]" />
              <div>
                <p className="font-display text-base text-[color:var(--danger)]">Divergência de {brl(Math.abs(divergencia))}</p>
                <p className="mt-1 text-xs text-muted-foreground">Declarado pelo gerente difere do apurado pelo sistema. Sinalizado ao financeiro para conferência antes do fechamento.</p>
              </div>
            </div>
          ) : (
            <div className="surface-card p-5">
              <p className="font-display text-base text-[color:var(--success)]">Sem divergência</p>
              <p className="mt-1 text-xs text-muted-foreground">Declarado bate com o sistema. Pronto para conferência do financeiro.</p>
            </div>
          )}

          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Resumo da viagem</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ResumoItem icon={Users} label="Passageiros" value={pc.passageiros} />
              <ResumoItem icon={Package} label="Encomendas" value={pc.encomendas} />
              <ResumoItem icon={Boxes} label="Cargas" value={pc.cargas} />
              <ResumoItem icon={Car} label="Veículos" value={pc.veiculos} />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--hairline)] pt-3 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> {pc.anexos} anexo(s) · atualizado {pc.atualizadoEm}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <p className="big-numeric mt-1 text-xl text-foreground">{value}</p>
    </div>
  );
}
