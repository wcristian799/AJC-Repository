import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, ArrowLeftRight, CalendarDays, Users, Ship, Clock,
  Check, ShieldCheck, CreditCard, QrCode, Lock, Mail, Phone, User,
  AlertTriangle, RefreshCw, Download, Share2, Armchair, Sparkles, ChevronLeft,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { brl } from "@/components/ops/primitives";
import {
  CIDADES, PRECOS_PASSAGEM, VENDA_CLASSES, VENDA_OFERTAS, ASSENTOS_CAMAROTE,
  type VendaClasseId, type VendaOferta, type Assento, type Cidade,
} from "@/mocks/data";

export const Route = createFileRoute("/portal")({
  head: () => ({ meta: [{ title: "Compre online · AJC Ferry Boat" }] }),
  component: Portal,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Step = "busca" | "resultados" | "classe" | "conta" | "termo" | "pagamento" | "confirmacao";
type PagState = "idle" | "processando" | "falha" | "sucesso";

const STEPS: { id: Step; label: string }[] = [
  { id: "busca", label: "Busca" },
  { id: "resultados", label: "Viagens" },
  { id: "classe", label: "Classe" },
  { id: "conta", label: "Conta" },
  { id: "termo", label: "Termo" },
  { id: "pagamento", label: "Pagamento" },
  { id: "confirmacao", label: "Pronto" },
];

const cidadeNome = (sigla: string) => CIDADES.find((c) => c.sigla === sigla)?.nome ?? sigla;

function Portal() {
  const [step, setStep] = useState<Step>("busca");
  const [origem, setOrigem] = useState<Cidade>("BEL");
  const [destino, setDestino] = useState<Cidade>("STM");
  const [data, setData] = useState("2026-06-25");
  const [pax, setPax] = useState(1);

  const [oferta, setOferta] = useState<VendaOferta | null>(null);
  const [classeId, setClasseId] = useState<VendaClasseId>("rede");
  const [assento, setAssento] = useState<string | null>(null);

  const [pag, setPag] = useState<PagState>("idle");
  const [metodo, setMetodo] = useState<"cartao" | "pix">("cartao");
  const [aceito, setAceito] = useState(false);

  const trecho = `${origem} → ${destino}`;
  const preco = PRECOS_PASSAGEM.find((p) => p.trecho === trecho);
  const classe = VENDA_CLASSES.find((c) => c.id === classeId)!;
  const valorUnit = preco ? preco[classe.precoKey] : 0;
  const total = valorUnit * pax;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function reiniciar() {
    setStep("busca");
    setOferta(null);
    setClasseId("rede");
    setAssento(null);
    setPag("idle");
    setAceito(false);
    setPax(1);
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      {/* Header */}
      <header className="hairline-b sticky top-0 z-20 bg-[color:var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-display text-base">AJC Ferry Boat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-2.5 py-1 text-[10px] font-medium text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] sm:inline-flex">
              <Sparkles className="h-3 w-3" /> Crimson Prestige
            </span>
            <ThemeToggle />
          </div>
        </div>
        {step !== "confirmacao" && <Stepper index={stepIndex} />}
      </header>

      <section className="mx-auto max-w-md px-5 pb-24 pt-6">
        <AnimatePresence mode="wait">
          {step === "busca" && (
            <StepShell key="busca">
              <Busca
                origem={origem} destino={destino} data={data} pax={pax}
                setOrigem={setOrigem} setDestino={setDestino} setData={setData} setPax={setPax}
                onBuscar={() => setStep("resultados")}
              />
            </StepShell>
          )}

          {step === "resultados" && (
            <StepShell key="resultados">
              <Resultados
                trecho={`${cidadeNome(origem)} → ${cidadeNome(destino)}`}
                data={data}
                preco={preco}
                onVoltar={() => setStep("busca")}
                onSelecionar={(of, cId) => { setOferta(of); setClasseId(cId); setAssento(null); setStep("classe"); }}
              />
            </StepShell>
          )}

          {step === "classe" && oferta && (
            <StepShell key="classe">
              <SelecaoClasse
                oferta={oferta}
                classeId={classeId}
                assento={assento}
                preco={preco}
                pax={pax}
                onTrocarClasse={(c) => { setClasseId(c); setAssento(null); }}
                onAssento={setAssento}
                onVoltar={() => setStep("resultados")}
                onContinuar={() => setStep("conta")}
              />
            </StepShell>
          )}

          {step === "conta" && (
            <StepShell key="conta">
              <Conta onVoltar={() => setStep("classe")} onContinuar={() => setStep("termo")} />
            </StepShell>
          )}

          {step === "termo" && (
            <StepShell key="termo">
              <Termo
                classe={classe.nome}
                aceito={aceito}
                setAceito={setAceito}
                onVoltar={() => setStep("conta")}
                onContinuar={() => setStep("pagamento")}
              />
            </StepShell>
          )}

          {step === "pagamento" && (
            <StepShell key="pagamento">
              <Pagamento
                total={total}
                metodo={metodo}
                setMetodo={setMetodo}
                estado={pag}
                onVoltar={() => setStep("termo")}
                onPagar={() => {
                  setPag("processando");
                  // Simula a 1ª tentativa falhando, 2ª aprovando.
                  window.setTimeout(() => {
                    setPag((prev) => (prev === "processando" ? "falha" : prev));
                  }, 1400);
                }}
                onTentarNovamente={() => {
                  setPag("processando");
                  window.setTimeout(() => { setPag("sucesso"); setStep("confirmacao"); }, 1500);
                }}
              />
            </StepShell>
          )}

          {step === "confirmacao" && (
            <StepShell key="confirmacao">
              <Confirmacao
                trecho={`${cidadeNome(origem)} → ${cidadeNome(destino)}`}
                data={data}
                oferta={oferta}
                classe={classe.nome}
                pulseira={classe.pulseira}
                assento={assento}
                total={total}
                onReiniciar={reiniciar}
              />
            </StepShell>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

/* ============ Stepper ============ */
function Stepper({ index }: { index: number }) {
  const pct = (index / (STEPS.length - 1)) * 100;
  return (
    <div className="mx-auto max-w-md px-5 pb-3">
      <div className="relative h-1 overflow-hidden rounded-full bg-[color:var(--muted)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[color:var(--brand)] to-[color:var(--brand-soft)]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: easeOut }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Passo {index + 1} de {STEPS.length}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--brand)]">
          {STEPS[index]?.label}
        </span>
      </div>
    </div>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.4, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
      <ChevronLeft className="h-3.5 w-3.5" /> Voltar
    </button>
  );
}

function StepCTA({ children, onClick, disabled, icon: Icon }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative mt-5 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] transition-shadow active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/22 opacity-0 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.2s_ease-out]" />
      </span>
      <span className="relative inline-flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5" strokeWidth={1.8} />}
        {children}
      </span>
    </button>
  );
}

/* ============ Passo 1 — Busca ============ */
function Busca({
  origem, destino, data, pax, setOrigem, setDestino, setData, setPax, onBuscar,
}: {
  origem: Cidade; destino: Cidade; data: string; pax: number;
  setOrigem: (c: Cidade) => void; setDestino: (c: Cidade) => void;
  setData: (d: string) => void; setPax: (n: number) => void;
  onBuscar: () => void;
}) {
  function inverter() {
    setOrigem(destino);
    setDestino(origem);
  }
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[color:var(--brand)]">Portal de venda online</p>
      <h1 className="mt-1 font-display text-3xl leading-tight">Sua viagem pelo rio começa aqui</h1>
      <p className="mt-2 text-sm text-muted-foreground">Belém e mais 7 cidades · pagamento por PIX ou cartão · QR direto no celular.</p>

      <div className="surface-card mt-6 space-y-4 p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Campo label="De">
            <Select value={origem} onChange={(v) => setOrigem(v as Cidade)} />
          </Campo>
          <button
            onClick={inverter}
            className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] transition-transform active:rotate-180"
            aria-label="Inverter trecho"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <Campo label="Para">
            <Select value={destino} onChange={(v) => setDestino(v as Cidade)} />
          </Campo>
        </div>

        <Campo label="Data de embarque" icon={CalendarDays}>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="h-11 w-full rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
          />
        </Campo>

        <Campo label="Passageiros" icon={Users}>
          <div className="flex items-center gap-3">
            <Stepper2 value={pax} onChange={(n) => setPax(Math.max(1, Math.min(8, n)))} />
            <span className="text-xs text-muted-foreground">{pax === 1 ? "1 passageiro" : `${pax} passageiros`}</span>
          </div>
        </Campo>

        <StepCTA onClick={onBuscar} icon={ArrowRight}>Buscar viagens</StepCTA>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Ambiente seguro · seus dados protegidos pela LGPD
      </div>
    </>
  );
}

