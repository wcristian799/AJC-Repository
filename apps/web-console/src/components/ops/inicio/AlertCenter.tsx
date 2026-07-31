import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BellPlus,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  Pencil,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  createOperacaoAlerta,
  getStoredAuth,
  updateOperacaoAlerta,
  type OperacaoAlertaApi,
} from "@/lib/ajc-api";
import { StatusChip } from "@/components/ops/primitives";

export type DerivedOperationalAlert = {
  id: string;
  titulo: string;
  detalhe: string;
  severidade: "info" | "warning" | "danger";
  modulo: string;
  href?: "/app/navegacao" | "/app/tms" | "/app/financeiro";
};

type AlertDraft = {
  titulo: string;
  detalhe: string;
  severidade: "info" | "warning" | "danger";
  modulo: string;
};

const EMPTY_DRAFT: AlertDraft = {
  titulo: "",
  detalhe: "",
  severidade: "warning",
  modulo: "operacao",
};

const MODULE_OPTIONS = [
  ["operacao", "Operação"],
  ["navegacao", "Navegação"],
  ["tms", "TMS / Cargas"],
  ["vendas", "Vendas"],
  ["caixa", "Caixa"],
  ["cadastros", "Cadastros"],
] as const;

const SEVERITY_OPTIONS = [
  { value: "info" as const, label: "Informativo", hint: "Acompanhamento", Icon: Info },
  { value: "warning" as const, label: "Atenção", hint: "Precisa de ação", Icon: CircleAlert },
  { value: "danger" as const, label: "Crítico", hint: "Ação imediata", Icon: ShieldAlert },
];

