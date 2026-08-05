import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Layers, MapPin, Plus, RefreshCw, Search, Ship, X } from "lucide-react";
import {
  DataTable,
  FilterChip,
  GhostButton,
  PrimaryButton,
  SectionHeader,
  StatusChip,
  Tag,
} from "@/components/ops/primitives";
import {
  createTmsPalete,
  listTmsConferencias,
  listTmsLocaisOperacionais,
  listTmsPaleteOwners,
  listTmsPaletes,
  releaseTmsPalete,
  updateTmsPalete,
  type CreateTmsPaleteInput,
  type TmsConferenciaResumoApi,
  type TmsLocalOperacionalApi,
  type TmsPaleteApi,
  type TmsPaleteOwnerApi,
} from "@/lib/ajc-api";

type Filters = {
  busca: string;
  status: string;
  proprietario: string;
  localId: string;
  pagina: number;
};
const EMPTY_FILTERS: Filters = { busca: "", status: "", proprietario: "", localId: "", pagina: 1 };

export function PaletesTab() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState<TmsPaleteApi[]>([]);
  const [owners, setOwners] = useState<TmsPaleteOwnerApi[]>([]);
  const [locations, setLocations] = useState<TmsLocalOperacionalApi[]>([]);
  const [pagination, setPagination] = useState({ pagina: 1, paginas: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TmsPaleteApi | "new" | null>(null);
  const [detail, setDetail] = useState<TmsPaleteApi | null>(null);
  const [conferences, setConferences] = useState<TmsConferenciaResumoApi[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, ownerRows, locationRows] = await Promise.all([
        listTmsPaletes({ ...filters, porPagina: 20 }),
        owners.length ? Promise.resolve(owners) : listTmsPaleteOwners(),
        locations.length ? Promise.resolve(locations) : listTmsLocaisOperacionais(),
      ]);
      setRows(response.items);
      setPagination({
        pagina: response.paginacao.pagina,
        paginas: response.paginacao.paginas,
        total: response.paginacao.total,
      });
      setOwners(ownerRows);
      setLocations(locationRows);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os paletes.");
    } finally {
      setLoading(false);
    }
  }, [filters, owners, locations]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.busca ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.busca]);
  useEffect(() => {
    if (!detail) {
      setConferences([]);
      return;
    }
    listTmsConferencias({ paleteId: detail.id })
      .then(setConferences)
      .catch(() => setConferences([]));
  }, [detail]);

  async function saved() {
    setEditing(null);
    await load();
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Operação · inventário físico"
        title="Paletes"
        description="Cadastro, localização, composição e ciclo operacional. Um palete ativo não é realocado; a liberação exige retorno ao porto e todos os volumes entregues."
        actions={
          <>
            <GhostButton icon={RefreshCw} onClick={() => void load()} disabled={loading}>
              {loading ? "Atualizando…" : "Atualizar"}
            </GhostButton>
            <PrimaryButton icon={Plus} onClick={() => setEditing("new")}>
              Cadastrar palete
            </PrimaryButton>
          </>
        }
      />

      <div className="surface-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <FieldLabel>Busca</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.busca}
                onChange={(e) => setFilters((f) => ({ ...f, busca: e.target.value, pagina: 1 }))}
                placeholder="código, proprietário, viagem ou local"
                className="field-control pl-9"
              />
            </div>
          </label>
          <label className="min-w-[220px]">
            <FieldLabel>Proprietário</FieldLabel>
            <select
              value={filters.proprietario}
              onChange={(e) =>
                setFilters((f) => ({ ...f, proprietario: e.target.value, pagina: 1 }))
              }
              className="field-control"
            >
              <option value="">Todos em ordem alfabética</option>
              {owners.map((owner) => (
                <option key={owner.chave} value={owner.chave}>
                  {owner.nome}
                  {owner.tipo !== "AJC" ? ` · ${owner.tipo}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[210px]">
            <FieldLabel>Local físico</FieldLabel>
            <select
              value={filters.localId}
              onChange={(e) => setFilters((f) => ({ ...f, localId: e.target.value, pagina: 1 }))}
              className="field-control"
            >
              <option value="">Todos os locais</option>
              {locations.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["", "Todos"],
            ["livre", "Livre no porto"],
            ["alocado", "Alocado"],
            ["em_transito", "Em trânsito"],
          ].map(([value, label]) => (
            <FilterChip
              key={value}
              active={filters.status === value}
              onClick={() => setFilters((f) => ({ ...f, status: value, pagina: 1 }))}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-sm text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_28%,transparent)]">
          {error}
        </div>
      )}

      <DataTable<TmsPaleteApi>
        rows={rows}
        empty={loading ? "Carregando paletes…" : "Nenhum palete corresponde aos filtros."}
        onRowClick={setDetail}
        columns={[
          {
            key: "codigo",
            header: "Palete",
            render: (row) => (
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-xs font-semibold">
                  <Layers className="h-4 w-4 text-[color:var(--brand)]" />
                  {row.codigo}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{row.proprietario_nome}</p>
              </div>
            ),
          },
          {
            key: "status",
            header: "Situação física",
            render: (row) => (
              <div className="space-y-1">
                <StatusChip
                  tone={
                    row.status === "livre"
                      ? "success"
                      : row.status === "em_transito"
                        ? "warning"
                        : "brand"
                  }
                >
                  {row.status === "livre" ? "livre no porto" : label(row.status)}
                </StatusChip>
                <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {row.local_nome ?? "local não informado"}
                </p>
              </div>
            ),
          },
          {
            key: "tipo_unitizacao",
            header: "Composição",
            render: (row) => (
              <div className="flex items-center gap-2">
                {row.tipo_unitizacao ? (
                  <Tag tone="brand">{row.tipo_unitizacao}</Tag>
                ) : (
                  <span className="text-xs text-muted-foreground">sem composição</span>
                )}
                <StatusChip
                  tone={
                    row.estado_composicao === "completo"
                      ? "success"
                      : row.estado_composicao === "parcial"
                        ? "warning"
                        : "neutral"
                  }
                  size="sm"
                >
                  {row.estado_composicao}
                </StatusChip>
              </div>
            ),
          },
          {
            key: "viagem_codigo",
            header: "Viagem / destino",
            render: (row) =>
              row.viagem_codigo ? (
                <div>
                  <p className="inline-flex items-center gap-1.5 font-mono text-xs">
                    <Ship className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                    {row.viagem_codigo}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    destino {row.cidade_destino_sigla}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">não alocado</span>
              ),
          },
          {
            key: "volumes",
            header: "Conteúdo",
            align: "right",
            render: (row) => (
              <div className="font-mono text-xs">
                <p>{row.volumes} volume(s)</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {row.documentos} NF/DC · {row.cargas} carga(s)
                </p>
              </div>
            ),
          },
          {
            key: "acao",
            header: "",
            align: "right",
            render: (row) => (
              <button
                type="button"
                aria-label={`Editar ${row.codigo}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(row);
                }}
                className="rounded-md p-2 text-muted-foreground hover:bg-[color:var(--accent)] hover:text-foreground"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            ),
          },
        ]}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pagination.total.toLocaleString("pt-BR")} palete(s)</span>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.pagina <= 1}
            onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina - 1 }))}
            className="pager"
          >
            Anterior
          </button>
          <span>
            {pagination.pagina} / {pagination.paginas}
          </span>
          <button
            disabled={pagination.pagina >= pagination.paginas}
            onClick={() => setFilters((f) => ({ ...f, pagina: f.pagina + 1 }))}
            className="pager"
          >
            Próxima
          </button>
        </div>
      </div>

      {editing && (
        <PaleteEditor
          palete={editing === "new" ? null : editing}
          owners={owners}
          locations={locations}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {detail && (
        <PaleteDetail
          palete={detail}
          conferences={conferences}
          locations={locations}
          onClose={() => setDetail(null)}
          onReleased={async () => {
            setDetail(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PaleteEditor({
  palete,
  owners,
  locations,
  onClose,
  onSaved,
}: {
  palete: TmsPaleteApi | null;
  owners: TmsPaleteOwnerApi[];
  locations: TmsLocalOperacionalApi[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const initialOwner =
    palete?.proprietario === "AJC"
      ? "AJC"
      : palete?.cliente_proprietario_id
        ? `cliente:${palete.cliente_proprietario_id}`
        : palete?.fornecedor_proprietario_id
          ? `fornecedor:${palete.fornecedor_proprietario_id}`
          : "";
  const [ownerKey, setOwnerKey] = useState(initialOwner || "AJC");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [locationId, setLocationId] = useState(
    palete?.local_operacional_id ?? locations[0]?.id ?? "",
  );
  const [active, setActive] = useState(palete?.ativo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerResults = useMemo(() => {
    const q = normalizeText(ownerSearch);
    return owners
      .filter(
        (owner) =>
          owner.tipo !== "AJC" &&
          (!q || normalizeText(`${owner.nome} ${owner.documento ?? ""} ${owner.tipo}`).includes(q)),
      )
      .slice(0, 40);
  }, [owners, ownerSearch]);
  const selectedOwner = owners.find((owner) => owner.chave === ownerKey);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!locationId) return setError("Selecione o local físico do palete.");
    const input: CreateTmsPaleteInput = {
      proprietario: ownerKey === "AJC" ? "AJC" : "terceiro",
      clienteProprietarioId:
        selectedOwner?.tipo === "cliente" ? (selectedOwner.id ?? undefined) : undefined,
      fornecedorProprietarioId:
        selectedOwner?.tipo === "fornecedor" ? (selectedOwner.id ?? undefined) : undefined,
      localOperacionalId: locationId,
      ativo: active,
    };
    setSaving(true);
    setError(null);
    try {
      if (palete) await updateTmsPalete(palete.id, input);
      else await createTmsPalete(input);
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o palete.");
    } finally {
      setSaving(false);
    }
  }
  const locked = Boolean(
    palete && (palete.status !== "livre" || palete.estado_composicao !== "vazio"),
  );
  return (
    <div className="modal-backdrop">
      <form onSubmit={submit} className="modal-panel max-w-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[color:var(--brand)]">
              {palete ? palete.codigo : "Novo palete"}
            </p>
            <h3 className="mt-1 font-display text-2xl">
              {palete ? "Editar cadastro" : "Cadastrar palete"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O código definitivo é gerado exclusivamente pelo servidor.
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-button">
            <X className="h-5 w-5" />
          </button>
        </header>
        {locked && (
          <p className="mt-4 rounded-lg bg-[color:color-mix(in_oklab,var(--warning)_10%,transparent)] p-3 text-xs text-[color:var(--warning)] ring-1 ring-[color:var(--hairline)]">
            Proprietário e local ficam bloqueados enquanto o palete possui composição ou alocação
            ativa.
          </p>
        )}
        <div className="mt-5 space-y-4">
          <label>
            <FieldLabel>Proprietário selecionado</FieldLabel>
            <div className="field-control flex items-center justify-between">
              <span>{selectedOwner?.nome ?? "Nenhum terceiro selecionado"}</span>
              {ownerKey !== "AJC" && (
                <button
                  type="button"
                  onClick={() => setOwnerKey("AJC")}
                  className="text-xs text-[color:var(--brand)]"
                >
                  Usar AJC
                </button>
              )}
            </div>
          </label>
          <label>
            <FieldLabel>Buscar cliente ou fornecedor proprietário</FieldLabel>
            <input
              disabled={locked}
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="nome, CPF/CNPJ ou tipo"
              className="field-control"
            />
          </label>
          {!locked && ownerSearch && (
            <div className="max-h-52 overflow-auto rounded-lg bg-[color:var(--muted)] ring-1 ring-[color:var(--hairline)]">
              {ownerResults.map((owner) => (
                <button
                  key={owner.chave}
                  type="button"
                  onClick={() => {
                    setOwnerKey(owner.chave);
                    setOwnerSearch("");
                  }}
                  className="flex w-full items-center justify-between border-b border-[color:var(--hairline)] px-3 py-2.5 text-left last:border-0 hover:bg-[color:var(--accent)]"
                >
                  <span>
                    <b className="text-sm">{owner.nome}</b>
                    <small className="block text-muted-foreground">
                      {owner.documento || "sem documento"}
                    </small>
                  </span>
                  <Tag tone="neutral">{owner.tipo}</Tag>
                </button>
              ))}
              {!ownerResults.length && (
                <p className="p-3 text-xs text-muted-foreground">Nenhum cadastro encontrado.</p>
              )}
            </div>
          )}
          <label>
            <FieldLabel>Local físico atual</FieldLabel>
            <select
              disabled={locked}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="field-control"
            >
              <option value="">Selecionar local</option>
              {locations.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.nome} · {local.tipo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>
              <b className="block text-sm">Cadastro ativo</b>
              <small className="text-muted-foreground">
                Paletes inativos não aparecem para novas conferências.
              </small>
            </span>
          </label>
        </div>
        {error && <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p>}
        <footer className="mt-6 flex justify-end gap-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving || locked}>
            {saving ? "Salvando…" : "Salvar cadastro"}
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
}

function PaleteDetail({
  palete,
  conferences,
  locations,
  onClose,
  onReleased,
}: {
  palete: TmsPaleteApi;
  conferences: TmsConferenciaResumoApi[];
  locations: TmsLocalOperacionalApi[];
  onClose: () => void;
  onReleased: () => Promise<void>;
}) {
  const [release, setRelease] = useState(false);
  const [locationId, setLocationId] = useState(locations.find((l) => l.tipo === "porto")?.id ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirmRelease() {
    setSaving(true);
    setError(null);
    try {
      await releaseTmsPalete(palete.id, {
        localOperacionalId: locationId,
        motivo: reason,
        clientUuid: crypto.randomUUID(),
      });
      await onReleased();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível liberar o palete.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[color:var(--surface)] p-5 shadow-2xl">
        <header className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-[color:var(--brand)]">{palete.codigo}</p>
            <h3 className="mt-1 font-display text-2xl">Composição e histórico</h3>
          </div>
          <button onClick={onClose} className="icon-button">
            <X className="h-5 w-5" />
          </button>
        </header>
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[color:var(--hairline)] ring-1 ring-[color:var(--hairline)]">
          {[
            ["Proprietário", palete.proprietario_nome],
            ["Local", palete.local_nome ?? "Não informado"],
            ["Situação", palete.status],
            ["Unitização", palete.tipo_unitizacao ?? "Sem composição"],
            ["Estado", palete.estado_composicao],
            ["Viagem", palete.viagem_codigo ?? "Não alocado"],
          ].map(([term, value]) => (
            <div key={term} className="bg-[color:var(--surface-elev)] p-3">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{term}</dt>
              <dd className="mt-1 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Conferências vinculadas</h4>
            <span className="text-xs text-muted-foreground">{conferences.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {conferences.map((conf) => (
              <div
                key={conf.id}
                className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"
              >
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-xs">{conf.viagem_codigo}</span>
                  <StatusChip
                    tone={
                      conf.status === "divergente"
                        ? "danger"
                        : conf.status === "fechada"
                          ? "success"
                          : "warning"
                    }
                    size="sm"
                  >
                    {conf.status}
                  </StatusChip>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {conf.documentos} NF/DC · {conf.volumes_conferidos}/{conf.volumes_informados}{" "}
                  volumes · {formatDate(conf.aberta_em)}
                </p>
              </div>
            ))}
            {!conferences.length && (
              <p className="rounded-lg bg-[color:var(--muted)] p-4 text-sm text-muted-foreground">
                Nenhuma conferência registrada para este palete.
              </p>
            )}
          </div>
        </section>
        {palete.status !== "livre" && (
          <section className="mt-6 border-t border-[color:var(--hairline)] pt-5">
            <button
              onClick={() => setRelease(!release)}
              className="text-sm font-medium text-[color:var(--brand)]"
            >
              {release ? "Cancelar liberação" : "Registrar retorno e liberar palete"}
            </button>
            {release && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  A API só concluirá se todos os volumes estiverem entregues.
                </p>
                <label>
                  <FieldLabel>Porto onde o palete está</FieldLabel>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="field-control"
                  >
                    <option value="">Selecionar porto</option>
                    {locations
                      .filter((l) => l.tipo === "porto")
                      .map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nome}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Motivo / reconciliação</FieldLabel>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="field-control min-h-24 py-2"
                    placeholder="Descreva descarga, conferência e retorno físico"
                  />
                </label>
                {error && <p className="text-xs text-[color:var(--danger)]">{error}</p>}
                <PrimaryButton
                  onClick={confirmRelease}
                  disabled={saving || !locationId || reason.trim().length < 5}
                >
                  {saving ? "Validando…" : "Confirmar liberação"}
                </PrimaryButton>
              </div>
            )}
          </section>
        )}
      </aside>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}
function label(value: string) {
  return value.replaceAll("_", " ");
}
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
