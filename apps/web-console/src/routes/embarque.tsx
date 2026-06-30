import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode, CheckCircle2, XCircle, ScanLine, Search, Ship, ChevronRight,
  AlertTriangle, Keyboard, RotateCcw,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { SyncIndicator, OfflineBanner } from "@/components/ops/primitives";
import { VIAGENS, EMBARCACOES, EMBARQUE_LISTA, PULSEIRA_POR_CLASSE, type EmbarqueBilhete } from "@/mocks/data";

export const Route = createFileRoute("/embarque")({
  head: () => ({ meta: [{ title: "Validação de embarque · AJC" }] }),
  component: Embarque,
});

const easeOut = [0.16, 1, 0.3, 1] as const;

type Tela = "selecao" | "scanner";
type Resultado =
  | { tipo: "valido"; bilhete: EmbarqueBilhete }
  | { tipo: "ja_validado"; bilhete: EmbarqueBilhete }
  | { tipo: "vencido"; qr: string }
  | { tipo: "invalido"; qr: string };

function Embarque() {
  const [tela, setTela] = useState<Tela>("selecao");
  const [online, setOnline] = useState(false);
  const [viagemId, setViagemId] = useState(VIAGENS.find((v) => v.status === "em_curso")?.id ?? VIAGENS[0].id);

  // Estado local da lista (offline-first: validações ficam na memória do aparelho).
  const [validados, setValidados] = useState<Record<string, string>>(() =>
    Object.fromEntries(EMBARQUE_LISTA.filter((b) => b.validadoEm).map((b) => [b.qr, b.validadoEm!]))
  );
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [buscaManual, setBuscaManual] = useState(false);
  const [termo, setTermo] = useState("");

  const viagem = VIAGENS.find((v) => v.id === viagemId)!;
  const emb = EMBARCACOES.find((e) => e.id === viagem.embarcacaoId);
  const capacidade = EMBARQUE_LISTA.length;
  const embarcados = Object.keys(validados).length;
  const pendentes = embarcados; // eventos aguardando sync (todos, no modo offline)

  const horaAgora = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  function validar(bilhete: EmbarqueBilhete) {
    const jaEm = validados[bilhete.qr];
    if (jaEm) {
      setResultado({ tipo: "ja_validado", bilhete });
      return;
    }
    const agora = horaAgora();
    setValidados((v) => ({ ...v, [bilhete.qr]: agora }));
    setResultado({ tipo: "valido", bilhete: { ...bilhete, validadoEm: agora } });
  }

  function simularLeitura() {
    // Lê um pendente, senão um já validado, senão inválido.
    const pendente = EMBARQUE_LISTA.find((b) => !validados[b.qr]);
    if (pendente) return validar(pendente);
    const qualquer = EMBARQUE_LISTA.find((b) => validados[b.qr]);
    if (qualquer) return setResultado({ tipo: "ja_validado", bilhete: qualquer });
    setResultado({ tipo: "invalido", qr: "AJC-0000-??" });
  }

  function simularVencido() {
    setResultado({ tipo: "vencido", qr: "AJC-EXP-0418" });
  }

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (!t) return EMBARQUE_LISTA;
    return EMBARQUE_LISTA.filter(
      (b) => b.passageiro.toLowerCase().includes(t) || b.documento.includes(t) || b.qr.toLowerCase().includes(t)
    );
  }, [termo]);

  return (
    <main className="grid min-h-screen place-items-center bg-[color:var(--background)] p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BrandMark size={26} /><span className="font-display">App Validação</span></div>
          <button onClick={() => setOnline((o) => !o)} aria-label="Alternar conexão">
            <SyncIndicator online={online} pending={pendentes} />
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

              <div className="mt-4 space-y-3">
                {VIAGENS.filter((v) => v.status === "em_curso" || v.status === "planejada").map((v) => {
                  const e = EMBARCACOES.find((x) => x.id === v.embarcacaoId);
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
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--brand)]">{v.codigo} · {v.origem} → {v.destino}</span>
                        {ativo && <CheckCircle2 className="h-4 w-4 text-[color:var(--brand)]" />}
                      </div>
                      <p className="mt-1 font-display text-lg">{e?.nome}</p>
                      <p className="text-xs text-muted-foreground">saída {v.saida} · {v.passageiros} passageiros</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => { setTela("scanner"); setResultado(null); }}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[color:var(--brand)] to-[color:var(--brand-soft)] text-base font-semibold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_70%,transparent)] active:scale-[0.99]"
              >
                <ScanLine className="h-5 w-5" /> Iniciar validação
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
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">{viagem.codigo} · {viagem.origem} → {viagem.destino}</p>
                    <h1 className="mt-1 truncate font-display text-lg">Embarque · {emb?.nome}</h1>
                  </div>
                  <button onClick={() => setTela("selecao")} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[color:var(--accent)]" aria-label="Trocar viagem">
                    <Ship className="h-5 w-5" />
                  </button>
                </header>

                {!online && <div className="px-4 pt-3"><OfflineBanner pending={pendentes} /></div>}

                {/* Contador embarcados / capacidade */}
                <div className="px-5 pt-4">
                  <div className="flex items-end justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Embarcados</span>
                    <span className="big-numeric text-lg text-muted-foreground">{Math.round((embarcados / capacidade) * 100)}%</span>
                  </div>
                  <p className="big-numeric mt-1 text-5xl leading-none text-foreground">
                    {embarcados}<span className="text-foreground/30">/{capacidade}</span>
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
                    <motion.div
                      className="h-full bg-[color:var(--brand)]"
                      animate={{ width: `${(embarcados / capacidade) * 100}%` }}
                      transition={{ duration: 0.5, ease: easeOut }}
                    />
                  </div>
                </div>

                {/* Área de leitura / resultado tela cheia */}
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
                        titulo="QR já validado"
                        bilhete={resultado.bilhete}
                        rodape={`1ª validação às ${resultado.bilhete.validadoEm}`}
                      />
                    )}
                    {resultado?.tipo === "invalido" && (
                      <motion.div
                        key="inv"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 text-[color:var(--danger)]"
                      >
                        <XCircle className="h-24 w-24" strokeWidth={1.4} />
                        <p className="font-display text-2xl">Bilhete inválido</p>
                        <p className="font-mono text-xs text-muted-foreground">{resultado.qr} · não consta na lista</p>
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
                        <p className="font-mono text-xs text-muted-foreground">{resultado.qr} · validade expirada, entrada bloqueada</p>
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
                Offline-first · {pendentes} validações aguardam sincronização
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
              <p className="text-xs text-muted-foreground">Quando o QR não lê — busque por nome, documento ou código.</p>

              <div className="mt-4 flex h-11 items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 ring-1 ring-[color:var(--hairline)] focus-within:ring-[color:var(--ring)]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Helena, 112.345…, AJC-9002"
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
                        <p className="font-mono text-[10px] text-muted-foreground">{b.documento} · {b.classe}{b.assento ? ` · ${b.assento}` : ""}</p>
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
      {/* Faixa de cor da pulseira — gigante e óbvia para o bilheteiro */}
      <div className="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1" style={{ background: `color-mix(in oklab, ${pulseira?.hex} 16%, transparent)`, borderColor: pulseira?.hex }}>
        <span className="h-4 w-4 rounded-full ring-2 ring-white/60" style={{ background: pulseira?.hex }} />
        <span className="text-sm font-semibold" style={{ color: pulseira?.hex }}>
          Pulseira {pulseira?.nome} · {bilhete.classe}{bilhete.assento ? ` · ${bilhete.assento}` : ""}
        </span>
      </div>
      {rodape && <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>}
    </motion.div>
  );
}
