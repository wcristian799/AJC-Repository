import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Building2, CheckCircle2, Edit3, MapPin, Plus, Save, Search, X } from "lucide-react";
import { GhostButton, PrimaryButton, StatusChip } from "@/components/ops/primitives";
import {
  createCidade,
  updateCidade,
  type CidadeApi,
  type SaveCidadeInput,
} from "@/lib/ajc-api";

type Filter = "ativas" | "inativas" | "todas";

const EMPTY_DRAFT: SaveCidadeInput = {
  sigla: "",
  nome: "",
  uf: "",
  codigoIbge: "",
  isBase: false,
  ativo: true,
};

export function CitiesRegistry({
  cidades,
  onCidadesChange,
}: {
  cidades: CidadeApi[];
  onCidadesChange: (cidades: CidadeApi[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ativas");
  const [draft, setDraft] = useState<SaveCidadeInput>(EMPTY_DRAFT);
  const [editingSigla, setEditingSigla] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    const frame = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [formOpen, editingSigla]);

  const sorted = useMemo(
    () => [...cidades].sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.nome.localeCompare(b.nome, "pt-BR")),
    [cidades],
  );
  const visible = useMemo(() => {
    const needle = normalize(search);
    return sorted.filter((city) => {
      if (filter === "ativas" && !city.ativo) return false;
      if (filter === "inativas" && city.ativo) return false;
      return !needle || normalize(`${city.nome} ${city.sigla} ${city.uf} ${city.codigoIbge ?? ""}`).includes(needle);
    });
  }, [filter, search, sorted]);

  const activeCount = cidades.filter((city) => city.ativo).length;
  const baseCount = cidades.filter((city) => city.ativo && city.isBase).length;

  function openCreate() {
    setEditingSigla(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
    setMessage(null);
  }

  function openEdit(city: CidadeApi) {
    setEditingSigla(city.sigla);
    setDraft({
      sigla: city.sigla,
      nome: city.nome,
      uf: city.uf,
      codigoIbge: city.codigoIbge ?? "",
      isBase: city.isBase,
      ativo: city.ativo,
    });
    setFormOpen(true);
    setMessage(null);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingSigla(null);
    setDraft(EMPTY_DRAFT);
  }

  async function save() {
    if (saving) return;
    const nome = draft.nome.trim();
    const sigla = draft.sigla?.trim().toUpperCase() ?? "";
    const uf = draft.uf.trim().toUpperCase();
    if (nome.length < 2) {
      setMessage({ tone: "danger", text: "Informe o nome completo da cidade." });
      return;
    }
    if (!editingSigla && !/^[A-Z0-9]{2,4}$/.test(sigla)) {
      setMessage({ tone: "danger", text: "A sigla deve ter de 2 a 4 letras ou números." });
      return;
    }
    if (!/^[A-Z]{2}$/.test(uf)) {
      setMessage({ tone: "danger", text: "Informe a UF com duas letras, por exemplo PA." });
      return;
    }
    const codigoIbge = draft.codigoIbge?.replace(/\D/g, "") || null;
    if (codigoIbge !== null && !/^[0-9]{7}$/.test(codigoIbge)) {
      setMessage({ tone: "danger", text: "O código IBGE deve ter exatamente 7 dígitos." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...draft, sigla, nome, uf, codigoIbge };
      const saved = editingSigla
        ? await updateCidade(editingSigla, payload)
        : await createCidade(payload);
      onCidadesChange(
        [saved, ...cidades.filter((city) => city.sigla !== saved.sigla)].sort(
          (a, b) => Number(b.isBase) - Number(a.isBase) || a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setFormOpen(false);
      setEditingSigla(null);
      setDraft(EMPTY_DRAFT);
      setMessage({
        tone: "success",
        text: editingSigla
          ? `${saved.nome} foi atualizada.`
          : `${saved.nome} foi cadastrada e já está disponível nas configurações de rota.`,
      });
    } catch (error) {
      setMessage({
        tone: "danger",
        text: error instanceof Error ? error.message : "Não foi possível salvar a cidade.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 space-y-4" aria-labelledby="cities-title">
      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--hairline)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--brand)]" />
              <h2 id="cities-title" className="text-lg font-semibold text-foreground">Cidades operacionais</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Cadastre primeiro a cidade. Depois, inclua-a em uma rota, configure o porto/local e publique os preços aplicáveis.
            </p>
          </div>
          <PrimaryButton icon={Plus} onClick={openCreate}>Nova cidade</PrimaryButton>
        </div>

        <div className="grid gap-px bg-[color:var(--hairline)] sm:grid-cols-3">
          <Summary label="Cidades ativas" value={activeCount} />
          <Summary label="Cidades-base" value={baseCount} />
          <Summary label="Total cadastrado" value={cidades.length} />
        </div>
      </div>

      {formOpen && (
        <div ref={formRef} className="surface-card scroll-mt-4 p-5" role="region" aria-label={editingSigla ? "Editar cidade" : "Nova cidade"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{editingSigla ? `Editar ${editingSigla}` : "Cadastrar cidade"}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                A sigla vira a referência operacional de viagens, preços e documentos e não pode ser alterada depois.
              </p>
            </div>
            <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--muted)] hover:text-foreground" aria-label="Fechar formulário">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-[140px_minmax(240px,1fr)_100px_170px_180px]">
            <Field label="Sigla operacional" hint={editingSigla ? "Imutável" : "2 a 4 caracteres"}>
              <input
                value={draft.sigla ?? ""}
                maxLength={4}
                disabled={Boolean(editingSigla)}
                onChange={(event) => setDraft({ ...draft, sigla: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                placeholder="MCP"
                autoComplete="off"
              />
            </Field>
            <Field label="Nome da cidade">
              <input value={draft.nome} onChange={(event) => setDraft({ ...draft, nome: event.target.value })} placeholder="Melgaço" autoComplete="off" />
            </Field>
            <Field label="UF" hint="2 letras">
              <input
                value={draft.uf}
                maxLength={2}
                onChange={(event) => setDraft({ ...draft, uf: event.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
                placeholder="PA"
                autoComplete="off"
              />
            </Field>
            <Field label="Código IBGE" hint="Obrigatório para BP-e">
              <input
                value={draft.codigoIbge ?? ""}
                inputMode="numeric"
                maxLength={7}
                onChange={(event) => setDraft({ ...draft, codigoIbge: event.target.value.replace(/\D/g, "") })}
                placeholder="1501402"
                autoComplete="off"
              />
            </Field>
            <div className="flex flex-col justify-end gap-2 pb-0.5">
              <Toggle checked={draft.isBase} onChange={(checked) => setDraft({ ...draft, isBase: checked })} label="Cidade-base" />
              <Toggle checked={draft.ativo} onChange={(checked) => setDraft({ ...draft, ativo: checked })} label="Cadastro ativo" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--hairline)] pt-4">
            <GhostButton icon={X} onClick={closeForm}>Cancelar</GhostButton>
            <PrimaryButton icon={Save} disabled={saving} onClick={save}>
              {saving ? "Salvando…" : editingSigla ? "Salvar alterações" : "Cadastrar cidade"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {message && (
        <div
          aria-live="polite"
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ring-1 ${
            message.tone === "success"
              ? "bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)]"
              : "bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] text-[color:var(--danger)] ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)]"
          }`}
        >
          {message.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color:var(--hairline)] p-3 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar cidade</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por cidade, sigla, UF ou código IBGE…"
              className="field pl-10"
            />
          </label>
          <div className="flex gap-1 rounded-lg bg-[color:var(--muted)] p-1" aria-label="Filtrar cidades">
            {(["ativas", "inativas", "todas"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors ${filter === option ? "bg-[color:var(--surface-elev)] text-foreground ring-1 ring-[color:var(--hairline-strong)]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[90px_minmax(190px,1fr)_70px_120px_120px_100px] gap-3 border-b border-[color:var(--hairline)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid">
          <span>Sigla</span><span>Cidade</span><span>UF</span><span>Código IBGE</span><span>Situação</span><span className="text-right">Ação</span>
        </div>
        <div className="divide-y divide-[color:var(--hairline)]">
          {visible.map((city) => (
            <div key={city.sigla} className="grid gap-3 px-4 py-4 transition-colors hover:bg-[color:var(--muted)]/45 md:grid-cols-[90px_minmax(190px,1fr)_70px_120px_120px_100px] md:items-center">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">{city.sigla}</span>
                {city.isBase && <Building2 className="h-3.5 w-3.5 text-[color:var(--champagne)]" aria-label="Cidade-base" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{city.nome}</p>
                <p className="mt-0.5 text-xs text-muted-foreground md:hidden">{city.uf} · IBGE {city.codigoIbge ?? "não informado"} · {city.isBase ? "Cidade-base" : "Cidade operacional"}</p>
              </div>
              <span className="hidden text-sm text-muted-foreground md:block">{city.uf}</span>
              <span className={`hidden font-mono text-xs md:block ${city.codigoIbge ? "text-foreground" : "text-[color:var(--warning)]"}`}>
                {city.codigoIbge ?? "Pendente"}
              </span>
              <StatusChip tone={city.ativo ? "success" : "neutral"}>{city.ativo ? "Ativa" : "Inativa"}</StatusChip>
              <button type="button" onClick={() => openEdit(city)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] transition-colors hover:bg-[color:var(--accent)]" aria-label={`Editar ${city.nome}`}>
                <Edit3 className="h-3.5 w-3.5" /> Editar
              </button>
            </div>
          ))}
          {!visible.length && (
            <div className="px-5 py-12 text-center">
              <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Nenhuma cidade encontrada</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Ajuste a busca ou o filtro. Para uma cidade nova, use “Nova cidade”.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[color:var(--surface-elev)] px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label>
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-foreground">
        {label}{hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      <span className="block [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[color:var(--hairline)] [&_input]:bg-[color:var(--surface-elev)] [&_input]:px-3 [&_input]:text-sm [&_input]:outline-none [&_input]:transition-colors [&_input]:focus:border-[color:var(--ring)] [&_input:disabled]:cursor-not-allowed [&_input:disabled]:opacity-60">{children}</span>
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
