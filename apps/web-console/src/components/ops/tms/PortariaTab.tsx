import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, LogOut, Camera, Truck } from "lucide-react";
import { StatusChip, OfflineBanner } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";
import { AjcApiError, createTmsPortaria, listTmsPortaria, type TmsPortariaApi } from "@/lib/ajc-api";

/** B.1 - App Portaria: registro real de entrada no patio. */
export function PortariaTab() {
  return <SimuladorPortaria />;
}

function SimuladorPortaria() {
  const [screen, setScreen] = useState<"home" | "entrada" | "ok">("home");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [patio, setPatio] = useState<TmsPortariaApi[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placaInvalida = placa.length > 0 && !/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(placa.toUpperCase());

  useEffect(() => {
    let active = true;
    listTmsPortaria()
      .then((rows) => {
        if (active) setPatio(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar a portaria.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function confirmarEntrada() {
    if (placa.length === 0 || placaInvalida || empresa.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const registro = await createTmsPortaria({
        placa,
        empresa,
        tipo: "veiculo_carga",
        fotoUrl: "field://portaria/foto-recomendada",
        clientUuid: crypto.randomUUID(),
      });
      setPatio((rows) => [registro, ...rows]);
      setScreen("ok");
    } catch (err) {
      setError(err instanceof AjcApiError ? err.message : "Nao foi possivel registrar a entrada.");
    } finally {
      setSaving(false);
    }
  }

  const patioView = patio.map((p) => ({
    placa: p.placa ?? "—",
    empresa: p.empresa,
    entrada: formatHour(p.entrada_em),
  }));

  return (
    <PhoneFrame framed={false} online={!error} pending={error ? 1 : 0} clock={currentClock()}>
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">App Portaria</p>
            <h3 className="mt-1 font-display text-2xl">Porto de Belem</h3>
            <p className="mt-1 text-xs text-muted-foreground">Porteiro: Raimundo Nonato · turno manha</p>

            <OfflineBanner pending={error ? 1 : 0} />

            <div className="mt-4 rounded-2xl bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"><Truck className="h-4 w-4 text-[color:var(--brand)]" /> Veiculos no patio</span>
                <StatusChip tone="brand" size="xs">{patioView.length} agora</StatusChip>
              </div>
              <div className="mt-2 space-y-1">
                {patioView.slice(0, 2).map((p) => (
                  <div key={`${p.placa}-${p.entrada}`} className="flex items-center justify-between rounded-md bg-[color:var(--card)] px-2 py-1.5 text-[11px] ring-1 ring-[color:var(--hairline)]">
                    <span className="font-mono text-foreground">{p.placa}</span>
                    <span className="truncate text-muted-foreground">{p.empresa}</span>
                    <span className="font-mono text-[color:var(--brand)]">{p.entrada}</span>
                  </div>
                ))}
                {patioView.length === 0 && <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Nenhum registro carregado.</p>}
              </div>
            </div>

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <div className="mt-6 grid gap-3">
              <button
                onClick={() => { setScreen("entrada"); setPlaca(""); setEmpresa(""); setError(null); }}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98]"
              >
                <LogIn className="h-7 w-7" />
                <span className="text-base font-semibold">Registrar entrada</span>
              </button>
              <button className="surface-card flex h-24 flex-col items-center justify-center gap-2 text-foreground active:scale-[0.98]">
                <LogOut className="h-7 w-7 text-[color:var(--brand)]" />
                <span className="text-base font-semibold">Registrar saida</span>
                <span className="text-[10px] text-muted-foreground">saida operacional entra no proximo endpoint</span>
              </button>
            </div>

            <div className="mt-auto rounded-xl border border-dashed border-[color:var(--hairline)] p-3 text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground">Relatorio de entrada</p>
              <p className="mt-1">Data, horario, placa e empresa sao carimbados pelo backend.</p>
            </div>
          </motion.div>
        )}

        {screen === "entrada" && (
          <motion.div key="entrada" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <button onClick={() => setScreen("home")} className="self-start text-xs text-muted-foreground">‹ Voltar</button>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Nova entrada</p>

            <div className="mt-3 rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-3 py-2 text-xs text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
              Tipo fixo nesta versao: veiculo de carga. Pessoa e veiculo para transporte dependem de regra operacional futura.
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
              {placaInvalida && <p className="mt-1 text-[10px] text-[color:var(--danger)]">Formato de placa invalido (ex.: ABC-1D23).</p>}
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

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <button
              onClick={confirmarEntrada}
              disabled={saving || placa.length === 0 || placaInvalida || empresa.length === 0}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Confirmar entrada"}
            </button>
          </motion.div>
        )}

        {screen === "ok" && (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <LogIn className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Entrada registrada</h3>
            <p className="mt-1 text-xs text-muted-foreground">{empresa || "Visitante"} agora consta no patio.</p>
            <div className="mt-3"><StatusChip tone="success">sincronizado no backend</StatusChip></div>
            <button onClick={() => setScreen("home")} className="mt-6 text-sm text-[color:var(--brand)]">Voltar ao inicio</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function formatHour(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}
