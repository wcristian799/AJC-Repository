import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, PenLine, MessageCircle, FileSignature, ScanLine, Package, Car, Boxes } from "lucide-react";
import { StatusChip, Tag } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";

/** B.9 — Comprovante de entrega (desembarque balsa → terra, prova legal). */
export function EntregasTab() {
  return <SimuladorEntrega />;
}

/* ---- Simulador (frame de celular) — entrega com prova ---- */
function SimuladorEntrega() {
  const [tipo, setTipo] = useState<"carga" | "encomenda" | "veiculo">("carga");
  const [bipado, setBipado] = useState(false);
  const [foto1, setFoto1] = useState(false);
  const [foto2, setFoto2] = useState(false);
  const [assinatura, setAssinatura] = useState(false);
  const [done, setDone] = useState(false);
  const podeConfirmar = bipado && foto1 && foto2 && assinatura;

  return (
    <PhoneFrame framed={false} online={false} pending={1} clock="19:02">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Entrega · prova legal</p>
            <p className="mt-1 font-display text-xl">{tipo === "veiculo" ? "Fiat Strada RXA-7B43" : tipo === "encomenda" ? "Encomenda DC-2026-0192" : "Comercial Ribeira"}</p>
            <p className="text-xs text-muted-foreground">{tipo === "veiculo" ? "checklist de entrega · destino STM" : "2 volumes · destino STM · agente Túlio"}</p>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <TipoButton active={tipo === "carga"} icon={Boxes} label="Carga" onClick={() => { setTipo("carga"); setBipado(false); }} />
              <TipoButton active={tipo === "encomenda"} icon={Package} label="Encomenda" onClick={() => { setTipo("encomenda"); setBipado(false); }} />
              <TipoButton active={tipo === "veiculo"} icon={Car} label="Veículo" onClick={() => { setTipo("veiculo"); setBipado(false); }} />
            </div>

            <button
              onClick={() => setBipado(true)}
              className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1 ${
                bipado
                  ? "bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]"
                  : "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]"
              }`}
            >
              <ScanLine className="h-4 w-4" />
              {bipado ? "Bipe confirmado" : `Bipar ${tipo === "carga" ? "palete/volume" : tipo === "encomenda" ? "encomenda" : "veículo/máquina"}`}
            </button>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">2 fotos obrigatórias (90°)</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <CaptureTile icon={Camera} label={tipo === "veiculo" ? "Foto checklist 1" : "Foto de cima"} done={foto1} onClick={() => bipado && setFoto1(true)} />
              <CaptureTile icon={Camera} label={tipo === "veiculo" ? "Foto checklist 2" : "Foto do meio"} done={foto2} onClick={() => bipado && setFoto2(true)} />
            </div>

            <div className="mt-3">
              <CaptureTile icon={PenLine} label={tipo === "veiculo" ? "Assinatura entrega veículo" : "Assinatura do agente"} done={assinatura} onClick={() => bipado && setAssinatura(true)} />
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">
              <Tag tone={bipado ? "success" : "warning"}>{bipado ? "bipe ok" : "bipe obrigatório"}</Tag> Carimbo de data/hora/GPS sobreposto à foto. Não é pulável.
            </p>

            <button
              onClick={() => setDone(true)}
              disabled={!podeConfirmar}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {podeConfirmar ? "Confirmar entrega" : "Falta bipe / fotos / assinatura"}
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
            <button onClick={() => { setDone(false); setFoto1(false); setFoto2(false); setAssinatura(false); setBipado(false); }} className="mt-6 text-sm text-[color:var(--brand)]">Nova entrega</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function TipoButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-[10px] font-medium ring-1 transition-colors ${
        active
          ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]"
          : "bg-[color:var(--muted)] text-foreground/70 ring-[color:var(--hairline)]"
      }`}
    >
      <Icon className="mx-auto mb-1 h-4 w-4" />
      {label}
    </button>
  );
}
