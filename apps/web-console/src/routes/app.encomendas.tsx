import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, PackagePlus, FileSignature, Calculator, Ship, Route as RouteIcon,
  PackageCheck, AlertTriangle, History,
} from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import { SectionHeader, KPIStat, PrimaryButton, GhostButton, brl } from "@/components/ops/primitives";
import { DespachoTab } from "@/components/ops/encomendas/DespachoTab";
import { DeclaracaoTab } from "@/components/ops/encomendas/DeclaracaoTab";
import { CotacaoTab } from "@/components/ops/encomendas/CotacaoTab";
import { ControleViagemTab } from "@/components/ops/encomendas/ControleViagemTab";
import { RastreamentoTab } from "@/components/ops/encomendas/RastreamentoTab";
import { buildPrecoEncomendaTabela } from "@/components/ops/encomendas/pricing";
import type { ClienteEncomendaUi, DeclaracaoConteudoUi, EncomendaUi, PrecoEncomendaTabela, ViagemEncomendaUi } from "@/components/ops/encomendas/types";
import {
  listClientes,
  listEncomendaDeclaracoes,
  listEncomendas,
  getConfigValue,
  listNavegacaoViagens,
  listPrecos,
  type NavegacaoViagemApi,
  type TmsCargaApi,
  type EncomendaDeclaracaoApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas · AJC Suite" }] }),
  component: Encomendas,
});

type Tab = "despacho" | "dc" | "cotacao" | "controle" | "rastreio";

type TabDef = { id: Tab; label: string; spec: string; icon: React.ComponentType<{ className?: string }> };

const TABS: TabDef[] = [
  { id: "despacho",  label: "Despacho",               spec: "B.1", icon: PackagePlus },
  { id: "dc",        label: "Declaração de conteúdo",  spec: "B.2", icon: FileSignature },
  { id: "cotacao",   label: "Cotação",                 spec: "B.3", icon: Calculator },
  { id: "controle",  label: "Controle por viagem",     spec: "B.4", icon: Ship },
  { id: "rastreio",  label: "Rastreamento",            spec: "B.5", icon: RouteIcon },
];

function Encomendas() {
  const [tab, setTab] = useState<Tab>("despacho");
  const [encomendasApi, setEncomendasApi] = useState<EncomendaUi[]>([]);
  const [viagensApi, setViagensApi] = useState<ViagemEncomendaUi[]>([]);
  const [clientesApi, setClientesApi] = useState<ClienteEncomendaUi[]>([]);
  const [declaracoesApi, setDeclaracoesApi] = useState<EncomendaDeclaracaoApi[]>([]);
  const [precosEncomenda, setPrecosEncomenda] = useState<PrecoEncomendaTabela[]>([]);
  const [limiteFixoEncomenda, setLimiteFixoEncomenda] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      listEncomendas(),
      listEncomendaDeclaracoes(),
      listNavegacaoViagens(),
      listClientes(),
      listPrecos({ tipo: "encomenda" }),
      getConfigValue("tamanhos_encomenda"),
    ])
      .then(([encomendas, declaracoes, viagens, clientes, precos, configTamanhos]) => {
        if (!alive) return;
        const limiteFixo = parseLimiteFixoEncomenda(configTamanhos.valor);
        setViagensApi(viagens.map(mapViagem));
        setEncomendasApi(encomendas.map((item) => mapEncomenda(item, viagens, limiteFixo)));
        setDeclaracoesApi(declaracoes);
        setPrecosEncomenda(buildPrecoEncomendaTabela(precos));
        setLimiteFixoEncomenda(limiteFixo);
        setClientesApi(clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          documento: c.cpfCnpj ?? "",
          cidade: c.cidadeSigla ?? "BEL",
        })));
      })
      .catch(() => {
        if (!alive) return;
        setEncomendasApi([]);
        setDeclaracoesApi([]);
        setViagensApi([]);
        setClientesApi([]);
        setPrecosEncomenda([]);
        setLimiteFixoEncomenda(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const encomendas = useMemo<EncomendaUi[]>(() => (
    encomendasApi
  ), [encomendasApi]);
  const declaracoes = useMemo<DeclaracaoConteudoUi[]>(() => (
    declaracoesApi.map((d) => ({
      id: d.id,
      encomendaId: d.carga_id,
      descricao: d.descricao_informada ?? "-",
      valorDeclarado: d.valor_declarado ?? d.carga_valor_declarado ?? 0,
      textoTermoVersao: d.config_termo_versao_id ?? "DC-TERMO-v1",
      assinaturaOk: Boolean(d.assinatura_hash && d.aceite_em),
      aceiteEm: d.aceite_em ?? "",
      dispositivo: d.dispositivo ?? "API AJC",
    }))
  ), [declaracoesApi]);

  const total = encomendas.length;
  const cobradoTotal = encomendas.reduce((s, e) => s + e.valorCobrado, 0);
  const entregues = encomendas.filter((e) => e.status === "entregue").length;
  const dcPendentes = encomendas.filter((e) => {
    const dc = declaracoes.find((d) => d.id === e.dcId);
    return !dc || !dc.assinaturaOk;
  }).length;

  return (
    <AppShell crumb="Encomendas">
      <SectionHeader
        eyebrow="PDV · balcão · prova legal"
        title="Encomendas · despacho, DC e rastreio"
        description="Precificação por tamanho/valor e Declaração de Conteúdo com cláusula de exclusão de responsabilidade. Conecta Vendas (PDV) e TMS (etiqueta, conferência, entrega)."
        actions={
          <>
            <GhostButton icon={Calculator} onClick={() => setTab("cotacao")}>Cotar</GhostButton>
            <PrimaryButton icon={PackagePlus} onClick={() => setTab("despacho")}>Novo despacho</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Encomendas em rastreio" value={String(total)} hint="todas com etiqueta TMS" icon={Package} />
        <KPIStat index={1} label="Frete cobrado" value={brl(cobradoTotal)} hint="lançado no caixa de encomendas" delta={{ value: "+12%", positive: true }} icon={PackageCheck} />
        <KPIStat index={2} label="Entregues" value={String(entregues)} hint="com foto + assinatura" icon={PackageCheck} />
        <KPIStat index={3} label="DC pendentes" value={String(dcPendentes)} hint="bloqueia embarque" icon={AlertTriangle} />
      </section>

      <nav className="mt-6 flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                  : "text-muted-foreground ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)] hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className="font-mono text-[9px] text-muted-foreground/70">{t.spec}</span>
            </button>
          );
        })}
      </nav>

      {tab === "despacho" && <DespachoTab clientes={clientesApi} viagens={viagensApi} precos={precosEncomenda} limiteFixo={limiteFixoEncomenda} />}
      {tab === "dc" && <DeclaracaoTab encomendas={encomendas} declaracoes={declaracoes} onSaved={(dc) => setDeclaracoesApi((current) => [dc, ...current.filter((item) => item.id !== dc.id && item.carga_id !== dc.carga_id)])} />}
      {tab === "cotacao" && <CotacaoTab clientes={clientesApi} viagens={viagensApi} precos={precosEncomenda} limiteFixo={limiteFixoEncomenda} onConverter={() => setTab("despacho")} />}
      {tab === "controle" && <ControleViagemTab encomendas={encomendas} declaracoes={declaracoes} viagens={viagensApi} />}
      {tab === "rastreio" && <RastreamentoTab encomendas={encomendas} viagens={viagensApi} />}

      <div className="mt-6 surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4 text-[color:var(--brand)]" />
          <span><span className="font-medium text-foreground">Histórico de envios (B.6)</span> fica no CRM — data, volumes, conteúdo, preço e trecho dos últimos envios do cliente.</span>
        </p>
        <GhostButton icon={History}>Abrir no CRM</GhostButton>
      </div>
    </AppShell>
  );
}

