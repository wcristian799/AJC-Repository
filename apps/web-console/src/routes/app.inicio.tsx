import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Ship, Boxes, TrendingUp, AlertTriangle, ArrowRight,
  Activity, Radio, Anchor, BellPlus,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, StatusChip, ViagemStatusChip, ViagemSituacaoChip,
  PrimaryButton, GhostButton, brl,
} from "@/components/ops/primitives";
import {
  CountUp, RadialDial, LiveDot, Ticker, ShimmerBar, RadarSweep, VoyageTrack,
} from "@/components/ops/motion-bits";
import {
  getStoredAuth,
  createOperacaoAlerta,
  getOperacaoRelatorioDia,
  listBilhetes,
  listCaixas,
  listEmbarcacoes,
  listNavegacaoViagens,
  listOperacaoAlertas,
  listTmsCargas,
  listTmsVolumes,
  updateOperacaoAlerta,
  type BilheteApi,
  type CaixaApi,
  type EmbarcacaoApi,
  type NavegacaoViagemApi,
  type OperacaoAlertaApi,
  type TmsCargaApi,
  type TmsVolumeApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/inicio")({
  head: () => ({
    meta: [{ title: "Inicio · AJC Suite" }, { name: "description", content: "Centro de operacoes AJC: viagens em curso, alertas e caixas em tempo real." }],
  }),
  component: Inicio,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type InicioViagemView = {
  id: string;
  codigo: string;
  embarcacaoId: string;
  embarcacaoNome: string;
  origem: string;
  destino: string;
  escalas: Array<{ cidade: string; horaPrevista: string; horaReal?: string | null }>;
  saida: string;
  status: "planejada" | "em_curso" | "concluida" | "cancelada" | string;
  situacao?: "no_prazo" | "atencao" | "atrasado" | string | null;
  ocupacaoPct: number;
  cargaPct: number;
  volumes: number;
  passageiros: number;
};

type InicioCaixaView = {
  id: string;
  tipo: string;
  referencia: string;
  saldo: number;
  entradasDia: number;
  saidasDia: number;
  status?: string;
};

type InicioAlertaView = {
  id: string;
  titulo: string;
  detalhe: string;
  severidade: "danger" | "warning" | "info";
  quando: string;
  apiId?: string;
  origem?: "api" | "derivado";
};

function Inicio() {
  const [apiViagens, setApiViagens] = useState<NavegacaoViagemApi[]>([]);
  const [apiEmbarcacoes, setApiEmbarcacoes] = useState<EmbarcacaoApi[]>([]);
  const [apiCaixas, setApiCaixas] = useState<CaixaApi[]>([]);
  const [apiCargas, setApiCargas] = useState<TmsCargaApi[]>([]);
  const [apiVolumes, setApiVolumes] = useState<TmsVolumeApi[]>([]);
  const [apiBilhetes, setApiBilhetes] = useState<BilheteApi[]>([]);
  const [apiAlertas, setApiAlertas] = useState<OperacaoAlertaApi[]>([]);
  const [apiFalhou, setApiFalhou] = useState(false);
  const [alertaFormOpen, setAlertaFormOpen] = useState(false);
  const [alertaSaving, setAlertaSaving] = useState(false);
  const [relatorioSaving, setRelatorioSaving] = useState(false);
  const [alertaErro, setAlertaErro] = useState<string | null>(null);
  const [relatorioErro, setRelatorioErro] = useState<string | null>(null);
  const [novoAlerta, setNovoAlerta] = useState({
    titulo: "",
    detalhe: "",
    severidade: "warning" as "info" | "warning" | "danger",
    modulo: "operacao",
  });

  useEffect(() => {
    let alive = true;
    Promise.all([
      listNavegacaoViagens(),
      listEmbarcacoes(),
      listCaixas(),
      listTmsCargas(),
      listTmsVolumes(),
      listBilhetes(),
      listOperacaoAlertas({ status: "aberto" }),
    ])
      .then(([viagens, embarcacoes, caixas, cargas, volumes, bilhetes, alertas]) => {
        if (!alive) return;
        setApiViagens(viagens);
        setApiEmbarcacoes(embarcacoes);
        setApiCaixas(caixas);
        setApiCargas(cargas);
        setApiVolumes(volumes);
        setApiBilhetes(bilhetes);
        setApiAlertas(alertas);
        setApiFalhou(false);
      })
      .catch(() => {
        if (alive) setApiFalhou(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const embarcacoes = useMemo(() => apiEmbarcacoes.map(mapApiEmbarcacao), [apiEmbarcacoes]);

  const viagens = useMemo(
    () => apiViagens.map((viagem) => mapApiViagem(viagem, apiBilhetes, apiCargas, apiVolumes, apiEmbarcacoes)),
    [apiBilhetes, apiCargas, apiEmbarcacoes, apiViagens, apiVolumes],
  );

  const caixas = useMemo(() => apiCaixas.map(mapApiCaixa), [apiCaixas]);

  const emCurso = useMemo(() => {
    const atuais = viagens.filter((v) => v.status === "em_curso");
    if (atuais.length > 0) return atuais;
    return viagens.filter((v) => v.status !== "concluida" && v.status !== "cancelada").slice(0, 3);
  }, [viagens]);

  const alertas = useMemo(() => {
    const cadastrados = apiAlertas.map(mapApiAlerta);
    const derivados = buildAlertas(viagens, apiVolumes, caixas, apiFalhou);
    if (cadastrados.length + derivados.length > 0) return [...cadastrados, ...derivados].slice(0, 5);
    return [{
      id: "operacao-ok",
      titulo: "Operacao sem alerta critico",
      detalhe: "Viagens, volumes e caixas nao indicam pendencia imediata nos dados atuais.",
      severidade: "info" as const,
      quando: "agora",
    }];
  }, [apiAlertas, apiCaixas.length, apiFalhou, apiVolumes, caixas, viagens]);

  const ativos = embarcacoes.filter((e) => e.status === "ativa" || e.status === "ativo").length;
  const saldoCaixas = caixas.reduce((s, c) => s + c.saldo, 0);
  const passageirosAtivos = emCurso.reduce((s, v) => s + v.passageiros, 0);
  const volumesTransito = emCurso.reduce((s, v) => s + v.volumes, 0);
  const alertasCriticos = alertas.filter((a) => a.severidade === "danger").length;
  const usuarioNome = getStoredAuth()?.user.nome?.split(" ")[0] || "Wellington";

  const caixasPorTipo = [
    { tipo: "Porto", itens: caixas.filter((c) => c.tipo === "porto") },
    { tipo: "Embarcacoes", itens: caixas.filter((c) => ["embarcacao", "balsa"].includes(c.tipo)) },
    { tipo: "Agentes", itens: caixas.filter((c) => c.tipo === "agente") },
    { tipo: "Apoio", itens: caixas.filter((c) => !["porto", "embarcacao", "balsa", "agente"].includes(c.tipo)) },
  ].filter((g) => g.itens.length > 0);

  const tickerItems = buildTicker(emCurso, caixas, apiVolumes, apiBilhetes);

  async function salvarAlerta() {
    setAlertaSaving(true);
    setAlertaErro(null);
    try {
      const salvo = await createOperacaoAlerta({
        ...novoAlerta,
        clientUuid: crypto.randomUUID(),
      });
      setApiAlertas((current) => [salvo, ...current.filter((item) => item.id !== salvo.id)]);
      setNovoAlerta({ titulo: "", detalhe: "", severidade: "warning", modulo: "operacao" });
      setAlertaFormOpen(false);
    } catch (error) {
      setAlertaErro(error instanceof Error ? error.message : "Nao foi possivel cadastrar o alerta.");
    } finally {
      setAlertaSaving(false);
    }
  }

  async function resolverAlerta(id: string) {
    setAlertaErro(null);
    try {
      await updateOperacaoAlerta(id, { status: "resolvido", clientUuid: crypto.randomUUID() });
      setApiAlertas((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setAlertaErro(error instanceof Error ? error.message : "Nao foi possivel resolver o alerta.");
    }
  }

  async function baixarRelatorioDia() {
    setRelatorioSaving(true);
    setRelatorioErro(null);
    try {
      const data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
      const relatorio = await getOperacaoRelatorioDia({ data });
      downloadJson(`ajc-relatorio-operacional-${relatorio.data}.json`, relatorio);
    } catch (error) {
      setRelatorioErro(error instanceof Error ? error.message : "Nao foi possivel gerar o relatorio do dia.");
    } finally {
      setRelatorioSaving(false);
    }
  }

  return (
    <AppShell crumb="Inicio">
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
                <LiveDot /> Ao vivo · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date())}
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
                Centro de operacoes
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.6, ease: easeOut }}
              className="mt-3 font-display text-[1.9rem] leading-[1.05] text-foreground sm:text-4xl xl:text-[2.6rem]"
            >
              Bom dia, <span className="brand-text">{usuarioNome}</span>.
              <br />
              <span className="text-foreground/70">A frota esta respondendo.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6, ease: easeOut }}
              className="mt-3 max-w-xl text-sm text-muted-foreground"
            >
              {emCurso.length} viagens operacionais · {alertasCriticos} alerta(s) critico(s) · sincronizacao ativa com as bases conectadas.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: easeOut }}
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              <PrimaryButton icon={Ship} onClick={() => window.location.assign("/app/navegacao")}>Nova viagem</PrimaryButton>
              <GhostButton icon={ArrowRight} onClick={baixarRelatorioDia}>{relatorioSaving ? "Gerando..." : "Relatorio do dia"}</GhostButton>
              <GhostButton icon={BellPlus} onClick={() => setAlertaFormOpen((open) => !open)}>Cadastrar alerta</GhostButton>
              <GhostButton icon={Radio}>Escuta operacional</GhostButton>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Viagens", value: emCurso.length, dial: Math.min(100, emCurso.length * 25), icon: Ship, tone: "brand" as const },
                { label: "Volumes", value: volumesTransito, dial: Math.min(100, volumesTransito / 5), icon: Boxes, tone: "warning" as const },
                { label: "Caixas", value: saldoCaixas, dial: 62, icon: TrendingUp, tone: "success" as const, currency: true },
                { label: "Frota", value: ativos, dial: embarcacoes.length ? (ativos / embarcacoes.length) * 100 : 0, icon: Anchor, tone: "brand" as const },
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

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: easeOut }}
            className="relative hidden flex-col items-center justify-center xl:flex"
          >
            <div className="relative">
              <RadarSweep
                size={300}
                blips={emCurso.slice(0, 5).map((v, i) => ({
                  angle: 25 + i * 70,
                  radius: 0.42 + (i % 3) * 0.18,
                  tone: v.situacao === "atrasado" ? "danger" : v.situacao === "atencao" ? "warning" : "brand",
                }))}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--brand)]">Frota AJC</p>
                  <p className="big-numeric mt-1 text-3xl text-foreground"><CountUp to={emCurso.length} />/{embarcacoes.length}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">em rota</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative border-t border-[color:var(--hairline)] bg-[color:var(--surface-elev)]/60 py-2.5">
          <div className="flex items-center">
            <div className="flex items-center gap-2 border-r border-[color:var(--hairline)] px-4">
              <Activity className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80">Feed ao vivo · eventos da plataforma</span>
            </div>
            <div className="min-w-0 flex-1">
              <Ticker items={tickerItems} speed={55} />
            </div>
          </div>
        </div>
      </section>

      {relatorioErro && (
        <p className="mt-3 rounded-lg border border-[color:color-mix(in_oklab,var(--danger)_35%,transparent)] bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-xs text-[color:var(--danger)]">
          {relatorioErro}
        </p>
      )}

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
              const stops = [
                { code: v.origem, label: v.origem, done: true },
                ...v.escalas.map((e) => ({ code: e.cidade, label: e.cidade, done: Boolean(e.horaReal) })),
              ];
              const done = stops.filter((s) => s.done).length;
              const progress = Math.max(6, Math.round((done / Math.max(stops.length, 1)) * 100));
              const tone =
                v.situacao === "atrasado" ? "danger" :
                v.situacao === "atencao" ? "warning" : "brand";
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
                    <ViagemStatusChip s={v.status as never} />
                    <ViagemSituacaoChip s={(v.situacao ?? "no_prazo") as never} />
                    <span className="ml-auto big-numeric text-xl text-foreground"><CountUp to={v.ocupacaoPct} suffix="%" /></span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {v.embarcacaoNome} · saida {v.saida} · {v.passageiros} passageiros · {v.volumes} volumes
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
                <p className="mt-0.5 text-xs text-muted-foreground">{alertasCriticos} critico(s) · acao imediata</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlertaFormOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] hover:bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)]"
            >
              <BellPlus className="h-3.5 w-3.5" />
              Cadastrar
            </button>
          </div>
          {alertaFormOpen ? (
            <div className="border-b border-[color:var(--hairline)] bg-[color:var(--surface-elev)]/55 px-5 py-4">
              <div className="grid gap-2">
                <input
                  value={novoAlerta.titulo}
                  onChange={(event) => setNovoAlerta((current) => ({ ...current, titulo: event.target.value }))}
                  placeholder="Titulo do alerta"
                  className="h-9 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--card)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color:var(--hairline-brand)]"
                />
                <textarea
                  value={novoAlerta.detalhe}
                  onChange={(event) => setNovoAlerta((current) => ({ ...current, detalhe: event.target.value }))}
                  placeholder="Detalhe operacional"
                  rows={3}
                  className="resize-none rounded-lg border border-[color:var(--hairline)] bg-[color:var(--card)] px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color:var(--hairline-brand)]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={novoAlerta.severidade}
                    onChange={(event) => setNovoAlerta((current) => ({ ...current, severidade: event.target.value as "info" | "warning" | "danger" }))}
                    className="h-9 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--card)] px-3 text-xs text-foreground outline-none focus:border-[color:var(--hairline-brand)]"
                  >
                    <option value="warning">Atencao</option>
                    <option value="danger">Critico</option>
                    <option value="info">Informativo</option>
                  </select>
                  <input
                    value={novoAlerta.modulo}
                    onChange={(event) => setNovoAlerta((current) => ({ ...current, modulo: event.target.value }))}
                    placeholder="Modulo"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--card)] px-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[color:var(--hairline-brand)]"
                  />
                  <PrimaryButton icon={BellPlus} onClick={salvarAlerta} disabled={alertaSaving}>
                    {alertaSaving ? "Salvando" : "Salvar"}
                  </PrimaryButton>
                </div>
                {alertaErro ? <p className="text-xs text-[color:var(--danger)]">{alertaErro}</p> : null}
              </div>
            </div>
          ) : alertaErro ? (
            <div className="border-b border-[color:var(--hairline)] px-5 py-2 text-xs text-[color:var(--danger)]">{alertaErro}</div>
          ) : null}
          <ul className="divide-y divide-[color:var(--hairline)]">
            {alertas.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.45, ease: easeOut }}
                className="group relative px-5 py-4"
              >
                <span className={`absolute bottom-3 left-0 top-3 w-[2px] rounded-r ${
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
                {a.apiId ? (
                  <button
                    type="button"
                    onClick={() => resolverAlerta(a.apiId!)}
                    className="mt-3 text-xs font-medium text-[color:var(--brand)] hover:underline"
                  >
                    Resolver alerta
                  </button>
                ) : null}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </section>

      <section className="mt-6">
        <SectionHeader
          eyebrow="Tesouraria"
          title="Caixas em tempo real"
          description="Porto, embarcacoes, agentes e caixas de apoio separados por tipo operacional."
          actions={
            <Link to="/app/financeiro" className="text-xs font-medium text-[color:var(--brand)] hover:underline">
              Ir para Financeiro →
            </Link>
          }
        />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {caixasPorTipo.map((grupo) => {
            const totalGrupo = grupo.itens.reduce((s, c) => s + c.saldo, 0);
            return (
              <div key={grupo.tipo} className="surface-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{grupo.tipo}</p>
                <p className="big-numeric mt-2 text-2xl text-foreground">R$ <CountUp to={totalGrupo} duration={1.2} /></p>
                <p className="mt-1 text-[11px] text-muted-foreground">{grupo.itens.length} caixa(s) neste tipo</p>
              </div>
            );
          })}
        </div>
        <div className="surface-card mt-4 grid grid-cols-2 gap-px overflow-hidden bg-[color:var(--hairline)] md:grid-cols-3 xl:grid-cols-4">
          {caixas.map((c, i) => (
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
                <LiveDot tone={c.status === "fechado" ? "warning" : "success"} />
              </div>
              <p className="mt-1 truncate text-xs text-foreground/85">{c.referencia}</p>
              <p className="big-numeric mt-3 text-2xl text-foreground">
                R$ <CountUp to={c.saldo} duration={1.6} />
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="text-[color:var(--success)]">+ {brl(c.entradasDia)}</span>
                <span className="text-[color:var(--danger)]">- {brl(c.saidasDia)}</span>
              </div>
              <div className="mt-2">
                <ShimmerBar pct={Math.min(100, (c.entradasDia / Math.max(c.entradasDia + c.saidasDia, 1)) * 100)} tone="success" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--brand)] to-transparent opacity-0 transition-opacity group-hover:opacity-80" />
            </motion.div>
          ))}
        </div>
      </section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[color:var(--hairline)] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        <span>Da margem · a entrega - Suite AJC</span>
        <span className="flex items-center gap-2">
          <LiveDot tone="success" /> {passageirosAtivos} passageiros embarcados agora
        </span>
      </motion.div>
    </AppShell>
  );
}

function mapApiEmbarcacao(e: EmbarcacaoApi) {
  return {
    id: e.id,
    nome: e.nome,
    tipo: e.tipo,
    status: e.status,
    capacidadeCarga: Number(e.capacidadeCarga ?? 0),
    capacidadePax: sumNumericValues(e.capacidadePax),
  };
}

function mapApiCaixa(c: CaixaApi): InicioCaixaView {
  return {
    id: c.id,
    tipo: normalizeCaixaTipo(c.tipo),
    referencia: c.referencia || c.operador_nome || "Caixa AJC",
    saldo: Number(c.saldo ?? 0),
    entradasDia: Number(c.entradas_dia ?? 0),
    saidasDia: Number(c.saidas_dia ?? 0),
    status: c.status,
  };
}

function mapApiAlerta(a: OperacaoAlertaApi): InicioAlertaView {
  return {
    id: `api-alerta-${a.id}`,
    apiId: a.id,
    origem: "api",
    titulo: a.titulo,
    detalhe: a.detalhe,
    severidade: a.severidade,
    quando: a.modulo || a.origem || "manual",
  };
}

function mapApiViagem(
  viagem: NavegacaoViagemApi,
  bilhetes: BilheteApi[],
  cargas: TmsCargaApi[],
  volumes: TmsVolumeApi[],
  embarcacoes: EmbarcacaoApi[],
): InicioViagemView {
  const bilhetesDaViagem = bilhetes.filter((b) => b.viagem_id === viagem.id && b.status !== "cancelado");
  const cargasDaViagem = cargas.filter((c) => c.viagem_id === viagem.id);
  const cargaIds = new Set(cargasDaViagem.map((c) => c.id));
  const volumesDaViagem = volumes.filter((v) => cargaIds.has(v.carga_id));
  const totalVolumes = volumesDaViagem.length || cargasDaViagem.reduce((s, c) => s + Number(c.total_volumes ?? 0), 0);
  const capacidadePax = sumNumericValues(viagem.capacidadePaxDisponivel);
  const embarcacao = embarcacoes.find((e) => e.id === viagem.embarcacaoId);
  const pesoKg = cargasDaViagem.reduce((s, c) => s + Number(c.peso_total ?? 0), 0);
  const capacidadeCargaKg = Number(embarcacao?.capacidadeCarga ?? 0) * 1000;
  const cargaPct = capacidadeCargaKg > 0
    ? Math.min(100, Math.round((pesoKg / capacidadeCargaKg) * 100))
    : Math.min(100, Math.round(totalVolumes * 5));

  return {
    id: viagem.id,
    codigo: viagem.codigo || "VIA",
    embarcacaoId: viagem.embarcacaoId,
    embarcacaoNome: viagem.embarcacaoNome,
    origem: viagem.origemSigla,
    destino: viagem.destinoSigla || "-",
    escalas: viagem.escalas.map((e) => ({
      cidade: e.cidadeSigla,
      horaPrevista: formatDateTime(e.dataHoraPrevista),
      horaReal: e.dataHoraReal ? formatDateTime(e.dataHoraReal) : null,
    })),
    saida: formatDateTime(viagem.dataHoraSaida),
    status: viagem.status,
    situacao: viagem.situacao || "no_prazo",
    ocupacaoPct: capacidadePax > 0 ? Math.min(100, Math.round((bilhetesDaViagem.length / capacidadePax) * 100)) : 0,
    cargaPct,
    volumes: totalVolumes,
    passageiros: bilhetesDaViagem.length,
  };
}

function buildAlertas(
  viagens: InicioViagemView[],
  volumes: TmsVolumeApi[],
  caixas: InicioCaixaView[],
  apiFalhou: boolean,
): InicioAlertaView[] {
  const alertas: InicioAlertaView[] = [];
  if (apiFalhou) {
    alertas.push({
      id: "api-falhou",
      titulo: "API indisponivel neste painel",
      detalhe: "O dashboard esta usando fallback visual ate a conexao voltar.",
      severidade: "warning",
      quando: "agora",
    });
  }
  viagens
    .filter((v) => v.situacao === "atrasado" || v.situacao === "atencao")
    .slice(0, 3)
    .forEach((v) => {
      alertas.push({
        id: `viagem-${v.id}`,
        titulo: `${v.codigo} ${v.situacao === "atrasado" ? "com atraso" : "em atencao"}`,
        detalhe: `${v.embarcacaoNome} no trecho ${v.origem} -> ${v.destino}.`,
        severidade: v.situacao === "atrasado" ? "danger" : "warning",
        quando: "operacao",
      });
    });
  const divergentes = volumes.filter((v) => ["divergente", "bloqueado", "avaria"].includes(String(v.status)));
  if (divergentes.length > 0) {
    alertas.push({
      id: "volumes-divergentes",
      titulo: `${divergentes.length} volume(s) com divergencia`,
      detalhe: "Conferencia apontou volume bloqueado, avariado ou divergente no TMS.",
      severidade: "danger",
      quando: "TMS",
    });
  }
  const caixasFechados = caixas.filter((c) => c.status === "fechado");
  if (caixasFechados.length > 0) {
    alertas.push({
      id: "caixas-fechados",
      titulo: `${caixasFechados.length} caixa(s) fechado(s)`,
      detalhe: "Ha caixas fora de operacao na tesouraria do dia.",
      severidade: "warning",
      quando: "caixa",
    });
  }
  return alertas.slice(0, 5);
}

function buildTicker(
  viagens: InicioViagemView[],
  caixas: InicioCaixaView[],
  volumes: TmsVolumeApi[],
  bilhetes: BilheteApi[],
) {
  const items = [
    ...viagens.slice(0, 3).map((v) => (
      <>{v.codigo} · {v.origem} → {v.destino} · <span className="text-foreground">{v.passageiros} pax</span></>
    )),
    ...caixas.slice(0, 2).map((c) => (
      <>+ {brl(c.entradasDia)} · {c.referencia}</>
    )),
  ];
  const divergentes = volumes.filter((v) => ["divergente", "bloqueado", "avaria"].includes(String(v.status))).length;
  if (divergentes > 0) items.push(<>{divergentes} volume(s) divergente(s) no TMS</>);
  if (bilhetes.length > 0) items.push(<>{bilhetes.length} bilhetes emitidos na base operacional</>);
  return items.length > 0 ? items : [<>Operacao sincronizada · aguardando eventos da plataforma</>];
}

function normalizeCaixaTipo(tipo: string) {
  const lower = tipo.toLowerCase();
  if (lower.includes("balsa") || lower.includes("embarc")) return "embarcacao";
  if (lower.includes("porto")) return "porto";
  if (lower.includes("agente")) return "agente";
  return lower || "apoio";
}

function sumNumericValues(input: Record<string, unknown> | null | undefined) {
  if (!input) return 0;
  return Object.values(input).reduce((total, value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
