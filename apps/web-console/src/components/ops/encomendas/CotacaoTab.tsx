import { useMemo, useState } from "react";
import { Calculator, ArrowRight, CalendarClock, Ship } from "lucide-react";
import {
  SectionHeader, GhostButton, Tag, brl,
} from "@/components/ops/primitives";
import {
  ENCOMENDA_TAMANHOS, ENCOMENDA_TRECHOS, VIAGENS, EMBARCACOES,
  calcularPrecoEncomenda, type EncomendaTamanho,
} from "@/mocks/data";
import { PrecoDestaque } from "./shared";

/** B.3 — Cotação de encomenda (simulador sem efetivar). */
export function CotacaoTab({ onConverter }: { onConverter?: () => void }) {
  const [trecho, setTrecho] = useState(ENCOMENDA_TRECHOS[0]);
  const [tamanho, setTamanho] = useState<EncomendaTamanho>("M");
  const [peso, setPeso] = useState(12);
  const [valorDeclarado, setValorDeclarado] = useState(500);

  const resultado = useMemo(
    () => calcularPrecoEncomenda({ trecho, tamanho, valorDeclarado }),
    [trecho, tamanho, valorDeclarado],
  );

  // Prazo: próxima viagem planejada/em curso cujo destino bate com o trecho.
  const destinoSigla = trecho.split("→")[1]?.trim();
  const proximaViagem = useMemo(() => {
    return VIAGENS
      .filter((v) => v.status === "planejada" || v.status === "em_curso")
      .find((v) => v.destino === destinoSigla || v.escalas.some((e) => e.cidade === destinoSigla));
  }, [destinoSigla]);
  const embarcacao = EMBARCACOES.find((e) => e.id === proximaViagem?.embarcacaoId);

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Atendimento · CRM · cliente"
        title="Cotação de encomenda"
        description="Simula o preço sem efetivar o envio. Entrada: trecho + tamanho/peso + valor declarado. Saída: preço estimado (fixo ou percentual) e prazo da próxima viagem."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Simulador</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Trecho</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ENCOMENDA_TRECHOS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrecho(t)}
                    className={`h-9 rounded-md px-3 font-mono text-xs font-medium transition-colors ${
                      trecho === t
                        ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                        : "bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tamanho</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {ENCOMENDA_TAMANHOS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTamanho(t.id)}
                    className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                      tamanho === t.id
                        ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-1 ring-[color:var(--hairline-brand)]"
                        : "bg-[color:var(--muted)] ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                    }`}
                  >
                    <span className={`big-numeric text-xl ${tamanho === t.id ? "text-[color:var(--brand)]" : "text-foreground"}`}>{t.id}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">até {t.pesoMax} kg</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Peso (kg)</label>
                <input
                  type="number" min={0} value={peso || ""}
                  onChange={(e) => setPeso(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valor declarado (R$)</label>
                <input
                  type="number" min={0} value={valorDeclarado || ""}
                  onChange={(e) => setValorDeclarado(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Cotação não cria encomenda nem reserva espaço. <Tag tone="warning">🔶 tabela pendente (Lucas)</Tag>
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PrecoDestaque resultado={resultado} trecho={trecho} tamanho={tamanho} />

          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-base">Prazo · próxima viagem</h3>
            </div>
            {proximaViagem ? (
              <div className="mt-3 space-y-1">
                <p className="inline-flex items-center gap-1.5 font-display text-lg">
                  <Ship className="h-4 w-4 text-[color:var(--brand)]" />
                  {proximaViagem.origem} → {proximaViagem.destino} · {proximaViagem.codigo}
                </p>
                <p className="text-xs text-muted-foreground">{embarcacao?.nome} · saída {proximaViagem.saida}</p>
                <p className="text-xs text-muted-foreground">Previsão de chegada no destino: {proximaViagem.escalas.find((e) => e.cidade === destinoSigla)?.horaPrevista ?? "—"}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Sem viagem programada para {destinoSigla} no momento. Cotação válida; embarque na próxima janela.</p>
            )}
          </div>

          <GhostButton icon={ArrowRight} onClick={onConverter}>Converter em despacho</GhostButton>
        </div>
      </div>
    </div>
  );
}
