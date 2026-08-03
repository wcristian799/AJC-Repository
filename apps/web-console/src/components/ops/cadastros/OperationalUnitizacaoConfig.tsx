import { useEffect, useState } from "react";
import { MapPin, Plus, Save, Tags } from "lucide-react";
import { GhostButton, PrimaryButton, StatusChip } from "@/components/ops/primitives";
import {
  createTmsLocalOperacional,
  getConfigValue,
  listCidades,
  listEmbarcacoes,
  listTmsLocaisOperacionais,
  publishConfigValue,
  updateTmsLocalOperacional,
  type CidadeApi,
  type ConfigValueApi,
  type EmbarcacaoApi,
  type TmsLocalOperacionalApi,
} from "@/lib/ajc-api";

type Config = {
  schemaVersion: 1;
  timezone: string;
  unitizacoes: Array<{
    codigo: "MP" | "PD" | "PC";
    nome: string;
    descricao: string;
    ativo: boolean;
  }>;
  recebimento: { exigirEvidencia: boolean; minimoEvidencias: number; permitirAvulsa: boolean };
  reimpressao: { somenteDiaOperacional: boolean; exigirJustificativa: boolean };
  etiqueta: {
    copiasPadrao: number;
    larguraMm: number | null;
    alturaMm: number | null;
    perfilImpressora: string | null;
    protocolo: "ESC_POS" | "TSPL" | "ZPL" | null;
  };
  offline: { habilitado: boolean; maximoPendencias: number };
};
type LocalDraft = {
  id?: string;
  codigo: string;
  nome: string;
  tipo: TmsLocalOperacionalApi["tipo"];
  cidade_sigla: string;
  embarcacao_id: string;
  ativo: boolean;
};
const EMPTY_LOCAL: LocalDraft = {
  codigo: "",
  nome: "",
  tipo: "porto",
  cidade_sigla: "",
  embarcacao_id: "",
  ativo: true,
};

