import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Search, MapPin, MessageCircle, CheckCircle2, Circle, Truck, PackageCheck,
} from "lucide-react";
import {
  SectionHeader, StatusChip, Tag, brl,
} from "@/components/ops/primitives";
import { ENCOMENDA_FLUXO } from "./pricing";
import type { EncomendaStatus, EncomendaUi, ViagemEncomendaUi } from "./types";

const STATUS_LABEL: Record<EncomendaStatus, string> = {
  recebido: "Recebido",
  conferido: "Conferido",
  embarcado: "Embarcado",
  em_viagem: "Em viagem",
  desembarcado: "Desembarcado",
  entregue: "Entregue",
};

/** B.5 — Rastreamento da encomenda (cliente / atendimento). */
export function RastreamentoTab({
  encomendas = [],
  viagens,
}: {
  encomendas?: EncomendaUi[];
  viagens?: ViagemEncomendaUi[];
}) {
  const [selId, setSelId] = useState<string>(encomendas[0]?.id ?? "");
  const enc = encomendas.find((e) => e.id === selId) ?? encomendas[0];
  const viagem = useMemo(() => {
    if (!enc) return null;
    return viagens?.find((v) => v.id === enc.viagemId)
      ?? null;
  }, [enc, viagens]);
  const idxAtual = enc ? ENCOMENDA_FLUXO.indexOf(enc.status) : -1;

  if (!enc) {
    return (
      <div className="mt-5">
        <SectionHeader
          eyebrow="Cliente · atendimento"
          title="Rastreamento da encomenda"
          description="Nenhuma encomenda disponível para rastreio."
        />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Cliente · atendimento"
        title="Rastreamento da encomenda"
        description="Linha do tempo do volume reaproveitando a máquina de estados do TMS. Notificações automáticas via WhatsApp/SMS em recebimento e entrega."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          <div className="surface-card flex h-10 items-center gap-2 px-3">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Selecione a encomenda</span>
          </div>
          <div className="space-y-1.5">
            {encomendas.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelId(e.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  selId === e.id
                    ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-1 ring-[color:var(--hairline-brand)]"
                    : "surface-card hover:bg-[color:var(--accent)]"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] text-[color:var(--brand)]">{e.codigo}</p>
                  <p className="truncate text-xs text-foreground/85">{e.remetente} → {e.destinatario}</p>
                </div>
                <span className="shrink-0"><StatusChip tone={e.status === "entregue" ? "success" : "brand"} size="xs">{STATUS_LABEL[e.status]}</StatusChip></span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] text-[color:var(--brand)]">{enc.codigo}</p>
                <h3 className="mt-0.5 font-display text-lg">{enc.remetente} → {enc.destinatario}</h3>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> <span className="font-mono">{enc.trecho}</span> · {viagem?.codigo ?? "—"} · {enc.conteudo}
                </p>
              </div>
              <div className="text-right">
                <p className="big-numeric text-xl text-[color:var(--brand)]">{brl(enc.valorCobrado)}</p>
                <p className="text-[10px] text-muted-foreground">declarado {brl(enc.valorDeclarado)}</p>
              </div>
            </div>

            <ol className="mt-6 space-y-0">
              {ENCOMENDA_FLUXO.map((s, i) => {
                const done = i < idxAtual;
                const current = i === idxAtual;
                const last = i === ENCOMENDA_FLUXO.length - 1;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`grid h-7 w-7 place-items-center rounded-full ring-2 ring-[color:var(--card)] ${
                          done ? "bg-[color:var(--brand)] text-primary-foreground"
                          : current ? "bg-[color:color-mix(in_oklab,var(--brand)_18%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                          : "bg-[color:var(--muted)] text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : current ? <Truck className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                      </motion.span>
                      {!last && <span className={`my-0.5 w-px flex-1 ${i < idxAtual ? "bg-[color:var(--brand)]" : "bg-[color:var(--hairline)]"}`} style={{ minHeight: 28 }} />}
                    </div>
                    <div className={`pb-5 ${current ? "" : "opacity-90"}`}>
                      <p className={`text-sm font-medium ${current ? "text-[color:var(--brand)]" : "text-foreground"}`}>{STATUS_LABEL[s]}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {done ? "concluído" : current ? "estado atual" : "previsto"}
                        {s === "recebido" && " · notifica remetente/destinatário"}
                        {s === "entregue" && " · prova: 2 fotos + assinatura (TMS)"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-base">Notificações WhatsApp / SMS</h3>
            </div>
            <div className="mt-3 space-y-2">
              <NotifLinha disparado={idxAtual >= 0} label="Recebido no balcão" detalhe={`para ${enc.destinatarioContato}`} />
              <NotifLinha disparado={enc.status === "entregue"} label="Entregue com prova" detalhe="link do comprovante (foto + assinatura)" />
            </div>
            <p className="mt-3"><Tag tone="neutral">reaproveita protocolo de entrega do TMS</Tag></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotifLinha({ disparado, label, detalhe }: { disparado: boolean; label: string; detalhe: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[color:var(--muted)] px-3 py-2 ring-1 ring-[color:var(--hairline)]">
      <div className="flex items-center gap-2">
        <PackageCheck className={`h-4 w-4 ${disparado ? "text-[color:var(--success)]" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{detalhe}</p>
        </div>
      </div>
      {disparado
        ? <StatusChip tone="success" size="xs">enviada</StatusChip>
        : <StatusChip tone="neutral" size="xs">aguardando</StatusChip>}
    </div>
  );
}
