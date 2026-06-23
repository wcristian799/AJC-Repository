import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, ArrowLeft, Check, CreditCard, Hand,
  Ship, Wrench, RotateCcw, Printer,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { brl } from "@/components/ops/primitives";
import {
  CIDADES, PRECOS_PASSAGEM, VENDA_CLASSES, VENDA_OFERTAS,
  type VendaClasseId, type Cidade,
} from "@/mocks/data";

export const Route = createFileRoute("/totem")({
  head: () => ({ meta: [{ title: "Totem · AJC Ferry Boat" }] }),
  component: Totem,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Modo = "ocioso" | "em_uso" | "fora_servico";
type Passo = "destino" | "viagem" | "classe" | "pagamento" | "bilhete";

const cidadeNome = (s: string) => CIDADES.find((c) => c.sigla === s)?.nome ?? s;

function Totem() {
  const [modo, setModo] = useState<Modo>("ocioso");

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[color:var(--background)] p-6">
      {/* Botão de manutenção (canto) — alterna fora de serviço para a demo */}
      <button
        onClick={() => setModo((m) => (m === "fora_servico" ? "ocioso" : "fora_servico"))}
        className="fixed right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full text-muted-foreground/40 transition-colors hover:bg-[color:var(--accent)] hover:text-foreground"
        aria-label="Modo manutenção"
      >
        <Wrench className="h-5 w-5" />
      </button>

      <AnimatePresence mode="wait">
        {modo === "fora_servico" && <ForaDeServico key="fs" />}
        {modo === "ocioso" && <Ocioso key="oc" onTocar={() => setModo("em_uso")} />}
        {modo === "em_uso" && <EmUso key="eu" onSair={() => setModo("ocioso")} />}
      </AnimatePresence>
    </main>
  );
}

/* ============ Fora de serviço ============ */
function ForaDeServico() {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex w-full max-w-2xl flex-col items-center text-center"
    >
      <span className="grid h-28 w-28 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] ring-1 ring-[color:color-mix(in_oklab,var(--warning)_35%,transparent)]">
        <Wrench className="h-14 w-14" strokeWidth={1.4} />
      </span>
      <h1 className="mt-8 font-display text-5xl">Fora de serviço</h1>
      <p className="mt-4 max-w-md text-xl text-muted-foreground">
        Este totem está em manutenção. Por favor, dirija-se ao guichê de atendimento.
      </p>
    </motion.div>
  );
}

/* ============ Ocioso (atrai toque) ============ */
function Ocioso({ onTocar }: { onTocar: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onTocar}
      className="relative flex w-full max-w-2xl flex-col items-center gap-8 text-center"
    >
      <div className="pointer-events-none absolute -z-10 h-[480px] w-[480px] rounded-full bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] blur-3xl" />
      <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <BrandMark size={120} />
      </motion.div>
      <div>
        <h1 className="font-display text-6xl leading-tight">Bem-vindo a bordo</h1>
        <p className="mt-4 text-2xl text-muted-foreground">AJC Ferry Boat · Belém e mais 7 cidades</p>
      </div>
      <motion.span
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="mt-2 inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] px-10 py-5 text-2xl font-semibold text-primary-foreground shadow-[0_24px_60px_-18px_color-mix(in_oklab,var(--brand)_75%,transparent)]"
      >
        <Hand className="h-7 w-7" /> Toque para comprar
      </motion.span>
    </motion.button>
  );
}

