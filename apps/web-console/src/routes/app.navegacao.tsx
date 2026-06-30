import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ship, Plus, CalendarRange, Users, Send, AlertTriangle, Clock } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, StatusChip, ViagemStatusChip, ViagemSituacaoChip,
  DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
} from "@/components/ops/primitives";
import { ShimmerBar } from "@/components/ops/motion-bits";
import { EMBARCACOES, VIAGENS, COLABORADORES, ESCALAS } from "@/mocks/data";

export const Route = createFileRoute("/app/navegacao")({
  head: () => ({ meta: [{ title: "Navegação · AJC Suite" }] }),
  component: Navegacao,
});

type Tab = "operacao" | "viagens" | "capacidade" | "escalas" | "embarcacoes";

/** Lista oficial de embarcações (Lucas, 30/jun) — substitui os nomes-fantasia do mock antigo. */
const FROTA_LUCAS = [
  "F/B Amazonas II",
  "F/B Amazonas III",
  "F/B Amazonas IV",
  "F/B Amazonas V",
  "F/B Amazonas VI",
  "F/B Paru (cargas)",
] as const;

/** Classes por embarcação (matriz do Lucas). Capacidade numérica real ainda pendente. */
const CLASSES_POR_EMBARCACAO: Record<string, string[]> = {
  "F/B Amazonas II": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas III": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas IV": ["Rede", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas V": ["Rede", "Rede Sala VIP", "Camarote", "Suíte Comum", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Amazonas VI": ["Rede", "Suíte Comum", "Suíte Comum VIP", "Suíte Master", "Suíte Master VIP", "Mega Suíte"],
  "F/B Paru (cargas)": [],
};

/** Templates de cronograma/paradas do FAQ 2026 — alimentam o preenchimento automático das paradas. */
const ROTAS_FAQ: { id: string; rotulo: string; embarcacao: string; saida: string; paradas: string[] }[] = [
  {
    id: "bel-alm", rotulo: "Belém → Almeirim", embarcacao: "F/B Amazonas V",
    saida: "Terça · 17h/18h (validar)",
    paradas: ["Breves · qua 09h", "Gurupá · qua 20h", "Porto de Moz · qui 08h", "Almeirim · qui 14h (chegada)"],
  },
  {
    id: "bel-stm-qua", rotulo: "Belém → Santarém (quarta)", embarcacao: "F/B Amazonas VI",
    saida: "Quarta · 17h/18h (validar)",
    paradas: ["Breves · qui 09h", "Gurupá · qui 20h", "Almeirim · sex 09h", "Prainha · sex 17h", "Monte Alegre · sex 23h", "Santarém · sáb 10h/início tarde"],
  },
  {
    id: "bel-stm-sex", rotulo: "Belém → Santarém (sexta)", embarcacao: "F/B Amazonas IV",
    saida: "Sexta · 17h/18h (validar)",
    paradas: ["Breves · sáb 09h", "Gurupá · sáb 20h", "Almeirim · dom 09h", "Prainha · dom 17h", "Monte Alegre · dom 23h", "Santarém · seg 19h/início tarde"],
  },
  {
    id: "stm-bel-sab", rotulo: "Santarém → Belém (retorno sábado)", embarcacao: "F/B Amazonas VI",
    saida: "Sábado · 16h",
    paradas: ["Prainha · 00h (dia a validar)", "Almeirim · dom 08h", "Gurupá · dom 16h", "Breves · seg 02h", "Belém · seg 19h (chegada)"],
  },
];

function Navegacao() {
  const [tab, setTab] = useState<Tab>("operacao");
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  const [showCalendario, setShowCalendario] = useState(false);
  const [rotaSel, setRotaSel] = useState(ROTAS_FAQ[1].id);
  const rota = ROTAS_FAQ.find((r) => r.id === rotaSel) ?? ROTAS_FAQ[0];
  const embSel = rota.embarcacao;
  const classesEmb = CLASSES_POR_EMBARCACAO[embSel] ?? [];
  const ativas = EMBARCACOES.filter((e) => e.status === "ativa").length;
  const emCurso = VIAGENS.filter((v) => v.status === "em_curso");

  const tabs: [Tab, string][] = [
    ["operacao", "Painel operacional"],
    ["viagens", "Cronograma de viagens"],
    ["capacidade", "Capacidade & ocupação"],
    ["escalas", "Escala de colaboradores"],
    ["embarcacoes", "Embarcações"],
  ];

  return (
    <AppShell crumb="Navegação">
      <SectionHeader
        eyebrow="Navegação-core"
        title="Frota e cronograma"
        description="Embarcações, viagens e cumprimento do cronograma. Tudo é vinculado a uma viagem."
        actions={
          <>
            <GhostButton icon={CalendarRange} onClick={() => setShowCalendario((v) => !v)}>Calendário</GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setShowNovaViagem((v) => !v)}>Nova viagem</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Embarcações ativas" value={`${ativas}/${EMBARCACOES.length}`} hint="1 em manutenção · 2 alugadas" icon={Ship} />
        <KPIStat index={1} label="Viagens em curso" value={String(emCurso.length)} hint="2 com situação de atenção" />
        <KPIStat index={2} label="Passageiros embarcados (hoje)" value={String(emCurso.reduce((s, v) => s + v.passageiros, 0))} hint="todas as classes" delta={{ value: "+12%", positive: true }} />
        <KPIStat index={3} label="Volumes em trânsito" value={String(emCurso.reduce((s, v) => s + v.volumes, 0))} hint="rastreio QR ativo" delta={{ value: "+128", positive: true }} />
      </section>

      {(showNovaViagem || showCalendario) && (
        <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          {showNovaViagem && (
            <div className="surface-card brand-rail brand-rail-left p-5">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="font-display text-lg">Nova viagem · fluxo mockado</h3>
                <StatusChip tone="success">campos Lucas + FAQ 2026</StatusChip>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Número gerado pelo sistema, FerryBoat em lista, saída, e paradas com preenchimento automático a partir do DOC FAQ. Camarotes/classes condicionais à embarcação.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MockField label="Número da viagem (auto)" value="V-0422 · gerado pelo sistema" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">FerryBoat</p>
                  <select
                    value={embSel}
                    onChange={() => { /* mock: embarcação segue o template de rota */ }}
                    disabled
                    className="mt-1 w-full rounded-lg bg-[color:var(--muted)] px-3 py-2.5 text-sm text-foreground ring-1 ring-[color:var(--hairline)]"
                  >
                    {FROTA_LUCAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trecho / rota (DOC FAQ)</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ROTAS_FAQ.map((r) => (
                      <FilterChip key={r.id} active={r.id === rotaSel} onClick={() => setRotaSel(r.id)}>{r.rotulo}</FilterChip>
                    ))}
                  </div>
                </div>
                <MockField label="Data e hora da saída" value={rota.saida} />
                <MockField label="Embarcação do template" value={embSel} />
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Paradas (preenchidas automaticamente · DOC FAQ)</p>
                  <StatusChip tone="warning">horários do PDF a validar</StatusChip>
                </div>
                <ol className="mt-2 space-y-1.5">
                  {rota.paradas.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] px-3 py-2 text-sm ring-1 ring-[color:var(--hairline)]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--brand)]/15 text-[10px] font-semibold text-[color:var(--brand)]">{i + 1}</span>
                      <span className="text-foreground">{p}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MockField label="Passageiros disponíveis em rede" value="manual · ex. 180" />
                <MockField label="Camarotes disponíveis (por classe)" value="conforme embarcação selecionada" />
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Classes disponíveis · {embSel}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {classesEmb.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Embarcação só de carga — sem classes de passageiro.</span>
                  ) : (
                    classesEmb.map((c) => (
                      <span key={c} className="rounded-md bg-[color:var(--muted)] px-2.5 py-1 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">{c}</span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {showCalendario && (
            <div className="surface-card p-5">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="font-display text-lg">Calendário operacional</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Visualização acionável do cronograma longo enquanto a regra final de calendário é definida.</p>
              <div className="mt-4 space-y-2">
                {VIAGENS.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
                    <Clock className="h-4 w-4 text-[color:var(--brand)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.codigo} · {v.origem} → {v.destino}</p>
                      <p className="text-[11px] text-muted-foreground">Saída {v.saida} · retorno {v.retorno}</p>
                    </div>
                    <ViagemStatusChip s={v.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${
              tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "operacao" && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="surface-card overflow-hidden">
            <header className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Status × Situação · viagens em curso</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Status = ciclo. Situação = saúde do cronograma. Nunca colapsam no mesmo chip.</p>
            </header>
            <ul className="divide-y divide-[color:var(--hairline)]">
              {emCurso.map((v) => {
                const emb = EMBARCACOES.find((e) => e.id === v.embarcacaoId);
                return (
                  <li key={v.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm">
                          <span className="font-mono text-muted-foreground">{v.codigo}</span>{" "}
                          <span className="font-display text-foreground">{v.origem} → {v.destino}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{emb?.nome}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Saída {v.saida} · Retorno {v.retorno}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ViagemStatusChip s={v.status} />
                        <ViagemSituacaoChip s={v.situacao} />
                      </div>
                    </div>
                    {/* Escalas */}
                    <ol className="mt-3 flex flex-wrap gap-2">
                      {v.escalas.map((e, i) => (
                        <li key={i} className={`rounded-md px-2.5 py-1.5 text-[11px] ring-1 ${
                          e.horaReal
                            ? "bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)]"
                            : "bg-[color:var(--muted)] text-muted-foreground ring-[color:var(--hairline)]"
                        }`}>
                          <span className="font-semibold">{e.cidade}</span>
                          <span className="ml-1 font-mono">{e.horaReal ?? e.horaPrevista}</span>
                          {!e.horaReal && <span className="ml-1 text-[10px] opacity-70">previsto</span>}
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="surface-card overflow-hidden">
            <header className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="font-display text-lg text-foreground">Frota agora</h3>
            </header>
            <ul className="divide-y divide-[color:var(--hairline)]">
              {EMBARCACOES.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{e.tipo.replace("_", " + ")} · {e.ultimaViagem}</p>
                  </div>
                  <StatusChip tone={e.status === "ativa" ? "success" : e.status === "manutencao" ? "warning" : "offline"}>
                    {e.status === "ativa" ? "Ativa" : e.status === "manutencao" ? "Manutenção" : "Alugada"}
                  </StatusChip>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "viagens" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar por código, embarcação, trecho…" right={<PrimaryButton icon={Plus}>Nova viagem</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Em curso</FilterChip>
            <FilterChip>Planejadas</FilterChip>
            <FilterChip>Concluídas</FilterChip>
          </FilterBar>
          <DataTable
            rows={VIAGENS}
            columns={[
              { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span> },
              { key: "trecho", header: "Trecho", render: (r) => <span className="font-display text-sm">{r.origem} → {r.destino}</span> },
              { key: "embarcacao", header: "Embarcação", render: (r) => EMBARCACOES.find((e) => e.id === r.embarcacaoId)?.nome ?? "—" },
              { key: "saida", header: "Saída", render: (r) => <span className="font-mono text-xs">{r.saida}</span> },
              { key: "retorno", header: "Retorno", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.retorno}</span> },
              { key: "status", header: "Status", render: (r) => <ViagemStatusChip s={r.status} /> },
              { key: "situacao", header: "Situação", render: (r) => r.situacao ? <ViagemSituacaoChip s={r.situacao} /> : <span className="text-xs text-muted-foreground">—</span> },
              { key: "ocupacao", header: "Ocupação", align: "right", render: (r) => <span className="font-mono">{r.ocupacaoPct}%</span> },
              { key: "carga", header: "Carga", align: "right", render: (r) => <span className="font-mono">{r.cargaPct}%</span> },
            ]}
          />
        </div>
      )}

      {tab === "capacidade" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {EMBARCACOES.filter((e) => e.tipo === "passeio_carga").map((e) => {
            const viagem = VIAGENS.find((v) => v.embarcacaoId === e.id && v.status === "em_curso");
            const classes = [
              { label: "Rede", cap: e.capRede, tone: "brand" as const },
              { label: "Rede VIP", cap: e.capVip, tone: "warning" as const },
              { label: "Camarote", cap: e.capCamarote, tone: "success" as const },
            ];
            const ocup = viagem?.ocupacaoPct ?? 0;
            return (
              <div key={e.id} className="surface-card brand-rail brand-rail-left p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-foreground">{e.nome}</p>
                  <StatusChip tone={e.status === "ativa" ? "success" : e.status === "manutencao" ? "warning" : "offline"}>
                    {e.status === "ativa" ? "Ativa" : e.status === "manutencao" ? "Manutenção" : "Alugada"}
                  </StatusChip>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {viagem ? `${viagem.codigo} · ${viagem.origem} → ${viagem.destino}` : "Sem viagem em curso"}
                </p>
                <div className="mt-4 space-y-3">
                  {classes.map((c) => {
                    const pct = c.cap ? Math.min(100, Math.round((ocup / 100) * 100)) : 0;
                    const ocupados = Math.round((c.cap * ocup) / 100);
                    return (
                      <div key={c.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground/85">{c.label}</span>
                          <span className="font-mono text-muted-foreground">{ocupados}/{c.cap}</span>
                        </div>
                        <div className="mt-1.5"><ShimmerBar pct={viagem ? pct : 0} tone={c.tone} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[color:var(--hairline)] pt-3 text-xs">
                  <span className="text-muted-foreground">Carga</span>
                  <span className="font-mono text-foreground/85">{e.capCargaTon} t · {viagem?.cargaPct ?? 0}% usado</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "escalas" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card brand-rail brand-rail-left flex flex-wrap items-start gap-3 p-4" style={{ background: "color-mix(in oklab, var(--danger) 7%, var(--card))" }}>
            <AlertTriangle className="mt-0.5 h-5 w-5 text-[color:var(--danger)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Regra de conflito de escala</p>
              <p className="mt-1 text-xs text-muted-foreground">Bloquear o mesmo colaborador no mesmo dia, horário ou período em duas embarcações/viagens diferentes.</p>
              <p className="mt-2 font-mono text-[11px] text-[color:var(--danger)]">Exemplo: João Nonato · 25/06 18:00-22:00 · V-0418 e V-0420</p>
            </div>
            <StatusChip tone="danger" pulse>bloqueante</StatusChip>
          </div>
          <FilterBar searchPlaceholder="Buscar colaborador, viagem, função…" right={<PrimaryButton icon={Send}>Notificar via WhatsApp</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Confirmadas</FilterChip>
            <FilterChip>Pendentes</FilterChip>
            <FilterChip>Conflitos</FilterChip>
          </FilterBar>
          <DataTable
            rows={ESCALAS}
            columns={[
              { key: "colaborador", header: "Colaborador", render: (r) => {
                const col = COLABORADORES.find((c) => c.id === r.colaboradorId);
                return (
                  <div>
                    <p className="font-medium">{col?.nome ?? "—"}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{col?.whatsapp}</p>
                  </div>
                );
              } },
              { key: "funcao", header: "Função", render: (r) => <span className="text-xs">{r.funcao}</span> },
              { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo ?? "—"}</span> },
              { key: "notificadoEm", header: "Notificado em", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.notificadoEm}</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "confirmado" ? "success" : r.status === "notificado" ? "info" : r.status === "conflito" ? "danger" : "warning";
                return <StatusChip tone={tone as never} pulse={r.status === "conflito"}>{r.status}</StatusChip>;
              } },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Escala notifica o colaborador via WhatsApp. Conflito (mesmo colaborador em duas viagens) bloqueia até resolução.
          </p>
        </div>
      )}

      {tab === "embarcacoes" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar embarcação…" right={<PrimaryButton icon={Plus}>Nova embarcação</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Ativas</FilterChip>
            <FilterChip>Manutenção</FilterChip>
            <FilterChip>Alugadas</FilterChip>
          </FilterBar>
          <DataTable
            rows={EMBARCACOES}
            columns={[
              { key: "nome", header: "Embarcação", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "tipo", header: "Tipo", render: (r) => <span className="text-xs">{r.tipo === "carga" ? "Só carga" : "Passeio + carga"}</span> },
              { key: "capRede", header: "Rede", align: "right", render: (r) => r.capRede || "—" },
              { key: "capVip", header: "VIP", align: "right", render: (r) => r.capVip || "—" },
              { key: "capCamarote", header: "Camarote", align: "right", render: (r) => r.capCamarote || "—" },
              { key: "capCargaTon", header: "Carga (t)", align: "right" },
              { key: "status", header: "Status", render: (r) => (
                <StatusChip tone={r.status === "ativa" ? "success" : r.status === "manutencao" ? "warning" : "offline"}>
                  {r.status === "ativa" ? "Ativa" : r.status === "manutencao" ? "Manutenção" : "Alugada"}
                </StatusChip>
              ) },
              { key: "ultimaViagem", header: "Última viagem", render: (r) => <span className="font-mono text-xs">{r.ultimaViagem}</span> },
            ]}
          />
        </div>
      )}
    </AppShell>
  );
}

function MockField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex min-h-10 items-center rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
        {value}
      </div>
    </div>
  );
}
