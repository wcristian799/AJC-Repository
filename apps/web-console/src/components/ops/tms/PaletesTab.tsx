import { useState } from "react";
import { Layers, Plus, MapPin } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, PrimaryButton, Tag,
} from "@/components/ops/primitives";
import { PALETES, VIAGENS, type Palete, type PaleteStatus } from "@/mocks/data";

const STATUS_TONE: Record<PaleteStatus, "neutral" | "brand" | "warning"> = {
  livre: "neutral",
  alocado: "brand",
  em_transito: "warning",
};
const STATUS_LABEL: Record<PaleteStatus, string> = {
  livre: "Livre no porto",
  alocado: "Alocado",
  em_transito: "Em trânsito",
};

/** B.6 — Cadastro e alocação de paletes. */
export function PaletesTab() {
  const [filtro, setFiltro] = useState<PaleteStatus | "todos">("todos");
  const [prop, setProp] = useState<"todos" | "AJC" | "terceiro">("todos");
  const rows = PALETES.filter(
    (p) => (filtro === "todos" || p.status === filtro) && (prop === "todos" || p.proprietario === prop),
  );

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operação · paletização"
        title="Paletes — cadastro e alocação"
        description="Paletes próprios (AJC) e de terceiros. Palete alocado não realoca: só volta a ficar livre quando retorna/é liberado pela operação."
        actions={<PrimaryButton icon={Plus}>Cadastrar palete</PrimaryButton>}
      />

      <FilterBar searchPlaceholder="Buscar código, proprietário, viagem…">
        <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos status</FilterChip>
        <FilterChip active={filtro === "livre"} onClick={() => setFiltro("livre")}>Livres</FilterChip>
        <FilterChip active={filtro === "alocado"} onClick={() => setFiltro("alocado")}>Alocados</FilterChip>
        <FilterChip active={filtro === "em_transito"} onClick={() => setFiltro("em_transito")}>Em trânsito</FilterChip>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Proprietário
          <select
            value={prop}
            onChange={(e) => setProp(e.target.value as typeof prop)}
            className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
          >
            <option value="todos">Todos em ordem alfabética</option>
            <option value="AJC">AJC</option>
            <option value="terceiro">Terceiros</option>
          </select>
        </label>
      </FilterBar>

      <div className="grid gap-3 md:grid-cols-3">
        <TipoPalete sigla="MP" titulo="Multi-palete" detalhe="Uma carga em vários paletes. Ao bipar, o app mostra os paletes vinculados." />
        <TipoPalete sigla="PD" titulo="Palete dedicado" detalhe="Um palete fechado para uma única carga. Bipe movimenta a carga inteira." />
        <TipoPalete sigla="PC" titulo="Palete compartilhado" detalhe="Várias NF/DC no mesmo palete. Pode ficar parcialmente completo." />
      </div>

      <DataTable<Palete>
        rows={rows}
        empty="Nenhum palete neste filtro."
        columns={[
          { key: "codigo", header: "Código", render: (r) => (
            <span className="inline-flex items-center gap-2 font-mono text-xs"><Layers className="h-3.5 w-3.5 text-[color:var(--brand)]" />{r.codigo}</span>
          ) },
          { key: "proprietario", header: "Proprietário", render: (r) => r.proprietario === "AJC"
            ? <Tag tone="brand">AJC</Tag>
            : <span className="text-xs">{r.terceiro}</span> },
          { key: "status", header: "Status", render: (r) => <StatusChip tone={STATUS_TONE[r.status]} pulse={r.status === "em_transito"}>{STATUS_LABEL[r.status]}</StatusChip> },
          { key: "viagemId", header: "Viagem", render: (r) => r.viagemId
            ? <span className="font-mono text-xs">{VIAGENS.find((v) => v.id === r.viagemId)?.codigo ?? r.viagemId}</span>
            : <span className="text-muted-foreground">—</span> },
          { key: "cidadeDestino", header: "Destino", render: (r) => r.cidadeDestino
            ? <span className="inline-flex items-center gap-1 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />{r.cidadeDestino}</span>
            : <span className="text-muted-foreground">—</span> },
          { key: "volumes", header: "Volumes", align: "right", render: (r) => <span className="font-mono text-xs">{r.volumes}</span> },
          { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.volumes > 12 ? "warning" : r.volumes > 0 ? "brand" : "neutral"}>{r.volumes > 12 ? "MP" : r.volumes > 0 ? "PC" : "PD"}</Tag> },
          { key: "ocupacao", header: "Ocupação", render: (r) => r.status === "livre"
            ? <StatusChip tone="success" size="sm">disponível</StatusChip>
            : <StatusChip tone={r.volumes >= 10 ? "brand" : "warning"} size="sm">{r.volumes >= 10 ? "completo" : "parcial"}</StatusChip> },
          { key: "acao", header: "Ação", align: "right", render: (r) => r.status === "livre"
            ? <button className="text-[11px] font-medium text-[color:var(--brand)] story-link">Alocar</button>
            : <span className="text-[11px] text-muted-foreground">bloqueado até retorno/liberação</span> },
        ]}
      />
    </div>
  );
}

function TipoPalete({ sigla, titulo, detalhe }: { sigla: string; titulo: string; detalhe: string }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] font-mono text-sm font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
          {sigla}
        </span>
        <p className="text-sm font-medium text-foreground">{titulo}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}
