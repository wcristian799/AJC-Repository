import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Ship, Boxes, TrendingUp, ArrowRight, Activity, Anchor, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  ViagemStatusChip,
  ViagemSituacaoChip,
  PrimaryButton,
  GhostButton,
  brl,
} from "@/components/ops/primitives";
import {
  CountUp,
  LiveDot,
  Ticker,
  ShimmerBar,
  RadarSweep,
  VoyageTrack,
} from "@/components/ops/motion-bits";
import { AlertCenter, type DerivedOperationalAlert } from "@/components/ops/inicio/AlertCenter";
import { CashOverview } from "@/components/ops/inicio/CashOverview";
import {
  getStoredAuth,
  getOperacaoRelatorioDia,
  listBilhetes,
  listCaixas,
  listEmbarcacoes,
  listNavegacaoViagens,
  listOperacaoAlertas,
  listTmsCargas,
  listTmsVolumes,
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
    meta: [
      { title: "Inicio · AJC Suite" },
      {
        name: "description",
        content: "Centro de operacoes AJC: viagens em curso, alertas e caixas em tempo real.",
      },
    ],
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

function Inicio() {
  const [apiViagens, setApiViagens] = useState<NavegacaoViagemApi[]>([]);
  const [apiEmbarcacoes, setApiEmbarcacoes] = useState<EmbarcacaoApi[]>([]);
  const [apiCaixas, setApiCaixas] = useState<CaixaApi[]>([]);
  const [apiCargas, setApiCargas] = useState<TmsCargaApi[]>([]);
  const [apiVolumes, setApiVolumes] = useState<TmsVolumeApi[]>([]);
  const [apiBilhetes, setApiBilhetes] = useState<BilheteApi[]>([]);
  const [apiAlertas, setApiAlertas] = useState<OperacaoAlertaApi[]>([]);
  const [apiFalhas, setApiFalhas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [relatorioSaving, setRelatorioSaving] = useState(false);
  const [relatorioErro, setRelatorioErro] = useState<string | null>(null);
  const loadSequence = useRef(0);

  const loadDashboard = useCallback(async (silent = false) => {
    const sequence = ++loadSequence.current;
    if (silent) setRefreshing(true);
    else setLoading(true);

    const results = await Promise.allSettled([
      listNavegacaoViagens(),
      listEmbarcacoes(),
      listCaixas(),
      listTmsCargas(),
      listTmsVolumes(),
      listBilhetes(),
      listOperacaoAlertas({ status: "aberto" }),
      listOperacaoAlertas({ status: "resolvido" }),
    ]);

    if (sequence !== loadSequence.current) return;
    const failures: string[] = [];
    const names = [
      "viagens",
      "embarcações",
      "caixas",
      "cargas",
      "volumes",
      "bilhetes",
      "alertas abertos",
      "histórico de alertas",
    ];
    results.forEach((result, index) => {
      if (result.status === "rejected") failures.push(names[index]);
    });

    if (results[0].status === "fulfilled") setApiViagens(results[0].value);
    if (results[1].status === "fulfilled") setApiEmbarcacoes(results[1].value);
    if (results[2].status === "fulfilled") setApiCaixas(results[2].value);
    if (results[3].status === "fulfilled") setApiCargas(results[3].value);
    if (results[4].status === "fulfilled") setApiVolumes(results[4].value);
    if (results[5].status === "fulfilled") setApiBilhetes(results[5].value);
    if (results[6].status === "fulfilled" || results[7].status === "fulfilled") {
      const open = results[6].status === "fulfilled" ? results[6].value : [];
      const resolved = results[7].status === "fulfilled" ? results[7].value : [];
      setApiAlertas([...open, ...resolved]);
    }
    setApiFalhas(failures);
    setUpdatedAt(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(true), 30_000);
    return () => {
      window.clearInterval(interval);
      loadSequence.current += 1;
    };
  }, [loadDashboard]);

  const embarcacoes = useMemo(() => apiEmbarcacoes.map(mapApiEmbarcacao), [apiEmbarcacoes]);

  const viagens = useMemo(
    () =>
      apiViagens.map((viagem) =>
        mapApiViagem(viagem, apiBilhetes, apiCargas, apiVolumes, apiEmbarcacoes),
      ),
    [apiBilhetes, apiCargas, apiEmbarcacoes, apiViagens, apiVolumes],
  );

  const caixas = useMemo(() => apiCaixas.map(mapApiCaixa), [apiCaixas]);

  const emCurso = useMemo(() => viagens.filter((v) => v.status === "em_curso"), [viagens]);
  const viagensAcompanhamento = useMemo(() => {
    if (emCurso.length > 0) return emCurso.slice(0, 3);
    return viagens.filter((v) => v.status === "planejada").slice(0, 3);
  }, [emCurso, viagens]);
  const alertasDerivados = useMemo(
    () => buildAlertas(viagens, apiVolumes, apiFalhas),
    [apiFalhas, apiVolumes, viagens],
  );

  const ativos = embarcacoes.filter((e) => e.status === "ativa" || e.status === "ativo").length;
  const saldoCaixas = caixas.reduce((s, c) => s + c.saldo, 0);
  const passageirosAtivos = emCurso.reduce((s, v) => s + v.passageiros, 0);
  const volumesTransito = emCurso.reduce((s, v) => s + v.volumes, 0);
  const alertasCriticos =
    apiAlertas.filter((a) => a.status === "aberto" && a.severidade === "danger").length +
    alertasDerivados.filter((a) => a.severidade === "danger").length;
  const usuarioNome = getStoredAuth()?.user.nome?.split(" ")[0] || "usuário";
  const caixasAbertos = caixas.filter((caixa) => caixa.status === "aberto").length;

  const tickerItems = buildTicker(emCurso, caixas, apiVolumes, apiBilhetes);

  async function baixarRelatorioDia() {
    setRelatorioSaving(true);
    setRelatorioErro(null);
    try {
      const data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
        new Date(),
      );
      const relatorio = await getOperacaoRelatorioDia({ data });
      downloadJson(`ajc-relatorio-operacional-${relatorio.data}.json`, relatorio);
    } catch (error) {
      setRelatorioErro(
        error instanceof Error ? error.message : "Nao foi possivel gerar o relatorio do dia.",
      );
    } finally {
      setRelatorioSaving(false);
    }
  }

  return (
    <AppShell crumb="Inicio">
      <section className="surface-card filet-crimson relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--champagne), transparent)" }}
        />
        <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[1.4fr_auto]">
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="flex items-center gap-2"
            >
              <span className="champagne-eyebrow inline-flex items-center gap-2">
                <LiveDot tone={apiFalhas.length > 0 ? "warning" : "success"} />{" "}
                {apiFalhas.length > 0 ? "Dados parciais" : "Atualização operacional"}
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
                {updatedAt ? `Atualizado ${formatUpdatedAt(updatedAt)}` : "Carregando dados"}
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
              <span className="text-foreground/70">
                {apiFalhas.length > 0
                  ? "Há dados que precisam ser atualizados."
                  : emCurso.length > 0
                    ? "A operação está em movimento."
                    : "A próxima saída está no radar."}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.6, ease: easeOut }}
              className="mt-3 max-w-xl text-sm text-muted-foreground"
            >
              {loading
                ? "Conectando às bases operacionais…"
                : apiFalhas.length > 0
                  ? `${apiFalhas.length} fonte(s) indisponível(is): ${apiFalhas.join(", ")}. Os demais dados permanecem válidos.`
                  : `${countLabel(emCurso.length, "viagem em curso", "viagens em curso")} · ${countLabel(alertasCriticos, "alerta crítico", "alertas críticos")} · ${countLabel(caixasAbertos, "caixa aberto", "caixas abertos")}.`}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5, ease: easeOut }}
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              <PrimaryButton icon={Ship} onClick={() => window.location.assign("/app/navegacao")}>
                Nova viagem
              </PrimaryButton>
              <GhostButton icon={ArrowRight} onClick={baixarRelatorioDia}>
                {relatorioSaving ? "Gerando…" : "Relatório do dia"}
              </GhostButton>
              <GhostButton icon={RefreshCw} onClick={() => void loadDashboard(true)}>
                {refreshing ? "Atualizando…" : "Atualizar dados"}
              </GhostButton>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                {
                  label: "Viagens",
                  value: emCurso.length,
                  hint: "em curso agora",
                  icon: Ship,
                  currency: false,
                },
                {
                  label: "Volumes",
                  value: volumesTransito,
                  hint: "nas viagens em curso",
                  icon: Boxes,
                  currency: false,
                },
                {
                  label: "Caixas",
                  value: saldoCaixas,
                  hint: countLabel(caixasAbertos, "aberto", "abertos"),
                  icon: TrendingUp,
                  currency: true,
                },
                {
                  label: "Frota",
                  value: ativos,
                  hint: `${ativos}/${embarcacoes.length} ${embarcacoes.length === 1 ? "ativa" : "ativas"}`,
                  icon: Anchor,
                  currency: false,
                },
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
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {k.label}
                      </p>
                      <p className="big-numeric mt-2 text-2xl text-foreground md:text-[1.7rem]">
                        {k.currency ? (
                          <>
                            R$ <CountUp to={k.value} duration={1.6} />
                          </>
                        ) : (
                          <CountUp to={k.value} duration={1.4} />
                        )}
                      </p>
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)]">
                      <k.icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">{k.hint}</p>
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
                  tone:
                    v.situacao === "atrasado"
                      ? "danger"
                      : v.situacao === "atencao"
                        ? "warning"
                        : "brand",
                }))}
              />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--brand)]">
                    Frota AJC
                  </p>
                  <p className="big-numeric mt-1 text-3xl text-foreground">
                    <CountUp to={emCurso.length} />/{embarcacoes.length}
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    em rota
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative border-t border-[color:var(--hairline)] bg-[color:var(--surface-elev)]/60 py-2.5">
          <div className="flex items-center">
            <div className="flex items-center gap-2 border-r border-[color:var(--hairline)] px-4">
              <Activity className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/80">
                Eventos da plataforma
              </span>
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

      <section className="mt-6 grid items-start gap-5 xl:grid-cols-[1.6fr_1fr]">
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
                <h2 className="font-display text-lg text-foreground">Viagens em acompanhamento</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {emCurso.length > 0
                    ? "Embarcações navegando agora, conforme o apontamento das escalas."
                    : "Nenhuma viagem em curso; exibindo as próximas saídas planejadas."}
                </p>
              </div>
            </div>
            <Link
              to="/app/navegacao"
              className="text-xs font-medium text-[color:var(--brand)] hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          <ul className="divide-y divide-[color:var(--hairline)]">
            {viagensAcompanhamento.length === 0 ? (
              <li className="px-5 py-12 text-center">
                <Ship className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Nenhuma viagem em acompanhamento
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre ou planeje uma viagem para acompanhar sua operação aqui.
                </p>
              </li>
            ) : (
              viagensAcompanhamento.map((v, i) => {
                const stops = [
                  { code: v.origem, label: v.origem, done: v.status === "em_curso" },
                  ...v.escalas.map((e) => ({
                    code: e.cidade,
                    label: e.cidade,
                    done: Boolean(e.horaReal),
                  })),
                ];
                const done = stops.filter((s) => s.done).length;
                const progress = Math.round((done / Math.max(stops.length, 1)) * 100);
                const tone =
                  v.situacao === "atrasado"
                    ? "danger"
                    : v.situacao === "atencao"
                      ? "warning"
                      : "brand";
                return (
                  <motion.li
                    key={v.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: easeOut }}
                    className="px-5 py-5 transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_4%,transparent)]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {v.codigo}
                      </span>
                      <span className="font-display text-base text-foreground">
                        {v.origem} → {v.destino}
                      </span>
                      <ViagemStatusChip s={v.status as never} />
                      <ViagemSituacaoChip s={(v.situacao ?? "no_prazo") as never} />
                      <span className="ml-auto big-numeric text-xl text-foreground">
                        <CountUp to={v.ocupacaoPct} suffix="%" />
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.embarcacaoNome} · saida {v.saida} · {v.passageiros} passageiros ·{" "}
                      {v.volumes} volumes
                    </p>
                    <div className="mt-2">
                      <VoyageTrack stops={stops} progressPct={progress} />
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        Carga
                      </span>
                      <div className="flex-1">
                        <ShimmerBar pct={v.cargaPct} tone={tone} />
                      </div>
                      <span className="font-mono text-[10px] text-foreground/80">
                        {v.cargaPct}%
                      </span>
                    </div>
                  </motion.li>
                );
              })
            )}
          </ul>
        </motion.div>

        <AlertCenter
          alerts={apiAlertas}
          derivedAlerts={alertasDerivados}
          onAlertsChange={setApiAlertas}
        />
      </section>

      <CashOverview caixas={apiCaixas} loading={loading} />

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