export function OperationalUnitizacaoConfig() {
  const [published, setPublished] = useState<ConfigValueApi | null>(null);
  const [draft, setDraft] = useState<Config | null>(null);
  const [locations, setLocations] = useState<TmsLocalOperacionalApi[]>([]);
  const [cities, setCities] = useState<CidadeApi[]>([]);
  const [boats, setBoats] = useState<EmbarcacaoApi[]>([]);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function load() {
    try {
      const [config, localRows, cityRows, boatRows] = await Promise.all([
        getConfigValue("tms_paletizacao_etiquetas"),
        listTmsLocaisOperacionais(true),
        listCidades(),
        listEmbarcacoes(),
      ]);
      setPublished(config);
      setDraft(config.valor as Config);
      setLocations(localRows);
      setCities(cityRows);
      setBoats(boatRows);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Falha ao carregar paletização.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (!draft)
    return (
      <section className="surface-card p-5 text-sm text-muted-foreground">
        {message ?? "Carregando paletização e etiquetas…"}
      </section>
    );
  const dirty = JSON.stringify(published?.valor) !== JSON.stringify(draft);
  async function publish() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await publishConfigValue("tms_paletizacao_etiquetas", draft);
      setPublished(saved);
      setDraft(saved.valor as Config);
      setMessage(`Versão ${saved.versao} publicada. Novas conferências já usam estas regras.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }
  async function saveLocal() {
    if (!localDraft) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        codigo: localDraft.codigo,
        nome: localDraft.nome,
        tipo: localDraft.tipo,
        cidade_sigla: localDraft.cidade_sigla || null,
        embarcacao_id: localDraft.embarcacao_id || null,
        ativo: localDraft.ativo,
      };
      if (localDraft.id) await updateTmsLocalOperacional(localDraft.id, payload);
      else await createTmsLocalOperacional(payload);
      setLocalDraft(null);
      setLocations(await listTmsLocaisOperacionais(true));
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível salvar o local.");
    } finally {
      setSaving(false);
    }
  }
  function editLocal(local: TmsLocalOperacionalApi) {
    setLocalDraft({
      id: local.id,
      codigo: local.codigo,
      nome: local.nome,
      tipo: local.tipo,
      cidade_sigla: local.cidade_sigla ?? "",
      embarcacao_id: local.embarcacao_id ?? "",
      ativo: local.ativo,
    });
  }
  return (
    <section className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--hairline)] p-5">
        <div>
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-xl">Paletização e etiquetas</h3>
          </div>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Regras de MP/PD/PC, evidências, reimpressão, fila offline e hardware. Os códigos
            técnicos permanecem estáveis; textos e comportamento são versionados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone="neutral">versão {published?.versao ?? "-"}</StatusChip>
          {dirty && <StatusChip tone="warning">não publicada</StatusChip>}
        </div>
      </header>
      <div className="space-y-6 p-5">
        <div>
          <h4 className="text-sm font-semibold">Tipos operacionais</h4>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {draft.unitizacoes.map((unit, index) => (
              <div
                key={unit.codigo}
                className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"
              >
                <div className="flex items-center justify-between">
                  <b className="font-mono text-sm text-[color:var(--brand)]">{unit.codigo}</b>
                  <input
                    type="checkbox"
                    checked={unit.ativo}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        unitizacoes: draft.unitizacoes.map((item, i) =>
                          i === index ? { ...item, ativo: e.target.checked } : item,
                        ),
                      })
                    }
                  />
                </div>
                <input
                  value={unit.nome}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      unitizacoes: draft.unitizacoes.map((item, i) =>
                        i === index ? { ...item, nome: e.target.value } : item,
                      ),
                    })
                  }
                  className="field-control mt-3"
                />
                <textarea
                  value={unit.descricao}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      unitizacoes: draft.unitizacoes.map((item, i) =>
                        i === index ? { ...item, descricao: e.target.value } : item,
                      ),
                    })
                  }
                  className="field-control mt-2 min-h-20 py-2"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Group title="Recebimento">
            <Toggle
              label="Exigir evidência real"
              checked={draft.recebimento.exigirEvidencia}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  recebimento: { ...draft.recebimento, exigirEvidencia: value },
                })
              }
            />
            <Toggle
              label="Permitir mercadoria avulsa"
              checked={draft.recebimento.permitirAvulsa}
              onChange={(value) =>
                setDraft({ ...draft, recebimento: { ...draft.recebimento, permitirAvulsa: value } })
              }
            />
            <NumberField
              label="Mínimo de evidências"
              value={draft.recebimento.minimoEvidencias}
              min={0}
              max={10}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  recebimento: { ...draft.recebimento, minimoEvidencias: value },
                })
              }
            />
          </Group>
          <Group title="Reimpressão">
            <Toggle
              label="Somente dia operacional"
              checked={draft.reimpressao.somenteDiaOperacional}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  reimpressao: { ...draft.reimpressao, somenteDiaOperacional: value },
                })
              }
            />
            <Toggle
              label="Exigir justificativa"
              checked={draft.reimpressao.exigirJustificativa}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  reimpressao: { ...draft.reimpressao, exigirJustificativa: value },
                })
              }
            />
            <label>
              <FieldLabel>Fuso operacional</FieldLabel>
              <input
                value={draft.timezone}
                onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                className="field-control"
              />
            </label>
          </Group>
          <Group title="Operação offline">
            <Toggle
              label="Fila offline habilitada"
              checked={draft.offline.habilitado}
              onChange={(value) =>
                setDraft({ ...draft, offline: { ...draft.offline, habilitado: value } })
              }
            />
            <NumberField
              label="Máximo de pendências"
              value={draft.offline.maximoPendencias}
              min={10}
              max={5000}
              onChange={(value) =>
                setDraft({ ...draft, offline: { ...draft.offline, maximoPendencias: value } })
              }
            />
          </Group>
        </div>
        <Group title="Perfil da impressora térmica">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label>
              <FieldLabel>Perfil / modelo</FieldLabel>
              <input
                value={draft.etiqueta.perfilImpressora ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    etiqueta: { ...draft.etiqueta, perfilImpressora: e.target.value || null },
                  })
                }
                className="field-control"
                placeholder="modelo cadastrado"
              />
            </label>
            <label>
              <FieldLabel>Protocolo</FieldLabel>
              <select
                value={draft.etiqueta.protocolo ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    etiqueta: {
                      ...draft.etiqueta,
                      protocolo: (e.target.value || null) as Config["etiqueta"]["protocolo"],
                    },
                  })
                }
                className="field-control"
              >
                <option value="">Não configurado</option>
                <option value="ESC_POS">ESC/POS</option>
                <option value="TSPL">TSPL</option>
                <option value="ZPL">ZPL</option>
              </select>
            </label>
            <NullableNumber
              label="Largura (mm)"
              value={draft.etiqueta.larguraMm}
              onChange={(value) =>
                setDraft({ ...draft, etiqueta: { ...draft.etiqueta, larguraMm: value } })
              }
            />
            <NullableNumber
              label="Altura (mm)"
              value={draft.etiqueta.alturaMm}
              onChange={(value) =>
                setDraft({ ...draft, etiqueta: { ...draft.etiqueta, alturaMm: value } })
              }
            />
            <NumberField
              label="Cópias"
              value={draft.etiqueta.copiasPadrao}
              min={1}
              max={10}
              onChange={(value) =>
                setDraft({ ...draft, etiqueta: { ...draft.etiqueta, copiasPadrao: value } })
              }
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Enquanto modelo, protocolo e dimensão estiverem vazios, o sistema gera o trabalho mas o
            mantém como “pendente de configuração”; não finge impressão.
          </p>
        </Group>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
          <p className="text-xs text-muted-foreground">
            Publicar cria uma nova versão auditável e preserva as conferências anteriores.
          </p>
          <PrimaryButton icon={Save} disabled={!dirty || saving} onClick={() => void publish()}>
            {saving ? "Publicando…" : "Publicar regras"}
          </PrimaryButton>
        </div>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
      <div className="border-t border-[color:var(--hairline)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-[color:var(--brand)]" />
              Locais operacionais
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Portos, pátios e embarcações usados para localizar fisicamente cada palete.
            </p>
          </div>
          <GhostButton icon={Plus} onClick={() => setLocalDraft(EMPTY_LOCAL)}>
            Novo local
          </GhostButton>
        </div>
        {localDraft && (
          <div className="mt-4 grid gap-3 rounded-lg bg-[color:var(--muted)] p-4 ring-1 ring-[color:var(--hairline)] sm:grid-cols-2 xl:grid-cols-6">
            <label>
              <FieldLabel>Código</FieldLabel>
              <input
                value={localDraft.codigo}
                onChange={(e) =>
                  setLocalDraft({ ...localDraft, codigo: e.target.value.toUpperCase() })
                }
                className="field-control"
              />
            </label>
            <label className="xl:col-span-2">
              <FieldLabel>Nome</FieldLabel>
              <input
                value={localDraft.nome}
                onChange={(e) => setLocalDraft({ ...localDraft, nome: e.target.value })}
                className="field-control"
              />
            </label>
            <label>
              <FieldLabel>Tipo</FieldLabel>
              <select
                value={localDraft.tipo}
                onChange={(e) =>
                  setLocalDraft({ ...localDraft, tipo: e.target.value as LocalDraft["tipo"] })
                }
                className="field-control"
              >
                <option value="porto">Porto</option>
                <option value="patio">Pátio</option>
                <option value="embarcacao">Embarcação</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            {localDraft.tipo === "embarcacao" ? (
              <label>
                <FieldLabel>Embarcação</FieldLabel>
                <select
                  value={localDraft.embarcacao_id}
                  onChange={(e) => setLocalDraft({ ...localDraft, embarcacao_id: e.target.value })}
                  className="field-control"
                >
                  <option value="">Selecionar</option>
                  {boats.map((boat) => (
                    <option key={boat.id} value={boat.id}>
                      {boat.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <FieldLabel>Cidade</FieldLabel>
                <select
                  value={localDraft.cidade_sigla}
                  onChange={(e) => setLocalDraft({ ...localDraft, cidade_sigla: e.target.value })}
                  className="field-control"
                >
                  <option value="">Sem cidade</option>
                  {cities
                    .filter((city) => city.ativo)
                    .map((city) => (
                      <option key={city.sigla} value={city.sigla}>
                        {city.sigla} · {city.nome}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <div className="flex items-end gap-2">
              <PrimaryButton
                onClick={() => void saveLocal()}
                disabled={saving || !localDraft.codigo.trim() || !localDraft.nome.trim()}
              >
                Salvar
              </PrimaryButton>
              <button
                onClick={() => setLocalDraft(null)}
                className="h-10 text-xs text-muted-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Local</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Referência</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((local) => (
                <tr
                  key={local.id}
                  onClick={() => editLocal(local)}
                  className="cursor-pointer border-t border-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                >
                  <td className="px-3 py-3 font-mono">{local.codigo}</td>
                  <td className="px-3 py-3 font-medium">{local.nome}</td>
                  <td className="px-3 py-3">{local.tipo}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {local.cidade_nome ?? local.embarcacao_nome ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip tone={local.ativo ? "success" : "neutral"} size="sm">
                      {local.ativo ? "ativo" : "inativo"}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-[color:var(--muted)] p-4 ring-1 ring-[color:var(--hairline)]">
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field-control"
      />
    </label>
  );
}
function NullableNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="field-control"
        placeholder="não definido"
      />
    </label>
  );
}
