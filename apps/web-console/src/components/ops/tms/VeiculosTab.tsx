import { useEffect, useMemo, useState } from "react";
import { Building2, Camera, Car, Check, ClipboardCheck, ScanLine, Tag as TagIcon, UserRound, X } from "lucide-react";
import { SectionHeader, PrimaryButton, StatusChip, Tag, brl } from "@/components/ops/primitives";
import {
  createVeiculoEnvio,
  getVeiculosOrigensConfig,
  type NavegacaoViagemApi,
  type VeiculosOrigensConfigApi,
  type VeiculoEnvioApi,
} from "@/lib/ajc-api";

type VeiculoFormState = {
  tipo: "veiculo" | "maquina";
  viagemId: string;
  origemCadastro: string;
  placa: string;
  modelo: string;
  remetenteNome: string;
  remetenteDocumento: string;
  remetenteTelefone: string;
  destinatarioNome: string;
  destinatarioDocumento: string;
  destinatarioTelefone: string;
  cidadeOrigemSigla: string;
  cidadeDestinoSigla: string;
  valorFrete: string;
};

const initialForm: VeiculoFormState = {
  tipo: "veiculo",
  viagemId: "",
  origemCadastro: "",
  placa: "",
  modelo: "",
  remetenteNome: "",
  remetenteDocumento: "",
  remetenteTelefone: "",
  destinatarioNome: "",
  destinatarioDocumento: "",
  destinatarioTelefone: "",
  cidadeOrigemSigla: "BEL",
  cidadeDestinoSigla: "",
  valorFrete: "",
};

const checklist = [
  "Fotos obrigatorias: frente, traseira, laterais, teto/interior ou pontos criticos",
  "Checklist de envio baseado no modelo Frota Martins",
  "Etiqueta Bluetooth no veiculo/maquina",
  "Bipe de subida na balsa",
  "Bipe de descida no destino",
  "Checklist de entrega + assinatura",
];