function mapApiViagem(
  viagem: NavegacaoViagemApi,
  bilhetes: BilheteApi[],
  cargas: TmsCargaApi[],
  volumes: TmsVolumeApi[],
  embarcacoes: EmbarcacaoApi[],
): InicioViagemView {
  const bilhetesDaViagem = bilhetes.filter(
    (b) => b.viagem_id === viagem.id && b.status !== "cancelado",
  );
  const cargasDaViagem = cargas.filter((c) => c.viagem_id === viagem.id);
  const cargaIds = new Set(cargasDaViagem.map((c) => c.id));
  const volumesDaViagem = volumes.filter((v) => cargaIds.has(v.carga_id));
  const totalVolumes =
    volumesDaViagem.length || cargasDaViagem.reduce((s, c) => s + Number(c.total_volumes ?? 0), 0);
  const capacidadePax = sumNumericValues(viagem.capacidadePaxDisponivel);
  const embarcacao = embarcacoes.find((e) => e.id === viagem.embarcacaoId);
  const pesoKg = cargasDaViagem.reduce((s, c) => s + Number(c.peso_total ?? 0), 0);
  const capacidadeCargaKg = Number(embarcacao?.capacidadeCarga ?? 0) * 1000;
  const cargaPct =
    capacidadeCargaKg > 0
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
    ocupacaoPct:
      capacidadePax > 0
        ? Math.min(100, Math.round((bilhetesDaViagem.length / capacidadePax) * 100))
        : 0,
    cargaPct,
    volumes: totalVolumes,
    passageiros: bilhetesDaViagem.length,
  };
}

