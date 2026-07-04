import { useEffect, useState } from "react";
import { Printer, Tag as TagIcon } from "lucide-react";
import { SectionHeader, PrimaryButton, GhostButton, StatusChip } from "@/components/ops/primitives";
import { FakeQR } from "@/components/ops/FakeQR";
import { listTmsEtiquetas, printTmsEtiqueta, type TmsEtiquetaApi, type TmsVolumeApi } from "@/lib/ajc-api";

type VolumeEtiqueta = {
  id: string;
  uuid: string;
  cargaId: string;
  cliente: string;
  cidadeDestino: string;
  peso: number;
  status: string;
  paleteId?: string;
};

export function EtiquetaTab({ volumes }: { volumes?: TmsVolumeApi[] }) {
  const dados = volumes?.map(mapVolumeEtiqueta) ?? [];
  const [selId, setSelId] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<TmsEtiquetaApi[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const sel = dados.find((v) => v.id === selId) ?? dados[0] ?? null;
  const cidades = Array.from(new Set(dados.map((v) => v.cidadeDestino))).filter(Boolean);
  const irmaos = sel ? dados.filter((v) => v.cargaId === sel.cargaId) : [];
  const indice = sel ? irmaos.findIndex((v) => v.id === sel.id) + 1 : 0;
  const totalVol = irmaos.length;
  const tipoEtiqueta = totalVol > 1 ? "MP" : sel?.paleteId ? "PC" : "PD";

  useEffect(() => {
    let alive = true;
    listTmsEtiquetas()
      .then((rows) => { if (alive) setEtiquetas(rows); })
      .catch(() => { if (alive) setEtiquetas([]); });
    return () => { alive = false; };
  }, []);

  async function registrarEtiqueta(tipo: "impressao" | "reimpressao", volumeId = sel?.id) {
    if (!volumeId) return;
    setSaving(true);
    setErro(null);
    setSucesso(null);
    try {
      const row = await printTmsEtiqueta(volumeId, {
        tipo,
        printerModel: "bluetooth-pendente",
        clientUuid: crypto.randomUUID(),
      });
      setEtiquetas((prev) => [row, ...prev.filter((item) => item.id !== row.id)].slice(0, 200));
      setSucesso(`${row.protocolo} registrado como ${row.status}.`);
      setSelId(row.volume_id);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel registrar a etiqueta.");
    } finally {
      setSaving(false);
    }
  }

  if (!sel) {
    return (
      <div className="mt-5">
        <SectionHeader
          eyebrow="Impressao termica"
          title="Etiqueta de carga"
          description="Nenhum volume real carregado para pre-visualizar etiqueta. Crie ou receba uma carga para gerar UUID e imprimir."
        />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Impressao termica"
        title="Etiqueta de carga"
        description="Etiqueta fisica padronizada por volume. O QR codifica o UUID, chave de todos os bipes seguintes."
        actions={
          <>
            <GhostButton icon={TagIcon} onClick={() => registrarEtiqueta("reimpressao")} disabled={saving}>Reimprimir etiqueta</GhostButton>
            <PrimaryButton icon={Printer} onClick={() => registrarEtiqueta("impressao")} disabled={saving}>{saving ? "Registrando..." : "Imprimir etiqueta"}</PrimaryButton>
          </>
        }
      />

      {erro && <p className="rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,transparent)] px-3 py-2 text-xs text-[color:var(--destructive)] ring-1 ring-[color:color-mix(in_oklab,var(--destructive)_28%,transparent)]">{erro}</p>}
      {sucesso && <p className="rounded-md bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] px-3 py-2 text-xs text-[color:var(--success)] ring-1 ring-[color:color-mix(in_oklab,var(--success)_28%,transparent)]">{sucesso}</p>}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto">
          <div className="w-[320px] overflow-hidden rounded-lg bg-white text-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/10">
            <div className="flex items-stretch border-b-2 border-dashed border-black/30">
              <div className="flex-1 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">Cidade destino</p>
                <p className="font-mono text-5xl font-bold leading-none tracking-tight">{sel.cidadeDestino}</p>
              </div>
              <div className="grid place-items-center border-l-2 border-dashed border-black/30 px-3">
                <p className="text-[9px] font-bold uppercase text-black/50">AJC</p>
                <p className="font-mono text-2xl font-black">{tipoEtiqueta}</p>
              </div>
            </div>

            <div className="flex items-stretch border-b border-black/20">
              <div className="flex-1 border-r border-black/20 px-4 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Palete</p>
                <p className="font-mono text-xl font-bold">{sel.paleteId ?? "-"}</p>
              </div>
              <div className="flex-1 px-4 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Volume</p>
                <p className="font-mono text-xl font-bold">{indice}/{totalVol}</p>
              </div>
            </div>

            <div className="border-b border-black/20 px-4 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">Tipo operacional</p>
              <p className="font-mono text-sm font-bold">
                {tipoEtiqueta} - {tipoEtiqueta === "MP" ? "multi-palete" : tipoEtiqueta === "PC" ? "palete compartilhado" : "palete dedicado"}
              </p>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <FakeQR value={sel.uuid} size={120} />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-black/50">UUID do volume</p>
                <p className="break-all font-mono text-[11px] leading-tight">{sel.uuid}</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-black/50">Carga</p>
                <p className="font-mono text-xs">{sel.cargaId}</p>
              </div>
            </div>

            <div className="border-t border-black/20 px-4 py-2.5">
              <p className="truncate text-[11px]"><span className="font-bold">Dest.:</span> {sel.cliente}</p>
              <p className="text-[10px] text-black/60">Peso {sel.peso} kg - {sel.id}</p>
            </div>

            <div className="bg-black px-4 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white">
              {cidades.join(" - ")}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Palete ou volume para etiquetar</h3>
            <p className="mt-1 text-xs text-muted-foreground">Selecione um palete/volume para pre-visualizar a etiqueta. Cada bipe subsequente le o QR/UUID impresso.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {dados.map((v) => {
                const active = v.id === sel.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelId(v.id)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left ring-1 transition-colors ${
                      active
                        ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-[color:var(--hairline-brand)]"
                        : "bg-[color:var(--muted)] ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.cliente}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{v.uuid}</p>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-[color:var(--card)] px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-[color:var(--hairline)]">{v.cidadeDestino}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="surface-card brand-rail brand-rail-left p-5">
            <h3 className="font-display text-lg">Conteudo obrigatorio (B.5)</h3>
            <ul className="mt-3 grid gap-1.5 text-sm text-foreground/85 sm:grid-cols-2">
              <li>CIDADE - sigla destino</li>
              <li>PALETE - codigo usado</li>
              <li>VOLUME - indice/total</li>
              <li>QR - UUID do volume</li>
              <li>Remetente/destinatario abreviado</li>
              <li>Numero da carga</li>
              <li>Sigla operacional MP/PD/PC</li>
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">O registro atual usa adapter Bluetooth stub auditavel. Quando o modelo da impressora for definido, o mesmo payload alimenta o driver real.</p>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-display text-lg">Reimpressao do dia</h3>
            <p className="mt-1 text-xs text-muted-foreground">Lista real de etiquetas registradas para escolher exatamente o que reimprimir, sem gerar novo UUID.</p>
            <div className="mt-3 space-y-2">
              {etiquetas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etiqueta registrada hoje.</p>}
              {etiquetas.slice(0, 8).map((r) => (
                <button
                  key={r.id}
                  onClick={() => registrarEtiqueta("reimpressao", r.volume_id)}
                  className="flex w-full items-center justify-between rounded-lg bg-[color:var(--muted)] px-3 py-2 text-left ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                >
                  <span>
                    <span className="font-mono text-xs text-foreground">{formatHora(r.criado_em)} - {r.protocolo}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.cidade_destino_sigla}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <StatusChip tone={r.tipo === "reimpressao" ? "warning" : "brand"} size="sm">{r.tipo}</StatusChip>
                    <span className="rounded bg-[color:var(--card)] px-2 py-0.5 font-mono text-[10px] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">{String(r.payload?.tipoOperacional ?? "PD")}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function mapVolumeEtiqueta(volume: TmsVolumeApi): VolumeEtiqueta {
  return {
    id: volume.id,
    uuid: volume.uuid,
    cargaId: volume.carga_codigo ?? volume.carga_id,
    cliente: volume.categoria === "encomenda" ? "Encomenda" : "Carga",
    cidadeDestino: volume.cidade_destino_sigla,
    peso: Number(volume.peso ?? 0),
    status: volume.status,
    paleteId: volume.palete_codigo ?? undefined,
  };
}

function formatHora(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