export function VeiculosTab({
  envios: enviosApi,
  viagens = [],
  onEnviosChange,
}: {
  envios?: VeiculoEnvioApi[];
  viagens?: NavegacaoViagemApi[];
  onEnviosChange?: (envios: VeiculoEnvioApi[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VeiculoFormState>(initialForm);
  const [origensConfig, setOrigensConfig] = useState<VeiculosOrigensConfigApi | null>(null);
  const [origensError, setOrigensError] = useState<string | null>(null);

  useEffect(() => {
    getVeiculosOrigensConfig()
      .then((config) => {
        setOrigensConfig(config);
        setForm((current) => ({ ...current, origemCadastro: current.origemCadastro || config.valor.origemPadrao }));
      })
      .catch((cause) => setOrigensError(cause instanceof Error ? cause.message : "Nao foi possivel carregar as origens de cadastro."));
  }, []);

  const origemLabels = useMemo(() => new Map(origensConfig?.valor.origens.map((origem) => [origem.codigo, origem.nome]) ?? []), [origensConfig]);
  const rows = (enviosApi ?? []).map((envio) => mapEnvio(envio, origemLabels));
  const viagemOptions = useMemo(
    () => viagens.map((v) => ({ id: v.id, label: `${v.codigo ?? "sem codigo"} - ${v.origemSigla} -> ${v.destinoSigla ?? "destino"}` })),
    [viagens],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.modelo.trim()) {
      setError("Informe o modelo ou identificacao operacional.");
      return;
    }
    if (form.tipo === "veiculo" && !form.placa.trim()) {
      setError("Placa obrigatoria para veiculo.");
      return;
    }
    if (!origensConfig || !form.origemCadastro) {
      setError("Configure e publique ao menos uma origem de cadastro em Cadastros.");
      return;
    }

    setSaving(true);
    try {
      const created = await createVeiculoEnvio({
        tipo: form.tipo,
        viagemId: form.viagemId || undefined,
        origemCadastro: form.origemCadastro,
        placa: form.tipo === "veiculo" ? form.placa.trim().toUpperCase() : undefined,
        modelo: form.modelo.trim(),
        remetenteNome: form.remetenteNome.trim() || undefined,
        remetenteDocumento: form.remetenteDocumento.trim() || undefined,
        remetenteTelefone: form.remetenteTelefone.trim() || undefined,
        destinatarioNome: form.destinatarioNome.trim() || undefined,
        destinatarioDocumento: form.destinatarioDocumento.trim() || undefined,
        destinatarioTelefone: form.destinatarioTelefone.trim() || undefined,
        cidadeOrigemSigla: form.cidadeOrigemSigla.trim().toUpperCase() || undefined,
        cidadeDestinoSigla: form.cidadeDestinoSigla.trim().toUpperCase() || undefined,
        valorFrete: form.valorFrete ? Number(form.valorFrete.replace(",", ".")) : undefined,
        clientUuid: crypto.randomUUID(),
      });
      onEnviosChange?.([created, ...(enviosApi ?? [])]);
      setForm({ ...initialForm, origemCadastro: origensConfig.valor.origemPadrao });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar o envio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="MVP - veiculos e maquinas"
        title="Envio de veiculos/maquinas"
        description="Cadastro operacional com origem configurável, vistoria com fotos, etiqueta, bipes de movimentação e checklist de entrega."
        actions={
          <PrimaryButton icon={showForm ? X : Car} disabled={!origensConfig} onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Fechar cadastro" : "Novo envio veiculo/maquina"}
          </PrimaryButton>
        }
      />

      {origensError && <p role="alert" className="rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] px-4 py-3 text-sm text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_28%,transparent)]">{origensError} Publique a configuração em Cadastros › Configurações operacionais.</p>}

      {showForm && origensConfig && (
        <form onSubmit={submit} className="surface-card brand-rail brand-rail-left p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Car className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Novo envio</h3>
            <span className="rounded-full bg-[color:var(--muted)] px-2.5 py-1 text-[11px] text-muted-foreground ring-1 ring-[color:var(--hairline)]">
              gera codigo, status vistoria e trilha auditavel
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <FormSelect label="Tipo" value={form.tipo} onChange={(tipo) => setForm((prev) => ({ ...prev, tipo: tipo as VeiculoFormState["tipo"], placa: tipo === "maquina" ? "" : prev.placa }))}>
              <option value="veiculo">Veiculo</option>
              <option value="maquina">Maquina</option>
            </FormSelect>
            <FormSelect label="Origem cadastro" value={form.origemCadastro} onChange={(origemCadastro) => setForm((prev) => ({ ...prev, origemCadastro }))}>
              <option value="">Selecionar origem</option>
              {origensConfig.valor.origens.filter((origem) => origem.ativo).map((origem) => <option key={origem.codigo} value={origem.codigo}>{origem.nome}</option>)}
            </FormSelect>
            <FormSelect label="Viagem" value={form.viagemId} onChange={(viagemId) => setForm((prev) => ({ ...prev, viagemId }))}>
              <option value="">Selecionar depois</option>
              {viagemOptions.map((viagem) => (
                <option key={viagem.id} value={viagem.id}>{viagem.label}</option>
              ))}
            </FormSelect>
            <FormInput label="Frete" value={form.valorFrete} onChange={(valorFrete) => setForm((prev) => ({ ...prev, valorFrete }))} placeholder="0,00" inputMode="decimal" />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <FormInput label={form.tipo === "veiculo" ? "Placa" : "Identificacao"} value={form.placa} onChange={(placa) => setForm((prev) => ({ ...prev, placa }))} placeholder={form.tipo === "veiculo" ? "ABC-1D23" : "opcional"} disabled={form.tipo === "maquina"} />
            <FormInput label="Modelo" value={form.modelo} onChange={(modelo) => setForm((prev) => ({ ...prev, modelo }))} placeholder="Hilux SW4" />
            <FormInput label="Origem" value={form.cidadeOrigemSigla} onChange={(cidadeOrigemSigla) => setForm((prev) => ({ ...prev, cidadeOrigemSigla }))} placeholder="BEL" maxLength={3} />
            <FormInput label="Destino" value={form.cidadeDestinoSigla} onChange={(cidadeDestinoSigla) => setForm((prev) => ({ ...prev, cidadeDestinoSigla }))} placeholder="STM" maxLength={3} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <FormInput label="Remetente" value={form.remetenteNome} onChange={(remetenteNome) => setForm((prev) => ({ ...prev, remetenteNome }))} placeholder="nome/empresa" />
            <FormInput label="Documento remetente" value={form.remetenteDocumento} onChange={(remetenteDocumento) => setForm((prev) => ({ ...prev, remetenteDocumento }))} />
            <FormInput label="Telefone remetente" value={form.remetenteTelefone} onChange={(remetenteTelefone) => setForm((prev) => ({ ...prev, remetenteTelefone }))} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <FormInput label="Destinatario" value={form.destinatarioNome} onChange={(destinatarioNome) => setForm((prev) => ({ ...prev, destinatarioNome }))} placeholder="nome/empresa" />
            <FormInput label="Documento destinatario" value={form.destinatarioDocumento} onChange={(destinatarioDocumento) => setForm((prev) => ({ ...prev, destinatarioDocumento }))} />
            <FormInput label="Telefone destinatario" value={form.destinatarioTelefone} onChange={(destinatarioTelefone) => setForm((prev) => ({ ...prev, destinatarioTelefone }))} />
          </div>

          {error && <p className="mt-3 rounded-md bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)] ring-1 ring-[color:var(--danger)]/30">{error}</p>}

          <div className="mt-4 flex justify-end">
            <PrimaryButton type="submit" icon={Check} disabled={saving}>
              {saving ? "Salvando..." : "Salvar envio"}
            </PrimaryButton>
          </div>
        </form>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-[color:var(--hairline)] px-5 py-4">
            <h3 className="font-display text-lg">Fila de envios</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Placa obrigatoria quando for veiculo. Maquina usa identificacao operacional.</p>
          </div>
          <div className="divide-y divide-[color:var(--hairline)]">
            {rows.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                Nenhum envio real cadastrado ainda.
              </div>
            )}
            {rows.map((e) => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                  <Tag tone={e.tipo === "Veiculo" ? "brand" : "warning"}>{e.tipo}</Tag>
                  <span className="font-medium text-foreground">{e.modelo}</span>
                  <span className="font-mono text-xs text-muted-foreground">Placa {e.placa}</span>
                  <StatusChip tone={e.status === "vistoria" ? "warning" : e.status === "embarque" ? "brand" : "success"}>
                    {e.status}
                  </StatusChip>
                </div>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                  <PessoaLinha icon={UserRound} label="Remetente" value={e.remetente} />
                  <PessoaLinha icon={Building2} label="Destinatario" value={e.destinatario} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Origem do cadastro: {e.origem}</span>
                  <span className="font-mono text-[color:var(--brand)]">Frete {brl(e.frete)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">Checklist operacional</h3>
            </div>
            <div className="mt-3 space-y-2">
              {checklist.map((item, i) => (
                <div key={item} className="flex items-start gap-2 rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs ring-1 ring-[color:var(--hairline)]">
                  <span className="font-mono text-[color:var(--brand)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Estados do app conferente</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Estado icon={Camera} label="Fotos" value="6/6" />
              <Estado icon={TagIcon} label="Etiqueta" value={rows[0]?.id ?? "auto"} />
              <Estado icon={ScanLine} label="Bipes" value="Subiu/Desceu" />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">O checklist de entrega repete a prova fotografica no destino e bloqueia entrega sem bipe do veiculo/maquina.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapEnvio(envio: VeiculoEnvioApi, origemLabels: Map<string, string>) {
  return {
    id: envio.codigo ?? envio.id,
    tipo: envio.tipo === "maquina" ? "Maquina" : "Veiculo",
    placa: envio.placa ?? "-",
    modelo: envio.modelo,
    origem: origemLabels.get(envio.origem_cadastro) ?? envio.origem_cadastro,
    remetente: [envio.remetente_nome, envio.remetente_documento, envio.remetente_telefone].filter(Boolean).join(" - ") || "Remetente nao informado",
    destinatario: [envio.destinatario_nome, envio.destinatario_documento, envio.destinatario_telefone].filter(Boolean).join(" - ") || "Destinatario nao informado",
    status: envio.status,
    frete: Number(envio.valor_frete ?? 0),
  };
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-[color:var(--brand)] disabled:opacity-55"
      />
    </label>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--brand)]"
      >
        {children}
      </select>
    </label>
  );
}

function PessoaLinha({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 text-foreground/90">{value}</p>
    </div>
  );
}

function Estado({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 text-center ring-1 ring-[color:var(--hairline)]">
      <Icon className="mx-auto h-4 w-4 text-[color:var(--brand)]" />
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}
