import { useEffect, useState } from "react";
import { FileText, Upload, CheckCircle2, AlertTriangle, Link2, Tags, CalendarClock, Truck, Radio } from "lucide-react";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, StatusChip, PrimaryButton, GhostButton, brl, Tag,
} from "@/components/ops/primitives";
import {
  conferirTmsDocumento,
  createTmsDocumentoManual,
  listTmsAgendamentoDisponibilidade,
  listTmsCargas,
  listTmsDocumentos,
  listTmsVolumes,
  printTmsEtiqueta,
  type CidadeApi,
  type ClienteApi,
  type NavegacaoViagemApi,
  type TmsAgendamentoSlotApi,
  type TmsCargaApi,
  type TmsDocumentoApi,
  type TmsVolumeApi,
} from "@/lib/ajc-api";

type NotaDCStatus = "pendente" | "conferida" | "divergente";
type NotaDC = {
  id: string;
  tipo: "DC" | "NFe";
  pagamento: "CIF" | "FOB";
  numero: string;
  cliente: string;
  valor: number;
  cargaId?: string;
  cargaDbId?: string;
  origem: "cliente" | "agente" | "manual";
  status: NotaDCStatus;
  lancadoPor?: string;
};

type ManualDocumentoForm = {
  clienteRemetenteId: string;
  tipo: "NFe" | "NFCe" | "DC";
  pagamento: "CIF" | "FOB";
  numero: string;
  cidadeOrigemSigla: string;
  cidadeDestinoSigla: string;
  valor: string;
  pesoTotal: string;
  totalVolumes: string;
  destinatarioNome: string;
  destinatarioDocumento: string;
  destinatarioTelefone: string;
  agendamentoData: string;
  agendadoPara: string;
  arquivoNome: string;
  arquivoUrl: string;
  arquivoHash: string;
  arquivoTamanho: number | null;
};

const STATUS_TONE: Record<NotaDCStatus, "warning" | "success" | "danger"> = {
  pendente: "warning",
  conferida: "success",
  divergente: "danger",
};

