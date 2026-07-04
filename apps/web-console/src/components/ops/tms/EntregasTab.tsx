import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, PenLine, MessageCircle, FileSignature, ScanLine, Package, Car, Boxes } from "lucide-react";
import { StatusChip, Tag } from "@/components/ops/primitives";
import { PhoneFrame, CaptureTile } from "./PhoneFrame";
import { AjcApiError, createTmsEntrega, listTmsVolumes, type TmsVolumeApi } from "@/lib/ajc-api";

/** B.9 - Comprovante de entrega com prova legal. */
export function EntregasTab() {
  return <SimuladorEntrega />;
}

function SimuladorEntrega() {
  const [tipo, setTipo] = useState<"carga" | "encomenda" | "veiculo">("carga");
  const [volumes, setVolumes] = useState<TmsVolumeApi[]>([]);
  const [bipado, setBipado] = useState(false);
  const [foto1, setFoto1] = useState<LegalProof | null>(null);
  const [foto2, setFoto2] = useState<LegalProof | null>(null);
  const [assinatura, setAssinatura] = useState<LegalProof | null>(null);
  const [done, setDone] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const volumeAlvo = useMemo(() => volumes.find((v) => v.status !== "entregue") ?? volumes[0], [volumes]);
  const podeConfirmar = bipado && !!foto1 && !!foto2 && !!assinatura && !saving;

  useEffect(() => {
    let active = true;
    listTmsVolumes()
      .then((rows) => {
        if (active) setVolumes(rows);
      })
      .catch((err) => {
        if (active) setError(err instanceof AjcApiError ? err.message : "Nao foi possivel carregar volumes.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function confirmarEntrega() {
    if (!volumeAlvo || !podeConfirmar) return;
    setSaving(true);
    setError(null);
    try {
      const entrega = await createTmsEntrega({
        cidadeSigla: volumeAlvo.cidade_destino_sigla,
        volumeIds: [volumeAlvo.id],
        recebedorNome: tipo === "veiculo" ? "Recebedor do veiculo" : "Agente local",
        recebedorDoc: "doc-capturado-no-app",
        recebedorAvulso: false,
        assinaturaUrl: assinatura.url,
        assinaturaHash: assinatura.hash,
        foto1Url: foto1.url,
        foto2Url: foto2.url,
        foto1Hash: foto1.hash,
        foto2Hash: foto2.hash,
        clientUuid: crypto.randomUUID(),
      });
      setVolumes((rows) => rows.map((v) => v.id === volumeAlvo.id ? { ...v, status: "entregue" } : v));
      setProtocolo(entrega.protocolo);
      setDone(true);
    } catch (err) {
      setError(err instanceof AjcApiError ? err.message : "Nao foi possivel confirmar a entrega.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PhoneFrame framed={false} online={!error} pending={error ? 1 : 0} clock={currentClock()}>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Entrega · prova legal</p>
            <p className="mt-1 font-display text-xl">{tipo === "veiculo" ? "Veiculo / maquina" : tipo === "encomenda" ? "Encomenda" : volumeAlvo?.carga_codigo ?? "Carga"}</p>
            <p className="text-xs text-muted-foreground">{volumeAlvo ? `1 volume · destino ${volumeAlvo.cidade_destino_sigla}` : "sem volume carregado"}</p>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <TipoButton active={tipo === "carga"} icon={Boxes} label="Carga" onClick={() => { setTipo("carga"); resetCapturas(setBipado, setFoto1, setFoto2, setAssinatura); }} />
              <TipoButton active={tipo === "encomenda"} icon={Package} label="Encomenda" onClick={() => { setTipo("encomenda"); resetCapturas(setBipado, setFoto1, setFoto2, setAssinatura); }} />
              <TipoButton active={tipo === "veiculo"} icon={Car} label="Veiculo" onClick={() => { setTipo("veiculo"); resetCapturas(setBipado, setFoto1, setFoto2, setAssinatura); }} />
            </div>

            <button
              onClick={() => volumeAlvo && setBipado(true)}
              disabled={!volumeAlvo}
              className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold ring-1 disabled:opacity-50 ${
                bipado
                  ? "bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] text-[color:var(--success)] ring-[color:color-mix(in_oklab,var(--success)_35%,transparent)]"
                  : "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]"
              }`}
            >
              <ScanLine className="h-4 w-4" />
              {bipado ? "Bipe confirmado" : `Bipar ${tipo === "carga" ? "palete/volume" : tipo === "encomenda" ? "encomenda" : "veiculo/maquina"}`}
            </button>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">2 fotos obrigatorias (90 graus)</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <CaptureTile icon={Camera} label={tipo === "veiculo" ? "Foto checklist 1" : "Foto de cima"} done={!!foto1} onClick={() => bipado && captureProof("foto-1", volumeAlvo?.id).then(setFoto1).catch((err) => setError(err.message))} />
              <CaptureTile icon={Camera} label={tipo === "veiculo" ? "Foto checklist 2" : "Foto do meio"} done={!!foto2} onClick={() => bipado && captureProof("foto-2", volumeAlvo?.id).then(setFoto2).catch((err) => setError(err.message))} />
            </div>

            <div className="mt-3">
              <CaptureTile icon={PenLine} label={tipo === "veiculo" ? "Assinatura entrega veiculo" : "Assinatura do agente"} done={!!assinatura} onClick={() => bipado && captureProof("assinatura", volumeAlvo?.id).then(setAssinatura).catch((err) => setError(err.message))} />
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">
              <Tag tone={bipado ? "success" : "warning"}>{bipado ? "bipe ok" : "bipe obrigatorio"}</Tag> Fotos e assinatura geram comprovante no backend.
            </p>

            {error && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{error}</p>}

            <button
              onClick={confirmarEntrega}
              disabled={!podeConfirmar}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {saving ? "Gerando protocolo..." : podeConfirmar ? "Confirmar entrega" : "Falta bipe / fotos / assinatura"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <FileSignature className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">Protocolo gerado</h3>
            <p className="mt-1 font-mono text-sm text-[color:var(--brand)]">{protocolo ?? "ENT-API"}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp/SMS permanece stub ate provedor oficial</p>
            <div className="mt-3"><StatusChip tone="success">entrega sincronizada</StatusChip></div>
            <button onClick={() => { setDone(false); resetCapturas(setBipado, setFoto1, setFoto2, setAssinatura); }} className="mt-6 text-sm text-[color:var(--brand)]">Nova entrega</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

function TipoButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2 py-2 text-[10px] font-medium ring-1 transition-colors ${
        active
          ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]"
          : "bg-[color:var(--muted)] text-foreground/70 ring-[color:var(--hairline)]"
      }`}
    >
      <Icon className="mx-auto mb-1 h-4 w-4" />
      {label}
    </button>
  );
}

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

type LegalProof = {
  url: string;
  hash: string;
};

async function captureProof(kind: "foto-1" | "foto-2" | "assinatura", volumeId?: string): Promise<LegalProof> {
  if (!volumeId) throw new Error("Volume obrigatorio para capturar evidencia.");
  const payload = JSON.stringify({
    kind,
    volumeId,
    capturedAt: new Date().toISOString(),
    device: "field-web",
    nonce: crypto.randomUUID(),
  });
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    url: `local-proof://field-web/${volumeId}/${kind}/${hash}`,
    hash,
  };
}

function resetCapturas(
  setBipado: (value: boolean) => void,
  setFoto1: (value: LegalProof | null) => void,
  setFoto2: (value: LegalProof | null) => void,
  setAssinatura: (value: LegalProof | null) => void,
) {
  setBipado(false);
  setFoto1(null);
  setFoto2(null);
  setAssinatura(null);
}
