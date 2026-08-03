import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Layers,
  PackageOpen,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Ship,
  WifiOff,
} from "lucide-react";
import { RealQR } from "@/components/ops/RealQR";
import { GhostButton, PrimaryButton, StatusChip, Tag } from "@/components/ops/primitives";
import {
  addTmsConferenciaItem,
  closeTmsConferencia,
  confirmTmsEtiqueta,
  getConfigValue,
  getTmsConferencia,
  listNavegacaoViagens,
  listTmsConferenciaDocumentos,
  listTmsLocaisOperacionais,
  listTmsPaletes,
  openTmsConferencia,
  printTmsTargetEtiqueta,
  scanTmsConferenciaVolume,
  uploadTmsConferenciaEvidencia,
  type NavegacaoViagemApi,
  type TmsConferenciaApi,
  type TmsConferenciaDocumentoApi,
  type TmsEtiquetaApi,
  type TmsLocalOperacionalApi,
  type TmsPaleteApi,
} from "@/lib/ajc-api";
import {
  flushReceivingQueue,
  listReceivingQueue,
  persistEvidence,
  queueReceivingOperation,
} from "@/lib/tms-receiving-offline";

const ACTIVE_KEY = "ajc.tms.conferencia.ativa.v1";
type UnitType = "AVULSA" | "MP" | "PD" | "PC";
type Config = {
  unitizacoes: Array<{
    codigo: "MP" | "PD" | "PC";
    nome: string;
    descricao: string;
    ativo: boolean;
  }>;
  recebimento: { exigirEvidencia: boolean; minimoEvidencias: number; permitirAvulsa: boolean };
  etiqueta: {
    larguraMm: number | null;
    alturaMm: number | null;
    copiasPadrao: number;
    perfilImpressora: string | null;
    protocolo: string | null;
  };
  offline: { habilitado: boolean; maximoPendencias: number };
};

