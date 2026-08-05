import { useEffect, useMemo, useState } from "react";
import { CarFront, Plus, Save } from "lucide-react";
import { GhostButton, PrimaryButton, StatusChip } from "@/components/ops/primitives";
import { getConfigValue, publishConfigValue, type VeiculosOrigensConfigApi } from "@/lib/ajc-api";

type Draft = VeiculosOrigensConfigApi["valor"];

export function OperationalVeiculosConfig() {
  const [published, setPublished] = useState<VeiculosOrigensConfigApi | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getConfigValue("veiculos_origens_cadastro")
      .then((config) => {
        const typed = config as VeiculosOrigensConfigApi;
        setPublished(typed);
        setDraft(typed.valor);
      })
      .catch((cause) => setMessage(cause instanceof Error ? cause.message : "Falha ao carregar as origens de Veiculos."));
  }, []);

  const publishedCodes = useMemo(() => new Set(published?.valor.origens.map((origem) => origem.codigo) ?? []), [published]);
  if (!draft) return <section className="surface-card p-5 text-sm text-muted-foreground">{message ?? "Carregando origens de Veiculos e Maquinas..."}</section>;
  const dirty = JSON.stringify(published?.valor) !== JSON.stringify(draft);

  function addOrigin() {
    let index = draft.origens.length + 1;
    let codigo = `nova_origem_${index}`;
    while (draft.origens.some((item) => item.codigo === codigo)) codigo = `nova_origem_${++index}`;
    setDraft({ ...draft, origens: [...draft.origens, { codigo, nome: "Nova origem", ativo: true }] });
  }

  function updateOrigin(index: number, patch: Partial<Draft["origens"][number]>) {
    setDraft({ ...draft, origens: draft.origens.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  async function publish() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("veiculos_origens_cadastro", draft) as VeiculosOrigensConfigApi;
      setPublished(saved);
      setDraft(saved.valor);
      setMessage(`Versao ${saved.versao} publicada. Novos envios ja usam estas origens.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Nao foi possivel publicar as origens.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] pb-4">
        <div>
          <div className="flex items-center gap-2"><CarFront className="h-4 w-4 text-[color:var(--brand)]" /><h3 className="font-display text-xl">Origens de Veiculos e Maquinas</h3></div>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">Define de onde um envio pode ser cadastrado. O codigo publicado fica imutavel para preservar historico; nome, disponibilidade e origem padrao continuam editaveis.</p>
        </div>
        <div className="flex items-center gap-2"><StatusChip tone="neutral">versao {published?.versao ?? "-"}</StatusChip>{dirty && <StatusChip tone="warning">nao publicada</StatusChip>}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-[color:var(--hairline)]">
        <div className="grid grid-cols-[minmax(8rem,0.8fr)_minmax(12rem,1.4fr)_7rem_7rem] gap-3 bg-[color:var(--surface-tint)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Codigo</span><span>Nome exibido</span><span>Ativa</span><span>Padrao</span>
        </div>
        <div className="divide-y divide-[color:var(--hairline)]">
          {draft.origens.map((origem, index) => {
            const isDefault = draft.origemPadrao === origem.codigo;
            const codeLocked = publishedCodes.has(origem.codigo);
            return <div key={`${origem.codigo}-${index}`} className="grid grid-cols-[minmax(8rem,0.8fr)_minmax(12rem,1.4fr)_7rem_7rem] items-center gap-3 px-4 py-3">
              <input aria-label={`Codigo da origem ${index + 1}`} value={origem.codigo} disabled={codeLocked} onChange={(event) => updateOrigin(index, { codigo: normalizeCode(event.target.value) })} className="h-10 min-w-0 rounded-md bg-[color:var(--muted)] px-3 font-mono text-xs ring-1 ring-[color:var(--hairline)] disabled:opacity-65" />
              <input aria-label={`Nome da origem ${index + 1}`} value={origem.nome} onChange={(event) => updateOrigin(index, { nome: event.target.value })} className="h-10 min-w-0 rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
              <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={origem.ativo} disabled={isDefault} onChange={(event) => updateOrigin(index, { ativo: event.target.checked })} />Ativa</label>
              <label className="inline-flex items-center gap-2 text-xs"><input type="radio" name="origem-padrao" checked={isDefault} disabled={!origem.ativo} onChange={() => setDraft({ ...draft, origemPadrao: origem.codigo })} />Padrao</label>
            </div>;
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <GhostButton icon={Plus} onClick={addOrigin}>Adicionar origem</GhostButton>
        <PrimaryButton icon={Save} disabled={!dirty || saving} onClick={publish}>{saving ? "Publicando..." : "Publicar configuracao"}</PrimaryButton>
      </div>
      {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
    </section>
  );
}

function normalizeCode(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]/g, "_").slice(0, 60);
}
