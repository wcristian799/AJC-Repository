import { useEffect, useState } from "react";
import { Gauge, Save } from "lucide-react";
import { PrimaryButton, StatusChip } from "@/components/ops/primitives";
import { getConfigValue, publishConfigValue, type ConfigValueApi, type TmsControleConfigApi } from "@/lib/ajc-api";

type ControlConfig = Omit<TmsControleConfigApi, "versao">;

export function OperationalTmsControlConfig() {
  const [published, setPublished] = useState<ConfigValueApi | null>(null);
  const [draft, setDraft] = useState<ControlConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getConfigValue("tms_controle_viagem")
      .then((value) => {
        setPublished(value);
        setDraft(value.valor as ControlConfig);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Falha ao carregar o controle por viagem."));
  }, []);

  if (!draft) return <div className="surface-card p-5 text-sm text-muted-foreground">{message ?? "Carregando configuração do controle por viagem..."}</div>;
  const dirty = JSON.stringify(published?.valor) !== JSON.stringify(draft);
  const numberField = (key: keyof ControlConfig) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: Number(event.target.value) });

  async function publish() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("tms_controle_viagem", draft);
      setPublished(saved);
      setDraft(saved.valor as ControlConfig);
      setMessage(`Versão ${saved.versao} publicada. O painel já passou a usar estes parâmetros.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível publicar o controle por viagem.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
        <div>
          <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-[color:var(--brand)]" /><h3 className="font-display text-xl">Controle de carga por viagem</h3></div>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">Atualização automática, período inicial, paginação e limites operacionais do painel e das trilhas de auditoria.</p>
        </div>
        <div className="flex items-center gap-2"><StatusChip tone="neutral">versão {published?.versao ?? "-"}</StatusChip>{dirty && <StatusChip tone="warning">não publicada</StatusChip>}</div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <FieldGroup title="Atualização e período" description="Comportamento padrão ao abrir o painel.">
          <Field label="Atualização automática (seg)"><input type="number" min={10} max={300} value={draft.atualizacaoSegundos} onChange={numberField("atualizacaoSegundos")} /></Field>
          <Field label="Dias anteriores"><input type="number" min={1} max={365} value={draft.diasPassadosPadrao} onChange={numberField("diasPassadosPadrao")} /></Field>
          <Field label="Dias futuros"><input type="number" min={0} max={365} value={draft.diasFuturosPadrao} onChange={numberField("diasFuturosPadrao")} /></Field>
          <Field label="Fuso operacional"><input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} /></Field>
        </FieldGroup>
        <FieldGroup title="Listagem e exportação" description="Protege a experiência mesmo com milhares de viagens.">
          <Field label="Itens por página"><input type="number" min={5} max={draft.maximoPorPagina} value={draft.itensPorPagina} onChange={numberField("itensPorPagina")} /></Field>
          <Field label="Máximo por página"><input type="number" min={20} max={500} value={draft.maximoPorPagina} onChange={numberField("maximoPorPagina")} /></Field>
          <Field label="Limite da exportação"><input type="number" min={100} max={20000} value={draft.limiteExportacao} onChange={numberField("limiteExportacao")} /></Field>
        </FieldGroup>
        <FieldGroup title="Auditoria operacional" description="Profundidade dos detalhes exibidos por volume.">
          <Field label="Eventos por volume"><input type="number" min={10} max={500} value={draft.limiteEventosPorVolume} onChange={numberField("limiteEventosPorVolume")} /></Field>
          <Field label="Divergências em destaque"><input type="number" min={5} max={100} value={draft.limiteDivergenciasPainel} onChange={numberField("limiteDivergenciasPainel")} /></Field>
        </FieldGroup>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
        <p className="text-xs text-muted-foreground">Cada publicação gera uma versão auditável. Nenhum desses parâmetros fica preso no front ou no backend.</p>
        <PrimaryButton icon={Save} disabled={!dirty || saving} onClick={publish}>{saving ? "Publicando..." : "Publicar configuração"}</PrimaryButton>
      </div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}

function FieldGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-[color:var(--surface-tint)] p-4 ring-1 ring-[color:var(--hairline)]"><h4 className="text-sm font-semibold">{title}</h4><p className="mt-1 text-[11px] text-muted-foreground">{description}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:bg-[color:var(--muted)] [&_input]:px-3 [&_input]:text-sm [&_input]:ring-1 [&_input]:ring-[color:var(--hairline)]">{children}</div></label>;
}
