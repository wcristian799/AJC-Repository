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
  livre: "Livre",
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
        description="Paletes próprios (AJC) e de terceiros. Em trânsito não pode realocar; palete já alocado a outra viagem gera erro."
        actions={<PrimaryButton icon={Plus}>Cadastrar palete</PrimaryButton>}
      />

      <FilterBar searchPlaceholder="Buscar código, proprietário, viagem…">
        <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos status</FilterChip>
        <FilterChip active={filtro === "livre"} onClick={() => setFiltro("livre")}>Livres</FilterChip>
        <FilterChip active={filtro === "alocado"} onClick={() => setFiltro("alocado")}>Alocados</FilterChip>
        <FilterChip active={filtro === "em_transito"} onClick={() => setFiltro("em_transito")}>Em trânsito</FilterChip>
        <span className="mx-1 h-6 w-px bg-[color:var(--hairline)]" />
        <FilterChip active={prop === "todos"} onClick={() => setProp("todos")}>Todos donos</FilterChip>
        <FilterChip active={prop === "AJC"} onClick={() => setProp("AJC")}>AJC</FilterChip>
        <FilterChip active={prop === "terceiro"} onClick={() => setProp("terceiro")}>Terceiros</FilterChip>
      </FilterBar>

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
          { key: "acao", header: "Ação", align: "right", render: (r) => r.status === "em_transito"
            ? <span className="text-[11px] text-muted-foreground">bloqueado p/ realocar</span>
            : <button className="text-[11px] font-medium text-[color:var(--brand)] story-link">{r.status === "livre" ? "Alocar" : "Realocar"}</button> },
        ]}
      />
    </div>
  );
}
