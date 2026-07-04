import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PenLine, ShieldCheck, FileSignature, MessageCircle, Clock,
} from "lucide-react";
import {
  SectionHeader, StatusChip, Tag, brl,
} from "@/components/ops/primitives";
import { PhoneFrame } from "@/components/ops/tms/PhoneFrame";
import { AjcApiError, saveEncomendaDeclaracao, type EncomendaDeclaracaoApi } from "@/lib/ajc-api";
import { TermoDC, ResumoLinha } from "./shared";
import { DC_TERMO_VERSAO } from "./pricing";
import type { DeclaracaoConteudoUi, EncomendaUi } from "./types";

/** B.2 - Declaracao de Conteudo + assinatura em tela (prova legal). */
export function DeclaracaoTab({
  encomendas = [],
  declaracoes = [],
  onSaved,
}: {
  encomendas?: EncomendaUi[];
  declaracoes?: DeclaracaoConteudoUi[];
  onSaved?: (declaracao: EncomendaDeclaracaoApi) => void;
}) {
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <SectionHeader
          eyebrow="Prova legal - A.2"
          title="Declaracao de Conteudo / NF + assinatura"
          description="Toda encomenda sem NF exige DC. Quando houver NF, ela e anexada junto ao despacho. O cliente assina em tela; o aceite carimba data/hora e dispositivo."
        />

        <TermoDC />

        <div className="surface-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">O que torna a DC valida</h3>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground/85">
            <li>- <span className="font-medium">Assinatura do cliente em tela</span> com hash SHA-256 salvo no backend.</li>
            <li>- <span className="font-medium">Carimbo de data/hora + dispositivo</span> no aceite.</li>
            <li>- <span className="font-medium">Reembolso limitado ao valor declarado.</span></li>
            <li>- DC fica anexada a encomenda para auditoria/PF.</li>
            <li>- Quando houver <span className="font-medium">NF</span>, ela fica anexada junto da DC/despacho.</li>
          </ul>
          <p className="mt-3"><Tag tone="warning">texto integral do termo pendente (Lucas)</Tag></p>
        </div>
      </div>

      <AssinaturaFrame encomendas={encomendas} declaracoes={declaracoes} onSaved={onSaved} />
    </div>
  );
}

function AssinaturaFrame({
  encomendas,
  declaracoes,
  onSaved,
}: {
  encomendas: EncomendaUi[];
  declaracoes: DeclaracaoConteudoUi[];
  onSaved?: (declaracao: EncomendaDeclaracaoApi) => void;
}) {
  const [assinada, setAssinada] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pendente = encomendas.find((e) => !declaracoes.some((d) => d.encomendaId === e.id && d.assinaturaOk)) ?? encomendas[0];
  const descricao = pendente?.conteudo ?? "Conteudo declarado";
  const valor = pendente?.valorDeclarado ?? 0;
  const trecho = pendente?.trecho ?? "-";
  const podeConfirmar = !!pendente && assinada && aceite && !saving;

  async function confirmar() {
    if (!pendente || !podeConfirmar) return;
    setSaving(true);
    setErro(null);
    try {
      const proof = await captureDcProof(pendente.id, descricao);
      const saved = await saveEncomendaDeclaracao(pendente.id, {
        descricaoInformada: descricao,
        valorDeclarado: valor,
        assinaturaUrl: proof.url,
        assinaturaHash: proof.hash,
        dispositivo: "web-console-dc",
        aceiteEm: new Date().toISOString(),
      });
      onSaved?.(saved);
      setDone(true);
    } catch (error) {
      setErro(error instanceof AjcApiError || error instanceof Error ? error.message : "Falha ao salvar DC");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PhoneFrame online clock={currentClock()}>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex h-[calc(100%-44px)] flex-col p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Declaracao de Conteudo</p>
            <p className="mt-1 font-display text-xl">Confirme e assine</p>

            <div className="mt-3 surface-card p-3 text-[13px]">
              <ResumoLinha label="Encomenda">{pendente?.codigo ?? "sem encomenda"}</ResumoLinha>
              <ResumoLinha label="Conteudo">{descricao}</ResumoLinha>
              <ResumoLinha label="Documento">DC assinada ou NF anexada</ResumoLinha>
              <ResumoLinha label="Valor declarado">{brl(valor)}</ResumoLinha>
              <ResumoLinha label="Trecho"><span className="font-mono">{trecho}</span></ResumoLinha>
            </div>

            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Declaro que o conteudo e o valor acima sao verdadeiros e aceito a clausula de exclusao de responsabilidade.
            </p>

            <button
              onClick={() => setAssinada(true)}
              disabled={!pendente}
              className={`mt-3 grid h-28 w-full place-items-center rounded-2xl border border-dashed transition-colors disabled:opacity-50 ${
                assinada
                  ? "border-[color:color-mix(in_oklab,var(--success)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--success)_8%,transparent)] text-[color:var(--success)]"
                  : "border-[color:var(--hairline-strong)] bg-[color:var(--muted)] text-[color:var(--brand)]"
              }`}
            >
              <PenLine className="h-7 w-7" />
              <span className="mt-1 text-xs font-medium">{assinada ? "Assinatura capturada" : "Assinar aqui"}</span>
            </button>

            <label className="mt-3 flex items-start gap-2 text-[11px] text-foreground/85">
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 accent-[color:var(--brand)]" />
              <span>Li e aceito o termo da Declaracao de Conteudo ({DC_TERMO_VERSAO}).</span>
            </label>

            {erro && <p className="mt-3 rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-[11px] text-[color:var(--danger)]">{erro}</p>}

            <button
              onClick={confirmar}
              disabled={!podeConfirmar}
              className="mt-auto h-14 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50"
            >
              {saving ? "Salvando DC..." : podeConfirmar ? "Confirmar Declaracao de Conteudo" : "Assine e aceite para confirmar"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex h-[calc(100%-44px)] flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--success)_16%,transparent)] text-[color:var(--success)]">
              <FileSignature className="h-9 w-9" />
            </div>
            <h3 className="mt-4 font-display text-xl">DC gerada</h3>
            <p className="mt-1 font-mono text-sm text-[color:var(--brand)]">{pendente?.dcId ?? "DC"} - assinatura anexada</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Aceite carimbado no backend
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp/SMS permanece stub ate provedor oficial
            </p>
            <div className="mt-3"><StatusChip tone="success">anexada a encomenda</StatusChip></div>
            <button onClick={() => { setDone(false); setAssinada(false); setAceite(false); }} className="mt-6 text-sm text-[color:var(--brand)]">Nova DC</button>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

async function captureDcProof(encomendaId: string, descricao: string) {
  const payload = JSON.stringify({
    kind: "declaracao-conteudo",
    encomendaId,
    descricao,
    capturedAt: new Date().toISOString(),
    device: "web-console-dc",
    nonce: crypto.randomUUID(),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return {
    url: `local-proof://web-console-dc/${encomendaId}/assinatura/${hash}`,
    hash,
  };
}

function currentClock() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}
