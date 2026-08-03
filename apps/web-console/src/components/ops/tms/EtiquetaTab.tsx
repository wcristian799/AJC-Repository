import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, Printer, RefreshCw, Search, Tags, XCircle } from "lucide-react";
import { RealQR } from "@/components/ops/RealQR";
import {
  GhostButton,
  PrimaryButton,
  SectionHeader,
  StatusChip,
  Tag,
} from "@/components/ops/primitives";
import {
  confirmTmsEtiqueta,
  getConfigValue,
  listTmsEtiquetaTargets,
  listTmsEtiquetas,
  printTmsTargetEtiqueta,
  type TmsEtiquetaApi,
  type TmsEtiquetaTargetApi,
} from "@/lib/ajc-api";

type Mode = "palete" | "volume";
type HardwareConfig = {
  larguraMm: number | null;
  alturaMm: number | null;
  copiasPadrao: number;
  perfilImpressora: string | null;
  protocolo: string | null;
};

export function EtiquetaTab() {
  const [mode, setMode] = useState<Mode>("palete");
  const [search, setSearch] = useState("");
  const [targets, setTargets] = useState<TmsEtiquetaTargetApi[]>([]);
  const [selected, setSelected] = useState<TmsEtiquetaTargetApi | null>(null);
  const [labels, setLabels] = useState<TmsEtiquetaApi[]>([]);
  const [hardware, setHardware] = useState<HardwareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [job, setJob] = useState<TmsEtiquetaApi | null>(null);
  const [reprint, setReprint] = useState<TmsEtiquetaApi | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [targetRows, labelResponse, config] = await Promise.all([
        listTmsEtiquetaTargets(mode, search || undefined),
        listTmsEtiquetas(),
        getConfigValue("tms_paletizacao_etiquetas"),
      ]);
      setTargets(targetRows);
      setLabels(labelResponse.items);
      const value = config.valor as { etiqueta: HardwareConfig };
      setHardware(value.etiqueta);
      setSelected(
        (current) => targetRows.find((row) => row.id === current?.id) ?? targetRows[0] ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as etiquetas.");
    } finally {
      setLoading(false);
    }
  }, [mode, search]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);
  const configured = Boolean(
    hardware?.perfilImpressora && hardware?.protocolo && hardware?.larguraMm && hardware?.alturaMm,
  );

  async function createPrint(kind: "impressao" | "reimpressao") {
    if (!selected) return;
    setError(null);
    setMessage(null);
    try {
      const created = await printTmsTargetEtiqueta({
        alvoTipo: mode,
        alvoId: selected.id,
        conferenciaId: selected.conferencia_id,
        tipo: kind,
        justificativa: kind === "reimpressao" ? reason : undefined,
        etiquetaOriginalId: kind === "reimpressao" ? reprint?.id : undefined,
        printerModel: hardware?.perfilImpressora ?? undefined,
        clientUuid: crypto.randomUUID(),
      });
      setJob(created);
      setMessage(
        configured
          ? `${created.protocolo} pronto para enviar à impressora configurada.`
          : `${created.protocolo} gerado, mas o perfil físico ainda não está publicado em Cadastros.`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a etiqueta.");
    }
  }
  async function sendToPrinter() {
    if (!job || !selected || !hardware?.larguraMm || !hardware?.alturaMm) return;
    const qr = await QRCode.toDataURL(selected.id, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
    });
    const win = window.open("", "_blank", "width=720,height=720");
    if (!win) return setError("O navegador bloqueou a janela de impressão.");
    win.document.write(labelHtml(selected, job, hardware, qr));
    win.document.close();
    win.focus();
    win.print();
  }
  async function confirm(success: boolean) {
    if (!job) return;
    try {
      const updated = await confirmTmsEtiqueta(
        job.id,
        success,
        success ? undefined : "Impressão não saiu ou ficou ilegível",
      );
      setJob(updated);
      setMessage(
        success
          ? "Impressão física confirmada e auditada."
          : "Falha registrada. O mesmo QR pode ser reimpresso.",
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a impressão.");
    }
  }
  function chooseReprint(row: TmsEtiquetaApi) {
    setReprint(row);
    setReason("");
    setMode(row.alvo_tipo ?? (row.palete_id ? "palete" : "volume"));
    setSearch(row.alvo_codigo ?? "");
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Identificação física auditável"
        title="Etiquetas"
        description="Escolha exatamente um palete ou volume avulso. MP/PD/PC vem da conferência persistida — nunca é deduzido pela quantidade."
        actions={
          <GhostButton icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {loading ? "Atualizando…" : "Atualizar"}
          </GhostButton>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="surface-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton
                active={mode === "palete"}
                onClick={() => {
                  setMode("palete");
                  setSearch("");
                  setReprint(null);
                }}
              >
                Palete MP/PD/PC
              </FilterButton>
              <FilterButton
                active={mode === "volume"}
                onClick={() => {
                  setMode("volume");
                  setSearch("");
                  setReprint(null);
                }}
              >
                Volume avulso
              </FilterButton>
              <label className="relative ml-auto min-w-[240px] flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="field-control pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    mode === "palete" ? "palete, viagem ou local" : "UUID, carga ou cliente"
                  }
                />
              </label>
            </div>
          </div>
          {error && (
            <p className="rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] p-3 text-sm text-[color:var(--danger)] ring-1 ring-[color:var(--hairline)]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-[color:color-mix(in_oklab,var(--success)_9%,transparent)] p-3 text-sm text-[color:var(--success)] ring-1 ring-[color:var(--hairline)]">
              {message}
            </p>
          )}
          <div className="surface-card overflow-hidden">
            <div className="border-b border-[color:var(--hairline)] p-4">
              <h3 className="text-sm font-semibold">
                {mode === "palete" ? "Paletes classificados" : "Volumes aguardando etiqueta e bipe"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Resultados consultados no fluxo real de recebimento.
              </p>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {targets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => {
                    setSelected(target);
                    setReprint(null);
                  }}
                  className={`flex w-full items-center justify-between gap-4 border-b border-[color:var(--hairline)] p-4 text-left transition-colors last:border-0 ${selected?.id === target.id ? "bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)]" : "hover:bg-[color:var(--accent)]"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold">
                      {mode === "palete"
                        ? target.codigo
                        : `${target.carga_codigo} · ${target.indice_volume}/${target.total_volumes}`}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {mode === "palete"
                        ? `${target.viagem_codigo} · ${target.local_nome}`
                        : `${target.cliente_nome} · ${target.viagem_codigo}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {target.tipo_unitizacao && <Tag tone="brand">{target.tipo_unitizacao}</Tag>}
                    <StatusChip tone={target.possui_etiqueta ? "success" : "warning"} size="sm">
                      {target.possui_etiqueta ? "etiquetado" : "pendente"}
                    </StatusChip>
                  </div>
                </button>
              ))}
              {!targets.length && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {loading
                    ? "Consultando…"
                    : "Nenhum alvo disponível. Abra uma conferência e aloque a NF/DC primeiro."}
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Pré-visualização</h3>
              {selected?.tipo_unitizacao && <Tag tone="brand">{selected.tipo_unitizacao}</Tag>}
            </div>
            {selected ? (
              <LabelPreview target={selected} />
            ) : (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Selecione um item para visualizar.
              </p>
            )}
            {selected && (
              <div className="mt-5 space-y-2">
                <PrimaryButton
                  icon={Printer}
                  onClick={() => void createPrint("impressao")}
                  disabled={selected.possui_etiqueta}
                >
                  Gerar impressão original
                </PrimaryButton>
                {selected.possui_etiqueta && (
                  <p className="text-xs text-muted-foreground">
                    Este item já possui etiqueta original. Use a seleção de reimpressão abaixo.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="surface-card p-4">
            <div className="flex items-start gap-3">
              <Printer
                className={`mt-0.5 h-4 w-4 ${configured ? "text-[color:var(--success)]" : "text-[color:var(--warning)]"}`}
              />
              <div>
                <p className="text-sm font-medium">
                  {configured ? hardware?.perfilImpressora : "Impressora não configurada"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {configured
                    ? `${hardware?.protocolo} · ${hardware?.larguraMm} × ${hardware?.alturaMm} mm · ${hardware?.copiasPadrao} cópia(s)`
                    : "Publique perfil, protocolo e dimensão em Cadastros. O sistema não registrará impressão física enquanto isso estiver vazio."}
                </p>
              </div>
            </div>
          </div>
          {job && (
            <div className="surface-card p-4">
              <h4 className="text-sm font-semibold">{job.protocolo}</h4>
              <p className="mt-1 text-xs text-muted-foreground">Estado: {job.status}</p>
              {configured && job.status !== "concluida" && (
                <>
                  <div className="mt-3">
                    <PrimaryButton icon={Printer} onClick={() => void sendToPrinter()}>
                      Abrir impressão
                    </PrimaryButton>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => void confirm(true)}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-xs text-[color:var(--success)] ring-1 ring-[color:var(--hairline)]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Saiu legível
                    </button>
                    <button
                      onClick={() => void confirm(false)}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-xs text-[color:var(--danger)] ring-1 ring-[color:var(--hairline)]"
                    >
                      <XCircle className="h-4 w-4" />
                      Falhou
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-[color:var(--hairline)] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Tags className="h-4 w-4 text-[color:var(--brand)]" />
            Reimpressão do dia operacional
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Escolha a etiqueta original exata; a reimpressão mantém o mesmo alvo e exige
            justificativa.
          </p>
        </div>
        <div className="grid gap-px bg-[color:var(--hairline)] sm:grid-cols-2 xl:grid-cols-3">
          {labels
            .filter((row) => row.tipo === "impressao")
            .map((row) => (
              <button
                key={row.id}
                onClick={() => chooseReprint(row)}
                className="bg-[color:var(--surface-elev)] p-4 text-left hover:bg-[color:var(--accent)]"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs">{row.protocolo}</span>
                  <Tag tone="neutral">{row.alvo_tipo ?? (row.palete_id ? "palete" : "volume")}</Tag>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.alvo_codigo} · {formatTime(row.criado_em)} ·{" "}
                  {row.solicitado_por_nome ?? "operador"}
                </p>
              </button>
            ))}
          {!labels.some((row) => row.tipo === "impressao") && (
            <p className="col-span-full bg-[color:var(--surface-elev)] p-5 text-sm text-muted-foreground">
              Nenhuma etiqueta original registrada hoje.
            </p>
          )}
        </div>
        {reprint && (
          <div className="border-t border-[color:var(--hairline)] p-4">
            <p className="text-sm font-medium">Reimprimir {reprint.protocolo}</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field-control flex-1"
                placeholder="Justificativa: etiqueta rasgada, borrada…"
              />
              <PrimaryButton
                onClick={() => void createPrint("reimpressao")}
                disabled={reason.trim().length < 3}
              >
                Gerar reimpressão
              </PrimaryButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function LabelPreview({ target }: { target: TmsEtiquetaTargetApi }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg bg-white text-black ring-1 ring-black/10">
      <div className="flex border-b-2 border-dashed border-black/30">
        <div className="flex-1 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-black/55">Destino</p>
          <p className="font-mono text-4xl font-black">{target.cidade_destino_sigla}</p>
        </div>
        <div className="grid min-w-20 place-items-center border-l-2 border-dashed border-black/30 p-3 font-mono text-2xl font-black">
          {target.tipo_unitizacao ?? "AV"}
        </div>
      </div>
      <div className="flex items-center gap-3 p-4">
        <RealQR value={target.id} size={112} label={`QR ${target.codigo}`} />
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase text-black/55">
            {target.tipo_unitizacao ? "Palete" : "Volume"}
          </p>
          <p className="break-all font-mono text-sm font-bold">{target.codigo}</p>
          <p className="mt-2 text-[10px] text-black/65">Viagem {target.viagem_codigo}</p>
          {target.documentos !== undefined && (
            <p className="text-[10px] text-black/65">
              {target.documentos} NF/DC · {target.volumes} volumes
            </p>
          )}
          {target.carga_codigo && (
            <p className="text-[10px] text-black/65">
              Carga {target.carga_codigo} · {target.indice_volume}/{target.total_volumes}
            </p>
          )}
        </div>
      </div>
      <div className="bg-black px-3 py-2 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-white">
        AJC · identificação operacional
      </div>
    </div>
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
      className={`h-10 rounded-md px-4 text-xs font-medium ring-1 ${active ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]" : "text-muted-foreground ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"}`}
    >
      {children}
    </button>
  );
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
function labelHtml(
  target: TmsEtiquetaTargetApi,
  job: TmsEtiquetaApi,
  hardware: HardwareConfig,
  qr: string,
) {
  const width = hardware.larguraMm ?? 100;
  const height = hardware.alturaMm ?? 70;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${job.protocolo}</title><style>@page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#000}.label{width:${width}mm;height:${height}mm;padding:3mm;border:1px solid #000;display:grid;grid-template-columns:1fr 30mm;gap:3mm}.dest{font:900 13mm/1 monospace}.code{font:700 5mm monospace;overflow-wrap:anywhere}.meta{font-size:3.2mm;margin-top:2mm}.qr{width:28mm;height:28mm}.protocol{font:700 2.8mm monospace;margin-top:2mm}@media print{button{display:none}}</style></head><body><div class="label"><div><div class="dest">${escapeHtml(target.cidade_destino_sigla)}</div><div class="code">${escapeHtml(target.codigo)}</div><div class="meta">${escapeHtml(target.tipo_unitizacao ?? "AVULSA")} · viagem ${escapeHtml(target.viagem_codigo)}</div><div class="protocol">${escapeHtml(job.protocolo)}</div></div><img class="qr" src="${qr}" alt="QR"></div></body></html>`;
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char,
  );
}
