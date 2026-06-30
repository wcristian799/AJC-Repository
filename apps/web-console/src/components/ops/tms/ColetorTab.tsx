import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScanLine, Camera, PenLine, Layers, PackageOpen, Car } from "lucide-react";
import { OfflineBanner, CounterBadge, StatusChip, Tag } from "@/components/ops/primitives";
import { PhoneFrame } from "./PhoneFrame";
import { VIAGENS, EMBARCACOES } from "@/mocks/data";

/** B.4/B.7 — App Conferente (coletor): conferência de embarque, 2º bipe e entrega. */
export function ColetorTab() {
  const [screen, setScreen] = useState<"home" | "conf" | "entrega">("home");
  const [modo, setModo] = useState<"palete" | "avulso" | "veiculo">("palete");
  const [count, setCount] = useState(0);
  const total = modo === "palete" ? 15 : modo === "avulso" ? 8 : 1;
  const viagem = VIAGENS.find((v) => v.status === "em_curso");
  const emb = EMBARCACOES.find((e) => e.id === viagem?.embarcacaoId);

  return (
    <PhoneFrame framed={false} online={screen !== "conf"} pending={screen === "conf" ? 3 : 0} clock="08:42">
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
              <h3 className="mt-1 font-display text-2xl">Olá, João</h3>
              <p className="mt-4 text-xs text-muted-foreground">Viagem selecionada</p>
              <div className="mt-2 surface-card brand-rail brand-rail-left p-4">
                <p className="font-display text-lg">{viagem?.origem} → {viagem?.destino}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{emb?.nome} · saída {viagem?.saida}</p>
              </div>

              <div className="mt-6 space-y-2">
                <BigSelectItem icon={Layers} label="Recebimento com palete" hint="Viagem → palete → NF/DC → quantidade → completo/parcial" onClick={() => { setModo("palete"); setScreen("conf"); setCount(0); }} />
                <BigSelectItem icon={PackageOpen} label="Mercadoria avulsa / porão" hint="NF/DC → etiqueta todos os volumes → bipe volume a volume" onClick={() => { setModo("avulso"); setScreen("conf"); setCount(0); }} />
                <BigSelectItem icon={Car} label="Veículo / máquina" hint="Checklist, fotos, etiqueta, bipe de subida e descida" onClick={() => { setModo("veiculo"); setScreen("conf"); setCount(0); }} />
                <BigSelectItem label="2º bipe (cross-docking)" hint="Reconferir antes do desembarque" onClick={() => { setModo("palete"); setScreen("conf"); setCount(8); }} />
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
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Conferência · {viagem?.codigo}</p>

              <OfflineBanner pending={3} />

              <div className="mt-3 rounded-2xl bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
                {modo === "palete" && (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag tone="warning">PC</Tag>
                      <Tag tone="brand">MP</Tag>
                      <Tag tone="neutral">PD</Tag>
                      <StatusChip tone="warning" size="xs">parcialmente completo</StatusChip>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Selecione viagem, palete e NF/DC. Informe volumes alocados e marque completo ou parcial.</p>
                  </>
                )}
                {modo === "avulso" && (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag tone="info">sem palete</Tag>
                      <StatusChip tone="brand" size="xs">etiqueta volume a volume</StatusChip>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Mercadoria de porão/avulsa: disponibiliza NF/DC, digita quantidade, imprime etiqueta em todos os volumes e bipa cada um.</p>
                  </>
                )}
                {modo === "veiculo" && (
                  <>
                    <div className="flex items-center gap-2">
                      <Tag tone="brand">veículo/máquina</Tag>
                      <StatusChip tone="warning" size="xs">checklist + fotos</StatusChip>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Checklist de envio, etiqueta Bluetooth, bipe de subida na balsa e bipe de descida no destino.</p>
                  </>
                )}
              </div>

              <div className="mt-4 flex-1">
                <CounterBadge current={count} total={total} label={modo === "veiculo" ? "Etapas conferidas" : "Volumes conferidos"} />
              </div>

              <button
                onClick={() => setCount((c) => Math.min(total, c + 1))}
                className="mt-4 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.98]"
              >
                <ScanLine className="h-6 w-6" />
                {modo === "veiculo" ? "Bipar veículo/máquina" : "Bipar volume"}
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
              <p className="mt-1 font-display text-xl">Comercial Ribeira</p>
              <p className="text-xs text-muted-foreground">2 volumes · destino STM</p>

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
                Carimbo de data/hora/GPS é sobreposto à foto. Não é pulável.
              </p>

              <button className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)]">
                Confirmar entrega
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
      <ScanLine className="h-5 w-5 text-[color:var(--brand)]" />
    </button>
  );
}
