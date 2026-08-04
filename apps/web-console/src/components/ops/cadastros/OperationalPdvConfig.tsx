import { useEffect, useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { PrimaryButton, StatusChip } from "@/components/ops/primitives";
import { getPdvConfig, publishConfigValue, type PdvConfigApi } from "@/lib/ajc-api";

type Rules = PdvConfigApi["valor"];

export function OperationalPdvConfig() {
  const [published, setPublished] = useState<PdvConfigApi | null>(null);
  const [draft, setDraft] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    getPdvConfig()
      .then((value) => {
        setPublished(value);
        setDraft(structuredClone(value.valor));
      })
      .catch((cause) =>
        setMessage(cause instanceof Error ? cause.message : "Falha ao carregar o PDV"),
      );
  }, []);
  if (!draft)
    return (
      <section className="surface-card p-5 text-sm text-muted-foreground">
        {message || "Carregando configuração do PDV…"}
      </section>
    );
  const dirty = JSON.stringify(published?.valor) !== JSON.stringify(draft);
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const saved = await publishConfigValue("vendas_pdv_operacao", draft!);
      const value = { id: saved.chave, versao: saved.versao, valor: saved.valor as Rules };
      setPublished(value);
      setDraft(structuredClone(value.valor));
      setMessage(`Configuração do PDV publicada na versão ${saved.versao}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Falha ao publicar o PDV");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] p-5">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[color:var(--brand)]" />
            <h2 className="font-display text-xl">PDV de passagens</h2>
            <StatusChip tone="neutral">versão {published?.versao ?? "—"}</StatusChip>
            {dirty && <StatusChip tone="warning">não publicada</StatusChip>}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Caixa, meios de pagamento, parcelamento, nomes das classes, pulseiras, gratuidades, BP-e
            e impressão consumidos pela bilheteria presencial.
          </p>
        </div>
        <PrimaryButton icon={Save} disabled={!dirty || saving} onClick={save}>
          {saving ? "Publicando…" : "Publicar configuração"}
        </PrimaryButton>
      </header>
      <div className="space-y-5 p-5">
        <Block title="Estação e canal">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Canal padrão">
              <input
                className="field"
                value={draft.canalPadrao}
                onChange={(event) => setDraft({ ...draft, canalPadrao: event.target.value })}
              />
            </Field>
            <Field label="Tipo de caixa">
              <input
                className="field"
                value={draft.caixa.tipo}
                onChange={(event) =>
                  setDraft({ ...draft, caixa: { ...draft.caixa, tipo: event.target.value } })
                }
              />
            </Field>
            <Field label="Referência do caixa">
              <input
                className="field"
                value={draft.caixa.referenciaPadrao}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    caixa: { ...draft.caixa, referenciaPadrao: event.target.value },
                  })
                }
              />
            </Field>
            <Field label="Valor de abertura padrão (vazio = operador informa)">
              <input
                className="field"
                type="number"
                min="0"
                step="0.01"
                value={draft.caixa.valorAberturaPadrao ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    caixa: {
                      ...draft.caixa,
                      valorAberturaPadrao:
                        event.target.value === "" ? null : Number(event.target.value),
                    },
                  })
                }
              />
            </Field>
            <Toggle
              label="Exigir abertura de caixa"
              value={draft.caixa.exigirAbertura}
              onChange={(value) =>
                setDraft({ ...draft, caixa: { ...draft.caixa, exigirAbertura: value } })
              }
            />
          </div>
        </Block>
        <Block title="Meios de recebimento">
          <div className="space-y-2">
            {draft.formasPagamento.map((item, index) => (
              <div
                key={item.codigo}
                className="grid gap-2 md:grid-cols-[150px_1fr_110px_130px_130px]"
              >
                <input className="field font-mono text-xs" value={item.codigo} disabled />
                <input
                  className="field"
                  value={item.nome}
                  onChange={(event) => updatePayment(index, { nome: event.target.value })}
                />
                <input
                  className="field"
                  type="number"
                  min="1"
                  max="24"
                  value={item.parcelasMax}
                  onChange={(event) =>
                    updatePayment(index, { parcelasMax: Number(event.target.value) })
                  }
                />
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Acréscimo não definido"
                  value={item.acrescimoPercentual ?? ""}
                  onChange={(event) =>
                    updatePayment(index, {
                      acrescimoPercentual:
                        event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Toggle
                    label="Ativa"
                    value={item.ativo}
                    onChange={(value) => updatePayment(index, { ativo: value })}
                  />
                  <Toggle
                    label="Troco"
                    value={item.permiteTroco}
                    onChange={(value) => updatePayment(index, { permiteTroco: value })}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O parcelamento acima de 1x só é liberado quando o acréscimo estiver publicado.
          </p>
        </Block>
        <Block title="Classes e pulseiras">
          <div className="space-y-2">
            {draft.classes.map((item, index) => (
              <div
                key={item.codigo}
                className="grid gap-2 md:grid-cols-[170px_1fr_1.4fr_150px_90px]"
              >
                <input className="field font-mono text-xs" value={item.codigo} disabled />
                <input
                  className="field"
                  value={item.nome}
                  onChange={(event) => updateClass(index, { nome: event.target.value })}
                />
                <input
                  className="field"
                  value={item.descricao}
                  onChange={(event) => updateClass(index, { descricao: event.target.value })}
                />
                <input
                  className="field"
                  placeholder="Cor CSS/hex opcional"
                  value={item.corPulseira ?? ""}
                  onChange={(event) =>
                    updateClass(index, { corPulseira: event.target.value || null })
                  }
                />
                <Toggle
                  label="Ativa"
                  value={item.ativo}
                  onChange={(value) => updateClass(index, { ativo: value })}
                />
              </div>
            ))}
          </div>
        </Block>
        <Block title="Gratuidades">
          <div className="space-y-2">
            {draft.gratuidades.map((item, index) => (
              <div key={item.codigo} className="grid gap-2 md:grid-cols-[130px_1fr_1.4fr_90px]">
                <input className="field font-mono text-xs" value={item.codigo} disabled />
                <input
                  className="field"
                  value={item.nome}
                  onChange={(event) => updateFree(index, { nome: event.target.value })}
                />
                <input
                  className="field"
                  value={item.documentoExigido}
                  onChange={(event) => updateFree(index, { documentoExigido: event.target.value })}
                />
                <Toggle
                  label="Ativa"
                  value={item.ativo}
                  onChange={(value) => updateFree(index, { ativo: value })}
                />
              </div>
            ))}
          </div>
        </Block>
        <div className="grid gap-4 xl:grid-cols-2">
          <Block title="Emissão fiscal">
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle
                label="PDV escolhe emitir"
                value={draft.fiscal.pdvPermiteEscolha}
                onChange={(value) =>
                  setDraft({ ...draft, fiscal: { ...draft.fiscal, pdvPermiteEscolha: value } })
                }
              />
              <Toggle
                label="PDV inicia marcado"
                value={draft.fiscal.pdvPadraoEmitir}
                onChange={(value) =>
                  setDraft({ ...draft, fiscal: { ...draft.fiscal, pdvPadraoEmitir: value } })
                }
              />
              <Toggle
                label="Portal obrigatório"
                value={draft.fiscal.portalObrigatorio}
                onChange={(value) =>
                  setDraft({ ...draft, fiscal: { ...draft.fiscal, portalObrigatorio: value } })
                }
              />
              <Toggle
                label="App do agente opcional"
                value={draft.fiscal.agenteOpcional}
                onChange={(value) =>
                  setDraft({ ...draft, fiscal: { ...draft.fiscal, agenteOpcional: value } })
                }
              />
              <Toggle
                label="Integração fiscal ativa"
                value={draft.fiscal.integracaoAtiva}
                onChange={(value) =>
                  setDraft({ ...draft, fiscal: { ...draft.fiscal, integracaoAtiva: value } })
                }
              />
            </div>
          </Block>
          <Block title="Impressão">
            <Toggle
              label="Hardware homologado e ativo"
              value={draft.impressao.habilitada}
              onChange={(value) =>
                setDraft({ ...draft, impressao: { ...draft.impressao, habilitada: value } })
              }
            />
            <Field label="Modelo homologado">
              <input
                className="field"
                value={draft.impressao.modeloHomologado ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    impressao: { ...draft.impressao, modeloHomologado: event.target.value || null },
                  })
                }
              />
            </Field>
          </Block>
        </div>
        {message && (
          <p className="rounded-lg bg-[color:var(--muted)] p-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    </section>
  );
  function updatePayment(index: number, patch: Partial<Rules["formasPagamento"][number]>) {
    setDraft({
      ...draft!,
      formasPagamento: draft!.formasPagamento.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }
  function updateClass(index: number, patch: Partial<Rules["classes"][number]>) {
    setDraft({
      ...draft!,
      classes: draft!.classes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }
  function updateFree(index: number, patch: Partial<Rules["gratuidades"][number]>) {
    setDraft({
      ...draft!,
      gratuidades: draft!.gratuidades.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[color:var(--surface-tint)] p-4 ring-1 ring-[color:var(--hairline)]">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-xs ring-1 ring-[color:var(--hairline)]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-[color:var(--brand)]"
      />
    </label>
  );
}
