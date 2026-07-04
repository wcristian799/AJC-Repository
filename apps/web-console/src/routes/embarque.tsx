import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode, CheckCircle2, XCircle, ScanLine, Search, Ship, ChevronRight,
  AlertTriangle, Keyboard, RotateCcw,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { SyncIndicator, OfflineBanner } from "@/components/ops/primitives";
import {
  listBilhetes,
  listEmbarcacoes,
  listNavegacaoViagens,
  validarBilhete,
  type BilheteApi,
  type EmbarcacaoApi,
  type NavegacaoViagemApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/embarque")({
  head: () => ({ meta: [{ title: "ValidaÃ§Ã£o de embarque Â· AJC" }] }),
  component: Embarque,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Tela = "selecao" | "scanner";
type EmbarqueBilhete = {
  qr: string;
  passageiro: string;
  documento: string;
  classe: string;
  assento?: string;
  validadoEm?: string;
};
type ViagemSelecao = {
  id: string;
  codigo: string;
  origem: string;
  destino: string;
  embarcacaoId?: string;
  saida: string;
  passageiros: number;
  status: string;
};
type Resultado =
  | { tipo: "valido"; bilhete: EmbarqueBilhete }
  | { tipo: "ja_validado"; bilhete: EmbarqueBilhete }
  | { tipo: "vencido"; qr: string }
  | { tipo: "invalido"; qr: string };

type ValidacaoPendente = {
  id: string;
  qr: string;
  viagemId: string;
  bilhete: EmbarqueBilhete;
  validadoEm: string;
  clientUuid: string;
  tentativas: number;
  ultimoErro?: string;
};

const EMBARQUE_QUEUE_KEY = "ajc.embarque.validacoes.v1";
const EMBARQUE_DEVICE_ID_KEY = "ajc.embarque.device.v1";

const CLASSE_LABEL: Record<string, string> = {
  rede: "Rede",
  rede_sala_vip: "Rede VIP",
  camarote: "Camarote",
  suite_comum: "Suite comum",
  suite_comum_vip: "Suite comum VIP",
  suite_master: "Suite master",
  suite_master_vip: "Suite master VIP",
  mega_suite: "Mega suite",
};
const PULSEIRA_POR_CLASSE: Record<string, { cor: string; hex: string }> = {
  Rede: { cor: "pendente", hex: "var(--brand)" },
  "Rede VIP": { cor: "pendente", hex: "var(--brand)" },
  Camarote: { cor: "pendente", hex: "var(--brand)" },
  "Suite comum": { cor: "pendente", hex: "var(--brand)" },
  "Suite comum VIP": { cor: "pendente", hex: "var(--brand)" },
  "Suite master": { cor: "pendente", hex: "var(--brand)" },
  "Suite master VIP": { cor: "pendente", hex: "var(--brand)" },
  "Mega suite": { cor: "pendente", hex: "var(--brand)" },
  Cortesia: { cor: "pendente", hex: "var(--warning)" },
  Gratuidade: { cor: "pendente", hex: "var(--success)" },
  Contrato: { cor: "pendente", hex: "var(--info)" },
};

function bilheteToEmbarque(b: BilheteApi): EmbarqueBilhete {
  return {
    qr: b.qr_token ?? b.codigo,
    passageiro: b.passageiro_nome ?? b.cliente_nome ?? "Passageiro sem nome",
    documento: b.passageiro_documento ?? "-",
    classe: b.tipo === "cortesia" ? "Cortesia" : b.tipo === "gratuidade" ? "Gratuidade" : b.tipo === "contrato" ? "Contrato" : CLASSE_LABEL[b.classe] ?? b.classe,
    assento: b.assento ?? undefined,
    validadoEm: b.validado_em ? new Date(b.validado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : undefined,
  };
}

function Embarque() {
  const [tela, setTela] = useState<Tela>("selecao");
  const [online, setOnline] = useState(false);
  const [viagensApi, setViagensApi] = useState<NavegacaoViagemApi[]>([]);
  const [embarcacoesApi, setEmbarcacoesApi] = useState<EmbarcacaoApi[]>([]);
  const [bilhetesApi, setBilhetesApi] = useState<BilheteApi[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [viagemId, setViagemId] = useState<string>("");

  // Estado local da lista (offline-first: validaÃ§Ãµes ficam na memÃ³ria do aparelho).
  const [validados, setValidados] = useState<Record<string, string>>({});
  const [filaOffline, setFilaOffline] = useState<ValidacaoPendente[]>(() => loadQueue());
  const [syncing, setSyncing] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [buscaManual, setBuscaManual] = useState(false);
  const [termo, setTermo] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [viagens, embarcacoes, bilhetes] = await Promise.all([listNavegacaoViagens(), listEmbarcacoes(), listBilhetes()]);
        if (!alive) return;
        setViagensApi(viagens);
        setEmbarcacoesApi(embarcacoes);
        setBilhetesApi(bilhetes);
        const primeira = viagens.find((v) => v.status === "em_curso") ?? viagens[0];
        if (primeira) setViagemId(primeira.id);
        setOnline(true);
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao baixar lista de embarque");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const viagensSelecao = useMemo<ViagemSelecao[]>(() => (
    viagensApi.map((v) => ({
          id: v.id,
          codigo: v.codigo ?? "Viagem",
          origem: v.origemSigla,
          destino: v.destinoSigla ?? "",
          embarcacaoId: v.embarcacaoId,
          saida: new Date(v.dataHoraSaida).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          passageiros: bilhetesApi.filter((b) => b.viagem_id === v.id).length,
          status: v.status,
        }))
  ), [bilhetesApi, viagensApi]);
  const viagem = viagensSelecao.find((v) => v.id === viagemId) ?? viagensSelecao[0] ?? null;
  const emb = viagem ? embarcacoesApi.find((e) => e.id === viagem.embarcacaoId) : undefined;
  const listaEmbarque = useMemo(() => {
    return bilhetesApi.filter((b) => b.viagem_id === viagemId).map(bilheteToEmbarque);
  }, [bilhetesApi, viagemId]);
  const capacidade = listaEmbarque.length;
  const embarcados = Object.keys(validados).length;
  const pctEmbarque = capacidade > 0 ? Math.round((embarcados / capacidade) * 100) : 0;
  const pendentes = filaOffline.length;

  useEffect(() => {
    const validadosApi = Object.fromEntries(listaEmbarque.filter((b) => b.validadoEm).map((b) => [b.qr, b.validadoEm!]));
    const validadosFila = Object.fromEntries(filaOffline.filter((item) => item.viagemId === viagemId).map((item) => [item.qr, formatTime(item.validadoEm)]));
    setValidados({ ...validadosApi, ...validadosFila });
  }, [filaOffline, listaEmbarque, viagemId]);

  useEffect(() => {
    persistQueue(filaOffline);
  }, [filaOffline]);

  useEffect(() => {
    if (!online || syncing || filaOffline.length === 0) return;
    void sincronizarFila();
  }, [filaOffline.length, online, syncing]);

  const horaAgora = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  async function validar(bilhete: EmbarqueBilhete) {
    const jaEm = validados[bilhete.qr];
    if (jaEm) {
      setResultado({ tipo: "ja_validado", bilhete });
      return;
    }
    if (!online) {
      const validadoEm = new Date().toISOString();
      const pending: ValidacaoPendente = {
        id: crypto.randomUUID(),
        qr: bilhete.qr,
        viagemId,
        bilhete,
        validadoEm,
        clientUuid: crypto.randomUUID(),
        tentativas: 0,
      };
      setFilaOffline((current) => current.some((item) => item.qr === pending.qr) ? current : [...current, pending]);
      const hora = formatTime(validadoEm);
      setValidados((current) => ({ ...current, [bilhete.qr]: hora }));
      setResultado({ tipo: "valido", bilhete: { ...bilhete, validadoEm: hora } });
      return;
    }
    try {
      const response = await validarBilhete(bilhete.qr, { qrToken: bilhete.qr, dispositivo: getDeviceId(), clientUuid: crypto.randomUUID() });
      const atualizado = bilheteToEmbarque(response.bilhete);
      const hora = atualizado.validadoEm ?? horaAgora();
      setValidados((v) => ({ ...v, [bilhete.qr]: hora }));
      setResultado({ tipo: response.resultado === "ja_validado" ? "ja_validado" : "valido", bilhete: { ...atualizado, validadoEm: hora } });
    } catch (error) {
      console.error(error);
      setResultado({ tipo: "invalido", qr: bilhete.qr });
    }
  }

  async function sincronizarFila() {
    setSyncing(true);
    let remaining = [...filaOffline];
    for (const item of filaOffline) {
      try {
        const response = await validarBilhete(item.qr, {
          qrToken: item.qr,
          dispositivo: getDeviceId(),
          clientUuid: item.clientUuid,
          validadoEm: item.validadoEm,
        });
        remaining = remaining.filter((queued) => queued.id !== item.id);
        setBilhetesApi((current) => upsertBilhete(current, response.bilhete));
        const atualizado = bilheteToEmbarque(response.bilhete);
        setValidados((current) => ({ ...current, [item.qr]: atualizado.validadoEm ?? formatTime(item.validadoEm) }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao sincronizar validacao";
        remaining = remaining.map((queued) => queued.id === item.id ? { ...queued, tentativas: queued.tentativas + 1, ultimoErro: message } : queued);
      }
    }
    setFilaOffline(remaining);
    setSyncing(false);
  }

  function simularLeitura() {
    // LÃª um pendente, senÃ£o um jÃ¡ validado, senÃ£o invÃ¡lido.
    const pendente = listaEmbarque.find((b) => !validados[b.qr]);
    if (pendente) return validar(pendente);
    const qualquer = listaEmbarque.find((b) => validados[b.qr]);
    if (qualquer) return setResultado({ tipo: "ja_validado", bilhete: qualquer });
    setResultado({ tipo: "invalido", qr: "AJC-0000-??" });
  }

  function simularVencido() {
    setResultado({ tipo: "vencido", qr: "AJC-EXP-0418" });
  }

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (!t) return listaEmbarque;
    return listaEmbarque.filter(
      (b) => b.passageiro.toLowerCase().includes(t) || b.documento.includes(t) || b.qr.toLowerCase().includes(t)
    );
  }, [listaEmbarque, termo]);

  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BrandMark size={26} /><span className="font-display">App ValidaÃ§Ã£o</span></div>
          <button onClick={() => setOnline((o) => !o)} aria-label="Alternar conexÃ£o">
            <SyncIndicator online={online && !syncing} pending={pendentes} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tela === "selecao" && (
            <motion.div
              key="selecao"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <h1 className="mt-6 font-display text-2xl">Selecione a viagem</h1>
              <p className="text-xs text-muted-foreground">Baixe a lista de embarque antes de sair do sinal.</p>
              {erro && <p className="mt-2 text-xs text-[color:var(--danger)]">{erro}</p>}

              <div className="mt-4 space-y-3">
                {viagensSelecao.filter((v) => v.status === "em_curso" || v.status === "planejada" || v.status === "programada").map((v) => {
                  const e = embarcacoesApi.find((x) => x.id === v.embarcacaoId);
                  const ativo = v.id === viagemId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setViagemId(v.id)}
                      className={`w-full rounded-2xl p-4 text-left ring-1 transition-all ${
                        ativo ? "bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)] ring-2 ring-[color:var(--brand)]"
                        : "surface-card ring-[color:var(--hairline)] hover:ring-[color:var(--hairline-brand)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--brand)]">{v.codigo} Â· {v.origem} â†’ {v.destino}</span>
                        {ativo && <CheckCircle2 className="h-4 w-4 text-[color:var(--brand)]" />}
                      </div>
                      <p className="mt-1 font-display text-lg">{e?.nome}</p>
                      <p className="text-xs text-muted-foreground">saÃ­da {v.saida} Â· {v.passageiros} passageiros</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setTela("scanner"); setResultado(null); }}
                disabled={!viagem}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] disabled:opacity-50 active:scale-[0.99]"
              >
                <ScanLine className="h-5 w-5" /> Iniciar validaÃ§Ã£o
              </button>
            </motion.div>
          )}

          {tela === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.35, ease: easeOut }}
              className="mt-5"
            >
              <div className="surface-card overflow-hidden">
                <header className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">{viagem?.codigo ?? "Sem viagem"} · {viagem?.origem ?? "-"} → {viagem?.destino ?? "-"}</p>
                    <h1 className="mt-1 truncate font-display text-lg">Embarque Â· {emb?.nome}</h1>
                  </div>
                  <button onClick={() => setTela("selecao")} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[color:var(--accent)]" aria-label="Trocar viagem">
                    <Ship className="h-5 w-5" />
                  </button>
                </header>

                {(!online || pendentes > 0) && <div className="px-4 pt-3"><OfflineBanner pending={pendentes} /></div>}

                {/* Contador embarcados / capacidade */}
                <div className="px-5 pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Embarcados</span>
                    <span className="big-numeric text-lg text-muted-foreground">{pctEmbarque}%</span>
                  </div>
                  <p className="big-numeric mt-1 text-5xl leading-none text-foreground">
                    {embarcados}<span className="text-foreground/30">/{capacidade}</span>
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
                    <motion.div
                      className="h-full bg-[color:var(--brand)]"
                      animate={{ width: `${pctEmbarque}%` }}
                      transition={{ duration: 0.5, ease: easeOut }}
                    />
                  </div>
                </div>

                {/* Ãrea de leitura / resultado tela cheia */}
                <div className="relative mt-4 grid h-72 place-items-center overflow-hidden bg-[color:var(--surface-deep)]">
                  <AnimatePresence mode="wait">
                    {!resultado && (
                      <motion.div key="aguardando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <QrCode className="h-24 w-24 text-muted-foreground" strokeWidth={1.2} />
                          <motion.span
                            className="absolute inset-x-0 h-0.5 bg-[color:var(--brand)] shadow-[0_0_10px_var(--brand)]"
                            animate={{ top: ["6%", "94%", "6%"] }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">Aponte para o QR do bilhete</p>
                      </motion.div>
                    )}

                    {resultado?.tipo === "valido" && (
                      <ResultadoTela
                        key="valido"
                        cor="var(--success)"
                        icon={CheckCircle2}
                        titulo="Embarque liberado"
                        bilhete={resultado.bilhete}
                      />
                    )}
                    {resultado?.tipo === "ja_validado" && (
                      <ResultadoTela
                        key="ja"
                        cor="var(--warning)"
                        icon={AlertTriangle}
                        titulo="QR jÃ¡ validado"
                        bilhete={resultado.bilhete}
                        rodape={`1Âª validaÃ§Ã£o Ã s ${resultado.bilhete.validadoEm}`}
                      />
                    )}
                    {resultado?.tipo === "invalido" && (
                      <motion.div
                        key="inv"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 text-[color:var(--danger)]"
                      >
                        <XCircle className="h-24 w-24" strokeWidth={1.4} />
                        <p className="font-display text-2xl">Bilhete invÃ¡lido</p>
                        <p className="font-mono text-xs text-muted-foreground">{resultado.qr} Â· nÃ£o consta na lista</p>
                      </motion.div>
                    )}
                    {resultado?.tipo === "vencido" && (
                      <motion.div
                        key="vencido"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 text-[color:var(--danger)]"
                      >
                        <XCircle className="h-24 w-24" strokeWidth={1.4} />
                        <p className="font-display text-2xl">QR vencido</p>
                        <p className="font-mono text-xs text-muted-foreground">{resultado.qr} Â· validade expirada, entrada bloqueada</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Controles */}
                <div className="grid grid-cols-4 gap-px bg-[color:var(--hairline)]">
                  <button onClick={simularLeitura} className="flex flex-col items-center gap-1 bg-[color:var(--card)] py-4 text-[color:var(--brand)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--brand)_8%,transparent)]">
                    <ScanLine className="h-5 w-5" /><span className="text-[10px]">Ler QR</span>
                  </button>
                  <button onClick={simularVencido} className="flex flex-col items-center gap-1 bg-[color:var(--card)] py-4 text-[color:var(--danger)] transition-colors hover:bg-[color:color-mix(in_oklab,var(--danger)_8%,transparent)]">
                    <XCircle className="h-5 w-5" /><span className="text-[10px]">Vencido</span>
                  </button>
                  <button onClick={() => setBuscaManual(true)} className="flex flex-col items-center gap-1 bg-[color:var(--card)] py-4 text-foreground/70 transition-colors hover:bg-[color:var(--accent)]">
                    <Keyboard className="h-5 w-5" /><span className="text-[10px]">Busca manual</span>
                  </button>
                  <button onClick={() => setResultado(null)} className="flex flex-col items-center gap-1 bg-[color:var(--card)] py-4 text-foreground/70 transition-colors hover:bg-[color:var(--accent)]">
                    <RotateCcw className="h-5 w-5" /><span className="text-[10px]">Limpar</span>
                  </button>
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] text-muted-foreground">
                Offline-first Â· {syncing ? "sincronizando..." : `${pendentes} validações aguardam sincronização`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sheet de busca manual (fallback) */}
      <AnimatePresence>
        {buscaManual && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 grid place-items-end bg-black/50 p-0"
            onClick={() => setBuscaManual(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-t-3xl bg-[color:var(--card)] p-5 ring-1 ring-[color:var(--hairline)]"
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[color:var(--hairline-strong)]" />
              <h2 className="mt-4 font-display text-xl">Busca manual</h2>
              <p className="text-xs text-muted-foreground">Quando o QR nÃ£o lÃª â€” busque por nome, documento ou cÃ³digo.</p>

              <div className="mt-4 flex h-11 items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 ring-1 ring-[color:var(--hairline)] focus-within:ring-[color:var(--ring)]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Helena, 112.345â€¦, AJC-9002"
                  className="h-full w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
                />
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {filtrados.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhum passageiro encontrado.</p>
                ) : filtrados.map((b) => {
                  const jaEm = validados[b.qr];
                  const pulseira = PULSEIRA_POR_CLASSE[b.classe];
                  return (
                    <button
                      key={b.qr}
                      onClick={() => { validar(b); setBuscaManual(false); }}
                      className="flex w-full items-center gap-3 rounded-xl bg-[color:var(--surface-elev)] p-3 text-left ring-1 ring-[color:var(--hairline)] transition-colors hover:ring-[color:var(--hairline-brand)]"
                    >
                      <span className="h-8 w-2 shrink-0 rounded-full" style={{ background: pulseira?.hex }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.passageiro}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{b.documento} Â· {b.classe}{b.assento ? ` Â· ${b.assento}` : ""}</p>
                      </div>
                      {jaEm ? (
                        <span className="text-[10px] font-medium text-[color:var(--warning)]">validado {jaEm}</span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function ResultadoTela({
  cor, icon: Icon, titulo, bilhete, rodape,
}: {
  cor: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titulo: string;
  bilhete: EmbarqueBilhete;
  rodape?: string;
}) {
  const pulseira = PULSEIRA_POR_CLASSE[bilhete.classe];
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
      style={{ background: `color-mix(in oklab, ${cor} 10%, transparent)` }}
    >
      <span style={{ color: cor }}>
        <Icon className="h-20 w-20" strokeWidth={1.5} />
      </span>
      <p className="font-display text-2xl" style={{ color: cor }}>{titulo}</p>
      <p className="text-base font-medium text-foreground">{bilhete.passageiro}</p>
      <p className="font-mono text-xs text-muted-foreground">{bilhete.documento}</p>
      {/* Faixa de cor da pulseira â€” gigante e Ã³bvia para o bilheteiro */}
      <div className="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1" style={{ background: `color-mix(in oklab, ${pulseira?.hex} 16%, transparent)`, borderColor: pulseira?.hex }}>
        <span className="h-4 w-4 rounded-full ring-2 ring-white/60" style={{ background: pulseira?.hex }} />
        <span className="text-sm font-semibold" style={{ color: pulseira?.hex }}>
          Pulseira {pulseira?.nome} Â· {bilhete.classe}{bilhete.assento ? ` Â· ${bilhete.assento}` : ""}
        </span>
      </div>
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </motion.div>
  );
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadQueue(): ValidacaoPendente[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(EMBARQUE_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    window.localStorage.removeItem(EMBARQUE_QUEUE_KEY);
    return [];
  }
}

function persistQueue(queue: ValidacaoPendente[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(EMBARQUE_QUEUE_KEY, JSON.stringify(queue));
}

function getDeviceId() {
  if (!canUseStorage()) return "app-validacao-front";
  const current = window.localStorage.getItem(EMBARQUE_DEVICE_ID_KEY);
  if (current) return current;
  const created = `embarque-web-${crypto.randomUUID()}`;
  window.localStorage.setItem(EMBARQUE_DEVICE_ID_KEY, created);
  return created;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function upsertBilhete(list: BilheteApi[], next: BilheteApi) {
  const exists = list.some((item) => item.id === next.id);
  return exists ? list.map((item) => item.id === next.id ? next : item) : [next, ...list];
}
