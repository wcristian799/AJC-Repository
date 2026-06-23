import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ScanLine, CheckCircle2 } from "lucide-react";
import { StatusChip, OfflineBanner, CounterBadge } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";

/** B.8 — Recebimento direto / cross-docking (múltiplos recebimentos por viagem). */
export function CrossDockingTab() {
  return <SimuladorCrossDocking />;
}

/* ---- Simulador (frame de celular) — novo lote de cross-docking ---- */
function SimuladorCrossDocking() {
  const [screen, setScreen] = useState<"lote" | "ok">("lote");
  const [count, setCount] = useState(0);
  const [fotoOk, setFotoOk] = useState(false);
  const total = 5;

  return (
    <PhoneFrame framed={false} online={false} pending={2} clock="20:48">
      <AnimatePresence mode="wait">
        {screen === "lote" && (
          <motion.div key="lote" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Carregamento direto · V-0420</p>
            <h3 className="mt-1 font-display text-xl">Recebimento 3</h3>
            <p className="text-xs text-muted-foreground">Conferente balsa · Sebastião Luz</p>

            <OfflineBanner pending={2} />

            <div className="mt-4 flex-1">
              <CounterBadge current={count} total={total} label="Volumes do lote" />
            </div>

            <div className="mt-3">
              <CaptureTile icon={Camera} label="Foto obrigatória do lote" done={fotoOk} onClick={() => setFotoOk(true)} />
            </div>

            <button
              onClick={() => setCount((c) => Math.min(total, c + 1))}
              className="mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98]"
            >
              <ScanLine className="h-5 w-5" /> Bipar volume
            </button>
            <button
              onClick={() => setScreen("ok")}
              disabled={!fotoOk || count === 0}
              className="mt-2 h-11 rounded-xl text-sm font-medium text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] disabled:opacity-40"
            >
              Fechar lote {!fotoOk && "(foto pendente)"}
            </button>
          </motion.div>
        )}

        {screen === "ok" && (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Lote recebido</h3>
            <p className="mt-1 text-xs text-muted-foreground">{count} volumes recebidos + embarcados no mesmo ato.</p>
            <div className="mt-3"><StatusChip tone="offline">salvo offline · sincroniza depois</StatusChip></div>
            <button onClick={() => { setScreen("lote"); setCount(0); setFotoOk(false); }} className="mt-6 text-sm text-[color:var(--brand)]">Novo recebimento</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
