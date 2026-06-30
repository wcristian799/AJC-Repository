import { useState } from "react";
import { Printer, Tag as TagIcon } from "lucide-react";
import {
  SectionHeader, PrimaryButton, GhostButton,
} from "@/components/ops/primitives";
import { FakeQR } from "@/components/ops/FakeQR";
import { VOLUMES, ETIQUETA_CIDADES, type Volume } from "@/mocks/data";

/** B.5 — Etiqueta de carga (preview do modelo térmico por volume). */
export function EtiquetaTab() {
  const [sel, setSel] = useState<Volume>(VOLUMES[2]);
  // índice/total derivados dos volumes da mesma carga
  const irmaos = VOLUMES.filter((v) => v.cargaId === sel.cargaId);
  const indice = irmaos.findIndex((v) => v.id === sel.id) + 1;
  const totalVol = irmaos.length;
  const tipoEtiqueta = totalVol > 1 ? "MP" : sel.paleteId ? "PC" : "PD";
  const reimpressoesHoje = VOLUMES.slice(0, 4).map((v, i) => ({
    id: v.id,
    hora: ["08:12", "08:48", "09:05", "09:27"][i],
    alvo: v.paleteId ?? v.id,
    cidade: v.cidadeDestino,
    tipo: i === 0 ? "MP" : i === 1 ? "PC" : "PD",
  }));

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Impressão térmica"
        title="Etiqueta de carga"
        description="Etiqueta física padronizada por volume. O QR codifica o UUID — chave de todos os bipes subsequentes (recebimento, 2º bipe, desembarque, entrega)."
        actions={
          <>
            <GhostButton icon={TagIcon}>Reimprimir etiqueta</GhostButton>
            <PrimaryButton icon={Printer}>Imprimir etiqueta</PrimaryButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Preview da etiqueta térmica */}
        <div className="mx-auto">
          <div className="w-[320px] overflow-hidden rounded-lg bg-white text-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/10">
            {/* Cabeçalho cidade */}
            <div className="flex items-stretch border-b-2 border-dashed border-black/30">
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">Cidade destino</p>
                <p className="font-mono text-5xl font-bold leading-none tracking-tight">{sel.cidadeDestino}</p>
              </div>
              <div className="grid place-items-center border-l-2 border-dashed border-black/30 px-3">
                <p className="text-[9px] font-bold uppercase text-black/50">AJC</p>
                <p className="font-mono text-2xl font-black">{tipoEtiqueta}</p>
              </div>
            </div>

            {/* Palete + volume índice/total */}
            <div className="flex items-stretch border-b border-black/20">
              <div className="flex-1 border-r border-black/20 px-4 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Palete</p>
                <p className="font-mono text-xl font-bold">{sel.paleteId ?? "—"}</p>
              </div>
              <div className="flex-1 px-4 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Volume</p>
                <p className="font-mono text-xl font-bold">{indice}/{totalVol}</p>
              </div>
            </div>

            <div className="border-b border-black/20 px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Tipo operacional</p>
              <p className="font-mono text-sm font-bold">
                {tipoEtiqueta} · {tipoEtiqueta === "MP" ? "multi-palete" : tipoEtiqueta === "PC" ? "palete compartilhado" : "palete dedicado"}
              </p>
            </div>

            {/* QR + UUID */}
            <div className="flex items-center gap-3 px-4 py-3">
              <FakeQR value={sel.uuid} size={120} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">UUID do volume</p>
                <p className="break-all font-mono text-[11px] leading-tight">{sel.uuid}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-black/50">Carga</p>
                <p className="font-mono text-xs">{sel.cargaId}</p>
              </div>
            </div>

            {/* Remetente/destinatário abreviado */}
            <div className="border-t border-black/20 px-4 py-2.5">
              <p className="truncate text-[11px]"><span className="font-bold">Dest.:</span> {sel.cliente}</p>
              <p className="text-[10px] text-black/60">Peso {sel.peso} kg · {sel.id}</p>
            </div>

            <div className="bg-black px-4 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white">
              {ETIQUETA_CIDADES.join(" · ")}
            </div>
          </div>
        </div>

        {/* Seletor de volume + campos da etiqueta */}
        <div className="space-y-4">
          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Palete ou volume para etiquetar</h3>
            <p className="mt-1 text-xs text-muted-foreground">Selecione um palete/volume para pré-visualizar a etiqueta. Cada bipe subsequente lê o QR/UUID impresso.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {VOLUMES.map((v) => {
                const active = v.id === sel.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSel(v)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left ring-1 transition-colors ${
                      active
                        ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-[color:var(--hairline-brand)]"
                        : "bg-[color:var(--muted)] ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.cliente}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{v.uuid}</p>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-[color:var(--card)] px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-[color:var(--hairline)]">{v.cidadeDestino}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="surface-card brand-rail brand-rail-left p-5">
            <h3 className="font-display text-lg">Conteúdo obrigatório (B.5)</h3>
            <ul className="mt-3 grid gap-1.5 text-sm text-foreground/85 sm:grid-cols-2">
              <li>• <span className="font-medium">CIDADE</span> — sigla destino</li>
              <li>• <span className="font-medium">PALETE</span> — código usado</li>
              <li>• <span className="font-medium">VOLUME</span> — índice/total (1/2…)</li>
              <li>• <span className="font-medium">QR</span> — UUID do volume</li>
              <li>• Remetente/destinatário abreviado</li>
              <li>• Nº da carga</li>
              <li>• Sigla operacional MP/PD/PC</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">Layout otimizado para impressora térmica. Nenhum volume embarca sem etiqueta com UUID e foto de recebimento — inclusive no cross-docking.</p>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Reimpressão do dia</h3>
            <p className="mt-1 text-xs text-muted-foreground">Lista de conferências/etiquetas criadas hoje para escolher exatamente o que reimprimir.</p>
            <div className="mt-3 space-y-2">
              {reimpressoesHoje.map((r) => (
                <button
                  key={r.id}
                  className="flex w-full items-center justify-between rounded-lg bg-[color:var(--muted)] px-3 py-2 text-left ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                >
                  <span>
                    <span className="font-mono text-xs text-foreground">{r.hora} · {r.alvo}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.cidade}</span>
                  </span>
                  <span className="rounded bg-[color:var(--card)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">{r.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
