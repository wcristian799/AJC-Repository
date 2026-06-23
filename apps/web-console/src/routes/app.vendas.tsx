import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ticket, Plus, QrCode, Globe, Monitor, Smartphone, Users, FileText, Gift, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, CounterBadge, Tag, brl,
} from "@/components/ops/primitives";
import { CountUp, ShimmerBar } from "@/components/ops/motion-bits";
import {
  PASSAGENS, VIAGENS, CANAIS_VENDA, OCUPACAO_CLASSE,
  CORTESIAS_EMITIDAS, CORTESIA_LIMITES, CORTESIA_LIMITE_PADRAO, CORTESIA_MOTIVOS, CORTESIA_CLASSES,
  tipoTarifaDaClasse, TIPO_TARIFA_LABEL,
  type CortesiaClasse, type CortesiaMotivoId, type TipoTarifa,
} from "@/mocks/data";

export const Route = createFileRoute("/app/vendas")({
  head: () => ({ meta: [{ title: "Vendas · AJC Suite" }] }),
  component: Vendas,
});

type Tab = "passagens" | "canais" | "ocupacao" | "cortesias" | "manifesto" | "regulatorio";

function limiteCortesia(viagemId: string): number {
  return CORTESIA_LIMITES.find((l) => l.viagemId === viagemId)?.limite ?? CORTESIA_LIMITE_PADRAO;
}