function Stepper2({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[color:var(--muted)] p-1 ring-1 ring-[color:var(--hairline)]">
      <button onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-[color:var(--accent)]">−</button>
      <span className="min-w-[2ch] text-center font-mono text-sm">{value}</span>
      <button onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-[color:var(--accent)]">+</button>
    </div>
  );
}

function Campo({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
    >
      {CIDADES.map((c) => <option key={c.sigla} value={c.sigla}>{c.nome}</option>)}
    </select>
  );
}

/* ============ Passo 2 — Resultados / disponibilidade ============ */
function Resultados({
  trecho, data, preco, onVoltar, onSelecionar,
}: {
  trecho: string;
  data: string;
  preco: ReturnType<typeof PRECOS_PASSAGEM.find>;
  onVoltar: () => void;
  onSelecionar: (oferta: VendaOferta, classe: VendaClasseId) => void;
}) {
  const dataLabel = new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return (
    <>
      <BackLink onClick={onVoltar} />
      <h1 className="mt-2 font-display text-2xl">{trecho}</h1>
      <p className="text-xs text-muted-foreground">{dataLabel} · {VENDA_OFERTAS.length} viagens disponíveis</p>

      <div className="mt-5 space-y-4">
        {VENDA_OFERTAS.map((of, i) => (
          <motion.div
            key={of.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.45, ease: easeOut }}
            className="surface-card brand-rail brand-rail-left overflow-hidden p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-[color:var(--brand)]" />
                <span className="font-display text-lg">{of.saida}</span>
                <span className="text-xs text-muted-foreground">→ {of.chegada}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {of.duracao}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{of.embarcacao}</p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {VENDA_CLASSES.map((c) => {
                const disp = of.disponibilidade[c.id];
                const esgotado = disp.restantes === 0;
                const ultimas = !esgotado && disp.restantes <= 5;
                const valor = preco ? preco[c.precoKey] : 0;
                return (
                  <button
                    key={c.id}
                    disabled={esgotado}
                    onClick={() => onSelecionar(of, c.id)}
                    className={`flex flex-col gap-1 rounded-xl p-2.5 text-left ring-1 transition-colors ${
                      esgotado
                        ? "cursor-not-allowed bg-[color:var(--muted)]/40 text-muted-foreground ring-[color:var(--hairline)]"
                        : "bg-[color:var(--surface-elev)] ring-[color:var(--hairline)] hover:bg-[color:color-mix(in_oklab,var(--brand)_6%,transparent)] hover:ring-[color:var(--hairline-brand)]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: c.pulseira.hex }} />
                      <span className="text-[11px] font-medium">{c.nome}</span>
                    </span>
                    {esgotado ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--danger)]">Esgotado</span>
                    ) : (
                      <>
                        <span className="big-numeric text-sm">{brl(valor)}</span>
                        <span className={`text-[10px] ${ultimas ? "font-semibold text-[color:var(--warning)]" : "text-muted-foreground"}`}>
                          {ultimas ? `Últimas ${disp.restantes}` : `${disp.restantes} vagas`}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ============ Passo 3 — Seleção de classe + assento ============ */
function SelecaoClasse({
  oferta, classeId, assento, preco, pax, onTrocarClasse, onAssento, onVoltar, onContinuar,
}: {
  oferta: VendaOferta;
  classeId: VendaClasseId;
  assento: string | null;
  preco: ReturnType<typeof PRECOS_PASSAGEM.find>;
  pax: number;
  onTrocarClasse: (c: VendaClasseId) => void;
  onAssento: (id: string) => void;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  const classe = VENDA_CLASSES.find((c) => c.id === classeId)!;
  const valor = preco ? preco[classe.precoKey] : 0;
  const precisaAssento = classeId === "camarote";
  const podeContinuar = !precisaAssento || assento !== null;

  return (
    <>
      <BackLink onClick={onVoltar} />
      <h1 className="mt-2 font-display text-2xl">Escolha sua classe</h1>
      <p className="text-xs text-muted-foreground">{oferta.embarcacao} · saída {oferta.saida}</p>

      <div className="mt-5 space-y-3">
        {VENDA_CLASSES.map((c) => {
          const disp = oferta.disponibilidade[c.id];
          const esgotado = disp.restantes === 0;
          const ativo = c.id === classeId;
          const v = preco ? preco[c.precoKey] : 0;
          return (
            <button
              key={c.id}
              disabled={esgotado}
              onClick={() => onTrocarClasse(c.id)}
              className={`w-full overflow-hidden rounded-2xl p-4 text-left ring-1 transition-all ${
                esgotado ? "cursor-not-allowed opacity-50 ring-[color:var(--hairline)]"
                : ativo ? "bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)] ring-2 ring-[color:var(--brand)]"
                : "surface-card ring-[color:var(--hairline)] hover:ring-[color:var(--hairline-brand)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.pulseira.hex }} />
                    <span className="font-display text-lg">{c.nome}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.subtitulo}</p>
                </div>
                <div className="text-right">
                  <p className="big-numeric text-lg">{brl(v)}</p>
                  <p className="text-[10px] text-muted-foreground">por pessoa</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {c.perks.map((p) => (
                  <li key={p} className="rounded-full bg-[color:var(--muted)] px-2 py-0.5 text-[10px] text-foreground/80 ring-1 ring-[color:var(--hairline)]">{p}</li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] font-medium text-[color:var(--brand)]">Pulseira {c.pulseira.nome} no embarque</p>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {precisaAssento && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 surface-card p-5"
          >
            <div className="flex items-center gap-2">
              <Armchair className="h-4 w-4 text-[color:var(--brand)]" />
              <h2 className="font-display text-base">Escolha o camarote</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cada camarote Royal é nominal e travado por reserva.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {ASSENTOS_CAMAROTE.map((a) => (
                <SeatButton key={a.id} assento={a} selecionado={assento === a.id} onClick={() => onAssento(a.id)} />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[color:var(--surface-elev)] ring-1 ring-[color:var(--hairline)]" /> Livre</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[color:var(--brand)]" /> Selecionado</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[color:var(--muted)]" /> Ocupado</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)] p-4 ring-1 ring-[color:var(--hairline-brand)]">
        <div>
          <span className="text-xs text-muted-foreground">{pax}× {classe.nome}</span>
          {assento && <span className="ml-2 font-mono text-[11px] text-[color:var(--brand)]">{ASSENTOS_CAMAROTE.find((a) => a.id === assento)?.label}</span>}
        </div>
        <span className="big-numeric text-2xl text-[color:var(--brand)]">{brl(valor * pax)}</span>
      </div>

      <StepCTA onClick={onContinuar} disabled={!podeContinuar} icon={ArrowRight}>
        {podeContinuar ? "Continuar" : "Escolha o camarote"}
      </StepCTA>
    </>
  );
}

function SeatButton({ assento, selecionado, onClick }: { assento: Assento; selecionado: boolean; onClick: () => void }) {
  const ocupado = assento.status === "ocupado";
  return (
    <button
      disabled={ocupado}
      onClick={onClick}
      className={`grid h-12 place-items-center rounded-lg text-xs font-medium ring-1 transition-all ${
        ocupado ? "cursor-not-allowed bg-[color:var(--muted)] text-muted-foreground/50 ring-[color:var(--hairline)]"
        : selecionado ? "scale-105 bg-[color:var(--brand)] text-primary-foreground ring-[color:var(--brand)] shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent)]"
        : "bg-[color:var(--surface-elev)] text-foreground ring-[color:var(--hairline)] hover:ring-[color:var(--brand)]"
      }`}
    >
      {assento.label}
    </button>
  );
}

/* ============ Passo 4 — Conta (autocadastro / login) ============ */
function Conta({ onVoltar, onContinuar }: { onVoltar: () => void; onContinuar: () => void }) {
  const [modo, setModo] = useState<"cadastro" | "login">("cadastro");
  return (
    <>
      <BackLink onClick={onVoltar} />
      <h1 className="mt-2 font-display text-2xl">Quase lá</h1>
      <p className="text-xs text-muted-foreground">Identifique-se para emitir o bilhete no seu nome.</p>

      <div className="mt-4 inline-flex rounded-full bg-[color:var(--muted)] p-1 ring-1 ring-[color:var(--hairline)]">
        {(["cadastro", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${modo === m ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            {modo === m && <motion.span layoutId="conta-pill" className="absolute inset-0 rounded-full bg-[color:var(--brand)]" />}
            <span className="relative">{m === "cadastro" ? "Criar conta" : "Já tenho conta"}</span>
          </button>
        ))}
      </div>

      <div className="surface-card mt-4 space-y-3 p-5">
        {modo === "cadastro" && (
          <CampoInput icon={User} label="Nome completo" placeholder="Como no documento" />
        )}
        <CampoInput icon={Mail} label="E-mail" placeholder="voce@email.com" type="email" />
        {modo === "cadastro" && (
          <CampoInput icon={Phone} label="WhatsApp" placeholder="(91) 9####-####" type="tel" />
        )}
        <CampoInput icon={Lock} label="Senha" placeholder="••••••••" type="password" />
        {modo === "cadastro" && (
          <p className="text-[10px] text-muted-foreground">
            Enviamos o QR do bilhete por e-mail e WhatsApp. Você pode acompanhar em “Minhas viagens”.
          </p>
        )}
      </div>

      <StepCTA onClick={onContinuar} icon={ArrowRight}>
        {modo === "cadastro" ? "Criar conta e continuar" : "Entrar e continuar"}
      </StepCTA>
    </>
  );
}

function CampoInput({ icon: Icon, label, placeholder, type = "text" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      <div className="mt-1 flex h-11 items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 ring-1 ring-[color:var(--hairline)] focus-within:ring-[color:var(--ring)]">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input type={type} placeholder={placeholder} className="h-full w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none" />
      </div>
    </div>
  );
}

/* ============ Passo 5 — Termo de aceite ============ */
function Termo({ classe, aceito, setAceito, onVoltar, onContinuar }: {
  classe: string;
  aceito: boolean;
  setAceito: (v: boolean) => void;
  onVoltar: () => void;
  onContinuar: () => void;
}) {
  return (
    <>
      <BackLink onClick={onVoltar} />
      <h1 className="mt-2 font-display text-2xl">Termo de embarque</h1>
      <p className="text-xs text-muted-foreground">Leia e aceite antes de pagar. É obrigatório.</p>

      <div className="surface-card mt-4 max-h-72 space-y-3 overflow-y-auto p-5 text-xs leading-relaxed text-foreground/80">
        <p><span className="font-medium text-foreground">1. Classe contratada.</span> Você adquire a classe <span className="text-[color:var(--brand)]">{classe}</span> e declara conhecer suas condições (acomodação, bagagem e acessos).</p>
        <p><span className="font-medium text-foreground">2. Embarque.</span> Apresente o QR do bilhete e documento com foto. A pulseira correspondente à classe é obrigatória durante toda a travessia.</p>
        <p><span className="font-medium text-foreground">3. Bagagem.</span> Volumes de carga seguem regras de despacho próprias e não estão inclusos na passagem.</p>
        <p><span className="font-medium text-foreground">4. Cancelamento.</span> Reembolsos seguem a política vigente e os prazos da ANTAQ.</p>
        <p><span className="font-medium text-foreground">5. Dados pessoais.</span> Autorizo o tratamento dos meus dados conforme a LGPD para emissão, validação e comunicação da viagem.</p>
        <p><span className="font-medium text-foreground">6. Segurança.</span> Sigo as orientações da tripulação e as normas de segurança da embarcação.</p>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[color:var(--muted)] p-4 ring-1 ring-[color:var(--hairline)]">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 transition-colors ${aceito ? "bg-[color:var(--brand)] ring-[color:var(--brand)]" : "bg-transparent ring-[color:var(--hairline-strong)]"}`}>
          {aceito && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
        </span>
        <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="sr-only" />
        <span className="text-xs text-foreground/90">Li e aceito o termo de embarque e a política de tratamento de dados.</span>
      </label>

      <StepCTA onClick={onContinuar} disabled={!aceito} icon={ArrowRight}>
        {aceito ? "Ir para o pagamento" : "Aceite para continuar"}
      </StepCTA>
    </>
  );
}

/* ============ Passo 6 — Pagamento ============ */
function Pagamento({
  total, metodo, setMetodo, estado, onVoltar, onPagar, onTentarNovamente,
}: {
  total: number;
  metodo: "cartao" | "pix";
  setMetodo: (m: "cartao" | "pix") => void;
  estado: PagState;
  onVoltar: () => void;
  onPagar: () => void;
  onTentarNovamente: () => void;
}) {
  // Timer de reserva (10:00 → expira).
  const [restante, setRestante] = useState(600);
  useEffect(() => {
    if (estado === "sucesso") return;
    const id = window.setInterval(() => setRestante((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [estado]);
  const expirado = restante === 0;
  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");

  if (expirado) {
    return (
      <div className="py-6">
        <BackLink onClick={onVoltar} />
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] ring-1 ring-[color:color-mix(in_oklab,var(--warning)_35%,transparent)]">
            <Clock className="h-10 w-10" strokeWidth={1.6} />
          </span>
          <h1 className="mt-4 font-display text-2xl">Reserva expirada</h1>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">As vagas ficam bloqueadas por 10 minutos. Refaça a busca para garantir o preço atual.</p>
          <StepCTA onClick={onVoltar} icon={RefreshCw}>Refazer reserva</StepCTA>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackLink onClick={onVoltar} />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl">Pagamento</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs ring-1 ${
          restante < 120 ? "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] ring-[color:color-mix(in_oklab,var(--warning)_35%,transparent)]"
          : "bg-[color:var(--muted)] text-muted-foreground ring-[color:var(--hairline)]"
        }`}>
          <Clock className="h-3 w-3" /> {mm}:{ss}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Reserva garantida enquanto o tempo não zera.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetodoBtn ativo={metodo === "cartao"} onClick={() => setMetodo("cartao")} icon={CreditCard} label="Cartão" />
        <MetodoBtn ativo={metodo === "pix"} onClick={() => setMetodo("pix")} icon={QrCode} label="PIX" />
      </div>

      <div className="surface-card mt-4 p-5">
        <AnimatePresence mode="wait">
          {metodo === "cartao" ? (
            <motion.div key="cartao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <CampoInput icon={CreditCard} label="Número do cartão" placeholder="0000 0000 0000 0000" />
              <div className="grid grid-cols-2 gap-3">
                <CampoInput icon={CalendarDays} label="Validade" placeholder="MM/AA" />
                <CampoInput icon={Lock} label="CVV" placeholder="123" />
              </div>
              <CampoInput icon={User} label="Nome impresso" placeholder="Como no cartão" />
            </motion.div>
          ) : (
            <motion.div key="pix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
              <FakeQR seed="PIX-AJC-PORTAL" size={168} />
              <p className="mt-3 text-xs text-muted-foreground">Abra o app do banco e escaneie. A confirmação é automática.</p>
              <code className="mt-2 w-full truncate rounded-md bg-[color:var(--muted)] px-3 py-2 font-mono text-[10px] text-foreground/70 ring-1 ring-[color:var(--hairline)]">
                00020126AJC-FERRY-PIX-0xR9...COPIA-E-COLA
              </code>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {estado === "falha" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-3 rounded-xl bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] p-4 text-sm text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Pagamento não autorizado</p>
            <p className="mt-0.5 text-xs text-[color:var(--danger)]/85">O banco recusou a transação. Verifique os dados ou troque a forma de pagamento.</p>
          </div>
        </motion.div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)] p-4 ring-1 ring-[color:var(--hairline-brand)]">
        <span className="text-sm">Total</span>
        <span className="big-numeric text-2xl text-[color:var(--brand)]">{brl(total)}</span>
      </div>

      {estado === "falha" ? (
        <StepCTA onClick={onTentarNovamente} icon={RefreshCw}>Tentar novamente</StepCTA>
      ) : (
        <StepCTA onClick={onPagar} disabled={estado === "processando"} icon={estado === "processando" ? undefined : Lock}>
          {estado === "processando" ? "Processando…" : `Pagar ${brl(total)}`}
        </StepCTA>
      )}

      <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Transação criptografada · não armazenamos o número do cartão
      </div>
    </>
  );
}

function MetodoBtn({ ativo, onClick, icon: Icon, label }: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ring-1 transition-colors ${
        ativo ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-[color:var(--brand)]"
        : "surface-card text-foreground/80 ring-[color:var(--hairline)] hover:ring-[color:var(--hairline-brand)]"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} /> {label}
    </button>
  );
}

/* ============ Passo 7 — Confirmação ============ */
function Confirmacao({
  trecho, data, oferta, classe, pulseira, assento, total, onReiniciar,
}: {
  trecho: string;
  data: string;
  oferta: VendaOferta | null;
  classe: string;
  pulseira: { nome: string; hex: string };
  assento: string | null;
  total: number;
  onReiniciar: () => void;
}) {
  const codigo = useMemo(() => `AJC-${Math.floor(70000 + Math.random() * 9999)}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`, []);
  const dataLabel = new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  const assentoLabel = assento ? ASSENTOS_CAMAROTE.find((a) => a.id === assento)?.label : null;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="grid h-16 w-16 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]"
      >
        <Check className="h-9 w-9" strokeWidth={2.4} />
      </motion.span>
      <h1 className="mt-4 font-display text-2xl">Pagamento aprovado</h1>
      <p className="mt-1 text-sm text-muted-foreground">Seu bilhete foi emitido e enviado por e-mail e WhatsApp.</p>

      {/* Bilhete com QR grande */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: easeOut }}
        className="surface-card mt-6 w-full overflow-hidden"
      >
        <div className="flex items-center justify-between bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-5 py-3">
          <div className="flex items-center gap-2">
            <BrandMark size={22} />
            <span className="font-display text-sm">Bilhete eletrônico</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: pulseira.hex }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: pulseira.hex }} /> Pulseira {pulseira.nome}
          </span>
        </div>

        <div className="grid place-items-center bg-[color:var(--surface-deep)] py-7">
          <div className="rounded-2xl bg-white p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)]">
            <FakeQR seed={codigo} size={208} />
          </div>
          <code className="mt-3 font-mono text-xs tracking-widest text-foreground/80">{codigo}</code>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[color:var(--hairline)] text-left">
          <Info label="Trecho" value={trecho} />
          <Info label="Embarcação" value={oferta?.embarcacao ?? "—"} />
          <Info label="Data" value={dataLabel} />
          <Info label="Saída" value={oferta?.saida ?? "—"} />
          <Info label="Classe" value={classe} />
          <Info label={assentoLabel ? "Camarote" : "Total pago"} value={assentoLabel ?? brl(total)} />
        </div>
      </motion.div>

      <div className="mt-5 grid w-full grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]">
          <Download className="h-4 w-4" /> Baixar
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]">
          <Share2 className="h-4 w-4" /> Compartilhar
        </button>
      </div>

      <button onClick={onReiniciar} className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        Comprar outra passagem
      </button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--card)] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

/* ============ QR fake — grid SVG determinístico ============ */
function FakeQR({ seed, size = 200 }: { seed: string; size?: number }) {
  const cells = 25;
  const modules = useMemo(() => {
    // PRNG determinístico (mulberry32) a partir do seed.
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
      {/* Finder patterns nos 3 cantos */}
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