export function AlertCenter({
  alerts,
  derivedAlerts,
  onAlertsChange,
}: {
  alerts: OperacaoAlertaApi[];
  derivedAlerts: DerivedOperationalAlert[];
  onAlertsChange: (alerts: OperacaoAlertaApi[]) => void;
}) {
  const permissions = getStoredAuth()?.user.permissions ?? [];
  const canCreate = permissions.includes("operacao.criar");
  const canEdit = permissions.includes("operacao.editar");
  const [view, setView] = useState<"aberto" | "resolvido">("aberto");
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AlertDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const openAlerts = useMemo(() => alerts.filter((alert) => alert.status === "aberto"), [alerts]);
  const resolvedAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "resolvido"),
    [alerts],
  );
  const criticalCount =
    openAlerts.filter((alert) => alert.severidade === "danger").length +
    derivedAlerts.filter((alert) => alert.severidade === "danger").length;
  const warningCount =
    openAlerts.filter((alert) => alert.severidade === "warning").length +
    derivedAlerts.filter((alert) => alert.severidade === "warning").length;

  const visibleManualAlerts = useMemo(() => {
    const needle = normalizeSearch(query);
    const source = view === "aberto" ? openAlerts : resolvedAlerts;
    if (!needle) return source;
    return source.filter((alert) =>
      normalizeSearch(`${alert.titulo} ${alert.detalhe} ${alert.modulo ?? ""}`).includes(needle),
    );
  }, [openAlerts, query, resolvedAlerts, view]);

  const visibleDerivedAlerts = useMemo(() => {
    if (view !== "aberto") return [];
    const needle = normalizeSearch(query);
    if (!needle) return derivedAlerts;
    return derivedAlerts.filter((alert) =>
      normalizeSearch(`${alert.titulo} ${alert.detalhe} ${alert.modulo}`).includes(needle),
    );
  }, [derivedAlerts, query, view]);

  const totalVisible = visibleManualAlerts.length + visibleDerivedAlerts.length;
  const draftIsValid = draft.titulo.trim().length >= 3 && draft.detalhe.trim().length >= 5;

  function startCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
    setFeedback(null);
    setEditorOpen(true);
  }

  function startEdit(alert: OperacaoAlertaApi) {
    setEditingId(alert.id);
    setDraft({
      titulo: alert.titulo,
      detalhe: alert.detalhe,
      severidade: alert.severidade,
      modulo: alert.modulo || "operacao",
    });
    setError(null);
    setFeedback(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  async function saveAlert() {
    if (!draftIsValid || saving) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const input = {
        titulo: draft.titulo.trim(),
        detalhe: draft.detalhe.trim(),
        severidade: draft.severidade,
        modulo: draft.modulo,
        clientUuid: crypto.randomUUID(),
      };
      const saved = editingId
        ? await updateOperacaoAlerta(editingId, input)
        : await createOperacaoAlerta(input);
      const next = editingId
        ? alerts.map((alert) => (alert.id === saved.id ? saved : alert))
        : [saved, ...alerts];
      onAlertsChange(next);
      setFeedback(
        editingId
          ? "Alerta atualizado com trilha de auditoria."
          : "Alerta publicado para a operação.",
      );
      setEditorOpen(false);
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      setView("aberto");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o alerta.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(alert: OperacaoAlertaApi, status: "aberto" | "resolvido") {
    if (actingId) return;
    setActingId(alert.id);
    setError(null);
    setFeedback(null);
    try {
      const saved = await updateOperacaoAlerta(alert.id, {
        status,
        clientUuid: crypto.randomUUID(),
      });
      onAlertsChange(alerts.map((item) => (item.id === saved.id ? saved : item)));
      setFeedback(
        status === "resolvido"
          ? "Alerta resolvido e preservado no histórico."
          : "Alerta reaberto para a operação.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o alerta.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="surface-card overflow-hidden"
      aria-labelledby="alert-center-title"
    >
      <div className="border-b border-[color:var(--hairline)] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${
                criticalCount > 0
                  ? "bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)] text-[color:var(--danger)] ring-[color:color-mix(in_oklab,var(--danger)_35%,transparent)]"
                  : warningCount > 0
                    ? "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] ring-[color:color-mix(in_oklab,var(--warning)_35%,transparent)]"
                    : "bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)]"
              }`}
            >
              {criticalCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <h2 id="alert-center-title" className="font-display text-lg text-foreground">
                Central de alertas
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {criticalCount > 0
                  ? `${criticalCount} ${criticalCount === 1 ? "alerta crítico exige" : "alertas críticos exigem"} ação imediata.`
                  : warningCount > 0
                    ? `${warningCount} ${warningCount === 1 ? "alerta de atenção em acompanhamento" : "alertas de atenção em acompanhamento"}.`
                    : "Nenhuma ocorrência crítica aberta."}
              </p>
            </div>
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={editorOpen && !editingId ? closeEditor : startCreate}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[color:var(--brand)] px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            >
              {editorOpen && !editingId ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <BellPlus className="h-3.5 w-3.5" />
              )}
              {editorOpen && !editingId ? "Fechar" : "Novo alerta"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md bg-[color:var(--muted)] p-0.5 ring-1 ring-[color:var(--hairline)]"
            aria-label="Situação dos alertas"
          >
            <ViewButton active={view === "aberto"} onClick={() => setView("aberto")}>
              Abertos{" "}
              <span className="text-foreground/60">{openAlerts.length + derivedAlerts.length}</span>
            </ViewButton>
            <ViewButton active={view === "resolvido"} onClick={() => setView("resolvido")}>
              Histórico <span className="text-foreground/60">{resolvedAlerts.length}</span>
            </ViewButton>
          </div>
          <label className="relative min-w-[190px] flex-1 sm:max-w-[280px]">
            <span className="sr-only">Buscar alertas</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título ou módulo"
              className="h-9 w-full rounded-md bg-[color:var(--muted)] pl-9 pr-3 text-xs text-foreground outline-none ring-1 ring-[color:var(--hairline)] placeholder:text-muted-foreground focus:ring-[color:var(--ring)]"
            />
          </label>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editorOpen ? (
          <motion.div
            key="alert-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-[color:var(--hairline)] bg-[color:var(--surface-elev)]/55"
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingId ? "Editar alerta" : "Cadastrar alerta operacional"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    O registro fica visível no painel e entra na trilha de auditoria.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  aria-label="Fechar formulário"
                  className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-[color:var(--accent)] hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Título{" "}
                  <span className="font-normal text-muted-foreground">
                    — descreva o fato, não a ação
                  </span>
                  <input
                    value={draft.titulo}
                    maxLength={160}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, titulo: event.target.value }))
                    }
                    placeholder="Ex.: Embarque V-2026-003 com atraso"
                    className="h-10 rounded-md bg-[color:var(--card)] px-3 text-sm font-normal text-foreground outline-none ring-1 ring-[color:var(--hairline)] placeholder:text-muted-foreground focus:ring-[color:var(--ring)]"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-foreground">
                  Detalhamento{" "}
                  <span className="font-normal text-muted-foreground">
                    — contexto suficiente para quem vai agir
                  </span>
                  <textarea
                    value={draft.detalhe}
                    maxLength={2000}
                    rows={3}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, detalhe: event.target.value }))
                    }
                    placeholder="Informe o impacto, a localização e o que já foi verificado."
                    className="resize-y rounded-md bg-[color:var(--card)] px-3 py-2.5 text-sm font-normal text-foreground outline-none ring-1 ring-[color:var(--hairline)] placeholder:text-muted-foreground focus:ring-[color:var(--ring)]"
                  />
                </label>

                <div className="grid gap-4">
                  <fieldset>
                    <legend className="text-xs font-medium text-foreground">
                      Prioridade operacional
                    </legend>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {SEVERITY_OPTIONS.map(({ value, label, hint, Icon }) => {
                        const selected = draft.severidade === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setDraft((current) => ({ ...current, severidade: value }))
                            }
                            className={`min-w-0 rounded-md px-2.5 py-2 text-left ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] ${
                              selected
                                ? severitySelectedClass(value)
                                : "bg-[color:var(--card)] text-muted-foreground ring-[color:var(--hairline)] hover:bg-[color:var(--accent)] hover:text-foreground"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-semibold">
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] opacity-75">
                              {hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <label className="grid max-w-[260px] content-start gap-1.5 text-xs font-medium text-foreground">
                    Área responsável
                    <select
                      value={draft.modulo}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, modulo: event.target.value }))
                      }
                      className="h-10 rounded-md bg-[color:var(--card)] px-3 text-sm font-normal text-foreground outline-none ring-1 ring-[color:var(--hairline)] focus:ring-[color:var(--ring)]"
                    >
                      {MODULE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
                <p className="text-[11px] text-muted-foreground">
                  Título mínimo: 3 caracteres · detalhamento mínimo: 5.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeEditor}
                    disabled={saving}
                    className="h-9 rounded-md px-3 text-xs font-medium text-foreground hover:bg-[color:var(--accent)] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveAlert}
                    disabled={!draftIsValid || saving}
                    className="h-9 rounded-md bg-[color:var(--brand)] px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-[color:var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Publicar alerta"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error || feedback ? (
        <div
          aria-live="polite"
          className={`border-b border-[color:var(--hairline)] px-4 py-2.5 text-xs sm:px-5 ${error ? "bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] text-[color:var(--danger)]" : "bg-[color:color-mix(in_oklab,var(--success)_9%,transparent)] text-[color:var(--success)]"}`}
        >
          {error || feedback}
        </div>
      ) : null}

      <div className="max-h-[560px] overflow-y-auto">
        {totalVisible === 0 ? (
          <div className="grid min-h-40 place-items-center px-5 py-8 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-7 w-7 text-[color:var(--success)]" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {query
                  ? "Nenhum alerta encontrado"
                  : view === "aberto"
                    ? "Operação sem alertas abertos"
                    : "Nenhum alerta resolvido"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query
                  ? "Tente outro termo ou limpe a busca."
                  : view === "aberto"
                    ? "Novas ocorrências e alertas automáticos aparecerão aqui."
                    : "O histórico preserva as ocorrências encerradas."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--hairline)]">
            {visibleDerivedAlerts.map((alert) => (
              <li key={alert.id} className="px-4 py-4 sm:px-5">
                <AlertRowHeader
                  severity={alert.severidade}
                  title={alert.titulo}
                  module={alert.modulo}
                  automatic
                />
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {alert.detalhe}
                </p>
                {alert.href ? (
                  <Link
                    to={alert.href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand)] hover:underline"
                  >
                    Abrir origem <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </li>
            ))}
            {visibleManualAlerts.map((alert) => (
              <li key={alert.id} className="px-4 py-4 sm:px-5">
                <AlertRowHeader
                  severity={alert.severidade}
                  title={alert.titulo}
                  module={moduleLabel(alert.modulo)}
                />
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {alert.detalhe}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">
                    {alert.status === "resolvido"
                      ? `Resolvido ${formatAuditDate(alert.resolvido_em)}${alert.resolvido_por_nome ? ` por ${alert.resolvido_por_nome}` : ""}`
                      : `Criado ${formatAuditDate(alert.criado_em)}${alert.criado_por_nome ? ` por ${alert.criado_por_nome}` : ""}`}
                  </p>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      {alert.status === "aberto" ? (
                        <button
                          type="button"
                          onClick={() => startEdit(alert)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground/80 hover:bg-[color:var(--accent)] hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          changeStatus(alert, alert.status === "resolvido" ? "aberto" : "resolvido")
                        }
                        disabled={actingId === alert.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[color:var(--brand)] hover:bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] disabled:opacity-50"
                      >
                        {alert.status === "resolvido" ? (
                          <RotateCcw className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {actingId === alert.id
                          ? "Atualizando…"
                          : alert.status === "resolvido"
                            ? "Reabrir"
                            : "Resolver"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors ${active ? "bg-[color:var(--card)] text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function AlertRowHeader({
  severity,
  title,
  module,
  automatic = false,
}: {
  severity: "info" | "warning" | "danger";
  title: string;
  module: string;
  automatic?: boolean;
}) {
  const Icon = severity === "danger" ? AlertTriangle : severity === "warning" ? CircleAlert : Info;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${severityIconClass(severity)}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
          {automatic ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Gerado automaticamente pelos dados operacionais
            </p>
          ) : null}
        </div>
      </div>
      <StatusChip
        tone={severity === "danger" ? "danger" : severity === "warning" ? "warning" : "info"}
        size="xs"
      >
        {module}
      </StatusChip>
    </div>
  );
}

function severitySelectedClass(severity: AlertDraft["severidade"]) {
  if (severity === "danger")
    return "bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)] text-[color:var(--danger)] ring-[color:color-mix(in_oklab,var(--danger)_40%,transparent)]";
  if (severity === "warning")
    return "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)] ring-[color:color-mix(in_oklab,var(--warning)_40%,transparent)]";
  return "bg-[color:color-mix(in_oklab,var(--info)_14%,transparent)] text-[color:var(--info)] ring-[color:color-mix(in_oklab,var(--info)_40%,transparent)]";
}

function severityIconClass(severity: AlertDraft["severidade"]) {
  if (severity === "danger")
    return "bg-[color:color-mix(in_oklab,var(--danger)_14%,transparent)] text-[color:var(--danger)]";
  if (severity === "warning")
    return "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--warning)]";
  return "bg-[color:color-mix(in_oklab,var(--info)_14%,transparent)] text-[color:var(--info)]";
}

function moduleLabel(module: string | null) {
  return MODULE_OPTIONS.find(([value]) => value === module)?.[1] ?? module ?? "Operação";
}

function formatAuditDate(value: string | null) {
  if (!value) return "agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