function Vendas() {
  const [tab, setTab] = useState<Tab>("passagens");
  const total = PASSAGENS.length;
  const validadas = PASSAGENS.filter((p) => p.status === "validado").length;
  const gratuidades = PASSAGENS.filter((p) => p.classe === "Gratuidade").length;
  const cortesias = PASSAGENS.filter((p) => p.classe === "Cortesia").length;
  const receita = PASSAGENS.reduce((s, p) => s + p.valor, 0);

  const receitaCanais = CANAIS_VENDA.reduce((s, c) => s + c.receita, 0);
  const bilhetesCanais = CANAIS_VENDA.reduce((s, c) => s + c.bilhetes, 0);

  const tabs: [Tab, string][] = [
    ["passagens", "Passagens"],
    ["canais", "Canais de venda"],
    ["ocupacao", "Ocupação por classe"],
    ["cortesias", "Gerador de cortesias"],
    ["manifesto", "Manifesto / passageiros"],
    ["regulatorio", "Relatório regulatório (MP)"],
  ];

  return (
    <AppShell crumb="Vendas">
      <SectionHeader
        eyebrow="Passagens & Encomendas"
        title="Vendas multi-canal"
        description="Portal online, app, PDV, totem e validação por QR. Cortesias e gratuidades com relatório regulatório."
        actions={
          <>
            <Link to="/pos"><GhostButton icon={Monitor}>Abrir PDV</GhostButton></Link>
            <Link to="/cliente"><GhostButton icon={Smartphone}>Compra pública</GhostButton></Link>
            <PrimaryButton icon={Plus}>Nova passagem</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Passagens emitidas (hoje)" value={String(total)} hint={`${validadas} já validadas`} delta={{ value: "+18", positive: true }} icon={Ticket} />
        <KPIStat index={1} label="Receita do dia" value={brl(receita)} hint="líquido de cortesias e gratuidades" delta={{ value: "+12%", positive: true }} />
        <KPIStat index={2} label="Gratuidades" value={String(gratuidades)} hint="idoso, PCD — controle MP" icon={QrCode} />
        <KPIStat index={3} label="Cortesias" value={String(cortesias)} hint="limite por viagem aplicado" />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "passagens" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar passageiro, QR, viagem…">
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Emitidas</FilterChip>
            <FilterChip>Validadas</FilterChip>
            <FilterChip>Canceladas</FilterChip>
          </FilterBar>
          <DataTable
            rows={PASSAGENS}
            columns={[
              { key: "qr", header: "QR", render: (r) => <span className="font-mono text-[11px]">{r.qr}</span> },
              { key: "passageiro", header: "Passageiro", render: (r) => (
                <div>
                  <p className="font-medium">{r.passageiro}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{r.documento}</p>
                </div>
              ) },
              { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo}</span> },
              { key: "classe", header: "Classe", render: (r) => <Tag tone={r.classe === "Gratuidade" || r.classe === "Cortesia" ? "warning" : "brand"}>{r.classe}</Tag> },
              { key: "canal", header: "Canal", render: (r) => <span className="text-xs">{r.canal}</span> },
              { key: "valor", header: "Valor", align: "right", render: (r) => r.valor ? <span className="font-mono">{brl(r.valor)}</span> : <span className="text-xs text-muted-foreground">isento</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "validado" ? "success" : r.status === "emitido" ? "info" : r.status === "usado" ? "neutral" : "offline";
                return <StatusChip tone={tone as never}>{r.status}</StatusChip>;
              } },
            ]}
          />
        </div>
      )}

      {tab === "canais" && (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="surface-card brand-rail brand-rail-left p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Receita · todos os canais</p>
              <p className="big-numeric mt-3 text-3xl text-foreground">R$ <CountUp to={receitaCanais} duration={1.6} /></p>
              <p className="mt-2 text-xs text-muted-foreground">{bilhetesCanais} bilhetes consolidados hoje</p>
            </div>
            <div className="surface-card p-5 xl:col-span-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[color:var(--brand)]" />
                <p className="text-sm font-medium">Participação por canal</p>
                <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Portal online é MVP</span>
              </div>
              <div className="mt-4 space-y-3">
                {CANAIS_VENDA.map((c) => {
                  const pct = Math.round((c.receita / Math.max(receitaCanais, 1)) * 100);
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{c.rotulo}</span>
                        <span className="font-mono text-muted-foreground">{brl(c.receita)} · {pct}%</span>
                      </div>
                      <div className="mt-1.5"><ShimmerBar pct={pct} tone={c.id === "portal" ? "brand" : "success"} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DataTable
            rows={CANAIS_VENDA}
            columns={[
              { key: "rotulo", header: "Canal", render: (r) => (
                <div>
                  <p className="font-medium">{r.rotulo}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{r.descricao}</p>
                </div>
              ) },
              { key: "online", header: "Pagamento online", render: (r) => <StatusChip tone={r.online ? "success" : "neutral"}>{r.online ? "Integrado" : "Manual"}</StatusChip> },
              { key: "bilhetes", header: "Bilhetes", align: "right", render: (r) => <span className="font-mono">{r.bilhetes}</span> },
              { key: "receita", header: "Receita", align: "right", render: (r) => <span className="font-mono">{brl(r.receita)}</span> },
            ]}
          />
        </div>
      )}

      {tab === "ocupacao" && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {OCUPACAO_CLASSE.map((o, i) => {
            const pct = Math.round((o.ocupados / o.capacidade) * 100);
            const tone = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "brand";
            return (
              <div key={o.classe} className="surface-card brand-rail brand-rail-left p-5">
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg text-foreground">{o.classe}</p>
                  <Tag tone={tone as never}>Pulseira {o.pulseira}</Tag>
                </div>
                <p className="big-numeric mt-4 text-3xl text-foreground">
                  <CountUp to={o.ocupados} duration={1.4} /><span className="text-foreground/30">/{o.capacidade}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{pct}% ocupado · {brl(o.preco)} / assento</p>
                <div className="mt-4"><ShimmerBar pct={pct} tone={tone as never} /></div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {o.capacidade - o.ocupados} vagas livres · sem overbooking entre canais
                </p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cortesias" && <CortesiasTab />}

      {tab === "manifesto" && <ManifestoTab />}

      {tab === "regulatorio" && (
        <div className="mt-5 surface-card brand-rail brand-rail-left p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Relatório regulatório · MP</h3>
            <div className="ml-auto flex items-center gap-2">
              <GhostButton icon={FileText}>Exportar PDF</GhostButton>
              <GhostButton icon={Users}>Exportar CSV</GhostButton>
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Listagem de gratuidades e cortesias para entrega ao Ministério Público (filtro por período, tipo e viagem). Exportável em PDF/CSV.
          </p>
          <div className="mt-5">
            <DataTable
              rows={PASSAGENS.filter((p) => p.classe === "Gratuidade" || p.classe === "Cortesia")}
              columns={[
                { key: "qr", header: "QR", render: (r) => <span className="font-mono text-[11px]">{r.qr}</span> },
                { key: "passageiro", header: "Beneficiário" },
                { key: "documento", header: "Documento", render: (r) => <span className="font-mono text-xs">{r.documento}</span> },
                { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo}</span> },
                { key: "classe", header: "Tipo", render: (r) => <Tag tone="warning">{r.classe}</Tag> },
                { key: "canal", header: "Canal" },
              ]}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ============ B.6 Gerador de cortesias ============ */

function CortesiasTab() {
  const viagensAtivas = VIAGENS.filter((v) => v.status !== "concluida" && v.status !== "cancelada");
  const [viagemId, setViagemId] = useState<string>(viagensAtivas[0]?.id ?? VIAGENS[0].id);
  const [classe, setClasse] = useState<CortesiaClasse>(CORTESIA_CLASSES[0]);
  const [motivoId, setMotivoId] = useState<CortesiaMotivoId>(CORTESIA_MOTIVOS[0].id);

  const viagem = VIAGENS.find((v) => v.id === viagemId);
  const limite = limiteCortesia(viagemId);
  const emitidasDaViagem = CORTESIAS_EMITIDAS.filter((c) => c.viagemId === viagemId);
  const emitidasCount = emitidasDaViagem.length;
  const noLimite = emitidasCount >= limite;
  const inputCls =
    "h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]";

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Form de geração */}
      <div className="surface-card p-6">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Gerar código de cortesia</h3>
          <Tag tone="warning">Influência / relacionamento</Tag>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada cortesia gera um código vinculado à viagem. O limite por viagem é configurável em Cadastros.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Viagem</span>
            <select className={`mt-1.5 ${inputCls}`} value={viagemId} onChange={(e) => setViagemId(e.target.value)}>
              {viagensAtivas.map((v) => (
                <option key={v.id} value={v.id}>{v.codigo} · {v.origem} → {v.destino}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Classe</span>
            <select className={`mt-1.5 ${inputCls}`} value={classe} onChange={(e) => setClasse(e.target.value as CortesiaClasse)}>
              {CORTESIA_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Motivo</span>
            <select className={`mt-1.5 ${inputCls}`} value={motivoId} onChange={(e) => setMotivoId(e.target.value as CortesiaMotivoId)}>
              {CORTESIA_MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <PrimaryButton icon={Plus} disabled={noLimite}>Gerar código</PrimaryButton>
          {noLimite ? (
            <StatusChip tone="danger">Limite da viagem atingido</StatusChip>
          ) : (
            <span className="text-xs text-muted-foreground">
              Restam <strong className="text-foreground">{limite - emitidasCount}</strong> cortesia(s) para esta viagem
            </span>
          )}
        </div>
      </div>

      {/* Contador grande */}
      <div className="surface-card flex flex-col gap-3 p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {viagem?.codigo} · cortesias emitidas
        </p>
        <CounterBadge current={emitidasCount} total={limite} label="Emitidas nesta viagem" />
        <p className={`text-center text-sm font-medium ${noLimite ? "text-[color:var(--danger)]" : "text-muted-foreground"}`}>
          {noLimite
            ? "Limite atingido — bloqueado até liberar em Cadastros."
            : `${emitidasCount} de ${limite} usadas nesta viagem`}
        </p>
      </div>

      {/* Lista de cortesias emitidas */}
      <div className="lg:col-span-2">
        <DataTable
          rows={emitidasDaViagem}
          empty="Nenhuma cortesia emitida para esta viagem"
          columns={[
            { key: "codigo", header: "Código", render: (r) => <span className="font-mono text-[11px]">{r.codigo}</span> },
            { key: "viagem", header: "Viagem", render: (r) => <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo}</span> },
            { key: "classe", header: "Classe", render: (r) => <Tag tone="warning">{r.classe}</Tag> },
            { key: "motivo", header: "Motivo", render: (r) => <span className="text-xs">{r.motivo}</span> },
            { key: "concedidoPor", header: "Concedido por", render: (r) => (
              <div>
                <p className="text-xs font-medium">{r.concedidoPor}</p>
                <p className="text-[10px] text-muted-foreground">{r.emitidaEm}</p>
              </div>
            ) },
            { key: "status", header: "Status", render: (r) => (
              <StatusChip tone={r.status === "usada" ? "success" : "neutral"}>
                {r.status === "usada" ? "Usada" : "Não usada"}
              </StatusChip>
            ) },
          ]}
        />
      </div>
    </div>
  );
}

/* ============ B.8 Manifesto de passageiros por viagem ============ */

function ManifestoTab() {
  const viagensComPassageiros = VIAGENS.filter((v) => PASSAGENS.some((p) => p.viagemId === v.id));
  const [viagemId, setViagemId] = useState<string>(viagensComPassageiros[0]?.id ?? VIAGENS[0].id);
  const viagem = VIAGENS.find((v) => v.id === viagemId);
  const inputCls =
    "h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]";

  const rows = useMemo(() => PASSAGENS.filter((p) => p.viagemId === viagemId), [viagemId]);

  const totaisClasse = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of rows) m.set(p.classe, (m.get(p.classe) ?? 0) + 1);
    return [...m.entries()];
  }, [rows]);

  const totaisTarifa = useMemo(() => {
    const m = new Map<TipoTarifa, number>();
    for (const p of rows) {
      const t = tipoTarifaDaClasse(p.classe);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return (["paga", "cortesia", "gratuidade", "contrato"] as TipoTarifa[])
      .filter((t) => m.has(t))
      .map((t) => [t, m.get(t) ?? 0] as const);
  }, [rows]);

  const embarcados = rows.filter((p) => p.status === "usado").length;
  const tarifaTone: Record<TipoTarifa, "brand" | "warning" | "neutral"> = {
    paga: "brand", cortesia: "warning", gratuidade: "warning", contrato: "neutral",
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="surface-card flex flex-wrap items-center gap-3 p-4">
        <ClipboardList className="h-4 w-4 text-[color:var(--brand)]" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Manifesto de passageiros</p>
          <p className="text-xs text-muted-foreground">Base de conferência de embarque · derivada das passagens da viagem.</p>
        </div>
        <select className={`ml-auto ${inputCls}`} value={viagemId} onChange={(e) => setViagemId(e.target.value)}>
          {viagensComPassageiros.map((v) => (
            <option key={v.id} value={v.id}>{v.codigo} · {v.origem} → {v.destino}</option>
          ))}
        </select>
        <GhostButton icon={FileText}>Exportar PDF</GhostButton>
        <GhostButton icon={Users}>Exportar CSV</GhostButton>
      </div>

      {/* Totais */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
        <div className="surface-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total por classe</p>
          <div className="mt-4 space-y-3">
            {totaisClasse.map(([cl, n]) => {
              const pct = Math.round((n / Math.max(rows.length, 1)) * 100);
              return (
                <div key={cl}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{cl}</span>
                    <span className="big-numeric text-base text-foreground"><CountUp to={n} duration={1.2} /></span>
                  </div>
                  <div className="mt-1.5"><ShimmerBar pct={pct} tone="brand" /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="surface-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total por tipo de tarifa</p>
          <div className="mt-4 space-y-3">
            {totaisTarifa.map(([t, n]) => {
              const pct = Math.round((n / Math.max(rows.length, 1)) * 100);
              const tone = t === "paga" ? "brand" : t === "contrato" ? "success" : "warning";
              return (
                <div key={t}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{TIPO_TARIFA_LABEL[t]}</span>
                    <span className="big-numeric text-base text-foreground"><CountUp to={n} duration={1.2} /></span>
                  </div>
                  <div className="mt-1.5"><ShimmerBar pct={pct} tone={tone} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="surface-card brand-rail brand-rail-left p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Embarcados</p>
          <p className="big-numeric mt-3 text-3xl text-foreground">
            <CountUp to={embarcados} duration={1.4} /><span className="text-foreground/30">/{rows.length}</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{viagem?.codigo} · status de embarque</p>
          <div className="mt-4"><ShimmerBar pct={Math.round((embarcados / Math.max(rows.length, 1)) * 100)} tone="success" /></div>
        </div>
      </div>

      <DataTable
        rows={rows}
        empty="Sem passageiros para esta viagem"
        columns={[
          { key: "passageiro", header: "Passageiro", render: (r) => (
            <div>
              <p className="font-medium">{r.passageiro}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{r.documento}</p>
            </div>
          ) },
          { key: "classe", header: "Classe", render: (r) => <Tag tone={tipoTarifaDaClasse(r.classe) === "paga" ? "brand" : "warning"}>{r.classe}</Tag> },
          { key: "assento", header: "Assento", render: (r) => r.assento ? <span className="font-mono text-xs">{r.assento}</span> : <span className="text-xs text-muted-foreground">—</span> },
          { key: "tarifa", header: "Tipo de tarifa", render: (r) => {
            const t = tipoTarifaDaClasse(r.classe);
            return <Tag tone={tarifaTone[t]}>{TIPO_TARIFA_LABEL[t]}</Tag>;
          } },
          { key: "embarque", header: "Embarque", render: (r) => (
            <StatusChip tone={r.status === "usado" ? "success" : "neutral"}>
              {r.status === "usado" ? "Embarcado" : "Não embarcado"}
            </StatusChip>
          ) },
        ]}
      />
    </div>
  );
}
