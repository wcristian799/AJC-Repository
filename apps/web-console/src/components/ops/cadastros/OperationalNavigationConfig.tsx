import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Plus, Route, Save, Trash2, X } from "lucide-react";
import { GhostButton, PrimaryButton, StatusChip } from "@/components/ops/primitives";
import {
  getConfigValue,
  listEmbarcacoes,
  publishConfigValue,
  type CidadeApi,
  type ConfigValueApi,
  type EmbarcacaoApi,
  type RotaTemplateApi,
} from "@/lib/ajc-api";

type ConfigDraft = {
  schemaVersion: 1;
  fonte?: string;
  rotas: Array<Omit<RotaTemplateApi, "configVersaoId" | "configVersao">>;
};

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function OperationalNavigationConfig({ cidades }: { cidades: CidadeApi[] }) {
  const [config, setConfig] = useState<ConfigValueApi | null>(null);
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [boats, setBoats] = useState<EmbarcacaoApi[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([getConfigValue("navegacao_rotas_horarios"), listEmbarcacoes()])
      .then(([value, fleet]) => {
        if (!alive) return;
        const parsed = value.valor as ConfigDraft;
        setConfig(value);
        setDraft({ ...parsed, rotas: parsed.rotas ?? [] });
        setSelectedId(parsed.rotas?.[0]?.id ?? null);
        setBoats(fleet);
      })
      .catch(
        (error) =>
          alive && setMessage(error instanceof Error ? error.message : "Falha ao carregar rotas."),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => draft?.rotas.find((route) => route.id === selectedId) ?? null,
    [draft, selectedId],
  );
  const dirty = Boolean(config && draft && JSON.stringify(config.valor) !== JSON.stringify(draft));

  function updateRoute(change: Partial<ConfigDraft["rotas"][number]>) {
    if (!draft || !selectedId) return;
    setDraft({
      ...draft,
      rotas: draft.rotas.map((route) =>
        route.id === selectedId ? { ...route, ...change } : route,
      ),
    });
    setMessage(null);
  }

  function addRoute() {
    if (!draft) return;
    const route: ConfigDraft["rotas"][number] = {
      id: `rota-${crypto.randomUUID()}`,
      nome: "",
      origemSigla: "",
      destinoSigla: "",
      diaSemana: 1,
      horaSaida: "00:00",
      ativo: true,
      paradas: [],
    };
    setDraft({ ...draft, rotas: [...draft.rotas, route] });
    setSelectedId(route.id);
  }

  function removeRoute() {
    if (!draft || !selectedId) return;
    const routes = draft.rotas.filter((route) => route.id !== selectedId);
    setDraft({ ...draft, rotas: routes });
    setSelectedId(routes[0]?.id ?? null);
    setConfirming(false);
  }

  function addStop() {
    if (!selected) return;
    updateRoute({
      paradas: [
        ...selected.paradas,
        { cidadeSigla: "", offsetMinutos: (selected.paradas.at(-1)?.offsetMinutos ?? 0) + 60 },
      ],
    });
  }

  function updateStop(
    index: number,
    change: Partial<{ cidadeSigla: string; offsetMinutos: number }>,
  ) {
    if (!selected) return;
    updateRoute({
      paradas: selected.paradas.map((stop, stopIndex) =>
        stopIndex === index ? { ...stop, ...change } : stop,
      ),
    });
  }

  function removeStop(index: number) {
    if (!selected) return;
    updateRoute({ paradas: selected.paradas.filter((_, stopIndex) => stopIndex !== index) });
  }

  async function publish() {
    if (!draft || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("navegacao_rotas_horarios", draft);
      setConfig(saved);
      setDraft(saved.valor as ConfigDraft);
      setConfirming(false);
      setMessage(`Versão ${saved.versao} publicada. Novas viagens já usam esta programação.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível publicar a programação.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="surface-card p-6 text-sm text-muted-foreground">
        Carregando programação operacional…
      </div>
    );
  if (!draft)
    return (
      <div className="surface-card p-6 text-sm text-[color:var(--danger)]">
        {message ?? "Programação não encontrada. Aplique a migration 0024."}
      </div>
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="surface-card overflow-hidden">
        <div className="flex items-start justify-between border-b border-[color:var(--hairline)] p-4">
          <div>
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-[color:var(--brand)]" />
              <p className="font-medium">Rotas e horários</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Versão publicada {config?.versao ?? "—"}
            </p>
          </div>
          <GhostButton icon={Plus} onClick={addRoute}>
            Rota
          </GhostButton>
        </div>
        <div className="max-h-[620px] overflow-y-auto p-2">
          {draft.rotas.map((route) => (
            <button
              key={route.id}
              onClick={() => setSelectedId(route.id)}
              className={`mb-1 w-full border-l-2 px-3 py-3 text-left transition-colors ${selectedId === route.id ? "border-[color:var(--brand)] bg-[color:var(--brand)]/8" : "border-transparent hover:bg-[color:var(--muted)]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{route.nome || "Rota sem nome"}</p>
                {route.requerRevisao && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                )}
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {route.origemSigla || "—"} → {route.destinoSigla || "—"} · {DAYS[route.diaSemana]}{" "}
                {route.horaSaida}
              </p>
            </button>
          ))}
          {!draft.rotas.length && (
            <p className="p-4 text-xs text-muted-foreground">Nenhuma rota cadastrada.</p>
          )}
        </div>
      </aside>

      <section className="surface-card min-w-0 p-5">
        {!selected ? (
          <p className="text-sm text-muted-foreground">Selecione ou crie uma rota.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
              <div>
                <p className="font-display text-xl">Configuração da rota</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Alterações só entram em operação após publicar uma nova versão.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.ativo}
                  onChange={(event) => updateRoute({ ativo: event.target.checked })}
                />
                Rota ativa
              </label>
            </div>
            {selected.requerRevisao && (
              <div className="mt-4 flex gap-3 border-l-2 border-[color:var(--warning)] bg-[color:var(--warning)]/6 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning)]" />
                <div>
                  <p className="text-xs font-medium">Horário importado com divergência no FAQ</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.observacao}</p>
                  <button
                    className="mt-2 text-xs font-medium text-[color:var(--warning)]"
                    onClick={() => updateRoute({ requerRevisao: false })}
                  >
                    Marcar como revisado
                  </button>
                </div>
              </div>
            )}
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nome da rota" wide>
                <input
                  value={selected.nome}
                  onChange={(e) => updateRoute({ nome: e.target.value })}
                />
              </Field>
              <Field label="Origem">
                <CitySelect
                  value={selected.origemSigla}
                  cidades={cidades}
                  onChange={(value) => updateRoute({ origemSigla: value })}
                />
              </Field>
              <Field label="Destino">
                <CitySelect
                  value={selected.destinoSigla}
                  cidades={cidades}
                  onChange={(value) => updateRoute({ destinoSigla: value })}
                />
              </Field>
              <Field label="Dia da saída">
                <select
                  value={selected.diaSemana}
                  onChange={(e) => updateRoute({ diaSemana: Number(e.target.value) })}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Hora da saída">
                <input
                  type="time"
                  value={selected.horaSaida}
                  onChange={(e) => updateRoute({ horaSaida: e.target.value })}
                />
              </Field>
              <Field label="Embarcação padrão">
                <select
                  value={selected.embarcacaoPadraoId ?? ""}
                  onChange={(e) => updateRoute({ embarcacaoPadraoId: e.target.value || null })}
                >
                  <option value="">Escolher ao planejar</option>
                  {boats
                    .filter((boat) => boat.status === "ativa")
                    .map((boat) => (
                      <option key={boat.id} value={boat.id}>
                        {boat.nome}
                      </option>
                    ))}
                </select>
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Intertrechos</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tempo contado a partir da saída; a viagem grava as datas exatas.
                </p>
              </div>
              <GhostButton icon={Plus} onClick={addStop}>
                Parada
              </GhostButton>
            </div>
            <div className="mt-3 space-y-2">
              {selected.paradas.map((stop, index) => (
                <div
                  key={`${selected.id}-${index}`}
                  className="grid items-center gap-2 border-b border-[color:var(--hairline)] py-3 sm:grid-cols-[36px_minmax(150px,1fr)_minmax(230px,280px)_36px]"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CitySelect
                    value={stop.cidadeSigla}
                    cidades={cidades}
                    onChange={(value) => updateStop(index, { cidadeSigla: value })}
                  />
                  <StopOffsetInput
                    value={stop.offsetMinutos}
                    index={index}
                    onChange={(offsetMinutos) => updateStop(index, { offsetMinutos })}
                  />
                  <button
                    aria-label="Remover parada"
                    onClick={() => removeStop(index)}
                    className="text-muted-foreground hover:text-[color:var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!selected.paradas.length && (
                <p className="py-4 text-xs text-muted-foreground">
                  Adicione as paradas até o destino final.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
              <GhostButton icon={Trash2} onClick={removeRoute}>
                Excluir rota
              </GhostButton>
              <div className="flex items-center gap-2">
                {dirty && <StatusChip tone="warning">alterações não publicadas</StatusChip>}
                <PrimaryButton icon={Save} disabled={!dirty} onClick={() => setConfirming(true)}>
                  Publicar versão
                </PrimaryButton>
              </div>
            </div>
          </>
        )}
        {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
      </section>

      {confirming && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
          <div className="surface-card w-full max-w-lg p-6">
            <p className="font-display text-xl">Publicar nova programação?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Novas viagens usarão esta versão. Viagens já planejadas preservam a programação que
              originou o lançamento.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <GhostButton icon={X} onClick={() => setConfirming(false)}>
                Revisar
              </GhostButton>
              <PrimaryButton icon={Check} disabled={saving} onClick={publish}>
                {saving ? "Publicando…" : "Confirmar publicação"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StopOffsetInput({
  value,
  index,
  onChange,
}: {
  value: number;
  index: number;
  onChange: (value: number) => void;
}) {
  const totalMinutes = Math.max(0, Math.trunc(Number(value) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  function updateHours(nextHours: number) {
    onChange(Math.max(0, Math.trunc(nextHours || 0)) * 60 + minutes);
  }

  function updateMinutes(nextMinutes: number) {
    const normalizedMinutes = Math.min(59, Math.max(0, Math.trunc(nextMinutes || 0)));
    onChange(hours * 60 + normalizedMinutes);
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[11px] font-medium text-muted-foreground">
        Tempo após a saída
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="relative min-w-0">
          <span className="sr-only">Horas após a saída da parada {index + 1}</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={hours}
            onChange={(event) => updateHours(Number(event.target.value))}
            className="w-full pr-9 tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            h
          </span>
        </label>
        <label className="relative min-w-0">
          <span className="sr-only">Minutos após a saída da parada {index + 1}</span>
          <input
            type="number"
            min={0}
            max={59}
            step={1}
            inputMode="numeric"
            value={minutes}
            onChange={(event) => updateMinutes(Number(event.target.value))}
            className="w-full pr-11 tabular-nums"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            min
          </span>
        </label>
      </div>
    </fieldset>
  );
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "xl:col-span-2" : ""}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:bg-[color:var(--muted)] [&_input]:px-3 [&_input]:text-sm [&_input]:ring-1 [&_input]:ring-[color:var(--hairline)] [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:bg-[color:var(--muted)] [&_select]:px-3 [&_select]:text-sm [&_select]:ring-1 [&_select]:ring-[color:var(--hairline)]">
        {children}
      </div>
    </label>
  );
}

function CitySelect({
  value,
  cidades,
  onChange,
}: {
  value: string;
  cidades: CidadeApi[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]"
    >
      <option value="">Selecione a cidade</option>
      {cidades
        .filter((city) => city.ativo)
        .map((city) => (
          <option key={city.sigla} value={city.sigla}>
            {city.nome} · {city.sigla}
          </option>
        ))}
    </select>
  );
}
