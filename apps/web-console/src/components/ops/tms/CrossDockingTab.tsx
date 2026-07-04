import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ScanLine, CheckCircle2, Layers, PackageOpen, Car } from "lucide-react";
import { StatusChip, OfflineBanner, CounterBadge, Tag } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";
import { AjcApiError, addTmsVolumeEvent, listTmsVolumes, type TmsVolumeApi } from "@/lib/ajc-api";

/** B.8 - Recebimento direto / cross-docking. */
export function CrossDockingTab() {
  return <SimuladorCrossDocking />;
}

function SimuladorCrossDocking() {
  const [screen, setScreen] = useState<"lote" | "ok">("lote");
  const [modo, setModo] = useState<"palete" | "avulso" | "veiculo">("palete");
  const [volumes, setVolumes] = useState<TmsVolumeApi[]>([]);
  const [count, setCount] = useState(0);
  const [fotoOk, setFotoOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendentes = useMemo(() => volumes.filter((v) => !["embarcado", "entregue", "reconferido"].includes(v.status)), [volumes]);
  const total = modo === "veiculo" ? 1 : Math.max(1, pendentes.length || volumes.length || (modo === "palete" ? 5 : 9));

  useEffect(() => {
    let active = true;
    listTmsVolumes()
      .then((rows) => {
        if (active) setVolumes(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar volumes.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function bipar() {
    if (modo === "veiculo") {
      setCount((c) => Math.min(total, c + 1));
      return;
    }
    const volume = pendentes[count] ?? volumes[count] ?? volumes[0];
    if (!volume) {
      setCount((c) => Math.min(total, c + 1));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addTmsVolumeEvent(volume.id, {
        tipo: "embarcado",
        obs: "Recebimento direto / cross-docking pelo app de campo",
        clientUuid: crypto.randomUUID(),
      });
      setVolumes((rows) => rows.map((v) => v.id === volume.id ? { ...v, status: "embarcado" } : v));
      setCount((c) => Math.min(total, c + 1));
    } catch (err) {
      setError(err instanceof AjcApiError ? err.message : "Nao foi possivel registrar o bipe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PhoneFrame framed={false} online={!error} pending={error ? 1 : 0} clock={currentClock()}>
      <AnimatePresence mode="wait">
        {screen === "lote" && (
          <motion.div key="lote" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Carregamento direto · API TMS</p>
            <h3 className="mt-1 font-display text-xl">Recebimento direto</h3>
            <p className="text-xs text-muted-foreground">Conferente balsa · Sebastiao Luz</p>

            <OfflineBanner pending={error ? 1 : 0} />

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <ModeButton active={modo === "palete"} icon={Layers} label="Palete" onClick={() => { setModo("palete"); setCount(0); }} />
              <ModeButton active={modo === "avulso"} icon={PackageOpen} label="Sem palete" onClick={() => { setModo("avulso"); setCount(0); }} />
              <ModeButton active={modo === "veiculo"} icon={Car} label="Veiculo" onClick={() => { setModo("veiculo"); setCount(0); }} />
            </div>

            <div className="mt-3 rounded-xl bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              {modo === "palete" && <p className="text-[11px] text-muted-foreground"><Tag tone="brand">PC</Tag> Bipe registra embarque real do volume no backend.</p>}
              {modo === "avulso" && <p className="text-[11px] text-muted-foreground"><Tag tone="info">avulso</Tag> Etiqueta todos os volumes e bipa volume a volume.</p>}
              {modo === "veiculo" && <p className="text-[11px] text-muted-foreground"><Tag tone="warning">veiculo/maquina</Tag> Checklist visual; eventos completos ficam no modulo Veiculos.</p>}
            </div>

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <div className="mt-4 flex-1">
              <CounterBadge current={count} total={total} label={modo === "veiculo" ? "Etapas do veiculo" : "Volumes do lote"} />
            </div>

            <div className="mt-3">
              <CaptureTile icon={Camera} label="Foto obrigatoria do lote" done={fotoOk} onClick={() => setFotoOk(true)} />
            </div>

            <button
              onClick={bipar}
              disabled={saving}
              className="mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98] disabled:opacity-60"
            >
              <ScanLine className="h-5 w-5" /> {saving ? "Sincronizando..." : modo === "veiculo" ? "Bipar veiculo/maquina" : "Bipar volume"}
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
            <p className="mt-1 text-xs text-muted-foreground">{modo === "veiculo" ? "Veiculo/maquina recebido visualmente" : `${count} volumes recebidos + embarcados no backend.`}</p>
            <div className="mt-3"><StatusChip tone="success">sincronizado</StatusChip></div>
            <button onClick={() => { setScreen("lote"); setCount(0); setFotoOk(false); }} className="mt-6 text-sm text-[color:var(--brand)]">Novo recebimento</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
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

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}