/* ============ Em uso (fluxo curto) ============ */
function EmUso({ onSair }: { onSair: () => void }) {
  const [passo, setPasso] = useState<Passo>("destino");
  const [destino, setDestino] = useState<Cidade>("STM");
  const [ofertaId, setOfertaId] = useState<string>(VENDA_OFERTAS[0].id);
  const [classeId, setClasseId] = useState<VendaClasseId>("rede");

  const trecho = `BEL → ${destino}`;
  const preco = PRECOS_PASSAGEM.find((p) => p.trecho === trecho);
  const oferta = VENDA_OFERTAS.find((o) => o.id === ofertaId)!;
  const classe = VENDA_CLASSES.find((c) => c.id === classeId)!;
  const valor = preco ? preco[classe.precoKey] : 0;

  // Timeout de inatividade — totem volta ao ocioso após 60s (curto p/ demo).
  const [restante, setRestante] = useState(60);
  useEffect(() => {
    if (passo === "bilhete") return;
    setRestante(60);
    const id = window.setInterval(() => setRestante((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [passo]);
  useEffect(() => {
    if (restante <= 0) onSair();
  }, [restante, onSair]);

  // Destinos populares (exclui Belém).
  const destinos = CIDADES.filter((c) => c.sigla !== "BEL");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="flex h-full w-full max-w-4xl flex-col"
    >
      {/* Topo */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark size={44} />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[color:var(--brand)]">Autoatendimento</p>
            <h1 className="font-display text-2xl">Comprar passagem</h1>
          </div>
        </div>
        {passo !== "bilhete" && (
          <span className="font-mono text-sm text-muted-foreground">volta em {restante}s</span>
        )}
      </header>

      <div className="mt-8 flex-1">
        <AnimatePresence mode="wait">
          {passo === "destino" && (
            <Passo key="destino" titulo="Para onde você vai?">
              <div className="grid grid-cols-3 gap-4">
                {destinos.map((c) => (
                  <button
                    key={c.sigla}
                    onClick={() => { setDestino(c.sigla as Cidade); setPasso("viagem"); }}
                    className="surface-card brand-rail brand-rail-left flex h-32 flex-col items-center justify-center gap-2 p-4 text-center transition-all hover:scale-[1.03] hover:bg-[color:color-mix(in_oklab,var(--brand)_6%,transparent)] active:scale-95"
                  >
                    <Ship className="h-8 w-8 text-[color:var(--brand)]" strokeWidth={1.5} />
                    <span className="font-display text-2xl">{c.nome}</span>
                    <span className="font-mono text-xs text-muted-foreground">BEL → {c.sigla}</span>
                  </button>
                ))}
              </div>
            </Passo>
          )}

          {passo === "viagem" && (
            <Passo key="viagem" titulo={`Belém → ${cidadeNome(destino)}`} onVoltar={() => setPasso("destino")}>
              <div className="space-y-4">
                {VENDA_OFERTAS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setOfertaId(o.id); setPasso("classe"); }}
                    className="surface-card brand-rail brand-rail-left flex w-full items-center justify-between gap-4 p-6 text-left transition-all hover:scale-[1.01] hover:bg-[color:color-mix(in_oklab,var(--brand)_6%,transparent)] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4">
                      <Ship className="h-9 w-9 text-[color:var(--brand)]" strokeWidth={1.5} />
                      <div>
                        <p className="font-display text-3xl">{o.saida}</p>
                        <p className="text-base text-muted-foreground">{o.embarcacao} · {o.duracao}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-7 w-7 text-[color:var(--brand)]" />
                  </button>
                ))}
              </div>
            </Passo>
          )}

          {passo === "classe" && (
            <Passo key="classe" titulo="Escolha a classe" onVoltar={() => setPasso("viagem")}>
              <div className="grid grid-cols-3 gap-4">
                {VENDA_CLASSES.map((c) => {
                  const disp = oferta.disponibilidade[c.id];
                  const esgotado = disp.restantes === 0;
                  const v = preco ? preco[c.precoKey] : 0;
                  return (
                    <button
                      key={c.id}
                      disabled={esgotado}
                      onClick={() => { setClasseId(c.id); setPasso("pagamento"); }}
                      className={`flex h-56 flex-col items-center justify-center gap-3 rounded-2xl p-5 text-center ring-1 transition-all ${
                        esgotado ? "cursor-not-allowed opacity-40 ring-[color:var(--hairline)]"
                        : "surface-card ring-[color:var(--hairline)] hover:scale-[1.03] hover:ring-[color:var(--brand)] active:scale-95"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full" style={{ background: c.pulseira.hex }} />
                      <span className="font-display text-2xl">{c.nome}</span>
                      {esgotado ? (
                        <span className="text-base font-semibold uppercase text-[color:var(--danger)]">Esgotado</span>
                      ) : (
                        <>
                          <span className="big-numeric text-3xl text-[color:var(--brand)]">{brl(v)}</span>
                          <span className="text-sm text-muted-foreground">Pulseira {c.pulseira.nome}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </Passo>
          )}

          {passo === "pagamento" && (
            <Passo key="pagamento" titulo="Pague no totem" onVoltar={() => setPasso("classe")}>
              <div className="grid grid-cols-[1fr_auto] items-center gap-8">
                <div className="space-y-4">
                  <Resumo label="Trecho" value={`Belém → ${cidadeNome(destino)}`} />
                  <Resumo label="Saída" value={`${oferta.saida} · ${oferta.embarcacao}`} />
                  <Resumo label="Classe" value={`${classe.nome} · pulseira ${classe.pulseira.nome}`} />
                  <div className="flex items-center justify-between rounded-2xl bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)] p-6 ring-1 ring-[color:var(--hairline-brand)]">
                    <span className="text-xl">Total</span>
                    <span className="big-numeric text-4xl text-[color:var(--brand)]">{brl(valor)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-[color:var(--surface-deep)] p-8">
                  <CreditCard className="h-16 w-16 text-[color:var(--brand)]" strokeWidth={1.3} />
                  <p className="max-w-[12rem] text-center text-base text-muted-foreground">Aproxime ou insira o cartão na maquininha</p>
                  <button
                    onClick={() => setPasso("bilhete")}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] px-8 text-xl font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-95"
                  >
                    <Check className="h-6 w-6" /> Simular pagamento
                  </button>
                </div>
              </div>
            </Passo>
          )}

          {passo === "bilhete" && (
            <Passo key="bilhete" titulo="">
              <div className="flex flex-col items-center text-center">
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]"
                >
                  <Check className="h-11 w-11" strokeWidth={2.4} />
                </motion.span>
                <h2 className="mt-5 font-display text-4xl">Pagamento aprovado</h2>
                <p className="mt-2 flex items-center gap-2 text-xl text-muted-foreground">
                  <Printer className="h-6 w-6" /> Retire o bilhete impresso abaixo
                </p>
                <div className="mt-6 rounded-3xl bg-white p-5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)]">
                  <TotemQR seed={`${trecho}-${classe.nome}-${oferta.saida}`} size={220} />
                </div>
                <p className="mt-4 text-base">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ background: classe.pulseira.hex }} />
                    Pulseira {classe.pulseira.nome} · {classe.nome}
                  </span>
                </p>
                <button
                  onClick={onSair}
                  className="mt-8 flex h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] px-10 text-xl font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-95"
                >
                  <RotateCcw className="h-6 w-6" /> Concluir
                </button>
              </div>
            </Passo>
          )}
        </AnimatePresence>
      </div>

      {passo !== "bilhete" && (
        <footer className="mt-6 flex justify-center">
          <button onClick={onSair} className="flex items-center gap-2 rounded-full px-6 py-3 text-base text-muted-foreground transition-colors hover:bg-[color:var(--accent)] hover:text-foreground">
            Cancelar e sair
          </button>
        </footer>
      )}
    </motion.div>
  );
}

function Passo({ titulo, onVoltar, children }: { titulo: string; onVoltar?: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {titulo && (
        <div className="mb-6 flex items-center gap-4">
          {onVoltar && (
            <button onClick={onVoltar} className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]" aria-label="Voltar">
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
          <h2 className="font-display text-4xl">{titulo}</h2>
        </div>
      )}
      {children}
    </motion.div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[color:var(--hairline)] pb-3">
      <span className="text-base text-muted-foreground">{label}</span>
      <span className="text-xl font-medium">{value}</span>
    </div>
  );
}

/* ============ QR fake para o totem (grid SVG determinístico) ============ */
function TotemQR({ seed, size = 200 }: { seed: string; size?: number }) {
  const cells = 25;
  const modules = useMemo(() => {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    const rand = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const grid: boolean[][] = [];
    for (let r = 0; r < cells; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < cells; c++) row.push(rand() > 0.5);
      grid.push(row);
    }
    return grid;
  }, [seed]);

  const unit = size / cells;
  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR do bilhete" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#ffffff" />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on && !isFinder(r, c) ? (
            <rect key={`${r}-${c}`} x={c * unit} y={r * unit} width={unit} height={unit} fill="#0a0a0a" />
          ) : null
        )
      )}
      {[[0, 0], [0, cells - 7], [cells - 7, 0]].map(([br, bc], i) => (
        <g key={i}>
          <rect x={bc * unit} y={br * unit} width={unit * 7} height={unit * 7} fill="#0a0a0a" />
          <rect x={(bc + 1) * unit} y={(br + 1) * unit} width={unit * 5} height={unit * 5} fill="#ffffff" />
          <rect x={(bc + 2) * unit} y={(br + 2) * unit} width={unit * 3} height={unit * 3} fill="#0a0a0a" />
        </g>
      ))}
    </svg>
  );
}
