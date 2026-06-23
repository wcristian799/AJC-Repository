import { useMemo, useState } from "react";
import { Boxes, Ship, MapPin, AlertTriangle } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, ViagemStatusChip, brl,
} from "@/components/ops/primitives";
import { VoyageTrack } from "@/components/ops/motion-bits";
import { VOLUMES, VIAGENS, EMBARCACOES, type Viagem, type Cidade } from "@/mocks/data";

type ViagemResumo = {
  id: string;
  viagem: Viagem;
  embarcacao: string;
  recebidos: number;
  embarcados: number;
  entregues: number;
  divergentes: number;
  total: number;
  valorDeclarado: number;
  valorCobrado: number;
};

/** B.11 — Controle de carga por viagem (operação/diretoria). */
export function ControleTab() {
  const [filtroCidade, setFiltroCidade] = useState<Cidade | "todas">("todas");

  const resumos = useMemo<ViagemResumo[]>(() => {
    return VIAGENS.map((viagem) => {
      const vols = VOLUMES.filter((v) => v.viagemId === viagem.id);
      const emb = EMBARCACOES.find((e) => e.id === viagem.embarcacaoId);
      // valor declarado/cobrado derivado do peso (mock determinístico)
      const valorDeclarado = vols.reduce((s, v) => s + v.peso * 1200, 0);
      return {
        id: viagem.id,
        viagem,
        embarcacao: emb?.nome ?? "—",
        recebidos: vols.filter((v) => ["recebido", "conferido"].includes(v.status)).length,
        embarcados: vols.filter((v) => ["embarcado", "reconferido", "desembarcado"].includes(v.status)).length,
        entregues: vols.filter((v) => v.status === "entregue").length,
        divergentes: vols.filter((v) => v.status === "divergente").length,
        total: vols.length,
        valorDeclarado,
        valorCobrado: Math.round(valorDeclarado * 0.055),
      };
    }).filter((r) => r.total > 0);
  }, []);

  const rows = resumos.filter(
    (r) => filtroCidade === "todas" || r.viagem.destino === filtroCidade || r.viagem.escalas.some((e) => e.cidade === filtroCidade),
  );

  const cidadesComCarga = Array.from(new Set(VOLUMES.map((v) => v.cidadeDestino)));
  const viagemDestaque = VIAGENS.find((v) => v.id === "VIA-2026-0418");

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operação · diretoria"
        title="Controle de carga por viagem"
        description="Visão em tempo real do que está em cada viagem: volumes por estado, valor declarado × cobrado e divergências abertas. Base do BI de rentabilidade."
      />

      {viagemDestaque && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">{viagemDestaque.origem} → {viagemDestaque.destino} · {viagemDestaque.codigo}</h3>
            </div>
            <StatusChip tone="brand" pulse>em curso</StatusChip>
          </div>
          <VoyageTrack
            label="Rota e escalas"
            progressPct={viagemDestaque.cargaPct}
            stops={[
              { code: viagemDestaque.origem, label: viagemDestaque.origem, done: true },
              ...viagemDestaque.escalas.map((e) => ({ code: e.cidade, label: e.cidade, done: !!e.horaReal })),
            ]}
          />
        </div>
      )}

      <FilterBar searchPlaceholder="Buscar viagem, embarcação, cidade…">
        <FilterChip active={filtroCidade === "todas"} onClick={() => setFiltroCidade("todas")}>Todas cidades</FilterChip>
        {cidadesComCarga.map((c) => (
          <FilterChip key={c} active={filtroCidade === c} onClick={() => setFiltroCidade(c)}>{c}</FilterChip>
        ))}
      </FilterBar>

      <DataTable<ViagemResumo>
        rows={rows}
        empty="Nenhuma viagem com carga neste filtro."
        columns={[
          { key: "codigo", header: "Viagem", render: (r) => (
            <div>
              <p className="font-mono text-xs">{r.viagem.codigo}</p>
              <p className="text-[10px] text-muted-foreground">{r.viagem.origem} → {r.viagem.destino}</p>
            </div>
          ) },
          { key: "embarcacao", header: "Embarcação", render: (r) => <span className="text-xs">{r.embarcacao}</span> },
          { key: "total", header: "Volumes", align: "right", render: (r) => (
            <span className="inline-flex items-center gap-1 font-mono text-sm"><Boxes className="h-3.5 w-3.5 text-muted-foreground" />{r.total}</span>
          ) },
          { key: "estados", header: "Recebidos / Embarcados / Entregues", align: "center", render: (r) => (
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
              <span className="rounded bg-[color:color-mix(in_oklab,var(--info)_14%,transparent)] px-1.5 py-0.5 text-[color:var(--info)]">{r.recebidos}</span>
              <span className="text-muted-foreground">/</span>
              <span className="rounded bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] px-1.5 py-0.5 text-[color:var(--brand)]">{r.embarcados}</span>
              <span className="text-muted-foreground">/</span>
              <span className="rounded bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] px-1.5 py-0.5 text-[color:var(--success)]">{r.entregues}</span>
            </div>
          ) },
          { key: "valorDeclarado", header: "Declarado", align: "right", render: (r) => <span className="font-mono text-xs">{brl(r.valorDeclarado)}</span> },
          { key: "valorCobrado", header: "Cobrado", align: "right", render: (r) => <span className="font-mono text-xs text-[color:var(--brand)]">{brl(r.valorCobrado)}</span> },
          { key: "divergentes", header: "Diverg.", align: "right", render: (r) => r.divergentes > 0
            ? <span className="inline-flex items-center gap-1 text-[color:var(--danger)]"><AlertTriangle className="h-3.5 w-3.5" /><span className="font-mono text-xs">{r.divergentes}</span></span>
            : <span className="text-muted-foreground">—</span> },
          { key: "status", header: "Viagem", render: (r) => <ViagemStatusChip s={r.viagem.status} /> },
        ]}
      />

      {/* Detalhe por volume */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Volumes em rastreio
        </p>
        <DataTable
          rows={VOLUMES}
          columns={[
            { key: "uuid", header: "UUID / QR", render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.uuid}</span> },
            { key: "cargaId", header: "Carga", render: (r) => <span className="font-mono text-xs">{r.cargaId}</span> },
            { key: "cliente", header: "Cliente", render: (r) => <span className="font-medium">{r.cliente}</span> },
            { key: "cidadeDestino", header: "Destino" },
            { key: "peso", header: "Peso (kg)", align: "right" },
            { key: "viagemId", header: "Viagem", render: (r) => <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo ?? "—"}</span> },
            { key: "status", header: "Estado", render: (r) => {
              const tone =
                r.status === "divergente" ? "danger" :
                r.status === "entregue" ? "success" :
                r.status === "embarcado" || r.status === "reconferido" ? "brand" :
                "info";
              return <StatusChip tone={tone as never}>{r.status}</StatusChip>;
            } },
          ]}
        />
      </div>
    </div>
  );
}
