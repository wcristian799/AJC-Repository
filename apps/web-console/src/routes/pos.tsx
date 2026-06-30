import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Ship, Ticket, Plus, Minus, Trash2, User, CreditCard, Banknote, QrCode,
  ChevronLeft, Printer, Check, Receipt, Gift, HeartHandshake, Wallet,
  ArrowDownToLine, ArrowUpFromLine, ShieldCheck, X, Search,
} from "lucide-react";
import { BrandMark } from "@/components/ops/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  CIDADES, PRECOS_PASSAGEM, VENDA_CLASSES, VENDA_GRATUIDADES, VENDA_CORTESIAS, CAIXAS,
  type VendaClasseId, type Cidade,
} from "@/mocks/data";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "PDV · Porto · AJC Ferry Boat" },
      { name: "description", content: "Terminal de vendas do porto: passagens, cortesias, gratuidades e controle de caixa." },
    ],
  }),
  component: PosScreen,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const cidadeNome = (s: string) => CIDADES.find((c) => c.sigla === s)?.nome ?? s;

type PayMethod = "credito" | "debito" | "pix" | "dinheiro";
type TipoItem = "paga" | "gratuidade" | "cortesia";

type Linha = {
  id: string;
  classeId: VendaClasseId;
  classeNome: string;
  trecho: string;
  valor: number;          // valor cobrado (0 para gratuidade/cortesia)
  precoCheio: number;     // valor de tabela (para mostrar isenção)
  tipo: TipoItem;
  rotulo?: string;        // ex.: "Idoso (60+)" ou código de cortesia
};

const caixaPorto = CAIXAS.find((c) => c.tipo === "porto") ?? CAIXAS[0];

