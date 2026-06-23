import { useMemo, useState } from "react";
import { Package, Ship, AlertTriangle, FileWarning } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, ViagemStatusChip, Tag, brl,
} from "@/components/ops/primitives";
import {
  ENCOMENDAS, VIAGENS, EMBARCACOES, DECLARACOES_CONTEUDO,
  type Viagem, type Encomenda,
} from "@/mocks/data";

type ViagemResumoEnc = {
  id: string;
  viagem: Viagem;
  embarcacao: string;
  qtd: number;
  valorDeclarado: number;
  valorCobrado: number;
  dcPendentes: number;
};

/** B.4 — Controle de encomendas por viagem (operação/financeiro/diretoria). */
export function ControleViagemTab() {
  const [viagemSel, setViagemSel] = useState<string | "todas">("todas");

  const resumos = useMemo<ViagemResumoEnc[]>(() => {
    return VIAGENS.map((viagem) => {
      const encs = ENCOMENDAS.filter((e) => e.viagemId === viagem.id);
      const emb = EMBARCACOES.find((e) => e.id === viagem.embarcacaoId);
      const dcPendentes = encs.filter((e) => {
        const dc = DECLARACOES_CONTEUDO.find((d) => d.id === e.dcId);
        return !dc || !dc.assinaturaOk;
      }).length;
      return {
        id: viagem.id,
        viagem,
        embarcacao: emb?.nome ?? "—",
        qtd: encs.length,
        valorDeclarado: encs.reduce((s, e) => s + e.valorDeclarado, 0),
        valorCobrado: encs.reduce((s, e) => s + e.valorCobrado, 0),
        dcPendentes,
      };
    }).filter((r) => r.qtd > 0);
  }, []);

  const totalQtd = resumos.reduce((s, r) => s + r.qtd, 0);
  const totalDeclarado = resumos.reduce((s, r) => s + r.valorDeclarado, 0);
  const totalCobrado = resumos.reduce((s, r) => s + r.valorCobrado, 0);
  const totalDcPendentes = resumos.reduce((s, r) => s + r.dcPendentes, 0);

  const encomendasFiltradas = ENCOMENDAS.filter((e) => viagemSel === "todas" || e.viagemId === viagemSel);

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operação · financeiro · diretoria"
        title="Controle de encomendas por viagem"
        description="Por viagem, em tempo real: quantidade de encomendas, valor declarado total e valor cobrado total. Pendências de Declaração de Conteúdo são sinalizadas. Alimenta o BI e o cruzamento financeiro."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label="Encomendas na operação" value={String(totalQtd)} icon={Package} />
        <Mini label="Valor declarado total" value={brl(totalDeclarado)} icon={Ship} />
        <Mini label="Valor cobrado total" value={brl(totalCobrado)} tone="brand" icon={Ship} />
        <Mini label="DC pendentes" value={String(totalDcPendentes)} tone={totalDcPendentes > 0 ? "danger" : "success"} icon={FileWarning} />
      </div>

      <DataTable<ViagemResumoEnc>
        rows={resumos}
        empty="Nenhuma viagem com encomendas."
        onRowClick={(r) => setViagemSel((cur) => (cur === r.viagem.id ? "todas" : r.viagem.id))}
        columns={[
          { key: "codigo", header: "Viagem", render: (r) => (
            <div>
              <p className="font-mono text-xs">{r.viagem.codigo}</p>
              <p className="text-[10px] text-muted-foreground">{r.viagem.origem} → {r.viagem.destino}</p>
            </div>
          ) },
          { key: "embarcacao", header: "Embarcação", render: (r) => <span className="text-xs">{r.embarcacao}</span> },
          { key: "qtd", header: "Encomendas", align: "right", render: (r) => (
            <span className="inline-flex items-center gap-1 font-mono text-sm"><Package className="h-3.5 w-3.5 text-muted-foreground" />{r.qtd}</span>
          ) },
          { key: "valorDeclarado", header: "Declarado", align: "right", render: (r) => <span className="font-mono text-xs">{brl(r.valorDeclarado)}</span> },
          { key: "valorCobrado", header: "Cobrado", align: "right", render: (r) => <span className="font-mono text-xs text-[color:var(--brand)]">{brl(r.valorCobrado)}</span> },
          { key: "dcPendentes", header: "DC pend.", align: "right", render: (r) => r.dcPendentes > 0
            ? <span className="inline-flex items-center gap-1 text-[color:var(--danger)]"><AlertTriangle className="h-3.5 w-3.5" /><span className="font-mono text-xs">{r.dcPendentes}</span></span>
            : <span className="text-muted-foreground">—</span> },
          { key: "status", header: "Viagem", render: (r) => <ViagemStatusChip s={r.viagem.status} /> },
        ]}
      />

      {/* Lista filtrável de encomendas */}
      <FilterBar searchPlaceholder="Buscar remetente, destinatário, cidade, status…">
        <FilterChip active={viagemSel === "todas"} onClick={() => setViagemSel("todas")}>Todas viagens</FilterChip>
        {resumos.map((r) => (
          <FilterChip key={r.id} active={viagemSel === r.id} onClick={() => setViagemSel(r.id)}>{r.viagem.codigo}</FilterChip>
        ))}
      </FilterBar>

      <DataTable<Encomenda>
        rows={encomendasFiltradas}
        empty="Nenhuma encomenda nesta viagem."
        columns={[
          { key: "codigo", header: "Protocolo", render: (r) => <span className="font-mono text-[11px] text-[color:var(--brand)]">{r.codigo}</span> },
          { key: "remetente", header: "Remetente", render: (r) => <span className="font-medium">{r.remetente}</span> },
          { key: "destinatario", header: "Destinatário", render: (r) => (
            <div>
              <p className="text-sm">{r.destinatario}</p>
              <p className="text-[10px] text-muted-foreground">{r.destinatarioContato}</p>
            </div>
          ) },
          { key: "trecho", header: "Trecho", render: (r) => <span className="font-mono text-xs">{r.trecho}</span> },
          { key: "tamanho", header: "Tam.", align: "center", render: (r) => <Tag tone="neutral">{r.tamanho} · {r.peso}kg</Tag> },
          { key: "valorDeclarado", header: "Declarado", align: "right", render: (r) => <span className="font-mono text-xs">{brl(r.valorDeclarado)}</span> },
          { key: "valorCobrado", header: "Cobrado", align: "right", render: (r) => (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-[color:var(--brand)]">
              {brl(r.valorCobrado)}
              {r.modoPreco === "percentual" && <Tag tone="warning">%</Tag>}
            </span>
          ) },
          { key: "quemPaga", header: "Paga", render: (r) => <span className="text-[11px] capitalize text-muted-foreground">{r.quemPaga}</span> },
          { key: "dc", header: "DC", align: "center", render: (r) => {
            const dc = DECLARACOES_CONTEUDO.find((d) => d.id === r.dcId);
            return dc?.assinaturaOk
              ? <StatusChip tone="success" size="xs">assinada</StatusChip>
              : <StatusChip tone="danger" size="xs">pendente</StatusChip>;
          } },
        ]}
      />
    </div>
  );
}

function Mini({ label, value, tone = "neutral", icon: Icon }: {
  label: string; value: string; tone?: "neutral" | "brand" | "danger" | "success";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color = tone === "brand" ? "var(--brand)" : tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--foreground)";
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-[color:var(--hairline)]" style={{ color, background: `color-mix(in oklab, ${color} 10%, transparent)` }}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="big-numeric truncate text-xl text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
