import { useState } from "react";
import { Layers, Plus, MapPin } from "lucide-react";
import {
  SectionHeader,
  DataTable,
  FilterBar,
  FilterChip,
  StatusChip,
  PrimaryButton,
  Tag,
} from "@/components/ops/primitives";
import {
  allocateTmsPalete,
  createTmsPalete,
  releaseTmsPalete,
  type NavegacaoViagemApi,
  type TmsPaleteApi,
  type TmsVolumeApi,
} from "@/lib/ajc-api";

type PaleteStatus = "livre" | "alocado" | "em_transito";
type Palete = {
  id: string;
  codigo: string;
  proprietario: "AJC" | "terceiro";
  terceiro?: string;
  status: PaleteStatus;
  viagemId?: string;
  cidadeDestino?: string;
  volumes: number;
};

const STATUS_TONE: Record<PaleteStatus, "neutral" | "brand" | "warning"> = {
  livre: "neutral",
  alocado: "brand",
  em_transito: "warning",
};

const STATUS_LABEL: Record<PaleteStatus, string> = {
  livre: "Livre no porto",
  alocado: "Alocado",
  em_transito: "Em transito",
};

export function PaletesTab({
  paletes,
  volumes,
  viagens,
  onPaletesChange,
}: {
  paletes?: TmsPaleteApi[];
  volumes?: TmsVolumeApi[];
  viagens?: NavegacaoViagemApi[];
  onPaletesChange?: (paletes: TmsPaleteApi[]) => void;
}) {
  const [filtro, setFiltro] = useState<PaleteStatus | "todos">("todos");
  const [prop, setProp] = useState<"todos" | "AJC" | "terceiro">("todos");
  const [draft, setDraft] = useState({ codigo: "", proprietario: "AJC" as "AJC" | "terceiro", terceiroId: "" });
  const [alocacao, setAlocacao] = useState<{ paleteId: string; viagemId: string; cidadeDestinoSigla: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dados = paletes?.map((p) => mapPalete(p, volumes ?? [])) ?? [];
  const rows = dados.filter(
    (p) => (filtro === "todos" || p.status === filtro) && (prop === "todos" || p.proprietario === prop),
  );
  const viagensAtivas = (viagens ?? []).filter((viagem) => viagem.id && viagem.codigo);

  async function refreshPaletes(changed: TmsPaleteApi) {
    const current = paletes ?? [];
    const exists = current.some((palete) => palete.id === changed.id);
    const next = exists ? current.map((palete) => (palete.id === changed.id ? changed : palete)) : [...current, changed];
    onPaletesChange?.(next.sort((a, b) => a.codigo.localeCompare(b.codigo)));
  }

  async function handleCreatePalete() {
    if (!draft.codigo.trim()) {
      setErro("Informe o codigo do palete.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const created = await createTmsPalete({
        codigo: draft.codigo.trim(),
        proprietario: draft.proprietario,
        terceiroId: draft.proprietario === "terceiro" && draft.terceiroId.trim() ? draft.terceiroId.trim() : undefined,
      });
      await refreshPaletes(created);
      setDraft({ codigo: "", proprietario: "AJC", terceiroId: "" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel cadastrar o palete.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAllocatePalete() {
    if (!alocacao?.viagemId || !alocacao.cidadeDestinoSigla) return;
    setSaving(true);
    setErro(null);
    try {
      const updated = await allocateTmsPalete(alocacao.paleteId, {
        viagemId: alocacao.viagemId,
        cidadeDestinoSigla: alocacao.cidadeDestinoSigla,
        clientUuid: crypto.randomUUID(),
      });
      await refreshPaletes(updated);
      setAlocacao(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel alocar o palete.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReleasePalete(paleteId: string) {
    setSaving(true);
    setErro(null);
    try {
      const updated = await releaseTmsPalete(paleteId);
      await refreshPaletes(updated);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel liberar o palete.");
    } finally {
      setSaving(false);
    }
  }

  function beginAllocation(palete: Palete) {
    const viagem = viagensAtivas[0];
    setAlocacao({
      paleteId: palete.id,
      viagemId: viagem?.id ?? "",
      cidadeDestinoSigla: viagem?.destinoSigla ?? viagem?.escalas.at(-1)?.cidadeSigla ?? palete.cidadeDestino ?? "",
    });
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operacao - paletizacao"
        title="Paletes - cadastro e alocacao"
        description="Paletes proprios (AJC) e de terceiros. Palete alocado nao realoca: so volta a ficar livre quando retorna/e liberado pela operacao."
        actions={<PrimaryButton icon={Plus} onClick={handleCreatePalete} disabled={saving}>{saving ? "Salvando..." : "Cadastrar palete"}</PrimaryButton>}
      />

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="surface-card grid gap-3 p-4 md:grid-cols-[1fr_150px_1fr]">
          <label className="space-y-1 text-xs text-muted-foreground">
            Codigo do palete
            <input
              value={draft.codigo}
              onChange={(event) => setDraft((prev) => ({ ...prev, codigo: event.target.value }))}
              placeholder="AJC-024"
              className="h-10 w-full rounded-md bg-[color:var(--muted)] px-3 font-mono text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Proprietario
            <select
              value={draft.proprietario}
              onChange={(event) => setDraft((prev) => ({ ...prev, proprietario: event.target.value as "AJC" | "terceiro" }))}
              className="h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            >
              <option value="AJC">AJC</option>
              <option value="terceiro">Terceiro</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Terceiro
            <input
              value={draft.terceiroId}
              disabled={draft.proprietario === "AJC"}
              onChange={(event) => setDraft((prev) => ({ ...prev, terceiroId: event.target.value }))}
              placeholder="id cliente/fornecedor"
              className="h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)] disabled:opacity-50"
            />
          </label>
        </div>

        {alocacao && (
          <div className="surface-card grid gap-3 p-4 md:grid-cols-[1fr_130px_auto]">
            <label className="space-y-1 text-xs text-muted-foreground">
              Viagem
              <select
                value={alocacao.viagemId}
                onChange={(event) => {
                  const viagem = viagensAtivas.find((item) => item.id === event.target.value);
                  setAlocacao((prev) => prev && ({
                    ...prev,
                    viagemId: event.target.value,
                    cidadeDestinoSigla: viagem?.destinoSigla ?? viagem?.escalas.at(-1)?.cidadeSigla ?? prev.cidadeDestinoSigla,
                  }));
                }}
                className="h-10 w-full rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              >
                {viagensAtivas.map((viagem) => <option key={viagem.id} value={viagem.id}>{viagem.codigo} - {viagem.embarcacaoNome}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Destino
              <input
                value={alocacao.cidadeDestinoSigla}
                onChange={(event) => setAlocacao((prev) => prev && ({ ...prev, cidadeDestinoSigla: event.target.value.toUpperCase() }))}
                className="h-10 w-full rounded-md bg-[color:var(--muted)] px-3 font-mono text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
            </label>
            <div className="flex items-end gap-2">
              <PrimaryButton onClick={handleAllocatePalete} disabled={saving || !alocacao.viagemId}>Alocar</PrimaryButton>
              <button className="h-10 text-xs text-muted-foreground" onClick={() => setAlocacao(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {erro && <p className="rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,transparent)] px-3 py-2 text-xs text-[color:var(--destructive)] ring-1 ring-[color:color-mix(in_oklab,var(--destructive)_28%,transparent)]">{erro}</p>}

      <FilterBar searchPlaceholder="Buscar codigo, proprietario, viagem...">
        <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos status</FilterChip>
        <FilterChip active={filtro === "livre"} onClick={() => setFiltro("livre")}>Livres</FilterChip>
        <FilterChip active={filtro === "alocado"} onClick={() => setFiltro("alocado")}>Alocados</FilterChip>
        <FilterChip active={filtro === "em_transito"} onClick={() => setFiltro("em_transito")}>Em transito</FilterChip>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Proprietario
          <select
            value={prop}
            onChange={(e) => setProp(e.target.value as typeof prop)}
            className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
          >
            <option value="todos">Todos em ordem alfabetica</option>
            <option value="AJC">AJC</option>
            <option value="terceiro">Terceiros</option>
          </select>
        </label>
      </FilterBar>

      <div className="grid gap-3 md:grid-cols-3">
        <TipoPalete sigla="MP" titulo="Multi-palete" detalhe="Uma carga em varios paletes. Ao bipar, o app mostra os paletes vinculados." />
        <TipoPalete sigla="PD" titulo="Palete dedicado" detalhe="Um palete fechado para uma unica carga. Bipe movimenta a carga inteira." />
        <TipoPalete sigla="PC" titulo="Palete compartilhado" detalhe="Varias NF/DC no mesmo palete. Pode ficar parcialmente completo." />
      </div>

      <DataTable<Palete>
        rows={rows}
        empty="Nenhum palete neste filtro."
        columns={[
          { key: "codigo", header: "Codigo", render: (r) => (
            <span className="inline-flex items-center gap-2 font-mono text-xs"><Layers className="h-3.5 w-3.5 text-[color:var(--brand)]" />{r.codigo}</span>
          ) },
          { key: "proprietario", header: "Proprietario", render: (r) => r.proprietario === "AJC"
            ? <Tag tone="brand">AJC</Tag>
            : <span className="text-xs">{r.terceiro}</span> },
          { key: "status", header: "Status", render: (r) => <StatusChip tone={STATUS_TONE[r.status]} pulse={r.status === "em_transito"}>{STATUS_LABEL[r.status]}</StatusChip> },
          { key: "viagemId", header: "Viagem", render: (r) => r.viagemId
            ? <span className="font-mono text-xs">{r.viagemId}</span>
            : <span className="text-muted-foreground">-</span> },
          { key: "cidadeDestino", header: "Destino", render: (r) => r.cidadeDestino
            ? <span className="inline-flex items-center gap-1 text-xs"><MapPin className="h-3 w-3 text-muted-foreground" />{r.cidadeDestino}</span>
            : <span className="text-muted-foreground">-</span> },
          { key: "volumes", header: "Volumes", align: "right", render: (r) => <span className="font-mono text-xs">{r.volumes}</span> },
          { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.volumes > 12 ? "warning" : r.volumes > 0 ? "brand" : "neutral"}>{r.volumes > 12 ? "MP" : r.volumes > 0 ? "PC" : "PD"}</Tag> },
          { key: "ocupacao", header: "Ocupacao", render: (r) => r.status === "livre"
            ? <StatusChip tone="success" size="sm">disponivel</StatusChip>
            : <StatusChip tone={r.volumes >= 10 ? "brand" : "warning"} size="sm">{r.volumes >= 10 ? "completo" : "parcial"}</StatusChip> },
          { key: "acao", header: "Acao", align: "right", render: (r) => r.status === "livre"
            ? <button className="text-[11px] font-medium text-[color:var(--brand)] story-link" onClick={() => beginAllocation(r)}>Alocar</button>
            : <button className="text-[11px] text-muted-foreground story-link" disabled={saving} onClick={() => handleReleasePalete(r.id)}>liberar retorno</button> },
        ]}
      />
    </div>
  );
}

function mapPalete(palete: TmsPaleteApi, volumes: TmsVolumeApi[]): Palete {
  const totalVolumes = volumes.filter((v) => v.palete_id === palete.id || v.palete_codigo === palete.codigo).length;
  return {
    id: palete.id,
    codigo: palete.codigo,
    proprietario: palete.proprietario === "terceiro" ? "terceiro" : "AJC",
    terceiro: palete.terceiro_id ?? undefined,
    status: ["livre", "alocado", "em_transito"].includes(palete.status) ? (palete.status as PaleteStatus) : "livre",
    viagemId: palete.viagem_codigo ?? palete.viagem_id ?? undefined,
    cidadeDestino: palete.cidade_destino_sigla ?? undefined,
    volumes: totalVolumes,
  };
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
