import { useMemo, useState } from "react";
import { Boxes, Ship, MapPin, AlertTriangle } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, ViagemStatusChip, brl,
} from "@/components/ops/primitives";
import { VoyageTrack } from "@/components/ops/motion-bits";
import type { EmbarcacaoApi, NavegacaoViagemApi, TmsCargaApi, TmsVolumeApi } from "@/lib/ajc-api";

type ViagemStatusUi = "planejada" | "em_curso" | "concluida" | "cancelada";

type ViagemLike = {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  status: ViagemStatusUi;
  cargaPct: number;
  embarcacaoId?: string;
  escalas: Array<{ cidade: string; horaReal?: string | null }>;
};

type VolumeLike = {
  id: string;
  uuid: string;
  cargaId: string;
  cliente: string;
  cidadeDestino: string;
  peso: number;
  viagemId: string;
  status: string;
};

type ViagemResumo = {
  id: string;
  viagem: ViagemLike;
  embarcacao: string;
  recebidos: number;
  embarcados: number;
  entregues: number;
  divergentes: number;
  total: number;
  valorDeclarado: number;
  valorCobrado: number;
};

/** B.11 - Controle de carga por viagem (operacao/diretoria). */
export function ControleTab({
  cargas = [],
  volumes,
  viagens,
  embarcacoes,
}: {
  cargas?: TmsCargaApi[];
  volumes?: TmsVolumeApi[];
  viagens?: NavegacaoViagemApi[];
  embarcacoes?: EmbarcacaoApi[];
}) {
  const [filtroCidade, setFiltroCidade] = useState<string | "todas">("todas");
  const apiViagens = useMemo<ViagemLike[]>(() => viagens?.map(mapViagem) ?? [], [viagens]);
  const apiVolumes = useMemo<VolumeLike[]>(() => volumes?.map((v) => mapVolume(v, cargas)) ?? [], [volumes, cargas]);
  const apiEmbarcacoes = embarcacoes ?? [];

  const resumos = useMemo<ViagemResumo[]>(() => {
    return apiViagens.map((viagem) => {
      const cargasDaViagem = cargas.filter((c) => c.viagem_codigo === viagem.codigo);
      const cargaIdsDaViagem = new Set(cargasDaViagem.map((c) => c.id));
      const vols = apiVolumes.filter((v) => cargaIdsDaViagem.size ? cargaIdsDaViagem.has(v.cargaId) : v.viagemId === viagem.id);
      const emb = apiEmbarcacoes.find((e) => e.id === viagem.embarcacaoId);
      const valorDeclarado = cargasDaViagem.length
        ? cargasDaViagem.reduce((s, c) => s + (c.valor_declarado ?? 0), 0)
        : vols.reduce((s, v) => s + v.peso * 1200, 0);
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
        valorCobrado: cargasDaViagem.length
          ? cargasDaViagem.reduce((s, c) => s + (c.valor_cobrado ?? 0), 0)
          : Math.round(valorDeclarado * 0.055),
      };
    }).filter((r) => r.total > 0);
  }, [apiViagens, apiVolumes, apiEmbarcacoes, cargas]);

  const rows = resumos.filter(
    (r) => filtroCidade === "todas" || r.viagem.destino === filtroCidade || r.viagem.escalas.some((e) => e.cidade === filtroCidade),
  );

  const cidadesComCarga = Array.from(new Set(apiVolumes.map((v) => v.cidadeDestino)));
  const viagemDestaque = apiViagens.find((v) => v.status === "em_curso") ?? apiViagens[0];

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operacao · diretoria"
        title="Controle de carga por viagem"
        description="Visao em tempo real do que esta em cada viagem: volumes por estado, valor declarado x cobrado e divergencias abertas. Base do BI de rentabilidade."
      />

      {viagemDestaque && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">{viagemDestaque.origem} → {viagemDestaque.destino} · {viagemDestaque.codigo}</h3>
            </div>
            <StatusChip tone={viagemDestaque.status === "em_curso" ? "brand" : "neutral"} pulse={viagemDestaque.status === "em_curso"}>
              {viagemDestaque.status === "em_curso" ? "em curso" : viagemDestaque.status}
            </StatusChip>
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

      <FilterBar searchPlaceholder="Buscar viagem, embarcacao, cidade...">
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
          { key: "embarcacao", header: "Embarcacao", render: (r) => <span className="text-xs">{r.embarcacao}</span> },
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

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> Volumes em rastreio
        </p>
        <DataTable
          rows={apiVolumes}
          columns={[
            { key: "uuid", header: "UUID / QR", render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.uuid}</span> },
            { key: "cargaId", header: "Carga", render: (r) => <span className="font-mono text-xs">{r.cargaId}</span> },
            { key: "cliente", header: "Cliente", render: (r) => <span className="font-medium">{r.cliente}</span> },
            { key: "cidadeDestino", header: "Destino" },
            { key: "peso", header: "Peso (kg)", align: "right" },
            { key: "viagemId", header: "Viagem", render: (r) => <span className="font-mono text-xs">{apiViagens.find((v) => v.id === r.viagemId || v.codigo === r.viagemId)?.codigo ?? "—"}</span> },
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

function mapViagem(v: NavegacaoViagemApi): ViagemLike {
  return {
    id: v.id,
    codigo: v.codigo ?? "sem-codigo",
    origem: v.origemSigla,
    destino: v.destinoSigla ?? v.escalas.at(-1)?.cidadeSigla ?? "—",
    status: ["planejada", "em_curso", "concluida", "cancelada"].includes(v.status) ? (v.status as ViagemStatusUi) : "planejada",
    cargaPct: 0,
    embarcacaoId: v.embarcacaoId,
    escalas: v.escalas.map((e) => ({ cidade: e.cidadeSigla, horaReal: e.dataHoraReal })),
  };
}

function mapVolume(v: TmsVolumeApi, cargas: TmsCargaApi[]): VolumeLike {
  const carga = cargas.find((c) => c.id === v.carga_id);
  return {
    id: v.id,
    uuid: v.uuid,
    cargaId: v.carga_id,
    cliente: carga?.remetente_nome ?? "Cliente nao informado",
    cidadeDestino: v.cidade_destino_sigla,
    peso: Number(v.peso ?? 0),
    viagemId: carga?.viagem_codigo ?? "",
    status: v.status,
  };
}
