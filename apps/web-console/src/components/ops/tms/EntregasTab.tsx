import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, FileSignature, MessageCircle, ScanLine, UserRound } from "lucide-react";
import { StatusChip, Tag } from "@/components/ops/primitives";
import { PhoneFrame } from "./PhoneFrame";
import {
  AjcApiError,
  createTmsEntrega,
  listTmsVolumes,
  uploadTmsEntregaEvidencia,
  resolveCampoEntrega,
  type TmsVolumeApi,
  type CampoEntregaTargetApi,
} from "@/lib/ajc-api";

/** B.9 - Bipe final e comprovante de entrega com prova legal real. */
export function EntregasTab() {
  const [volumes, setVolumes] = useState<TmsVolumeApi[]>([]);
  const [scan, setScan] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target,setTarget] = useState<CampoEntregaTargetApi|null>(null);
  const [recebedorNome, setRecebedorNome] = useState("");
  const [recebedorDoc, setRecebedorDoc] = useState("");
  const [recebedorAvulso, setRecebedorAvulso] = useState(false);
  const [foto1, setFoto1] = useState<File | null>(null);
  const [foto2, setFoto2] = useState<File | null>(null);
  const [assinatura, setAssinatura] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeAlvo = useMemo(
    () => volumes.find((volume) => volume.id === selectedId) ?? null,
    [selectedId, volumes],
  );
  const podeConfirmar =
    !!volumeAlvo &&
    !!recebedorNome.trim() &&
    !!recebedorDoc.trim() &&
    !!foto1 &&
    !!foto2 &&
    !!assinatura &&
    !saving;

  useEffect(() => {
    let active = true;
    listTmsVolumes()
      .then((rows) => {
        if (active) setVolumes(rows);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof AjcApiError
              ? err.message
              : "Nao foi possivel carregar volumes.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  async function confirmarBipe() {
    const value = scan.trim().toLowerCase();
    if (!value) return;
    try {
      const resolved=await resolveCampoEntrega(value);
      setTarget(resolved);
      if(resolved.tipo==="veiculo_maquina"){setSelectedId(null);setError("Veículo ou máquina exige checklist de entrega no app de Conferente da Navegação.");return;}
      let available=volumes;
      if(!available.some(v=>resolved.volume_ids.includes(v.id))) available=await listTmsVolumes();
      setVolumes(available);
      const volume=available.find(item=>resolved.volume_ids.includes(item.id)&&item.status==="embarcado");
      if(!volume) throw new Error("O item não possui volume embarcado elegível para entrega.");
      setSelectedId(volume.id);setError(null);
    } catch (e) {
      setSelectedId(null);
      setTarget(null);
      setError(e instanceof Error?e.message:"Código não encontrado ou não elegível para entrega.");
    }
  }

  async function confirmarEntrega() {
    if (!volumeAlvo || !foto1 || !foto2 || !assinatura || !podeConfirmar) return;
    setSaving(true);
    setError(null);
    try {
      const [evidenciaFoto1, evidenciaFoto2, evidenciaAssinatura] = await Promise.all([
        uploadTmsEntregaEvidencia(foto1),
        uploadTmsEntregaEvidencia(foto2),
        uploadTmsEntregaEvidencia(assinatura),
      ]);
      const entrega = await createTmsEntrega({
        cidadeSigla: volumeAlvo.cidade_destino_sigla,
        volumeIds: [volumeAlvo.id],
        tipoOperacao: target?.tipo === "carga" || target?.tipo === "encomenda" || target?.tipo === "palete" ? target.tipo : "volume",
        paleteId: target?.tipo === "palete" ? target.id : undefined,
        dispositivo: typeof navigator !== "undefined" ? navigator.userAgent.slice(0,150) : undefined,
        recebedorNome: recebedorNome.trim(),
        recebedorDoc: recebedorDoc.trim(),
        recebedorAvulso,
        assinaturaUrl: evidenciaAssinatura.url,
        assinaturaHash: evidenciaAssinatura.hash,
        foto1Url: evidenciaFoto1.url,
        foto2Url: evidenciaFoto2.url,
        foto1Hash: evidenciaFoto1.hash,
        foto2Hash: evidenciaFoto2.hash,
        clientUuid: crypto.randomUUID(),
      });
      setVolumes((rows) =>
        rows.map((volume) =>
          volume.id === volumeAlvo.id ? { ...volume, status: "entregue" } : volume,
        ),
      );
      setProtocolo(entrega.protocolo);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof AjcApiError
          ? err.message
          : "Nao foi possivel confirmar a entrega.",
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setDone(false);
    setScan("");
    setSelectedId(null);
    setTarget(null);
    setRecebedorNome("");
    setRecebedorDoc("");
    setRecebedorAvulso(false);
    setFoto1(null);
    setFoto2(null);
    setAssinatura(null);
    setProtocolo(null);
    setError(null);
  }

  return (
    <PhoneFrame framed={false} online={!error} pending={error ? 1 : 0} clock={currentClock()}>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="flex min-h-[calc(100%-44px)] flex-col p-5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">
              Entrega · bipe final
            </p>
            <h3 className="mt-1 font-display text-xl">Comprovante de entrega</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Somente volumes embarcados podem ser entregues. O UUID pode vir do leitor ou da camera.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                value={scan}
                onChange={(event) => setScan(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && confirmarBipe()}
                placeholder="Bipar ou informar UUID do volume"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm outline-none focus:border-[color:var(--brand)]"
              />
              <button
                onClick={confirmarBipe}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)] text-white"
                aria-label="Confirmar bipe de entrega"
              >
                <ScanLine className="h-5 w-5" />
              </button>
            </div>

            {volumeAlvo && (
              <div className="mt-3 rounded-xl border border-[color:var(--hairline-brand)] bg-[color:color-mix(in_oklab,var(--brand)_9%,transparent)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs">{volumeAlvo.carga_codigo} · volume {volumeAlvo.indice_volume}/{volumeAlvo.total_volumes}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Destino {volumeAlvo.cidade_destino_sigla} · {volumeAlvo.categoria}</p>
                  </div>
                  <Tag tone="success">embarcado</Tag>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <label className="relative">
                <UserRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={recebedorNome}
                  onChange={(event) => setRecebedorNome(event.target.value)}
                  placeholder="Nome completo do recebedor"
                  className="h-11 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--muted)] pl-10 pr-3 text-sm outline-none focus:border-[color:var(--brand)]"
                />
              </label>
              <input
                value={recebedorDoc}
                onChange={(event) => setRecebedorDoc(event.target.value)}
                placeholder="CPF/CNPJ ou documento do recebedor"
                className="h-11 w-full rounded-xl border border-[color:var(--hairline)] bg-[color:var(--muted)] px-3 text-sm outline-none focus:border-[color:var(--brand)]"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={recebedorAvulso}
                  onChange={(event) => setRecebedorAvulso(event.target.checked)}
                  className="accent-[color:var(--brand)]"
                />
                Recebedor avulso, diferente do destinatario cadastrado
              </label>
            </div>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Provas obrigatorias · armazenadas com SHA-256
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <EvidenceInput label="Foto 1" file={foto1} onChange={setFoto1} capture="environment" />
              <EvidenceInput label="Foto 2" file={foto2} onChange={setFoto2} capture="environment" />
              <EvidenceInput label="Assinatura" file={assinatura} onChange={setAssinatura} />
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">
                {error}
              </p>
            )}

            <button
              onClick={confirmarEntrega}
              disabled={!podeConfirmar}
              className="mt-5 h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {saving
                ? "Enviando provas e concluindo..."
                : podeConfirmar
                  ? "Confirmar entrega"
                  : "Preencha bipe, recebedor e provas"}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="ok"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <FileSignature className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Entrega concluida</h3>
            <p className="mt-1 font-mono text-sm text-[color:var(--brand)]">{protocolo}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp/SMS aguarda provedor oficial
            </p>
            <div className="mt-3"><StatusChip tone="success">bipe e provas sincronizados</StatusChip></div>
            <button onClick={reset} className="mt-6 text-sm text-[color:var(--brand)]">Nova entrega</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function EvidenceInput({
  label,
  file,
  onChange,
  capture,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  capture?: "environment";
}) {
  return (
    <label className={`flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-2 text-center ${file ? "border-[color:var(--success)] bg-[color:color-mix(in_oklab,var(--success)_8%,transparent)]" : "border-[color:var(--hairline-strong)] bg-[color:var(--muted)]"}`}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Camera className="h-4 w-4" />
      <span className="mt-1 text-[10px] font-medium">{file ? file.name : label}</span>
    </label>
  );
}

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
