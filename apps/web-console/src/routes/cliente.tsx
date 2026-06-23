import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Ticket, CalendarDays, MapPin, Ship, ChevronRight, Download, Share2,
  Clock, CheckCircle2, XCircle, Plus, User, X,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { brl, StatusChip } from "@/components/ops/primitives";
import { CLIENTE_BILHETES, PULSEIRA_POR_CLASSE, type ClienteBilhete } from "@/mocks/data";

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "Minhas viagens · AJC Ferry Boat" }] }),
  component: ClienteArea,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Aba = "ativo" | "passado";

function ClienteArea() {
  const [aba, setAba] = useState<Aba>("ativo");
  const [aberto, setAberto] = useState<ClienteBilhete | null>(null);

  const lista = useMemo(() => CLIENTE_BILHETES.filter((b) => b.quando === aba), [aba]);
  const ativos = CLIENTE_BILHETES.filter((b) => b.quando === "ativo").length;
  const passageiro = CLIENTE_BILHETES[0]?.passageiro ?? "Cliente AJC";

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <header className="hairline-b sticky top-0 z-20 bg-[color:var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-display text-base">AJC Ferry Boat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--muted)] px-2.5 py-1 text-[11px] text-foreground/80 ring-1 ring-[color:var(--hairline)]">
              <User className="h-3.5 w-3.5" /> {passageiro.split(" ")[0]}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-5 pb-24 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--brand)]">Área do cliente</p>
        <h1 className="mt-1 font-display text-3xl">Minhas viagens</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ativos > 0 ? `${ativos} ${ativos === 1 ? "bilhete ativo" : "bilhetes ativos"} · QR pronto para embarcar` : "Nenhuma viagem ativa no momento"}
        </p>

        {/* Abas */}
        <div className="mt-5 inline-flex rounded-full bg-[color:var(--muted)] p-1 ring-1 ring-[color:var(--hairline)]">
          {(["ativo", "passado"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${aba === a ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {aba === a && <motion.span layoutId="cliente-aba" className="absolute inset-0 rounded-full bg-[color:var(--brand)]" />}
              <span className="relative">{a === "ativo" ? "Próximas" : "Histórico"}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <AnimatePresence mode="popLayout">
            {lista.length === 0 ? (
              <motion.div
                key="vazio"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="surface-card flex flex-col items-center gap-3 p-10 text-center"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
                  <Ticket className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <p className="font-display text-base">Nada por aqui ainda</p>
                <p className="text-xs text-muted-foreground">
                  {aba === "ativo" ? "Compre uma passagem para ver seu bilhete aqui." : "Suas viagens concluídas aparecerão neste histórico."}
                </p>
              </motion.div>
            ) : lista.map((b, i) => (
              <motion.button
                key={b.id}
                layout
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ delay: Math.min(i, 8) * 0.06, duration: 0.4, ease: easeOut }}
                onClick={() => setAberto(b)}
                className="surface-card brand-rail brand-rail-left flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_5%,transparent)]"
              >
                <span className="h-12 w-2 shrink-0 rounded-full" style={{ background: PULSEIRA_POR_CLASSE[b.classe]?.hex }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
                    <span className="truncate font-display text-lg">{b.trecho}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.data} · {b.hora} · {b.classe}{b.assento ? ` · ${b.assento}` : ""}</p>
                  <div className="mt-2"><BilheteStatus status={b.status} /></div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA fixo de nova compra */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[color:var(--background)] to-transparent p-5">
        <div className="mx-auto max-w-md">
          <a
            href="/portal"
            className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.99]"
          >
            <Plus className="h-5 w-5" /> Comprar nova passagem
          </a>
        </div>
      </div>

      {/* Detalhe do bilhete (QR grande) */}
      <AnimatePresence>
        {aberto && <BilheteSheet bilhete={aberto} onClose={() => setAberto(null)} />}
      </AnimatePresence>
    </main>
  );
}

function BilheteStatus({ status }: { status: ClienteBilhete["status"] }) {
  const map = {
    emitido: { tone: "brand" as const, label: "Pronto para embarque", Icon: Clock },
    validado: { tone: "info" as const, label: "Validado", Icon: CheckCircle2 },
    usado: { tone: "neutral" as const, label: "Concluída", Icon: CheckCircle2 },
    cancelado: { tone: "danger" as const, label: "Cancelada", Icon: XCircle },
  }[status];
  return <StatusChip tone={map.tone}><map.Icon className="h-3 w-3" /> {map.label}</StatusChip>;
}

function BilheteSheet({ bilhete, onClose }: { bilhete: ClienteBilhete; onClose: () => void }) {
  const pulseira = PULSEIRA_POR_CLASSE[bilhete.classe];
  const ativo = bilhete.quando === "ativo";
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-30 grid place-items-end bg-black/50"
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[color:var(--card)] ring-1 ring-[color:var(--hairline)]"
      >
        <div className="sticky top-0 flex items-center justify-between bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="font-display text-sm">Bilhete eletrônico</span>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[color:var(--accent)]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-8 pt-2">
          <div className="grid place-items-center py-5">
            <div className={`rounded-2xl bg-white p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)] ${ativo ? "" : "opacity-50 grayscale"}`}>
              <ClienteQR seed={bilhete.qr} size={200} />
            </div>
            <code className="mt-3 font-mono text-xs tracking-widest text-foreground/80">{bilhete.qr}</code>
            {!ativo && <p className="mt-1 text-[11px] text-muted-foreground">Viagem concluída · QR inativo</p>}
          </div>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1" style={{ background: `color-mix(in oklab, ${pulseira?.hex} 14%, transparent)`, borderColor: pulseira?.hex }}>
            <span className="h-3 w-3 rounded-full" style={{ background: pulseira?.hex }} />
            <span className="text-xs font-semibold" style={{ color: pulseira?.hex }}>Pulseira {pulseira?.nome} · {bilhete.classe}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[color:var(--muted)]/50 p-4">
            <Detalhe icon={MapPin} label="Trecho" value={bilhete.trecho} />
            <Detalhe icon={Ship} label="Embarcação" value={bilhete.embarcacao} />
            <Detalhe icon={CalendarDays} label="Data" value={bilhete.data} />
            <Detalhe icon={Clock} label="Embarque" value={bilhete.hora} />
            <Detalhe icon={Ticket} label="Passageiro" value={bilhete.passageiro} />
            <Detalhe icon={Ticket} label={bilhete.assento ? "Camarote" : "Valor"} value={bilhete.assento ?? brl(bilhete.valor)} />
          </div>

          {ativo && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]">
                <Download className="h-4 w-4" /> Baixar
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Detalhe({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

/* ============ QR fake — grid SVG determinístico ============ */
function ClienteQR({ seed, size = 200 }: { seed: string; size?: number }) {
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
