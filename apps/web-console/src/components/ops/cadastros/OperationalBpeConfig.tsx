import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileKey2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { GhostButton, PrimaryButton, StatusChip } from "@/components/ops/primitives";
import {
  getBpeIntegrationConfig,
  getBpeReadiness,
  publishConfigValue,
  type BpeIntegrationConfigApi,
  type BpeReadinessApi,
  type CidadeApi,
} from "@/lib/ajc-api";

export function OperationalBpeConfig({ cidades }: { cidades: CidadeApi[] }) {
  const [published, setPublished] = useState<{ versao: number; valor: BpeIntegrationConfigApi } | null>(null);
  const [draft, setDraft] = useState<BpeIntegrationConfigApi | null>(null);
  const [readiness, setReadiness] = useState<BpeReadinessApi | null>(null);
  const [taxJson, setTaxJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function load() {
    const [config, status] = await Promise.all([getBpeIntegrationConfig(), getBpeReadiness()]);
    setPublished({ versao: config.versao, valor: config.valor });
    setDraft(structuredClone(config.valor));
    setTaxJson(JSON.stringify(config.valor.impostos, null, 2));
    setReadiness(status);
  }

  useEffect(() => {
    load().catch((cause) => setMessage({ tone: "danger", text: cause instanceof Error ? cause.message : "Falha ao carregar BP-e" }));
  }, []);

  const dirty = useMemo(() => {
    if (!draft || !published) return false;
    try {
      return JSON.stringify(published.valor) !== JSON.stringify({ ...draft, impostos: JSON.parse(taxJson) });
    } catch {
      return true;
    }
  }, [draft, published, taxJson]);

  async function save() {
    if (!draft || saving) return;
    let taxes: Record<string, unknown>;
    try {
      taxes = JSON.parse(taxJson) as Record<string, unknown>;
    } catch {
      setMessage({ tone: "danger", text: "A tributação não é um JSON válido. Use exatamente a estrutura entregue pelo contador/provedor." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("vendas_bpe_integracao", { ...draft, impostos: taxes });
      await load();
      setMessage({ tone: "success", text: `Configuração de BP-e publicada na versão ${saved.versao}.` });
    } catch (cause) {
      setMessage({ tone: "danger", text: cause instanceof Error ? cause.message : "Não foi possível publicar o BP-e" });
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return <section className="surface-card p-5 text-sm text-muted-foreground">{message?.text ?? "Carregando integração de BP-e…"}</section>;
  }

  return (
    <section className="surface-card overflow-hidden" aria-labelledby="bpe-config-title">
      <header className="flex flex-col gap-4 border-b border-[color:var(--hairline)] p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <FileKey2 className="h-4 w-4 text-[color:var(--brand)]" />
            <h2 id="bpe-config-title" className="text-lg font-semibold">BP-e · NS Tecnologia</h2>
            <StatusChip tone={readiness?.pronta ? "success" : draft.habilitada ? "warning" : "neutral"}>
              {readiness?.pronta ? "pronta" : draft.habilitada ? "requer atenção" : "desativada"}
            </StatusChip>
            <StatusChip tone="neutral">versão {published?.versao ?? "—"}</StatusChip>
            {dirty && <StatusChip tone="warning">não publicada</StatusChip>}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Dados fiscais, série, percursos e mapeamentos publicados aqui. Token, senha do webhook e certificado PFX ficam fora do banco e do navegador.
          </p>
        </div>
        <PrimaryButton icon={Save} disabled={!dirty || saving} onClick={save}>{saving ? "Publicando…" : "Publicar configuração"}</PrimaryButton>
      </header>

      <div className="space-y-5 p-5">
        <div className="grid gap-px overflow-hidden rounded-xl bg-[color:var(--hairline)] md:grid-cols-4">
          <Readiness label="Token NS" ok={readiness?.tokenConfigurado} />
          <Readiness label="Webhook seguro" ok={readiness?.webhookConfigurado} />
          <Readiness label="MinIO fiscal" ok={readiness?.storageConfigurado} />
          <Readiness label="Cidades com IBGE" ok={!readiness?.cidadesSemCodigoIbge.length} detail={readiness?.cidadesSemCodigoIbge.length ? `${readiness.cidadesSemCodigoIbge.length} pendente(s)` : undefined} />
        </div>

        <div className="rounded-xl bg-[color:color-mix(in_oklab,var(--info)_9%,transparent)] p-4 ring-1 ring-[color:color-mix(in_oklab,var(--info)_25%,transparent)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info)]" />
            <div>
              <p className="text-sm font-medium">Segredos não são cadastrados nesta tela</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">O PFX é enviado pelo responsável fiscal diretamente ao cofre da NS. O token e o Basic Auth do webhook são variáveis secretas no Coolify.</p>
            </div>
          </div>
        </div>

        <Block title="Ativação e numeração" description="Homologue primeiro. Em produção, use uma série exclusiva e o próximo número confirmado no sistema fiscal atual.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Toggle label="Integração habilitada" value={draft.habilitada} onChange={(habilitada) => setDraft({ ...draft, habilitada })} />
            <Field label="Ambiente">
              <select className="field" value={draft.ambiente} onChange={(event) => setDraft({ ...draft, ambiente: event.target.value as BpeIntegrationConfigApi["ambiente"] })}>
                <option value="homologacao">Homologação</option><option value="producao">Produção</option>
              </select>
            </Field>
            <Field label="Série fiscal"><input className="field" type="number" min="0" max="999" value={draft.serie ?? ""} onChange={(event) => setDraft({ ...draft, serie: nullableNumber(event.target.value) })} /></Field>
            <Field label="Próximo número"><input className="field" type="number" min="1" max="999999999" value={draft.numeroInicial ?? ""} onChange={(event) => setDraft({ ...draft, numeroInicial: nullableNumber(event.target.value) })} /></Field>
            <Field label="Versão do layout"><input className="field" value={draft.versaoLayout} onChange={(event) => setDraft({ ...draft, versaoLayout: event.target.value })} /></Field>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Field label="Modal"><input className="field" value={draft.modal} onChange={(event) => setDraft({ ...draft, modal: event.target.value })} /></Field>
            <Field label="Versão do processo"><input className="field" value={draft.verProc} onChange={(event) => setDraft({ ...draft, verProc: event.target.value })} /></Field>
            <Field label="Tipo de BP-e"><input className="field" value={draft.tpBPe} onChange={(event) => setDraft({ ...draft, tpBPe: event.target.value })} /></Field>
            <Field label="Indicador de presença"><input className="field" value={draft.indPres} onChange={(event) => setDraft({ ...draft, indPres: event.target.value })} /></Field>
          </div>
        </Block>

        <Block title="Emitente" description="Copie os dados exatamente do cadastro fiscal homologado. Nenhum campo é inferido pelo sistema.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {([['cnpj','CNPJ'],['ie','Inscrição estadual'],['razaoSocial','Razão social'],['im','Inscrição municipal'],['cnae','CNAE'],['crt','CRT'],['tar','TAR']] as const).map(([key, label]) => (
              <Field key={key} label={label}><input className="field" value={draft.emitente[key]} onChange={(event) => setDraft({ ...draft, emitente: { ...draft.emitente, [key]: event.target.value } })} /></Field>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {([['logradouro','Logradouro'],['numero','Número'],['bairro','Bairro'],['codigoIbge','Código IBGE'],['municipio','Município'],['uf','UF']] as const).map(([key, label]) => (
              <Field key={key} label={label}><input className="field" value={draft.emitente.endereco[key]} onChange={(event) => setDraft({ ...draft, emitente: { ...draft.emitente, endereco: { ...draft.emitente.endereco, [key]: event.target.value } } })} /></Field>
            ))}
          </div>
        </Block>

        <Block title="Percursos fiscais" description="Cada intertrecho vendido precisa de códigos fiscais próprios, aprovados com o contador/provedor.">
          <div className="space-y-2">
            {draft.rotas.map((route, index) => (
              <div key={`${index}-${route.origemSigla}-${route.destinoSigla}`} className="grid gap-2 rounded-xl bg-[color:var(--muted)]/55 p-3 md:grid-cols-2 xl:grid-cols-[120px_120px_110px_minmax(180px,1fr)_90px_90px_90px_40px]">
                <CitySelect value={route.origemSigla} cidades={cidades} onChange={(value) => updateArray(draft.rotas, index, { ...route, origemSigla: value }, (rotas) => setDraft({ ...draft, rotas }))} />
                <CitySelect value={route.destinoSigla} cidades={cidades} onChange={(value) => updateArray(draft.rotas, index, { ...route, destinoSigla: value }, (rotas) => setDraft({ ...draft, rotas }))} />
                <input className="field" placeholder="cPercurso" value={route.cPercurso} onChange={(event) => updateArray(draft.rotas, index, { ...route, cPercurso: event.target.value }, (rotas) => setDraft({ ...draft, rotas }))} />
                <input className="field" placeholder="Descrição do percurso" value={route.xPercurso} onChange={(event) => updateArray(draft.rotas, index, { ...route, xPercurso: event.target.value }, (rotas) => setDraft({ ...draft, rotas }))} />
                {(['tpViagem','tpServ','tpTrecho'] as const).map((key) => <input key={key} className="field" placeholder={key} value={route[key]} onChange={(event) => updateArray(draft.rotas, index, { ...route, [key]: event.target.value }, (rotas) => setDraft({ ...draft, rotas }))} />)}
                <IconDelete onClick={() => setDraft({ ...draft, rotas: draft.rotas.filter((_, itemIndex) => itemIndex !== index) })} label="Remover percurso" />
              </div>
            ))}
            <GhostButton icon={Plus} onClick={() => setDraft({ ...draft, rotas: [...draft.rotas, { origemSigla: "", destinoSigla: "", cPercurso: "", xPercurso: "", tpViagem: "", tpServ: "", tpTrecho: "" }] })}>Adicionar percurso</GhostButton>
          </div>
        </Block>

        <div className="grid gap-5 xl:grid-cols-2">
          <MappingBlock title="Classes → tpAcomodacao" rows={draft.classes} left="classe" right="tpAcomodacao" onChange={(classes) => setDraft({ ...draft, classes })} />
          <MappingBlock title="Pagamentos → tPag" rows={draft.pagamentos} left="formaPagamento" right="tPag" onChange={(pagamentos) => setDraft({ ...draft, pagamentos })} />
        </div>

        <Block title="Composição, passageiro e tributação" description="Códigos e estrutura devem vir da contabilidade/NS; o painel não preenche valores fiscais de exemplo.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="tpComp da tarifa"><input className="field" value={draft.componenteTarifa ?? ""} onChange={(event) => setDraft({ ...draft, componenteTarifa: event.target.value || null })} /></Field>
            <Field label="tpDoc padrão quando não for CPF"><input className="field" value={draft.tipoDocumentoPassageiroPadrao ?? ""} onChange={(event) => setDraft({ ...draft, tipoDocumentoPassageiroPadrao: event.target.value || null })} /></Field>
          </div>
          <Field label="Objeto imp do BP-e (JSON validado pelo contador)">
            <textarea className="mt-1 min-h-44 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-elev)] p-3 font-mono text-xs leading-5 outline-none focus:border-[color:var(--ring)]" value={taxJson} onChange={(event) => setTaxJson(event.target.value)} spellCheck={false} />
          </Field>
        </Block>

        <Block title="Processamento assíncrono" description="A venda não fica presa à resposta da SEFAZ; o worker consulta, tenta novamente e mantém a trilha fiscal.">
          <div className="grid gap-3 md:grid-cols-4">
            {([['pollingSegundos','Polling (s)'],['tentativasConsulta','Consultas por ciclo'],['retryMinutos','Retry (min)'],['maxTentativas','Máximo de tentativas']] as const).map(([key,label]) => (
              <Field key={key} label={label}><input className="field" type="number" min="1" value={draft.operacao[key]} onChange={(event) => setDraft({ ...draft, operacao: { ...draft.operacao, [key]: Number(event.target.value) } })} /></Field>
            ))}
          </div>
        </Block>

        {message && <div aria-live="polite" className={`flex items-start gap-2 rounded-xl p-4 text-sm ring-1 ${message.tone === "success" ? "text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)]" : "text-[color:var(--danger)] ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)]"}`}>{message.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}<span>{message.text}</span></div>}
      </div>
    </section>
  );
}

function Readiness({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  return <div className="flex items-center gap-3 bg-[color:var(--surface-elev)] p-4">{ok ? <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" /> : <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />}<div><p className="text-xs font-medium">{label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{detail ?? (ok ? "Configurado" : "Pendente")}</p></div></div>;
}
function Block({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[color:var(--hairline)] p-4"><div className="mb-4"><h3 className="text-sm font-semibold">{title}</h3>{description && <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">{description}</p>}</div>{children}</section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-medium">{label}</span>{children}</label>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-elev)] px-3 text-sm"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function CitySelect({ value, cidades, onChange }: { value: string; cidades: CidadeApi[]; onChange: (value: string) => void }) { return <select className="field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Cidade</option>{cidades.filter((city) => city.ativo).map((city) => <option key={city.sigla} value={city.sigla}>{city.sigla} · {city.nome}</option>)}</select>; }
function IconDelete({ onClick, label }: { onClick: () => void; label: string }) { return <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)] hover:text-[color:var(--danger)]"><Trash2 className="h-4 w-4" /></button>; }
function MappingBlock<T extends Record<string, string>>({ title, rows, left, right, onChange }: { title: string; rows: T[]; left: keyof T; right: keyof T; onChange: (rows: T[]) => void }) {
  return <Block title={title}><div className="space-y-2">{rows.map((row,index) => <div key={index} className="grid grid-cols-[1fr_1fr_40px] gap-2"><input className="field" placeholder={String(left)} value={row[left]} onChange={(event) => updateArray(rows,index,{...row,[left]:event.target.value},onChange)} /><input className="field" placeholder={String(right)} value={row[right]} onChange={(event) => updateArray(rows,index,{...row,[right]:event.target.value},onChange)} /><IconDelete onClick={() => onChange(rows.filter((_,itemIndex) => itemIndex !== index))} label={`Remover ${title}`} /></div>)}<GhostButton icon={Plus} onClick={() => onChange([...rows, { [left]: "", [right]: "" } as T])}>Adicionar mapeamento</GhostButton></div></Block>;
}
function updateArray<T>(rows: T[], index: number, value: T, onChange: (rows: T[]) => void) { const next = [...rows]; next[index] = value; onChange(next); }
function nullableNumber(value: string) { return value === "" ? null : Number(value); }