function PosScreen() {
  const [destino, setDestino] = useState<Cidade>("STM");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [pay, setPay] = useState<PayMethod>("credito");
  const [pagamentos, setPagamentos] = useState<Record<PayMethod, number>>({ credito: 0, debito: 0, pix: 0, dinheiro: 0 });
  const [emitirBpe, setEmitirBpe] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [sheet, setSheet] = useState<null | "gratuidade" | "cortesia">(null);

  const trecho = `BEL → ${destino}`;
  const preco = PRECOS_PASSAGEM.find((p) => p.trecho === trecho);

  const subtotal = linhas.reduce((a, l) => a + l.valor, 0);
  const isencoes = linhas.reduce((a, l) => a + (l.tipo !== "paga" ? l.precoCheio : 0), 0);
  const total = subtotal;
  const totalPago = pagamentos.credito + pagamentos.debito + pagamentos.pix + pagamentos.dinheiro;
  const faltaPagar = Math.max(0, total - totalPago);
  const troco = Math.max(0, totalPago - total);
  const podeCobrar = linhas.length > 0 && (total === 0 || totalPago >= total);

  function addPaga(classeId: VendaClasseId) {
    const c = VENDA_CLASSES.find((x) => x.id === classeId)!;
    const v = preco ? preco[c.precoKey] : 0;
    setLinhas((prev) => [...prev, {
      id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      classeId, classeNome: c.nome, trecho, valor: v, precoCheio: v, tipo: "paga",
    }]);
  }

  function addIsento(classeId: VendaClasseId, tipo: "gratuidade" | "cortesia", rotulo: string) {
    const c = VENDA_CLASSES.find((x) => x.id === classeId)!;
    const v = preco ? preco[c.precoKey] : 0;
    setLinhas((prev) => [...prev, {
      id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      classeId, classeNome: c.nome, trecho, valor: 0, precoCheio: v, tipo, rotulo,
    }]);
    setSheet(null);
  }

  function remover(id: string) {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  }

  function limpar() {
    setLinhas([]);
    setPagamentos({ credito: 0, debito: 0, pix: 0, dinheiro: 0 });
  }

  function cobrar() {
    if (paying || !podeCobrar) return;
    setPaying(true);
    window.setTimeout(() => {
      setPaid(true);
      window.setTimeout(() => {
        setPaid(false);
        setPaying(false);
        limpar();
      }, 1600);
    }, 900);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[color:var(--background)]">
      {/* Top bar */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-[color:var(--hairline)] bg-[color:var(--surface-elev)] px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="grid h-10 w-10 place-items-center rounded-xl ring-1 ring-[color:var(--hairline-strong)] text-foreground/70 transition-colors hover:text-[color:var(--brand)]" aria-label="Voltar ao painel">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_22%,transparent)] to-transparent ring-1 ring-[color:var(--hairline-brand)]">
            <BrandMark size={26} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color:var(--brand)]">Caixa 02 · Porto de Belém</p>
            <h1 className="font-display text-lg leading-tight">PDV · Passagens</h1>
          </div>
        </div>

        <div className="hidden items-center justify-center gap-2 md:flex">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3.5 py-1.5 text-xs text-foreground/80 ring-1 ring-[color:var(--hairline)]">
            <Wallet className="h-3.5 w-3.5 text-[color:var(--brand)]" /> Saldo do caixa: <span className="font-mono">{brl(caixaPorto.saldo)}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--muted)] px-3.5 py-1.5 text-xs text-foreground/80 ring-1 ring-[color:var(--hairline)]">
            <ArrowDownToLine className="h-3.5 w-3.5 text-[color:var(--success)]" /> {brl(caixaPorto.entradasDia)}
            <ArrowUpFromLine className="ml-1 h-3.5 w-3.5 text-[color:var(--danger)]" /> {brl(caixaPorto.saidasDia)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden flex-col items-end font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
            <span className="text-[color:var(--success)]">● online</span>
            <span>operador · wellington</span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
        {/* ===== Catálogo de passagens ===== */}
        <section className="flex min-h-0 flex-col border-r border-[color:var(--hairline)]">
          {/* Seletor de trecho */}
          <div className="flex items-center gap-3 border-b border-[color:var(--hairline)] px-4 py-3">
            <Ship className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
            <span className="text-sm text-muted-foreground">Trecho</span>
            <span className="font-display text-sm">Belém →</span>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value as Cidade)}
              className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            >
              {CIDADES.filter((c) => c.sigla !== "BEL").map((c) => <option key={c.sigla} value={c.sigla}>{c.nome}</option>)}
            </select>
          </div>

          {/* Classes */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
            {VENDA_CLASSES.map((c, i) => {
              const v = preco ? preco[c.precoKey] : 0;
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                  onClick={() => addPaga(c.id)}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-[color:var(--surface-elev)] p-4 text-left ring-1 ring-[color:var(--hairline)] transition-all hover:ring-[color:var(--hairline-brand)] hover:shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--brand)_55%,transparent)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.pulseira.hex }} />
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)] transition-transform group-hover:scale-110">
                      <Plus className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-lg">{c.nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{c.subtitulo}</p>
                  </div>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="big-numeric text-2xl text-[color:var(--brand)]">{brl(v)}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">pulseira {c.pulseira.nome}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Ações especiais */}
          <div className="grid grid-cols-2 gap-3 border-t border-[color:var(--hairline)] p-4">
            <button
              onClick={() => setSheet("gratuidade")}
              className="flex items-center justify-center gap-2 rounded-xl bg-[color:var(--surface-elev)] py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:ring-[color:var(--hairline-brand)]"
            >
              <Gift className="h-4 w-4 text-[color:var(--brand)]" /> Gratuidade legal
            </button>
            <button
              onClick={() => setSheet("cortesia")}
              className="flex items-center justify-center gap-2 rounded-xl bg-[color:var(--surface-elev)] py-3 text-sm font-medium ring-1 ring-[color:var(--hairline)] transition-colors hover:ring-[color:var(--hairline-brand)]"
            >
              <HeartHandshake className="h-4 w-4 text-[color:var(--brand)]" /> Cortesia (código)
            </button>
          </div>
        </section>

        {/* ===== Ticket ===== */}
        <aside className="relative flex min-h-0 flex-col bg-[color:var(--surface-elev)] backdrop-blur-xl">
          <span className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[color:var(--hairline-brand)] to-transparent" />

          <div className="flex items-center justify-between border-b border-dashed border-[color:var(--hairline-strong)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[color:var(--brand)]" strokeWidth={1.8} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Venda em andamento</p>
                <p className="font-display text-base">{trecho}</p>
              </div>
            </div>
            <button onClick={limpar} disabled={linhas.length === 0} className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground ring-1 ring-[color:var(--hairline-strong)] transition-colors hover:text-[color:var(--danger)] disabled:opacity-40" aria-label="Limpar venda">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {linhas.length === 0 ? (
              <EmptyTicket />
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {linhas.map((l) => (
                    <motion.li
                      key={l.id}
                      layout
                      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 rounded-xl bg-[color:var(--card)] p-3 ring-1 ring-[color:var(--hairline)]"
                    >
                      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: VENDA_CLASSES.find((c) => c.id === l.classeId)?.pulseira.hex }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.classeNome}</p>
                        <p className="mt-0.5 text-[11px]">
                          {l.tipo === "paga" ? (
                            <span className="text-muted-foreground">{l.trecho}</span>
                          ) : (
                            <span className={l.tipo === "gratuidade" ? "text-[color:var(--success)]" : "text-[color:var(--brand)]"}>
                              {l.tipo === "gratuidade" ? "Gratuidade" : "Cortesia"} · {l.rotulo}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        {l.tipo === "paga" ? (
                          <span className="font-mono text-sm">{brl(l.valor)}</span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground line-through">{brl(l.precoCheio)}</span>
                        )}
                      </div>
                      <button onClick={() => remover(l.id)} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-[color:var(--danger)]" aria-label="Remover">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {/* Totais */}
          <div className="border-t border-dashed border-[color:var(--hairline-strong)] px-5 py-4">
            <div className="space-y-1.5 font-mono text-xs">
              <Row label="Passageiros" value={String(linhas.length)} muted />
              {isencoes > 0 && <Row label="Isenções (grat./cortesia)" value={`- ${brl(isencoes)}`} muted />}
            </div>

            <div className="mt-4 flex items-end justify-between rounded-xl bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] to-transparent px-4 py-3 ring-1 ring-[color:var(--hairline-brand)]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--brand)]">Total a cobrar</p>
                <p className="big-numeric text-[2.4rem] leading-none tabular-nums">{brl(total)}</p>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <User className="h-3 w-3" /> {linhas.length}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <PayBtn id="credito" active={pay} onClick={setPay} icon={CreditCard} label="Crédito" />
              <PayBtn id="debito" active={pay} onClick={setPay} icon={CreditCard} label="Débito" />
              <PayBtn id="pix" active={pay} onClick={setPay} icon={QrCode} label="Pix" />
              <PayBtn id="dinheiro" active={pay} onClick={setPay} icon={Banknote} label="Dinheiro" />
            </div>

            <div className="mt-3 rounded-xl bg-[color:var(--card)] p-3 ring-1 ring-[color:var(--hairline)]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Multipagamento</p>
                <button
                  onClick={() => setPagamentos((p) => ({ ...p, [pay]: Math.max(0, faltaPagar || total) }))}
                  className="text-[11px] font-medium text-[color:var(--brand)]"
                >
                  lançar saldo no método ativo
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["credito", "debito", "pix", "dinheiro"] as PayMethod[]).map((m) => (
                  <label key={m} className="block">
                    <span className="text-[10px] capitalize text-muted-foreground">{m}</span>
                    <input
                      type="number"
                      min={0}
                      value={pagamentos[m] || ""}
                      onChange={(e) => setPagamentos((p) => ({ ...p, [m]: Number(e.target.value) }))}
                      className="mt-1 h-9 w-full rounded-md bg-[color:var(--muted)] px-2 text-right font-mono text-xs text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Informado: <span className="font-mono text-foreground">{brl(totalPago)}</span></span>
                {troco > 0 ? <span className="font-mono text-[color:var(--success)]">Troco {brl(troco)}</span> : <span className="font-mono text-[color:var(--warning)]">Pendente {brl(faltaPagar)}</span>}
              </div>
            </div>

            <label className="mt-3 flex items-center justify-between rounded-xl bg-[color:var(--card)] px-3 py-2.5 text-xs ring-1 ring-[color:var(--hairline)]">
              <span>
                <span className="block font-medium text-foreground">BP-e no ato da venda</span>
                <span className="text-muted-foreground">PDV pode emitir ou não; portal/app público emite automático.</span>
              </span>
              <input type="checkbox" checked={emitirBpe} onChange={(e) => setEmitirBpe(e.target.checked)} className="h-4 w-4 accent-[color:var(--brand)]" />
            </label>

            <button
              onClick={cobrar}
              disabled={!podeCobrar || paying}
              className="group relative mt-3 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 text-base font-medium text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--brand)_60%,transparent)] ring-1 ring-[color:var(--hairline-brand)] transition-shadow disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 100%)" }}
            >
              <span className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className={`absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 ${paying ? "[animation:shine-sweep_1s_linear_infinite]" : "opacity-0 group-hover:opacity-100 group-hover:[animation:shine-sweep_1.2s_ease-out]"}`} />
              </span>
              <AnimatePresence mode="wait" initial={false}>
                {paid ? (
                  <motion.span key="paid" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative inline-flex items-center gap-2">
                    <Check className="h-5 w-5" strokeWidth={2.4} /> Bilhetes emitidos
                  </motion.span>
                ) : paying ? (
                  <motion.span key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">Processando…</motion.span>
                ) : (
                  <motion.span key="charge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative inline-flex items-center gap-2">
                    {total > 0 ? `Cobrar ${brl(total)}` : "Emitir isento"} {emitirBpe ? "· BP-e" : "· sem BP-e"} <Printer className="h-4 w-4 opacity-80" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </aside>
      </div>

      {/* Sheets de gratuidade / cortesia */}
      <AnimatePresence>
        {sheet === "gratuidade" && (
          <Sheet titulo="Gratuidade legal" subtitulo="Selecione o tipo e confira o documento exigido." onClose={() => setSheet(null)}>
            <ClassePicker
              preco={preco}
              render={(classeId) => (
                <div className="space-y-2">
                  {VENDA_GRATUIDADES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => addIsento(classeId, "gratuidade", g.label)}
                      className="flex w-full items-center gap-3 rounded-xl bg-[color:var(--surface-elev)] p-3 text-left ring-1 ring-[color:var(--hairline)] transition-colors hover:ring-[color:var(--hairline-brand)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--success)_14%,transparent)] text-[color:var(--success)]">
                        <Gift className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{g.label}</p>
                        <p className="text-[11px] text-muted-foreground">Documento: {g.doc}</p>
                      </div>
                      <Check className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            />
          </Sheet>
        )}

        {sheet === "cortesia" && (
          <Sheet titulo="Validar cortesia" subtitulo="Códigos emitidos pela diretoria/comercial." onClose={() => setSheet(null)}>
            <div className="mb-3 flex h-11 items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 ring-1 ring-[color:var(--hairline)]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input placeholder="AJC-CORT-…" className="h-full w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none" />
            </div>
            <div className="space-y-2">
              {VENDA_CORTESIAS.map((c) => {
                const classeId = (VENDA_CLASSES.find((x) => x.nome === c.classe)?.id ?? "rede") as VendaClasseId;
                return (
                  <button
                    key={c.codigo}
                    disabled={c.usada}
                    onClick={() => addIsento(classeId, "cortesia", c.codigo)}
                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition-colors ${
                      c.usada ? "cursor-not-allowed bg-[color:var(--muted)]/40 ring-[color:var(--hairline)] opacity-60"
                      : "bg-[color:var(--surface-elev)] ring-[color:var(--hairline)] hover:ring-[color:var(--hairline-brand)]"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)]">
                      <HeartHandshake className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs">{c.codigo}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{c.motivo} · {c.classe}</p>
                    </div>
                    {c.usada ? (
                      <span className="text-[10px] font-medium text-[color:var(--danger)]">já usada</span>
                    ) : (
                      <Check className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClassePicker({ preco, render }: {
  preco: ReturnType<typeof PRECOS_PASSAGEM.find>;
  render: (classeId: VendaClasseId) => React.ReactNode;
}) {
  const [classeId, setClasseId] = useState<VendaClasseId>("rede");
  return (
    <>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Classe</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {VENDA_CLASSES.map((c) => {
          const v = preco ? preco[c.precoKey] : 0;
          const ativo = c.id === classeId;
          return (
            <button
              key={c.id}
              onClick={() => setClasseId(c.id)}
              className={`rounded-xl p-2.5 text-center ring-1 transition-colors ${ativo ? "bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] ring-[color:var(--brand)]" : "bg-[color:var(--surface-elev)] ring-[color:var(--hairline)]"}`}
            >
              <span className="mx-auto block h-2.5 w-2.5 rounded-full" style={{ background: c.pulseira.hex }} />
              <span className="mt-1 block text-xs font-medium">{c.nome}</span>
              <span className="block font-mono text-[10px] text-muted-foreground">{brl(v)}</span>
            </button>
          );
        })}
      </div>
      {render(classeId)}
    </>
  );
}

function Sheet({ titulo, subtitulo, onClose, children }: {
  titulo: string; subtitulo: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[color:var(--card)] p-5 ring-1 ring-[color:var(--hairline)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl">{titulo}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[color:var(--accent)]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        <p className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Isenções são auditadas · exige documento e registro do operador.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : "text-foreground/85"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PayBtn({ id, active, onClick, icon: Icon, label }: {
  id: PayMethod; active: PayMethod; onClick: (m: PayMethod) => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 ring-1 transition-all ${
        isActive ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--brand)]"
        : "text-foreground/75 ring-[color:var(--hairline-strong)] hover:ring-[color:var(--hairline-brand)]"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function EmptyTicket() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
        <Ticket className="h-6 w-6" strokeWidth={1.6} />
      </div>
      <div>
        <p className="font-display text-base">Nenhuma passagem no ticket</p>
        <p className="mt-1 text-xs text-muted-foreground">Toque numa classe à esquerda para iniciar a venda.</p>
      </div>
    </div>
  );
}
