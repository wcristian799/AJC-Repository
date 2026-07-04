import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScanLine, Camera, PenLine, Layers, PackageOpen, Car } from "lucide-react";
import { OfflineBanner, CounterBadge, StatusChip, Tag } from "@/components/ops/primitives";
import { PhoneFrame } from "./PhoneFrame";
import {
  AjcApiError,
  addTmsVolumeEvent,
  listEmbarcacoes,
  listNavegacaoViagens,
  listTmsVolumes,
  type EmbarcacaoApi,
  type NavegacaoViagemApi,
  type TmsVolumeApi,
} from "@/lib/ajc-api";

/** B.4/B.7 - App Conferente (coletor): conferencia, segundo bipe e entrega. */
export function ColetorTab() {
  const [screen, setScreen] = useState<"home" | "conf" | "entrega">("home");
  const [modo, setModo] = useState<"palete" | "avulso" | "veiculo">("palete");
  const [volumes, setVolumes] = useState<TmsVolumeApi[]>([]);
  const [viagens, setViagens] = useState<NavegacaoViagemApi[]>([]);
  const [embarcacoes, setEmbarcacoes] = useState<EmbarcacaoApi[]>([]);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listTmsVolumes(), listNavegacaoViagens(), listEmbarcacoes()])
      .then(([vols, trips, boats]) => {
        if (!active) return;
        setVolumes(vols);
        setViagens(trips);
        setEmbarcacoes(boats);
      })
      .catch((err) => {
        if (active) setError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar o coletor.");
      });
    return () => {
      active = false;
    };
  }, []);

  const viagem = viagens.find((v) => v.status === "em_curso") ?? viagens[0];
  const emb = embarcacoes.find((e) => e.id === viagem?.embarcacaoId);
  const volumesPendentes = useMemo(() => volumes.filter((v) => !["entregue", "embarcado", "reconferido"].includes(v.status)), [volumes]);
  const total = modo === "veiculo" ? 1 : Math.max(1, volumesPendentes.length || volumes.length || (modo === "palete" ? 15 : 8));

  async function bipar() {
    if (modo === "veiculo") {
      setCount((c) => Math.min(total, c + 1));
      return;
    }
    const volume = volumesPendentes[count] ?? volumes[count] ?? volumes[0];
    if (!volume) {
      setCount((c) => Math.min(total, c + 1));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tipo = count > 0 && modo === "palete" ? "reconferido" : "embarcado";
      await addTmsVolumeEvent(volume.id, {
        tipo,
        obs: modo === "avulso" ? "Bipe avulso pelo app de campo" : "Bipe pelo app de campo",
        clientUuid: crypto.randomUUID(),
      });
      setVolumes((rows) => rows.map((v) => v.id === volume.id ? { ...v, status: tipo } : v));
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
        {screen === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex h-[calc(100%-44px)] flex-col p-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">App Conferente</p>
            <h3 className="mt-1 font-display text-2xl">Ola, Joao</h3>
            <p className="mt-4 text-xs text-muted-foreground">Viagem selecionada</p>
            <div className="mt-2 surface-card brand-rail brand-rail-left p-4">
              <p className="font-display text-lg">{viagem ? `${viagem.origemSigla} → ${viagem.destinoSigla ?? "destino"}` : "Sem viagem carregada"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{emb?.nome ?? "Embarcacao"} · saida {viagem ? formatDate(viagem.dataHoraSaida) : "—"}</p>
            </div>

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <div className="mt-6 space-y-2">
              <BigSelectItem icon={Layers} label="Recebimento com palete" hint="Viagem → palete → NF/DC → quantidade → completo/parcial" onClick={() => { setModo("palete"); setScreen("conf"); setCount(0); }} />
              <BigSelectItem icon={PackageOpen} label="Mercadoria avulsa / porao" hint="NF/DC → etiqueta todos os volumes → bipe volume a volume" onClick={() => { setModo("avulso"); setScreen("conf"); setCount(0); }} />
              <BigSelectItem icon={Car} label="Veiculo / maquina" hint="Checklist, fotos, etiqueta, bipe de subida e descida" onClick={() => { setModo("veiculo"); setScreen("conf"); setCount(0); }} />
              <BigSelectItem label="2º bipe (cross-docking)" hint="Reconferir antes do desembarque" onClick={() => { setModo("palete"); setScreen("conf"); setCount(Math.min(8, total)); }} />
              <BigSelectItem label="Entrega com prova" hint="Foto + assinatura" onClick={() => setScreen("entrega")} />
            </div>
          </motion.div>
        )}

        {screen === "conf" && (
          <motion.div
            key="conf"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex h-[calc(100%-44px)] flex-col p-5"
          >
            <button onClick={() => setScreen("home")} className="self-start text-xs text-muted-foreground">‹ Voltar</button>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Conferencia · {viagem?.codigo ?? "sem viagem"}</p>

            <OfflineBanner pending={error ? 1 : 0} />

            <div className="mt-3 rounded-2xl bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
              {modo === "palete" && (
                <>
                  <div className="flex items-center gap-2">
                    <Tag tone="warning">PC</Tag>
                    <Tag tone="brand">MP</Tag>
                    <Tag tone="neutral">PD</Tag>
                    <StatusChip tone="warning" size="xs">parcialmente completo</StatusChip>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">O bipe registra evento real no volume e atualiza o estado no backend.</p>
                </>
              )}
              {modo === "avulso" && (
                <>
                  <div className="flex items-center gap-2">
                    <Tag tone="info">sem palete</Tag>
                    <StatusChip tone="brand" size="xs">etiqueta volume a volume</StatusChip>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Mercadoria avulsa: bipa cada volume pelo UUID impresso na etiqueta.</p>
                </>
              )}
              {modo === "veiculo" && (
                <>
                  <div className="flex items-center gap-2">
                    <Tag tone="brand">veiculo/maquina</Tag>
                    <StatusChip tone="warning" size="xs">checklist + fotos</StatusChip>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Veiculos usam o modulo dedicado; nesta tela o passo fica como checklist visual.</p>
                </>
              )}
            </div>

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <div className="mt-4 flex-1">
              <CounterBadge current={count} total={total} label={modo === "veiculo" ? "Etapas conferidas" : "Volumes conferidos"} />
            </div>

            <button
              onClick={bipar}
              disabled={saving}
              className="mt-4 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98] disabled:opacity-60"
            >
              <ScanLine className="h-6 w-6" />
              {saving ? "Sincronizando..." : modo === "veiculo" ? "Bipar veiculo/maquina" : "Bipar volume"}
            </button>
          </motion.div>
        )}

        {screen === "entrega" && (
          <motion.div
            key="entrega"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex h-[calc(100%-44px)] flex-col p-5"
          >
            <button onClick={() => setScreen("home")} className="self-start text-xs text-muted-foreground">‹ Voltar</button>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Entrega · prova legal</p>
            <p className="mt-1 font-display text-xl">Volume {volumes[0]?.carga_codigo ?? "sem carga"}</p>
            <p className="text-xs text-muted-foreground">{volumes.length} volumes · destino {volumes[0]?.cidade_destino_sigla ?? "—"}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="surface-deep flex h-32 flex-col items-center justify-center gap-2 text-[color:var(--brand)]">
                <Camera className="h-7 w-7" />
                <span className="text-xs font-medium">Foto do recebedor</span>
              </button>
              <button className="surface-deep flex h-32 flex-col items-center justify-center gap-2 text-[color:var(--brand)]">
                <PenLine className="h-7 w-7" />
                <span className="text-xs font-medium">Assinatura</span>
              </button>
            </div>

            <p className="mt-4 text-[10px] text-muted-foreground">
              Carimbo de data/hora/GPS sera anexado ao comprovante pelo app de entrega.
            </p>

            <button className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)]">
              Abrir entrega completa
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function BigSelectItem({ label, hint, onClick, icon: Icon = ScanLine }: { label: string; hint: string; onClick: () => void; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className="surface-card brand-rail brand-rail-left flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)]"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Icon className="h-5 w-5 text-[color:var(--brand)]" />
    </button>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}