export function RecebimentoOperacional({ direct = false }: { direct?: boolean }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [trips, setTrips] = useState<NavegacaoViagemApi[]>([]);
  const [locations, setLocations] = useState<TmsLocalOperacionalApi[]>([]);
  const [pallets, setPallets] = useState<TmsPaleteApi[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [conference, setConference] = useState<TmsConferenciaApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tripId, setTripId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [destination, setDestination] = useState("");
  const [type, setType] = useState<UnitType | "">(direct ? "AVULSA" : "");
  const [palletId, setPalletId] = useState("");
  const [documents, setDocuments] = useState<TmsConferenciaDocumentoApi[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<TmsConferenciaDocumentoApi | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justification, setJustification] = useState("");
  const [scan, setScan] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [composition, setComposition] = useState<"parcial" | "completo">("parcial");
  const [observation, setObservation] = useState("");
  const [labelJob, setLabelJob] = useState<TmsEtiquetaApi | null>(null);
  const [labelTarget, setLabelTarget] = useState<{
    tipo: "palete" | "volume";
    id: string;
    codigo: string;
    destino: string;
    unitizacao: string;
  } | null>(null);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tripRows, localRows, palletResponse, configValue] = await Promise.all([
        listNavegacaoViagens(),
        listTmsLocaisOperacionais(),
        listTmsPaletes({ porPagina: 100 }),
        getConfigValue("tms_paletizacao_etiquetas"),
      ]);
      setTrips(tripRows);
      setLocations(localRows);
      setPallets(palletResponse.items);
      setConfig(configValue.valor as Config);
      const saved = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null;
      if (saved) {
        try {
          setConference(await getTmsConferencia(saved));
        } catch {
          localStorage.removeItem(ACTIVE_KEY);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o recebimento.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      setPending(listReceivingQueue().length);
    };
    update();
    void loadBase();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const queue = () => update();
    window.addEventListener("ajc:receiving-queue", queue);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("ajc:receiving-queue", queue);
    };
  }, [loadBase]);
  useEffect(() => {
    if (!online || !pending) return;
    flushReceivingQueue(setPending).then((remaining) => {
      if (!remaining && conference)
        getTmsConferencia(conference.id)
          .then(setConference)
          .catch(() => undefined);
    });
  }, [online, pending, conference]);
  useEffect(() => {
    if (!conference) return;
    listTmsConferenciaDocumentos(conference.viagem_id, documentSearch || undefined)
      .then(setDocuments)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Falha ao buscar NF/DC."),
      );
  }, [conference, documentSearch]);
  const trip = trips.find((row) => row.id === tripId);
  const stops = useMemo(
    () =>
      trip
        ? [
            trip.origemSigla,
            ...(trip.escalas ?? []).map((stop) => stop.cidadeSigla),
            trip.destinoSigla,
          ].filter((value): value is string => Boolean(value))
        : [],
    [trip],
  );
  const availablePallets = pallets.filter(
    (row) =>
      row.ativo &&
      row.local_operacional_id === locationId &&
      (row.status === "livre" ||
        (row.viagem_id === tripId && row.cidade_destino_sigla === destination)),
  );

  async function start() {
    if (!online)
      return setError(
        "Para abrir uma nova conferência é necessário sincronizar o contexto da viagem. Uma conferência já aberta continua funcionando offline.",
      );
    if (!tripId || !locationId || !destination)
      return setError("Selecione viagem, local e destino.");
    if (!type) return setError("Escolha explicitamente a forma de unitização.");
    if (type !== "AVULSA" && !palletId) return setError("Selecione ou bipa um palete livre.");
    setLoading(true);
    setError(null);
    try {
      const created = await openTmsConferencia({
        viagemId: tripId,
        localOperacionalId: locationId,
        cidadeDestinoSigla: destination,
        tipoUnitizacao: type,
        paleteId: type === "AVULSA" ? undefined : palletId,
        clientUuid: crypto.randomUUID(),
      });
      setConference(created);
      localStorage.setItem(ACTIVE_KEY, created.id);
      setMessage(`Conferência ${created.palete_codigo ?? "avulsa"} aberta.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a conferência.");
    } finally {
      setLoading(false);
    }
  }
  async function addDocument() {
    if (!conference || !selectedDocument) return;
    const payload = {
      documentoFiscalId: selectedDocument.id,
      quantidadeInformada: quantity,
      justificativa: justification || undefined,
      clientUuid: crypto.randomUUID(),
    };
    setLoading(true);
    setError(null);
    try {
      if (online) setConference(await addTmsConferenciaItem(conference.id, payload));
      else {
        if (!config?.offline.habilitado)
          throw new Error("Operação offline desativada na configuração publicada.");
        queueReceivingOperation(
          {
            id: crypto.randomUUID(),
            kind: "item",
            conferenceId: conference.id,
            payload,
            createdAt: new Date().toISOString(),
          },
          config.offline.maximoPendencias,
        );
        setPending(listReceivingQueue().length);
        setMessage("Alocação guardada no aparelho. Sincronize antes de etiquetar volumes avulsos.");
      }
      setSelectedDocument(null);
      setJustification("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alocar a NF/DC.");
    } finally {
      setLoading(false);
    }
  }
  async function generateLabel(target: {
    tipo: "palete" | "volume";
    id: string;
    codigo: string;
    destino: string;
    unitizacao: string;
  }) {
    if (!conference) return;
    if (!online)
      return setError(
        "A etiqueta precisa obter protocolo auditável antes da impressão. Reconecte para gerar; os demais registros permanecem na fila.",
      );
    setLoading(true);
    setError(null);
    try {
      const created = await printTmsTargetEtiqueta({
        alvoTipo: target.tipo,
        alvoId: target.id,
        conferenciaId: conference.id,
        tipo: "impressao",
        printerModel: config?.etiqueta.perfilImpressora ?? undefined,
        clientUuid: crypto.randomUUID(),
      });
      setLabelJob(created);
      setLabelTarget(target);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a etiqueta.");
    } finally {
      setLoading(false);
    }
  }
  async function openPrint() {
    if (!labelJob || !labelTarget || !config?.etiqueta.larguraMm || !config.etiqueta.alturaMm)
      return setError("Publique modelo, protocolo e dimensão da impressora em Cadastros.");
    const qr = await QRCode.toDataURL(labelTarget.id, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
    });
    const win = window.open("", "_blank", "width=720,height=720");
    if (!win) return setError("O navegador bloqueou a janela de impressão.");
    win.document.write(fieldLabelHtml(labelTarget, labelJob, config.etiqueta, qr));
    win.document.close();
    win.focus();
    win.print();
  }
  async function confirmLabel(success: boolean) {
    if (!labelJob) return;
    try {
      setLabelJob(
        await confirmTmsEtiqueta(
          labelJob.id,
          success,
          success ? undefined : "Etiqueta não saiu ou ficou ilegível",
        ),
      );
      if (success && conference) setConference(await getTmsConferencia(conference.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao confirmar impressão.");
    }
  }
  async function receiveScan() {
    if (!conference || !scan.trim()) return;
    const payload = { volumeUuid: scan.trim(), clientUuid: crypto.randomUUID() };
    setError(null);
    try {
      if (online) setConference(await scanTmsConferenciaVolume(conference.id, payload));
      else {
        if (!config?.offline.habilitado)
          throw new Error("Operação offline desativada na configuração publicada.");
        queueReceivingOperation(
          {
            id: crypto.randomUUID(),
            kind: "scan",
            conferenceId: conference.id,
            payload,
            createdAt: new Date().toISOString(),
          },
          config.offline.maximoPendencias,
        );
        setPending(listReceivingQueue().length);
        setMessage("Bipe salvo no aparelho e aguardando sincronização.");
      }
      setScan("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o bipe.");
    }
  }
  async function finish() {
    if (!conference) return;
    if (
      config?.recebimento.exigirEvidencia &&
      evidenceFiles.length < (config.recebimento.minimoEvidencias ?? 1)
    )
      return setError(`Capture ao menos ${config.recebimento.minimoEvidencias} evidência(s).`);
    setLoading(true);
    setError(null);
    try {
      const clientUuid = crypto.randomUUID();
      if (online) {
        const evidences = [];
        for (const file of evidenceFiles) evidences.push(await uploadTmsConferenciaEvidencia(file));
        const closed = await closeTmsConferencia(conference.id, {
          estadoComposicao: conference.tipo_unitizacao === "AVULSA" ? undefined : composition,
          evidencias: evidences,
          observacao: observation || undefined,
          clientUuid,
        });
        setConference(closed);
        setMessage("Conferência fechada e auditada.");
      } else {
        if (!config?.offline.habilitado)
          throw new Error("Operação offline desativada na configuração publicada.");
        if (listReceivingQueue().length >= config.offline.maximoPendencias)
          throw new Error(
            `Limite de ${config.offline.maximoPendencias} operações offline atingido. Reconecte para sincronizar.`,
          );
        const evidencias = [];
        for (const file of evidenceFiles) evidencias.push(await persistEvidence(file));
        queueReceivingOperation(
          {
            id: crypto.randomUUID(),
            kind: "close",
            conferenceId: conference.id,
            payload: {
              estadoComposicao: conference.tipo_unitizacao === "AVULSA" ? undefined : composition,
              observacao: observation || undefined,
              clientUuid,
              evidencias,
            },
            createdAt: new Date().toISOString(),
          },
          config.offline.maximoPendencias,
        );
        setPending(listReceivingQueue().length);
        setMessage("Fechamento, fotos e auditoria foram guardados no aparelho.");
      }
      localStorage.removeItem(ACTIVE_KEY);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível fechar a conferência.");
    } finally {
      setLoading(false);
    }
  }
  function reset() {
    setConference(null);
    localStorage.removeItem(ACTIVE_KEY);
    setEvidenceFiles([]);
    setLabelJob(null);
    setMessage(null);
    void loadBase();
  }

  if (!conference)
    return (
      <div className="space-y-4">
        <FieldHeader
          title={direct ? "Recebimento direto" : "Nova conferência"}
          online={online}
          pending={pending}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        {message && <MessageBox>{message}</MessageBox>}
        <section className="surface-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <FieldLabel>Viagem</FieldLabel>
              <select
                value={tripId}
                onChange={(e) => {
                  setTripId(e.target.value);
                  setDestination("");
                }}
                className="field-control"
              >
                <option value="">Selecionar viagem</option>
                {trips
                  .filter((row) => row.status !== "concluida")
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.codigo} · {row.origemSigla} → {row.destinoSigla}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <FieldLabel>Local do recebimento</FieldLabel>
              <select
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  setPalletId("");
                }}
                className="field-control"
              >
                <option value="">Selecionar local real</option>
                {locations.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Destino da carga</FieldLabel>
              <select
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setPalletId("");
                }}
                className="field-control"
              >
                <option value="">Selecionar parada</option>
                {[...new Set(stops)].map((stop) => (
                  <option key={stop} value={stop}>
                    {stop}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5">
            <FieldLabel>Forma de unitização</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ModeButton
                active={type === "AVULSA"}
                icon={PackageOpen}
                title="Avulsa"
                description="Etiqueta e bipe por volume"
                onClick={() => {
                  setType("AVULSA");
                  setPalletId("");
                }}
              />
              {(config?.unitizacoes ?? [])
                .filter((unit) => unit.ativo)
                .map((unit) => (
                  <ModeButton
                    key={unit.codigo}
                    active={type === unit.codigo}
                    icon={Layers}
                    title={unit.codigo}
                    description={unit.nome}
                    onClick={() => {
                      setType(unit.codigo);
                      setPalletId("");
                    }}
                  />
                ))}
            </div>
          </div>
          {type && type !== "AVULSA" && (
            <label className="mt-5 block">
              <FieldLabel>Palete disponível neste local</FieldLabel>
              <select
                value={palletId}
                onChange={(e) => setPalletId(e.target.value)}
                className="field-control"
              >
                <option value="">Selecionar ou bipar código</option>
                {availablePallets.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.codigo} ·{" "}
                    {row.status === "livre"
                      ? "livre"
                      : `${row.tipo_unitizacao}/${row.estado_composicao}`}
                  </option>
                ))}
              </select>
              {locationId && destination && !availablePallets.length && (
                <p className="mt-2 text-xs text-[color:var(--warning)]">
                  Nenhum palete compatível neste local. Cadastre ou corrija a localização no painel.
                </p>
              )}
            </label>
          )}
          <PrimaryButton
            onClick={() => void start()}
            disabled={
              loading ||
              !tripId ||
              !locationId ||
              !destination ||
              !type ||
              (type !== "AVULSA" && !palletId)
            }
          >
            {loading ? "Validando…" : "Abrir conferência"}
          </PrimaryButton>
        </section>
      </div>
    );

  if (conference.fechada_em || conference.status === "fechada" || conference.status === "cancelada")
    return (
      <div className="space-y-4">
        <FieldHeader title="Conferência encerrada" online={online} pending={pending} />
        <div className="surface-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[color:var(--success)]" />
          <h3 className="mt-3 font-display text-2xl">Recebimento registrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {conference.itens.length} NF/DC ·{" "}
            {conference.itens.reduce((sum, item) => sum + item.quantidadeConferida, 0)} volumes ·{" "}
            {conference.conferente_nome}
          </p>
          {conference.status === "divergente" && (
            <p className="mt-2 text-sm text-[color:var(--danger)]">
              Fechado com divergência registrada para tratamento operacional.
            </p>
          )}
          <div className="mt-5">
            <PrimaryButton onClick={reset}>Nova conferência</PrimaryButton>
          </div>
        </div>
      </div>
    );

  const palletTarget =
    conference.palete_id && conference.palete_codigo
      ? {
          tipo: "palete" as const,
          id: conference.palete_id,
          codigo: conference.palete_codigo,
          destino: conference.itens[0]?.destino ?? destination,
          unitizacao: conference.tipo_unitizacao,
        }
      : null;
  const allVolumes = conference.itens.flatMap((item) => item.volumes ?? []);
  return (
    <div className="space-y-4">
      <FieldHeader
        title={conference.palete_codigo ?? "Mercadoria avulsa"}
        online={online}
        pending={pending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="brand">{conference.tipo_unitizacao}</Tag>
        <StatusChip tone={conference.status === "divergente" ? "danger" : "warning"}>
          {conference.status}
        </StatusChip>
        <span className="text-xs text-muted-foreground">
          {conference.viagem_codigo} · {conference.local_nome}
        </span>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {message && <MessageBox>{message}</MessageBox>}
      <section className="surface-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Alocar e conferir NF/DC</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A quantidade é validada contra os volumes declarados. Excesso exige justificativa e
              abre divergência.
            </p>
          </div>
          <FileText className="h-5 w-5 text-[color:var(--brand)]" />
        </div>
        <label className="relative mt-4 block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={documentSearch}
            onChange={(e) => setDocumentSearch(e.target.value)}
            className="field-control pl-9"
            placeholder="NF/DC, carga ou cliente"
          />
        </label>
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg ring-1 ring-[color:var(--hairline)]">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setSelectedDocument(doc);
                setQuantity(Math.max(1, doc.quantidade_restante));
              }}
              className={`flex w-full justify-between gap-3 border-b border-[color:var(--hairline)] p-3 text-left last:border-0 ${selectedDocument?.id === doc.id ? "bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)]" : "bg-[color:var(--muted)]"}`}
            >
              <span>
                <b className="block text-sm">
                  {doc.tipo}-{doc.numero}
                </b>
                <small className="text-muted-foreground">
                  {doc.cliente_codigo} · {doc.cliente_nome}
                </small>
              </span>
              <span className="font-mono text-xs">
                {doc.quantidade_restante}/{doc.quantidade_declarada}
              </span>
            </button>
          ))}
        </div>
        {selectedDocument && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[130px_1fr_auto]">
            <label>
              <FieldLabel>Quantidade</FieldLabel>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="field-control"
              />
            </label>
            <label>
              <FieldLabel>Justificativa de divergência</FieldLabel>
              <input
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="field-control"
                placeholder={
                  quantity > selectedDocument.quantidade_restante
                    ? "obrigatória para excedente"
                    : "somente se necessário"
                }
              />
            </label>
            <div className="flex items-end">
              <PrimaryButton onClick={() => void addDocument()} disabled={loading || quantity < 1}>
                Alocar
              </PrimaryButton>
            </div>
          </div>
        )}
      </section>

      <section className="surface-card p-4">
        <h3 className="text-sm font-semibold">Composição atual</h3>
        <div className="mt-3 space-y-2">
          {conference.itens.map((item) => (
            <div
              key={item.id}
              className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"
            >
              <div className="flex justify-between gap-3">
                <span>
                  <b className="text-sm">
                    {item.tipo}-{item.numero}
                  </b>
                  <small className="block text-muted-foreground">
                    {item.clienteNome} · {item.cargaCodigo}
                  </small>
                </span>
                <StatusChip
                  tone={
                    item.divergencia
                      ? "danger"
                      : item.quantidadeConferida === item.quantidadeInformada
                        ? "success"
                        : "warning"
                  }
                  size="sm"
                >
                  {item.quantidadeConferida}/{item.quantidadeInformada}
                </StatusChip>
              </div>
            </div>
          ))}
          {!conference.itens.length && (
            <p className="text-sm text-muted-foreground">Nenhuma NF/DC alocada.</p>
          )}
        </div>
      </section>

      {conference.tipo_unitizacao !== "AVULSA" && palletTarget && (
        <LabelAction
          target={palletTarget}
          job={labelJob}
          config={config}
          onGenerate={generateLabel}
          onPrint={openPrint}
          onConfirm={confirmLabel}
        />
      )}
      {conference.tipo_unitizacao === "AVULSA" && (
        <section className="surface-card p-4">
          <h3 className="text-sm font-semibold">Etiquetar e bipar cada volume</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            A API só recebe o volume depois que existe etiqueta original e o UUID é lido.
          </p>
          <div className="mt-3 space-y-2">
            {allVolumes.map((volume) => {
              const target = {
                tipo: "volume" as const,
                id: volume.uuid,
                codigo: `${volume.indice}/${volume.total}`,
                destino:
                  conference.itens.find((item) =>
                    item.volumes?.some((row) => row.uuid === volume.uuid),
                  )?.destino ?? "",
                unitizacao: "AVULSA",
              };
              return (
                <div
                  key={volume.uuid}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]"
                >
                  <span>
                    <b className="font-mono text-xs">
                      Volume {volume.indice}/{volume.total}
                    </b>
                    <small className="block max-w-[220px] truncate text-muted-foreground">
                      {volume.uuid}
                    </small>
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusChip
                      tone={volume.status === "recebido" ? "success" : "warning"}
                      size="sm"
                    >
                      {volume.status}
                    </StatusChip>
                    <button
                      onClick={() => void generateLabel(target)}
                      className="h-9 rounded-md px-3 text-xs text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                    >
                      Etiqueta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {labelTarget?.tipo === "volume" && labelJob && (
            <LabelAction
              target={labelTarget}
              job={labelJob}
              config={config}
              onGenerate={generateLabel}
              onPrint={openPrint}
              onConfirm={confirmLabel}
            />
          )}
          <div className="mt-4 flex gap-2">
            <input
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void receiveScan();
              }}
              className="field-control font-mono"
              placeholder="leia ou digite o UUID"
            />
            <button
              onClick={() => void receiveScan()}
              className="grid min-w-14 place-items-center rounded-md bg-[color:var(--brand)] text-white"
            >
              <ScanLine className="h-5 w-5" />
            </button>
          </div>
        </section>
      )}

      <section className="surface-card p-4">
        <div className="flex items-start gap-3">
          <Camera className="mt-0.5 h-5 w-5 text-[color:var(--brand)]" />
          <div>
            <h3 className="text-sm font-semibold">Evidências do recebimento</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Fotos reais são salvas no MinIO com SHA-256. Offline, ficam cifradas pelo
              armazenamento do navegador até sincronizar.
            </p>
          </div>
        </div>
        <label className="mt-4 flex min-h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[color:var(--hairline-strong)] bg-[color:var(--muted)] p-4 text-center">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(e) => setEvidenceFiles(Array.from(e.target.files ?? []))}
          />
          <span className="text-sm">
            {evidenceFiles.length
              ? `${evidenceFiles.length} foto(s) selecionada(s)`
              : "Capturar fotos do lote / palete"}
          </span>
        </label>
        {conference.tipo_unitizacao !== "AVULSA" && (
          <div className="mt-4">
            <FieldLabel>Estado físico ao fechar</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <FilterButton
                active={composition === "parcial"}
                onClick={() => setComposition("parcial")}
              >
                Parcial · continua aberto
              </FilterButton>
              <FilterButton
                active={composition === "completo"}
                onClick={() => setComposition("completo")}
              >
                Completo · fechado
              </FilterButton>
            </div>
          </div>
        )}
        <label className="mt-4 block">
          <FieldLabel>Observação</FieldLabel>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            className="field-control min-h-20 py-2"
            placeholder="ocorrência operacional, se houver"
          />
        </label>
        <div className="mt-4">
          <PrimaryButton
            onClick={() => void finish()}
            disabled={loading || !conference.itens.length}
          >
            {loading ? "Validando…" : online ? "Fechar conferência" : "Guardar fechamento offline"}
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}

function FieldHeader({
  title,
  online,
  pending,
}: {
  title: string;
  online: boolean;
  pending: number;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-[color:var(--brand)]">Recebimento físico</p>
        <h1 className="mt-1 font-display text-2xl">{title}</h1>
      </div>
      <div className="text-right">
        <StatusChip tone={online ? "success" : "warning"}>
          {online ? "online" : "offline"}
        </StatusChip>
        {pending > 0 && (
          <p className="mt-1 text-[10px] text-muted-foreground">{pending} pendente(s)</p>
        )}
      </div>
    </header>
  );
}
function ModeButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-24 rounded-lg p-3 text-left ring-1 ${active ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-[color:var(--hairline-brand)]" : "bg-[color:var(--muted)] ring-[color:var(--hairline)]"}`}
    >
      <Icon
        className={`h-5 w-5 ${active ? "text-[color:var(--brand)]" : "text-muted-foreground"}`}
      />
      <b className="mt-2 block text-sm">{title}</b>
      <small className="mt-1 block text-muted-foreground">{description}</small>
    </button>
  );
}
function LabelAction({
  target,
  job,
  config,
  onGenerate,
  onPrint,
  onConfirm,
}: {
  target: {
    tipo: "palete" | "volume";
    id: string;
    codigo: string;
    destino: string;
    unitizacao: string;
  };
  job: TmsEtiquetaApi | null;
  config: Config | null;
  onGenerate: (target: {
    tipo: "palete" | "volume";
    id: string;
    codigo: string;
    destino: string;
    unitizacao: string;
  }) => Promise<void>;
  onPrint: () => Promise<void>;
  onConfirm: (success: boolean) => Promise<void>;
}) {
  const configured = Boolean(
    config?.etiqueta.perfilImpressora &&
    config.etiqueta.protocolo &&
    config.etiqueta.larguraMm &&
    config.etiqueta.alturaMm,
  );
  return (
    <section className="surface-card p-4">
      <div className="flex gap-4">
        <RealQR value={target.id} size={88} />
        <div>
          <p className="text-xs text-muted-foreground">Etiqueta {target.tipo}</p>
          <h3 className="mt-1 font-mono text-base">{target.codigo}</h3>
          <p className="mt-1 text-xs">
            {target.unitizacao} · destino {target.destino}
          </p>
        </div>
      </div>
      {!job ? (
        <div className="mt-4">
          <PrimaryButton icon={Printer} onClick={() => void onGenerate(target)}>
            Gerar etiqueta
          </PrimaryButton>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">
            {job.protocolo} · {job.status}
          </p>
          {configured ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <PrimaryButton icon={Printer} onClick={() => void onPrint()}>
                Abrir impressão
              </PrimaryButton>
              <GhostButton onClick={() => void onConfirm(true)}>
                Confirmar saída legível
              </GhostButton>
              <GhostButton onClick={() => void onConfirm(false)}>Registrar falha</GhostButton>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--warning)]">
              Hardware incompleto em Cadastros. A conferência não poderá ser fechada fingindo
              impressão.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
function FilterButton({
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
      onClick={onClick}
      className={`min-h-11 rounded-md px-3 text-xs ring-1 ${active ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]" : "ring-[color:var(--hairline)]"}`}
    >
      {children}
    </button>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}
function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-sm text-[color:var(--danger)] ring-1 ring-[color:var(--hairline)]">
      <WifiOff className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}
function MessageBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[color:color-mix(in_oklab,var(--success)_9%,transparent)] p-3 text-sm text-[color:var(--success)] ring-1 ring-[color:var(--hairline)]">
      {children}
    </div>
  );
}
function fieldLabelHtml(
  target: { id: string; codigo: string; destino: string; unitizacao: string },
  job: TmsEtiquetaApi,
  hardware: Config["etiqueta"],
  qr: string,
) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${job.protocolo}</title><style>@page{size:${hardware.larguraMm}mm ${hardware.alturaMm}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#000}.label{width:${hardware.larguraMm}mm;height:${hardware.alturaMm}mm;padding:3mm;border:1px solid #000;display:grid;grid-template-columns:1fr 30mm;gap:3mm}.dest{font:900 13mm monospace}.code{font:700 5mm monospace;overflow-wrap:anywhere}.meta{font-size:3.2mm}.qr{width:28mm;height:28mm}</style></head><body><div class="label"><div><div class="dest">${target.destino}</div><div class="code">${target.codigo}</div><div class="meta">${target.unitizacao} · ${job.protocolo}</div></div><img class="qr" src="${qr}"></div></body></html>`;
}
