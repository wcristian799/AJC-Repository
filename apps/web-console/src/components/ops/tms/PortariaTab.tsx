import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, LogOut, Camera, Truck } from "lucide-react";
import { StatusChip, OfflineBanner } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";

/** B.1 — App Portaria: simulador de registro de entrada/saída. */
export function PortariaTab() {
  return <SimuladorPortaria />;
}

/* ---- Simulador do app de portaria (frame de celular) ---- */
function SimuladorPortaria() {
  const [screen, setScreen] = useState<"home" | "entrada" | "ok">("home");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const placaInvalida = placa.length > 0 && !/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(placa.toUpperCase());
  const patio = [
    { placa: "QEV-4H21", empresa: "Norte Log", entrada: "08:12" },
    { placa: "RXA-7B43", empresa: "Comercial Tapajós", entrada: "08:48" },
    { placa: "NHD-1C92", empresa: "Ferragens Amazônia", entrada: "09:05" },
  ];

  return (
    <PhoneFrame framed={false} online={false} pending={2} clock="08:51">
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">App Portaria</p>
            <h3 className="mt-1 font-display text-2xl">Porto de Belém</h3>
            <p className="mt-1 text-xs text-muted-foreground">Porteiro: Raimundo Nonato · turno manhã</p>

            <OfflineBanner pending={2} />

            <div className="mt-4 rounded-2xl bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"><Truck className="h-4 w-4 text-[color:var(--brand)]" /> Veículos no pátio</span>
                <StatusChip tone="brand" size="xs">{patio.length} agora</StatusChip>
              </div>
              <div className="mt-2 space-y-1">
                {patio.slice(0, 2).map((p) => (
                  <div key={p.placa} className="flex items-center justify-between rounded-md bg-[color:var(--card)] px-2 py-1.5 text-[11px] ring-1 ring-[color:var(--hairline)]">
                    <span className="font-mono text-foreground">{p.placa}</span>
                    <span className="truncate text-muted-foreground">{p.empresa}</span>
                    <span className="font-mono text-[color:var(--brand)]">{p.entrada}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                onClick={() => { setScreen("entrada"); setPlaca(""); setEmpresa(""); }}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98]"
              >
                <LogIn className="h-7 w-7" />
                <span className="text-base font-semibold">Registrar entrada</span>
              </button>
              <button className="surface-card flex h-24 flex-col items-center justify-center gap-2 text-foreground active:scale-[0.98]">
                <LogOut className="h-7 w-7 text-[color:var(--brand)]" />
                <span className="text-base font-semibold">Registrar saída</span>
                <span className="text-[10px] text-muted-foreground">seleciona veículo já listado no pátio</span>
              </button>
            </div>

            <div className="mt-auto rounded-xl border border-dashed border-[color:var(--hairline)] p-3 text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground">Relatório de entrada</p>
              <p className="mt-1">Data, horário, placa e empresa são carimbados automaticamente.</p>
            </div>
          </motion.div>
        )}

        {screen === "entrada" && (
          <motion.div key="entrada" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <button onClick={() => setScreen("home")} className="self-start text-xs text-muted-foreground">‹ Voltar</button>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Nova entrada</p>

            <div className="mt-3 rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-3 py-2 text-xs text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
              Tipo fixo nesta versão: veículo de carga. Pessoa e veículo para transporte foram removidos da portaria.
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Placa</label>
              <input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-1D23"
                className={`mt-1 h-11 w-full rounded-lg bg-[color:var(--muted)] px-3 font-mono text-sm uppercase tracking-wider text-foreground ring-1 focus:outline-none ${
                  placaInvalida ? "ring-[color:var(--danger)]" : "ring-[color:var(--hairline)] focus:ring-[color:var(--ring)]"
                }`}
              />
              {placaInvalida && <p className="mt-1 text-[10px] text-[color:var(--danger)]">Formato de placa inválido (ex.: ABC-1D23).</p>}
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Empresa</label>
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Autocomplete · digite ou cadastre"
                className="mt-1 h-11 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
            </div>

            <div className="mt-4">
              <CaptureTile icon={Camera} label="Foto (recomendada)" />
            </div>

            <button
              onClick={() => setScreen("ok")}
              disabled={placa.length === 0 || placaInvalida || empresa.length === 0}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              Confirmar entrada
            </button>
          </motion.div>
        )}

        {screen === "ok" && (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <LogIn className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Entrada registrada</h3>
            <p className="mt-1 text-xs text-muted-foreground">{empresa || "Visitante"} agora consta “no pátio”.</p>
            <div className="mt-3"><StatusChip tone="offline">salvo offline · pendente de sincronizar</StatusChip></div>
            <button onClick={() => setScreen("home")} className="mt-6 text-sm text-[color:var(--brand)]">Voltar ao início</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