function mapViagem(v: NavegacaoViagemApi): ViagemEncomendaUi {
  return {
    id: v.id,
    codigo: v.codigo ?? v.id.slice(0, 8),
    origem: v.origemSigla,
    destino: v.destinoSigla ?? v.escalas.at(-1)?.cidadeSigla ?? "-",
    status: v.status as ViagemEncomendaUi["status"],
    escalas: v.escalas.map((e) => ({ cidade: e.cidadeSigla, horaPrevista: e.dataHoraPrevista ?? "—", horaReal: e.dataHoraReal ?? undefined })),
    embarcacaoNome: v.embarcacaoNome,
  };
}

function mapEncomenda(item: TmsCargaApi, viagens: NavegacaoViagemApi[], limiteFixo: number | null): EncomendaUi {
  const obs = parseObs(item.observacoes);
  const origem = item.cidade_origem_sigla ?? "BEL";
  const destino = item.cidade_destino_sigla;
  const viagem = viagens.find((v) => v.id === item.viagem_id || v.codigo === item.viagem_codigo);
  const status = mapStatus(item.status);
  const valorDeclarado = item.valor_declarado ?? 0;
  const valorCobrado = item.valor_cobrado ?? 0;
  const tamanho = obs.tamanho ?? tamanhoPorPeso(item.peso_total ?? 0);
  return {
    id: item.id,
    apiId: item.id,
    codigo: item.codigo ?? item.numero_pedido ?? item.id.slice(0, 8).toUpperCase(),
    remetenteId: "",
    remetente: item.remetente_nome,
    destinatario: item.destinatario_nome ?? obs.destinatario ?? "-",
    destinatarioContato: obs.destinatarioContato ?? "-",
    trecho: `${origem} → ${destino}`,
    tamanho,
    peso: item.peso_total ?? 0,
    valorDeclarado,
    valorCobrado,
    modoPreco: limiteFixo && valorDeclarado > limiteFixo ? "percentual" : "fixo",
    quemPaga: obs.quemPaga ?? "remetente",
    dcId: `DC-${item.id}`,
    status,
    viagemId: item.viagem_id ?? viagem?.id ?? item.viagem_codigo,
    conteudo: obs.conteudo ?? item.numero_pedido ?? "Encomenda",
    criadoEm: formatDate(item.criado_em),
    notificado: status !== "recebido",
    sincronizado: true,
  };
}

function parseObs(raw?: string | null): Partial<EncomendaUi> & { destinatarioContato?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return { conteudo: raw };
  }
}

function mapStatus(status: string): EncomendaUi["status"] {
  if (status === "conferida") return "conferido";
  if (status === "embarcada") return "embarcado";
  if (status === "entregue") return "entregue";
  return "recebido";
}

function tamanhoPorPeso(peso: number): EncomendaUi["tamanho"] {
  if (peso <= 10) return "P";
  if (peso <= 20) return "M";
  return "G";
}

function parseLimiteFixoEncomenda(valor: unknown) {
  if (!valor || typeof valor !== "object") return null;
  const limite = Number((valor as { limiteFixo?: unknown }).limiteFixo);
  return Number.isFinite(limite) && limite > 0 ? limite : null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