function buildAlertas(
  viagens: InicioViagemView[],
  volumes: TmsVolumeApi[],
  apiFalhas: string[],
): DerivedOperationalAlert[] {
  const alertas: DerivedOperationalAlert[] = [];
  if (apiFalhas.length > 0) {
    alertas.push({
      id: "api-falhou",
      titulo: "Painel com dados parciais",
      detalhe: `Não foi possível atualizar: ${apiFalhas.join(", ")}. Os dados das demais fontes continuam visíveis com o horário da última consulta.`,
      severidade: "warning",
      modulo: "Sistema",
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
        modulo: "Navegação",
        href: "/app/navegacao",
      });
    });
  const divergentes = volumes.filter((v) =>
    ["divergente", "bloqueado", "avaria"].includes(String(v.status)),
  );
  if (divergentes.length > 0) {
    alertas.push({
      id: "volumes-divergentes",
      titulo: `${divergentes.length} volume(s) com divergencia`,
      detalhe: "Conferencia apontou volume bloqueado, avariado ou divergente no TMS.",
      severidade: "danger",
      modulo: "TMS",
      href: "/app/tms",
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
      <>
        {v.codigo} · {v.origem} → {v.destino} ·{" "}
        <span className="text-foreground">{v.passageiros} pax</span>
      </>
    )),
    ...caixas.slice(0, 2).map((c) => (
      <>
        + {brl(c.entradasDia)} · {c.referencia}
      </>
    )),
  ];
  const divergentes = volumes.filter((v) =>
    ["divergente", "bloqueado", "avaria"].includes(String(v.status)),
  ).length;
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

function formatUpdatedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
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
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