/** B.2 upload cliente/agente + B.3 fila de lancamento ADM Notas. */
export function NotasTab({
  cargas,
  cidades,
  documentos: documentosApi,
  volumes,
  viagens,
  clientes,
  onCargasChange,
  onDocumentosChange,
  onVolumesChange,
}: {
  cargas?: TmsCargaApi[];
  cidades?: CidadeApi[];
  documentos?: TmsDocumentoApi[];
  volumes?: TmsVolumeApi[];
  viagens?: NavegacaoViagemApi[];
  clientes?: ClienteApi[];
  onCargasChange?: (cargas: TmsCargaApi[]) => void;
  onDocumentosChange?: (documentos: TmsDocumentoApi[]) => void;
  onVolumesChange?: (volumes: TmsVolumeApi[]) => void;
}) {
  const [filtro, setFiltro] = useState<NotaDCStatus | "todos">("todos");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const defaultCliente = clientes?.[0];
  const [manualForm, setManualForm] = useState<ManualDocumentoForm>({
    clienteRemetenteId: "",
    tipo: "NFe",
    pagamento: "CIF",
    numero: "",
    cidadeOrigemSigla: "",
    cidadeDestinoSigla: "",
    valor: "",
    pesoTotal: "",
    totalVolumes: "1",
    destinatarioNome: "",
    destinatarioDocumento: "",
    destinatarioTelefone: "",
    agendamentoData: todayDateInput(),
    agendadoPara: "",
    arquivoNome: "",
    arquivoUrl: "",
    arquivoHash: "",
    arquivoTamanho: null,
  });
  const [agendamentoSlots, setAgendamentoSlots] = useState<TmsAgendamentoSlotApi[]>([]);
  const [loadingAgendamento, setLoadingAgendamento] = useState(false);
  const documentos = documentosApi?.length
    ? documentosApi.map(mapDocumentoNota)
    : cargas?.length ? cargas.map(mapCargaNota) : [];
  const rows = documentos.filter((n) => filtro === "todos" || n.status === filtro);
  const pendentes = documentos.filter((n) => n.status === "pendente").length;
  const semVinculo = documentos.filter((n) => !n.cargaId).length;
  const agenda = buildAgenda(documentosApi, cargas);
  const recebimentosAgora = buildRecebimentos(documentosApi, cargas);

  useEffect(() => {
    setManualForm((prev) => {
      return {
        ...prev,
        clienteRemetenteId: prev.clienteRemetenteId || defaultCliente?.id || "",
      };
    });
  }, [clientes]);

  useEffect(() => {
    if (!showManual || !manualForm.agendamentoData) return;
    let active = true;
    setLoadingAgendamento(true);
    listTmsAgendamentoDisponibilidade(manualForm.agendamentoData)
      .then((slots) => {
        if (!active) return;
        const normalized = Array.isArray(slots) ? slots : [];
        setAgendamentoSlots(normalized);
        setManualForm((prev) => {
          if (prev.agendamentoData !== manualForm.agendamentoData) return prev;
          const selected = normalized.find((slot) => slot.inicio === prev.agendadoPara);
          if (selected && !selected.bloqueada) return prev;
          const next = normalized.find((slot) => !slot.bloqueada);
          return { ...prev, agendadoPara: next?.inicio ?? "" };
        });
      })
      .catch(() => {
        if (active) setAgendamentoSlots([]);
      })
      .finally(() => {
        if (active) setLoadingAgendamento(false);
      });
    return () => {
      active = false;
    };
  }, [showManual, manualForm.agendamentoData]);

  async function marcarDocumento(id: string, status: "conferida" | "divergente") {
    setSavingId(id);
    setErro(null);
    try {
      const updated = await conferirTmsDocumento(id, {
        status,
        observacao: status === "divergente" ? "Marcado divergente via NotasTab" : "Conferido via NotasTab",
        clientUuid: crypto.randomUUID(),
      });
      const current = documentosApi ?? [];
      onDocumentosChange?.(current.map((doc) => (doc.id === id ? updated : doc)));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel conferir o documento.");
    } finally {
      setSavingId(null);
    }
  }

  async function refreshTmsCore() {
    const [cargasAtualizadas, documentosAtualizados, volumesAtualizados] = await Promise.all([
      listTmsCargas(),
      listTmsDocumentos(),
      listTmsVolumes(),
    ]);
    onCargasChange?.(cargasAtualizadas);
    onDocumentosChange?.(documentosAtualizados);
    onVolumesChange?.(volumesAtualizados);
    return { cargasAtualizadas, documentosAtualizados, volumesAtualizados };
  }

  async function salvarManual() {
    setErro(null);
    if (!manualForm.clienteRemetenteId) {
      setErro("Informe o cliente remetente.");
      return;
    }
    if (!manualForm.numero.trim()) {
      setErro("Informe o numero da NF/DC.");
      return;
    }
    if (!manualForm.destinatarioNome.trim() || !manualForm.destinatarioDocumento.trim() || !manualForm.destinatarioTelefone.trim()) {
      setErro("Informe nome, CPF/CNPJ e telefone do destinatario.");
      return;
    }
    if (manualForm.tipo !== "DC" && !manualForm.arquivoHash) {
      setErro("Anexe o arquivo da nota fiscal para NF-e/NFC-e.");
      return;
    }
    if (!manualForm.agendadoPara) {
      setErro("Selecione uma janela de agendamento com vaga.");
      return;
    }
    const totalVolumes = Math.max(1, Number.parseInt(manualForm.totalVolumes, 10) || 1);
    setManualSaving(true);
    try {
      await createTmsDocumentoManual({
        clienteRemetenteId: manualForm.clienteRemetenteId,
        destinatarioNome: manualForm.destinatarioNome.trim() || undefined,
        cidadeOrigemSigla: manualForm.cidadeOrigemSigla.trim().toUpperCase() || undefined,
        cidadeDestinoSigla: manualForm.cidadeDestinoSigla.trim().toUpperCase() || undefined,
        tipo: manualForm.tipo,
        pagamento: manualForm.pagamento,
        numero: manualForm.numero.trim(),
        valor: parseNumber(manualForm.valor),
        pesoTotal: parseNumber(manualForm.pesoTotal),
        totalVolumes,
        agendadoPara: manualForm.agendadoPara,
        clientUuid: crypto.randomUUID(),
        destinatarioDocumento: manualForm.destinatarioDocumento.trim(),
        destinatarioTelefone: manualForm.destinatarioTelefone.trim(),
        arquivoUrl: manualForm.arquivoUrl || undefined,
        arquivoHash: manualForm.arquivoHash || undefined,
      });
      await refreshTmsCore();
      setManualForm((prev) => ({
        ...prev,
        numero: "",
        pagamento: "CIF",
        valor: "",
        pesoTotal: "",
        totalVolumes: "1",
        destinatarioNome: "",
        destinatarioDocumento: "",
        destinatarioTelefone: "",
        cidadeOrigemSigla: "",
        cidadeDestinoSigla: "",
        agendamentoData: prev.agendamentoData,
        agendadoPara: prev.agendadoPara,
        arquivoNome: "",
        arquivoUrl: "",
        arquivoHash: "",
        arquivoTamanho: null,
      }));
      setShowManual(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel lancar o documento manual.");
    } finally {
      setManualSaving(false);
    }
  }

  async function anexarManualFile(file?: File) {
    setErro(null);
    if (!file) {
      setManualForm((prev) => ({ ...prev, arquivoNome: "", arquivoUrl: "", arquivoHash: "", arquivoTamanho: null }));
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErro("Arquivo da nota fiscal deve ter ate 10 MB.");
      return;
    }
    const hash = await sha256Hex(file);
    const safeName = encodeURIComponent(file.name.replace(/[^\w.\- ]/g, "_"));
    setManualForm((prev) => ({
      ...prev,
      arquivoNome: file.name,
      arquivoUrl: `manual-upload://${hash}/${safeName}`,
      arquivoHash: hash,
      arquivoTamanho: file.size,
    }));
  }

  async function etiquetarDocumento(documento?: NotaDC) {
    const alvo = documento ?? rows.find((row) => row.cargaDbId);
    if (!alvo?.cargaDbId) {
      setErro("Selecione um documento com carga vinculada para etiquetar.");
      return;
    }
    const volumesDaCarga = (volumes ?? []).filter((volume) => volume.carga_id === alvo.cargaDbId);
    if (!volumesDaCarga.length) {
      setErro("Nenhum volume encontrado para a carga deste documento.");
      return;
    }
    setBulkSaving(true);
    setErro(null);
    try {
      for (const volume of volumesDaCarga) {
        try {
          await printTmsEtiqueta(volume.id, { tipo: "impressao", clientUuid: crypto.randomUUID() });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("ja possui etiqueta")) throw error;
          await printTmsEtiqueta(volume.id, { tipo: "reimpressao", clientUuid: crypto.randomUUID() });
        }
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel etiquetar os volumes.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="ADM Notas - back-office"
        title="Notas Fiscais & Declaracoes de Conteudo"
        description="Fila de documentos enviados por clientes/agentes e lancamento manual. Todo volume sob risco legal exige NF ou DC vinculada antes do embarque."
        actions={
          <>
            <GhostButton icon={Upload} onClick={() => setShowManual((value) => !value)}>Lancar manual</GhostButton>
            <PrimaryButton icon={Tags} onClick={() => etiquetarDocumento()} disabled={bulkSaving}>
              {bulkSaving ? "Etiquetando..." : "Etiquetar por volume"}
            </PrimaryButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Pendentes de conferencia" value={pendentes} tone="warning" icon={FileText} />
        <MiniStat label="Sem carga vinculada" value={semVinculo} tone="danger" icon={Link2} />
        <MiniStat label="Conferidas hoje" value={documentos.filter((n) => n.status === "conferida").length} tone="success" icon={CheckCircle2} />
      </div>

      {showManual && (
        <div className="surface-card brand-rail brand-rail-left p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Upload className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Lancamento manual de NF/DC</h3>
            <StatusChip tone="brand">documento avulso sem carga/viagem</StatusChip>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FormSelect label="Cliente remetente" value={manualForm.clienteRemetenteId} onChange={(value) => setManualForm((prev) => ({ ...prev, clienteRemetenteId: value }))}>
              {(clientes ?? []).map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
            </FormSelect>
            <FormSelect label="Tipo" value={manualForm.tipo} onChange={(value) => setManualForm((prev) => ({ ...prev, tipo: value as ManualDocumentoForm["tipo"] }))}>
              <option value="NFe">NF-e</option>
              <option value="NFCe">NFC-e</option>
              <option value="DC">Declaracao de Conteudo</option>
            </FormSelect>
            <FormSelect label="Pagamento" value={manualForm.pagamento} onChange={(value) => setManualForm((prev) => ({ ...prev, pagamento: value as ManualDocumentoForm["pagamento"] }))}>
              <option value="CIF">CIF</option>
              <option value="FOB">FOB</option>
            </FormSelect>
            <FormInput label="Numero NF/DC" value={manualForm.numero} onChange={(value) => setManualForm((prev) => ({ ...prev, numero: value }))} placeholder="NF/DC" />
            <FormSelect label="Origem" value={manualForm.cidadeOrigemSigla} onChange={(value) => setManualForm((prev) => ({ ...prev, cidadeOrigemSigla: value }))}>
              <option value="">Selecionar</option>
              {(cidades ?? []).map((cidade) => <option key={`origem-${cidade.sigla}`} value={cidade.sigla}>{cidade.sigla} - {cidade.nome}</option>)}
            </FormSelect>
            <FormSelect label="Destino" value={manualForm.cidadeDestinoSigla} onChange={(value) => setManualForm((prev) => ({ ...prev, cidadeDestinoSigla: value }))}>
              <option value="">Selecionar</option>
              {(cidades ?? []).map((cidade) => <option key={`destino-${cidade.sigla}`} value={cidade.sigla}>{cidade.sigla} - {cidade.nome}</option>)}
            </FormSelect>
            <AgendamentoRecebimentoField
              data={manualForm.agendamentoData}
              agendadoPara={manualForm.agendadoPara}
              slots={agendamentoSlots}
              loading={loadingAgendamento}
              onDataChange={(agendamentoData) => setManualForm((prev) => ({ ...prev, agendamentoData, agendadoPara: "" }))}
              onSlotChange={(agendadoPara) => setManualForm((prev) => ({ ...prev, agendadoPara }))}
            />
            <FormInput label="Valor declarado" value={manualForm.valor} onChange={(value) => setManualForm((prev) => ({ ...prev, valor: value }))} inputMode="decimal" placeholder="0,00" />
            <FormInput label="Peso total" value={manualForm.pesoTotal} onChange={(value) => setManualForm((prev) => ({ ...prev, pesoTotal: value }))} inputMode="decimal" placeholder="kg" />
            <FormInput label="Volumes" value={manualForm.totalVolumes} onChange={(value) => setManualForm((prev) => ({ ...prev, totalVolumes: value }))} inputMode="numeric" />
            <FormInput label="Destinatario" value={manualForm.destinatarioNome} onChange={(value) => setManualForm((prev) => ({ ...prev, destinatarioNome: value }))} placeholder="Nome/razao social" />
            <FormInput label="CPF/CNPJ destinatario" value={manualForm.destinatarioDocumento} onChange={(value) => setManualForm((prev) => ({ ...prev, destinatarioDocumento: value }))} placeholder="000.000.000-00" />
            <FormInput label="Telefone destinatario" value={manualForm.destinatarioTelefone} onChange={(value) => setManualForm((prev) => ({ ...prev, destinatarioTelefone: value }))} placeholder="(91) 99999-9999" />
            <div className="md:col-span-2">
              <FormFile
                label="Upload da nota fiscal"
                fileName={manualForm.arquivoNome}
                fileHash={manualForm.arquivoHash}
                fileSize={manualForm.arquivoTamanho}
                onChange={anexarManualFile}
              />
            </div>
            <div className="flex items-end gap-2">
              <PrimaryButton icon={Upload} onClick={salvarManual} disabled={manualSaving || !(clientes?.length)}>
                {manualSaving ? "Lancando..." : "Salvar"}
              </PrimaryButton>
              <GhostButton onClick={() => setShowManual(false)}>Cancelar</GhostButton>
            </div>
          </div>
        </div>
      )}

      {erro && <p className="rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,transparent)] px-3 py-2 text-xs text-[color:var(--destructive)] ring-1 ring-[color:color-mix(in_oklab,var(--destructive)_28%,transparent)]">{erro}</p>}

      <FilterBar searchPlaceholder="Buscar numero/chave, cliente, carga...">
        <FilterChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos</FilterChip>
        <FilterChip active={filtro === "pendente"} onClick={() => setFiltro("pendente")}>Pendentes</FilterChip>
        <FilterChip active={filtro === "conferida"} onClick={() => setFiltro("conferida")}>Conferidas</FilterChip>
        <FilterChip active={filtro === "divergente"} onClick={() => setFiltro("divergente")}>Divergentes</FilterChip>
      </FilterBar>

      <DataTable<NotaDC>
        rows={rows}
        empty="Fila vazia - nenhum documento aguardando."
        columns={[
          { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.tipo === "DC" ? "info" : "brand"}>{r.tipo}</Tag> },
          { key: "numero", header: "Numero / chave", render: (r) => <span className="font-mono text-[11px] text-muted-foreground">{r.numero}</span> },
          { key: "cliente", header: "Cliente", render: (r) => <span className="font-medium">{r.cliente}</span> },
          { key: "modalidade", header: "CIF/FOB", render: (r) => <Tag tone={r.pagamento === "FOB" ? "warning" : "info"}>{r.pagamento}</Tag> },
          { key: "valor", header: "Valor", align: "right", render: (r) => <span className="font-mono text-xs">{brl(r.valor)}</span> },
          { key: "cargaId", header: "Carga", render: (r) => r.cargaId
            ? <span className="font-mono text-xs">{r.cargaId}</span>
            : <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--danger)]"><Link2 className="h-3 w-3" />vincular</span> },
          { key: "origem", header: "Origem", render: (r) => <span className="text-xs capitalize text-muted-foreground">{r.origem}</span> },
          { key: "status", header: "Status", render: (r) => <StatusChip tone={STATUS_TONE[r.status]} size="sm">{r.status}</StatusChip> },
          { key: "acao", header: "Acao", align: "right", render: (r) => r.status === "pendente"
            ? (
              <div className="flex items-center justify-end gap-1">
                <button disabled={bulkSaving || !r.cargaDbId} onClick={() => etiquetarDocumento(r)} className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] hover:bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] disabled:opacity-50" title="Etiquetar volumes"><Tags className="h-4 w-4" /></button>
                <button disabled={savingId === r.id} onClick={() => marcarDocumento(r.id, "conferida")} className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--success)_10%,transparent)] disabled:opacity-50" title="Marcar conferida"><CheckCircle2 className="h-4 w-4" /></button>
                <button disabled={savingId === r.id} onClick={() => marcarDocumento(r.id, "divergente")} className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--danger)] ring-1 ring-[color:color-mix(in_oklab,var(--danger)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] disabled:opacity-50" title="Marcar divergente"><AlertTriangle className="h-4 w-4" /></button>
              </div>
            )
            : (
              <div className="flex items-center justify-end gap-1">
                <button disabled={bulkSaving || !r.cargaDbId} onClick={() => etiquetarDocumento(r)} className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] hover:bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] disabled:opacity-50" title="Etiquetar volumes"><Tags className="h-4 w-4" /></button>
                <span className="text-[11px] text-muted-foreground">{r.lancadoPor ?? "-"}</span>
              </div>
            ) },
        ]}
      />

      <div className="surface-card brand-rail brand-rail-left p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Upload do cliente / agente (B.2)</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Como o cliente envia o documento antes ou no momento do envio. O documento cai na fila acima como pendente.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <UploadDropzone />
          <div className="space-y-2 text-sm">
            <SelectRow label="Remetente" value="Nome/razao social - CPF/CNPJ - telefone" />
            <SelectRow label="Destinatario" value="Nome/razao social - CPF/CNPJ - telefone" />
            <SelectRow label="Tipo de documento" value="NF-e - NFC-e - Declaracao de Conteudo" />
            <SelectRow label="Modalidade" value="CIF ou FOB" />
            <SelectRow label="Valor declarado" value="R$ -" />
            <SelectRow label="Agendamento" value="Dia + janela de 30 min" />
            <p className="text-[11px] text-muted-foreground">Estados: vazio, carregando, erro e sucesso. Buckets pendentes e hospedagem do object storage ficam registrados em `docs/infra/BUCKETS-PENDENTES.md`.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Agenda de recebimento de carga</h3>
            <StatusChip tone="warning">max. 5 caminhoes / 30 min</StatusChip>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">O documento enviado agenda o dia e o horario de chegada. Janela cheia bloqueia novo agendamento.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {agenda.map((a) => {
              const lotado = a.usados >= 5;
              return (
                <div key={`${a.janela}-${a.doc}`} className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-foreground">{a.janela}</span>
                    <StatusChip tone={lotado ? "danger" : a.usados > 0 ? "warning" : "success"} size="xs">
                      {a.usados}/5
                    </StatusChip>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.empresa} - {a.doc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Previsibilidade do dia</h3>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniNumber label="caminhoes" value={String(Math.max(1, agenda.filter((a) => a.usados > 0).length))} />
            <MiniNumber label="volumes prev." value={String(recebimentosAgora.reduce((s, r) => s + r.volumes, 0))} />
            <MiniNumber label="janelas cheias" value={String(agenda.filter((a) => a.usados >= 5).length)} />
          </div>
          <div className="mt-4 border-t border-[color:var(--hairline)] pt-4">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-[color:var(--success)]" />
              <p className="text-sm font-medium">Recebimentos em tempo real</p>
            </div>
            <div className="mt-2 space-y-2">
              {recebimentosAgora.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs ring-1 ring-[color:var(--hairline)]">
                  <span className="font-mono text-foreground">{r.doc}</span>
                  <span className="text-muted-foreground">{r.status}</span>
                  <span className="font-mono text-[color:var(--brand)]">{r.volumes} vol</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapDocumentoNota(doc: TmsDocumentoApi): NotaDC {
  return {
    id: doc.id,
    tipo: doc.tipo === "DC" ? "DC" : "NFe",
    pagamento: doc.pagamento === "FOB" ? "FOB" : "CIF",
    numero: doc.numero ?? doc.numero_pedido ?? doc.carga_codigo ?? doc.id,
    cliente: doc.cliente_nome ?? "Cliente nao informado",
    valor: doc.valor ?? 0,
    cargaId: doc.carga_codigo ?? doc.carga_id ?? undefined,
    cargaDbId: doc.carga_id ?? undefined,
    origem: doc.origem === "cliente" || doc.origem === "agente" ? doc.origem : "manual",
    status: normalizeDocumentoStatus(doc.status),
    lancadoPor: doc.lancado_por_nome ?? "API TMS",
  };
}

function mapCargaNota(carga: TmsCargaApi): NotaDC {
  return {
    id: carga.id,
    tipo: carga.numero_pedido?.toUpperCase().includes("DC") ? "DC" : "NFe",
    pagamento: "CIF",
    numero: carga.numero_pedido ?? carga.codigo ?? carga.id,
    cliente: carga.remetente_nome,
    valor: carga.valor_declarado ?? 0,
    cargaId: carga.codigo ?? carga.id,
    cargaDbId: carga.id,
    origem: carga.tipo_recebimento === "direto" ? "agente" : "manual",
    status: carga.status === "rascunho" ? "pendente" : carga.status === "divergente" ? "divergente" : "conferida",
    lancadoPor: "API TMS",
  };
}

function normalizeDocumentoStatus(status: string): NotaDCStatus {
  if (status === "pendente" || status === "divergente") return status;
  return "conferida";
}

function buildAgenda(documentos?: TmsDocumentoApi[], cargas?: TmsCargaApi[]) {
  const agendados = (documentos ?? []).filter((documento) => documento.agendado_para);
  const fonte = agendados.length
    ? Object.values(agendados.reduce<Record<string, { janela: string; usados: number; empresa: string; doc: string }>>((acc, documento) => {
      const key = documento.agendado_para!;
      const atual = acc[key];
      acc[key] = {
        janela: formatAgendaDateTime(key),
        usados: Math.min(5, (atual?.usados ?? 0) + 1),
        empresa: documento.cliente_nome ?? atual?.empresa ?? "Cliente nao informado",
        doc: atual ? `${atual.usados + 1} NF/DC` : documento.numero ?? documento.carga_codigo ?? "sem numero",
      };
      return acc;
    }, {})).slice(0, 6)
    : cargas?.slice(0, 4).map((c, index) => ({
      janela: nextJanela(index),
      usados: Math.min(5, Math.max(1, Number(c.total_volumes ?? 1))),
      empresa: c.remetente_nome,
      doc: c.numero_pedido ?? c.codigo ?? "sem numero",
    })) ?? [];
  return fonte.length ? fonte : [{ janela: "08:00", usados: 0, empresa: "Livre", doc: "-" }];
}

function buildRecebimentos(documentos?: TmsDocumentoApi[], cargas?: TmsCargaApi[]) {
  if (documentos?.length) {
    return documentos.slice(0, 3).map((d, index) => ({
      id: d.id,
      doc: d.numero ?? d.carga_codigo ?? `DOC-${index + 1}`,
      status: d.status === "pendente" ? "aguardando conferencia" : d.status,
      volumes: Math.max(1, Math.round(Number(d.peso_total ?? 1) / 20)),
    }));
  }
  return (cargas ?? []).slice(0, 3).map((c, index) => ({
    id: c.id,
    doc: c.numero_pedido ?? c.codigo ?? `DOC-${index + 1}`,
    status: c.status,
    volumes: c.total_volumes ?? 1,
  }));
}

function nextJanela(index: number) {
  const baseMinutes = 8 * 60 + index * 30;
  const hour = Math.floor(baseMinutes / 60);
  const minute = baseMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function MiniStat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "warning" | "danger" | "success"; icon: React.ComponentType<{ className?: string }> }) {
  const color = tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--warning)";
  return (
    <div className="surface-card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg ring-1" style={{ color, background: `color-mix(in oklab, ${color} 10%, transparent)`, borderColor: "transparent" }}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="big-numeric text-2xl text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function UploadDropzone() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[color:var(--hairline-strong)] bg-[color:var(--muted)] p-8 text-center">
      <Upload className="h-8 w-8 text-[color:var(--brand)]" />
      <p className="mt-2 text-sm font-medium">Arraste o PDF/foto ou informe a chave NF-e</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">PDF, JPG ou XML - ate 10 MB</p>
    </div>
  );
}

function SelectRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1 flex h-10 items-center rounded-lg bg-[color:var(--muted)] px-3 text-sm text-muted-foreground ring-1 ring-[color:var(--hairline)]">{value}</div>
    </div>
  );
}

function MiniNumber({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
      <p className="big-numeric text-xl text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </div>
  );
}

function parseNumber(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function todayDateInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatSlotTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAgendaDateTime(value: string) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
  return `${date}, ${formatSlotTime(value)}`;
}

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        inputMode={inputMode}
        maxLength={maxLength}
        className="mt-1 h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-[color:var(--brand)]"
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

function AgendamentoRecebimentoField({
  data,
  agendadoPara,
  slots,
  loading,
  onDataChange,
  onSlotChange,
}: {
  data: string;
  agendadoPara: string;
  slots: TmsAgendamentoSlotApi[];
  loading: boolean;
  onDataChange: (value: string) => void;
  onSlotChange: (value: string) => void;
}) {
  const selected = slots.find((slot) => slot.inicio === agendadoPara);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Agendamento</p>
        <span className="text-[9px] text-muted-foreground/70">5 vagas / 30 min</span>
      </div>
      <div className="mt-1 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
        <input
          type="date"
          value={data}
          onChange={(event) => onDataChange(event.target.value)}
          className="h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--brand)]"
        />
        <select
          value={agendadoPara}
          onChange={(event) => onSlotChange(event.target.value)}
          disabled={loading || slots.length === 0}
          className="h-10 w-full rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground focus:border-[color:var(--brand)]"
        >
          <option value="">{loading ? "consultando..." : "Selecionar horario"}</option>
          {slots.map((slot) => (
            <option key={slot.inicio} value={slot.inicio} disabled={slot.bloqueada}>
              {formatSlotTime(slot.inicio)} - {slot.disponiveis}/{slot.capacidade} vagas
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {selected ? `${selected.ocupadas} NF/DC agendada(s), ${selected.disponiveis} vaga(s) livres.` : "Consulta disponibilidade do sistema."}
      </p>
    </div>
  );
}

function FormFile({
  label,
  fileName,
  fileHash,
  fileSize,
  onChange,
}: {
  label: string;
  fileName: string;
  fileHash: string;
  fileSize: number | null;
  onChange: (file?: File) => void | Promise<void>;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="mt-1 flex min-h-10 items-center gap-3 rounded-md border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 py-2 text-sm text-foreground transition-colors focus-within:border-[color:var(--brand)]">
        <Upload className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
        <input
          type="file"
          accept=".pdf,.xml,.jpg,.jpeg,.png,application/pdf,application/xml,text/xml,image/jpeg,image/png"
          onChange={(event) => void onChange(event.target.files?.[0])}
          className="min-w-0 flex-1 text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--brand)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
        {fileName && (
          <span className="hidden max-w-[220px] truncate text-[11px] text-muted-foreground md:inline">
            {fileName} {formatBytes(fileSize)} {fileHash ? `- ${fileHash.slice(0, 8)}` : ""}
          </span>
        )}
      </div>
    </label>
  );
}
