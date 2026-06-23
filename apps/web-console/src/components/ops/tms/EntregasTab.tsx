import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, PenLine, MessageCircle, FileSignature } from "lucide-react";
import { StatusChip } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";

/** B.9 — Comprovante de entrega (desembarque balsa → terra, prova legal). */
export function EntregasTab() {
  return <SimuladorEntrega />;
}

/* ---- Simulador (frame de celular) — entrega com prova ---- */
function SimuladorEntrega() {
  const [foto1, setFoto1] = useState(false);
  const [foto2, setFoto2] = useState(false);
  const [assinatura, setAssinatura] = useState(false);
  const [done, setDone] = useState(false);
  const podeConfirmar = foto1 && foto2 && assinatura;

  return (
    <PhoneFrame framed={false} online={false} pending={1} clock="19:02">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Entrega · prova legal</p>
            <p className="mt-1 font-display text-xl">Comercial Ribeira</p>
            <p className="text-xs text-muted-foreground">2 volumes · destino STM · agente Túlio</p>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">2 fotos obrigatórias (90°)</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <CaptureTile icon={Camera} label="Foto de cima" done={foto1} onClick={() => setFoto1(true)} />
              <CaptureTile icon={Camera} label="Foto do meio" done={foto2} onClick={() => setFoto2(true)} />
            </div>

            <div className="mt-3">
              <CaptureTile icon={PenLine} label="Assinatura do agente" done={assinatura} onClick={() => setAssinatura(true)} />
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">Carimbo de data/hora/GPS sobreposto à foto. Não é pulável.</p>

            <button
              onClick={() => setDone(true)}
              disabled={!podeConfirmar}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {podeConfirmar ? "Confirmar entrega" : "Faltam fotos / assinatura"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <FileSignature className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Protocolo gerado</h3>
            <p className="mt-1 font-mono text-sm text-[color:var(--brand)]">AJC-ENT-77152</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp/SMS ao remetente e destinatário</p>
            <div className="mt-3"><StatusChip tone="offline">notificação dispara ao sincronizar</StatusChip></div>
            <button onClick={() => { setDone(false); setFoto1(false); setFoto2(false); setAssinatura(false); }} className="mt-6 text-sm text-[color:var(--brand)]">Nova entrega</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
