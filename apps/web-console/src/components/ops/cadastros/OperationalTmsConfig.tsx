import { useEffect, useState } from "react";
import { CalendarClock, Save } from "lucide-react";
import { PrimaryButton, StatusChip } from "@/components/ops/primitives";
import { getConfigValue, publishConfigValue, type ConfigValueApi } from "@/lib/ajc-api";

type ScheduleConfig = {
  schemaVersion: 1;
  timezone: string;
  horaInicio: string;
  horaFim: string;
  intervaloMinutos: number;
  capacidadePorJanela: number;
  atualizacaoSegundos: number;
};

export function OperationalTmsConfig() {
  const [published, setPublished] = useState<ConfigValueApi | null>(null);
  const [draft, setDraft] = useState<ScheduleConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getConfigValue("tms_agendamento_recebimento")
      .then((value) => { setPublished(value); setDraft(value.valor as ScheduleConfig); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Falha ao carregar a agenda TMS."));
  }, []);

  if (!draft) return <div className="surface-card p-5 text-sm text-muted-foreground">{message ?? "Carregando configuracao do TMS..."}</div>;
  const dirty = JSON.stringify(published?.valor) !== JSON.stringify(draft);

  async function publish() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("tms_agendamento_recebimento", draft);
      setPublished(saved);
      setDraft(saved.valor as ScheduleConfig);
      setMessage(`Versao ${saved.versao} publicada. Novos agendamentos ja usam esta regra.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel publicar a agenda TMS.");
    } finally { setSaving(false); }
  }

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
        <div><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[color:var(--brand)]" /><h3 className="font-display text-xl">Recebimento de NF/DC</h3></div><p className="mt-1 text-xs text-muted-foreground">Horario, janela, capacidade e atualizacao da agenda operacional.</p></div>
        <div className="flex items-center gap-2"><StatusChip tone="neutral">versao {published?.versao ?? "-"}</StatusChip>{dirty && <StatusChip tone="warning">nao publicada</StatusChip>}</div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Inicio"><input type="time" value={draft.horaInicio} onChange={(event) => setDraft({ ...draft, horaInicio: event.target.value })} /></Field>
        <Field label="Fim"><input type="time" value={draft.horaFim} onChange={(event) => setDraft({ ...draft, horaFim: event.target.value })} /></Field>
        <Field label="Janela (min)"><input type="number" min={5} max={240} value={draft.intervaloMinutos} onChange={(event) => setDraft({ ...draft, intervaloMinutos: Number(event.target.value) })} /></Field>
        <Field label="Vagas por janela"><input type="number" min={1} max={100} value={draft.capacidadePorJanela} onChange={(event) => setDraft({ ...draft, capacidadePorJanela: Number(event.target.value) })} /></Field>
        <Field label="Atualizacao (seg)"><input type="number" min={10} max={300} value={draft.atualizacaoSegundos} onChange={(event) => setDraft({ ...draft, atualizacaoSegundos: Number(event.target.value) })} /></Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4"><p className="text-xs text-muted-foreground">A publicacao cria uma versao auditavel; nenhuma dessas regras fica presa no codigo.</p><PrimaryButton icon={Save} disabled={!dirty || saving} onClick={publish}>{saving ? "Publicando..." : "Publicar configuracao"}</PrimaryButton></div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span><div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:bg-[color:var(--muted)] [&_input]:px-3 [&_input]:text-sm [&_input]:ring-1 [&_input]:ring-[color:var(--hairline)]">{children}</div></label>; }
