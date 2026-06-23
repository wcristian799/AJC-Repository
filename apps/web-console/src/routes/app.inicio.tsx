import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Ship, Boxes, Ticket, TrendingUp, AlertTriangle, ArrowRight,
  Activity, Radio, Anchor, Zap,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, StatusChip, ViagemStatusChip, ViagemSituacaoChip,
  PrimaryButton, GhostButton, brl,
} from "@/components/ops/primitives";
import {
  CountUp, RadialDial, LiveDot, Ticker, ShimmerBar, RadarSweep, VoyageTrack,
} from "@/components/ops/motion-bits";
import { VIAGENS, CAIXAS, ALERTAS, EMBARCACOES } from "@/mocks/data";

export const Route = createFileRoute("/app/inicio")({
  head: () => ({
    meta: [{ title: "Início · AJC Suite" }, { name: "description", content: "Centro de operações AJC: viagens em curso, alertas e caixas em tempo real." }],
  }),
  component: Inicio,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

function Inicio() {
  const emCurso = VIAGENS.filter((v) => v.status === "em_curso");
  const ativos = EMBARCACOES.filter((e) => e.status === "ativa").length;
  const saldoCaixas = CAIXAS.reduce((s, c) => s + c.saldo, 0);
  const passageirosAtivos = emCurso.reduce((s, v) => s + v.passageiros, 0);
  const volumesTransito = emCurso.reduce((s, v) => s + v.volumes, 0);
  const alertasCriticos = ALERTAS.filter((a) => a.severidade === "danger").length;

  const tickerItems = [
    <>V-0418 cruzou GUR · <span className="text-foreground">02:42</span></>,
    <>+ {brl(12_840)} caixa porto BEL nas últimas 2h</>,
    <>V-0420 com atraso · MTA pendente</>,
    <>1 volume divergente · C-2203 / Ferragens Amazônia</>,
    <>Ferry Belém II · 142 passageiros embarcados</>,
    <>MP solicitou relatório de gratuidades · prazo 28/06</>,
    <>+ {brl(3_240)} caixa agente Santarém</>,
  ];

  return (
    <AppShell crumb="Início">
      {/* ============ HERO COMMAND PULSE ============ */}
      <section className="surface-card filet-crimson relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--champagne), transparent)" }} />
        <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[1.4fr_auto]">
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="flex items-center gap-2"
            >
              <span className="champagne-eyebrow inline-flex items-center gap-2">
                <LiveDot /> Ao vivo · 22/06 · 14:32
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
                Centro de operações
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6, ease: easeOut }}
              className="mt-3 font-display text-[1.9rem] leading-[1.05] text-foreground sm:text-4xl xl:text-[2.6rem]"
            >
              Bom dia, <span className="brand-text">Wellington</span>.
              <br />
              <span className="text-foreground/70">A frota está respondendo.</span>
            </motion.h1>


            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6, ease: easeOut }}
              className="mt-3 max-w-xl text-sm text-muted-foreground"
            >
              {emCurso.length} viagens em curso · {alertasCriticos} alerta(s) crítico(s) · sincronização ativa com todas as bases.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: easeOut }}
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              <PrimaryButton icon={Ship}>Nova viagem</PrimaryButton>
              <GhostButton icon={ArrowRight}>Relatório do dia</GhostButton>
              <GhostButton icon={Radio}>Escuta operacional</GhostButton>
            </motion.div>

            {/* Mini KPI strip with dials */}
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Viagens", value: emCurso.length, dial: 75, icon: Ship,    tone: "brand" as const },
                { label: "Volumes", value: volumesTransito, dial: 88, icon: Boxes,   tone: "warning" as const },
                { label: "Caixas",  value: saldoCaixas,    dial: 62, icon: TrendingUp, tone: "success" as const, currency: true },
                { label: "Frota",   value: ativos,         dial: (ativos/EMBARCACOES.length)*100, icon: Anchor, tone: "brand" as const },
              ].map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06, duration: 0.5, ease: easeOut }}
                  whileHover={{ y: -3 }}
                  className="group relative overflow-hidden rounded-xl bg-[color:var(--surface-elev)] p-4 ring-1 ring-[color:var(--hairline)] backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{k.label}</p>
                      <p className="big-numeric mt-2 text-2xl text-foreground md:text-[1.7rem]">
                        {k.currency ? (
                          <>R$ <CountUp to={k.value} duration={1.6} /></>
                        ) : (
                          <CountUp to={k.value} duration={1.4} />
                        )}
                      </p>
                    </div>
                    <div className="relative">
                      <RadialDial value={k.dial} tone={k.tone} size={48} stroke={3.5} />
                      <k.icon className="absolute inset-0 m-auto h-4 w-4 text-foreground/80" strokeWidth={1.8} />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--brand)] to-transparent opacity-0 transition-opacity group-hover:opacity-60" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Radar lateral */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: easeOut }}
            className="relative hidden flex-col items-center justify-center xl:flex"
          >
            <div className="relative">
              <RadarSweep
                size={300}
                blips={[
                  { angle: 25,  radius: 0.55, tone: "brand"   },
                  { angle: 95,  radius: 0.78, tone: "warning" },
                  { angle: 165, radius: 0.42, tone: "brand"   },
                  { angle: 220, radius: 0.85, tone: "danger"  },
                  { angle: 305, radius: 0.6,  tone: "brand"   },
                ]}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--brand)]">Frota AJC</p>
                  <p className="big-numeric mt-1 text-3xl text-foreground"><CountUp to={emCurso.length} />/{EMBARCACOES.length}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">em rota</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ticker */}
        <div className="relative border-t border-[color:var(--hairline)] bg-[color:var(--surface-elev)]/60 py-2.5">
          <div className="flex items-center">
            <div className="flex items-center gap-2 border-r border-[color:var(--hairline)] px-4">
              <Activity className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80">Feed ao vivo</span>
            </div>
            <div className="min-w-0 flex-1">
              <Ticker items={tickerItems} speed={55} />
            </div>
          </div>
        </div>
      </section>

      {/* ============ VIAGENS COM TRACK ANIMADO ============ */}
      <section className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: easeOut }}
          className="surface-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] ring-1 ring-[color:var(--hairline-brand)]">
                <Ship className="h-4 w-4 text-[color:var(--brand)]" />
              </span>
              <div>
                <h2 className="font-display text-lg text-foreground">Viagens em curso</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Cada barco navega conforme o apontamento das escalas.</p>
              </div>
            </div>
            <Link to="/app/navegacao" className="text-xs font-medium text-[color:var(--brand)] hover:underline">
              Ver todas →
            </Link>
          </div>
          <ul className="divide-y divide-[color:var(--hairline)]">
            {emCurso.map((v, i) => {
              const emb = EMBARCACOES.find((e) => e.id === v.embarcacaoId);
              const stops = [
                { code: v.origem, label: v.origem, done: true },
                ...v.escalas.map((e) => ({ code: e.cidade, label: e.cidade, done: !!e.horaReal })),
              ];
              const done = stops.filter((s) => s.done).length;
              const progress = Math.max(6, Math.round((done / Math.max(stops.length, 1)) * 100));
              const tone =
                v.situacao === "atrasado" ? "danger" :
                v.situacao === "atencao"  ? "warning" : "brand";
              return (
                <motion.li
                  key={v.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: easeOut }}
                  className="px-5 py-5 transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_4%,transparent)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{v.codigo}</span>
                    <span className="font-display text-base text-foreground">{v.origem} → {v.destino}</span>
                    <ViagemStatusChip s={v.status} />
                    <ViagemSituacaoChip s={v.situacao} />
                    <span className="ml-auto big-numeric text-xl text-foreground"><CountUp to={v.ocupacaoPct} suffix="%" /></span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {emb?.nome} · saída {v.saida} · {v.passageiros} passageiros · {v.volumes} volumes
                  </p>
                  <div className="mt-2">
                    <VoyageTrack stops={stops} progressPct={progress} />
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Carga</span>
                    <div className="flex-1">
                      <ShimmerBar pct={v.cargaPct} tone={tone} />
                    </div>
                    <span className="font-mono text-[10px] text-foreground/80">{v.cargaPct}%</span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </motion.div>

        {/* Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: easeOut }}
          className="surface-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
            <div className="flex items-center gap-3">
              <motion.span
                className="grid h-9 w-9 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_35%,transparent)]"
                animate={{ boxShadow: [
                  "0 0 0 0 color-mix(in oklab, var(--danger) 50%, transparent)",
                  "0 0 0 8px color-mix(in oklab, var(--danger) 0%, transparent)",
                ] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                <AlertTriangle className="h-4 w-4 text-[color:var(--danger)]" />
              </motion.span>
              <div>
                <h2 className="font-display text-lg text-foreground">Alertas</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{alertasCriticos} crítico(s) · ação imediata</p>
              </div>
            </div>
            <Zap className="h-4 w-4 text-[color:var(--brand)]" />
          </div>
          <ul className="divide-y divide-[color:var(--hairline)]">
            {ALERTAS.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.45, ease: easeOut }}
                className="group relative px-5 py-4"
              >
                <span className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-r ${
                  a.severidade === "danger" ? "bg-[color:var(--danger)]" :
                  a.severidade === "warning" ? "bg-[color:var(--warning)]" : "bg-[color:var(--info)]"
                }`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.titulo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{a.detalhe}</p>
                  </div>
                  <StatusChip tone={a.severidade === "danger" ? "danger" : a.severidade === "warning" ? "warning" : "info"}>
                    {a.quando}
                  </StatusChip>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* ============ CAIXAS COM CONTADOR ============ */}
      <section className="mt-6">
        <SectionHeader
          eyebrow="Tesouraria"
          title="Caixas em tempo real"
          description="Porto, balsas, encomendas, agentes e lanchonetes consolidados."
          actions={
            <Link to="/app/financeiro" className="text-xs font-medium text-[color:var(--brand)] hover:underline">
              Ir para Financeiro →
            </Link>
          }
        />
        <div className="surface-card mt-4 grid grid-cols-2 gap-px overflow-hidden bg-[color:var(--hairline)] md:grid-cols-3 xl:grid-cols-4">
          {CAIXAS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.5, ease: easeOut }}
              whileHover={{ y: -4 }}
              className="group relative bg-[color:var(--card)] p-4 transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_4%,transparent)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{c.tipo}</p>
                <LiveDot tone="success" />
              </div>
              <p className="mt-1 truncate text-xs text-foreground/85">{c.referencia}</p>
              <p className="big-numeric mt-3 text-2xl text-foreground">
                R$ <CountUp to={c.saldo} duration={1.6} />
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="text-[color:var(--success)]">+ {brl(c.entradasDia)}</span>
                <span className="text-[color:var(--danger)]">− {brl(c.saidasDia)}</span>
              </div>
              <div className="mt-2">
                <ShimmerBar pct={Math.min(100, (c.entradasDia / Math.max(c.entradasDia + c.saidasDia, 1)) * 100)} tone="success" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--brand)] to-transparent opacity-0 transition-opacity group-hover:opacity-80" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer micro stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[color:var(--hairline)] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        <span>Da margem · à entrega — Suite AJC</span>
        <span className="flex items-center gap-2">
          <LiveDot tone="success" /> {passageirosAtivos} passageiros embarcados agora
        </span>
      </motion.div>
    </AppShell>
  );
}
