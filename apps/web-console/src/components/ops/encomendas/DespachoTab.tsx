import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, UserCheck, MapPin, Scale, Wallet, FileSignature,
  CheckCircle2, AlertTriangle, Printer, Search, Ruler,
} from "lucide-react";
import {
  SectionHeader, PrimaryButton, GhostButton, StatusChip, Tag, OfflineBanner, brl,
} from "@/components/ops/primitives";
import {
  CLIENTES, ENCOMENDA_TAMANHOS, ENCOMENDA_TRECHOS, ENCOMENDA_LIMITE_FIXO,
  calcularPrecoEncomenda, sugerirTamanhoPorPeso,
  type EncomendaTamanho, type EncomendaPagador,
} from "@/mocks/data";
import { PrecoDestaque, TermoDC, ResumoLinha } from "./shared";

/** B.1 — Despacho de encomenda (PDV / balcão do porto). */
export function DespachoTab() {
  // Remetente / destinatário
  const [remetente, setRemetente] = useState(CLIENTES[0].nome);
  const [destinatario, setDestinatario] = useState("");
  const [destContato, setDestContato] = useState("");
  // Trecho / dimensionamento
  const [trecho, setTrecho] = useState(ENCOMENDA_TRECHOS[0]);
  const [tamanho, setTamanho] = useState<EncomendaTamanho>("M");
  const [peso, setPeso] = useState(0);
  const [valorDeclarado, setValorDeclarado] = useState(0);
  const [conteudo, setConteudo] = useState("");
  // Pagamento / DC
  const [quemPaga, setQuemPaga] = useState<EncomendaPagador>("remetente");
  const [dcAssinada, setDcAssinada] = useState(false);
  const [offline] = useState(true);
  const [emitido, setEmitido] = useState(false);

  const resultado = useMemo(
    () => calcularPrecoEncomenda({ trecho, tamanho, valorDeclarado }),
    [trecho, tamanho, valorDeclarado],
  );

  const tamSel = ENCOMENDA_TAMANHOS.find((t) => t.id === tamanho)!;
  const pesoExcede = peso > 0 && peso > tamSel.pesoMax;
  const tamanhoSugerido = peso > 0 ? sugerirTamanhoPorPeso(peso) : null;
  const valorObrigatorioVazio = valorDeclarado <= 0;

  const podeConfirmar = !!destinatario && !valorObrigatorioVazio && !pesoExcede && dcAssinada;

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="PDV · balcão do porto"
        title="Despacho de encomenda"
        description="Fluxo do operador de caixa com balança ao lado: remetente → destinatário → trecho → tamanho/peso → valor declarado → preço automático → quem paga → Declaração de Conteúdo."
        actions={<GhostButton icon={Search}>Buscar encomenda</GhostButton>}
      />

      {offline && <OfflineBanner pending={2} />}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Coluna do fluxo */}
        <div className="space-y-4">
          {/* 1 · Remetente */}
          <StepCard n={1} icon={User} title="Remetente" hint="CPF/CNPJ → busca cadastro; se não existir, cadastro rápido.">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cliente cadastrado</label>
            <select
              value={remetente}
              onChange={(e) => setRemetente(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            >
              {CLIENTES.map((c) => (
                <option key={c.id} value={c.nome}>{c.nome} · {c.documento}</option>
              ))}
            </select>
          </StepCard>

          {/* 2 · Destinatário */}
          <StepCard n={2} icon={UserCheck} title="Destinatário" hint="Nome + contato para notificação de entrega (WhatsApp/SMS).">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do destinatário">
                <input
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  placeholder="Nome completo"
                  className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                />
              </Field>
              <Field label="Contato (telefone)">
                <input
                  value={destContato}
                  onChange={(e) => setDestContato(e.target.value)}
                  placeholder="(00) 90000-0000"
                  className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                />
              </Field>
            </div>
          </StepCard>

          {/* 3 · Trecho */}
          <StepCard n={3} icon={MapPin} title="Trecho" hint="Cidade de origem → destino (preço varia por trecho).">
            <div className="flex flex-wrap gap-1.5">
              {ENCOMENDA_TRECHOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTrecho(t)}
                  className={`h-9 rounded-md px-3 font-mono text-xs font-medium transition-colors ${
                    trecho === t
                      ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                      : "bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </StepCard>

          {/* 4 · Dimensionamento */}
          <StepCard n={4} icon={Scale} title="Dimensionamento" hint="Selecione o tamanho ou leia o peso da balança e informe o valor declarado.">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tamanho</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {ENCOMENDA_TAMANHOS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTamanho(t.id)}
                  className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                    tamanho === t.id
                      ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-1 ring-[color:var(--hairline-brand)]"
                      : "bg-[color:var(--muted)] ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                  }`}
                >
                  <span className={`big-numeric text-xl ${tamanho === t.id ? "text-[color:var(--brand)]" : "text-foreground"}`}>{t.id}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">até {t.pesoMax} kg</span>
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Peso da balança (kg)">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={peso || ""}
                    onChange={(e) => setPeso(Number(e.target.value))}
                    placeholder="0"
                    className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
                  />
                  <button
                    onClick={() => setPeso(tamSel.pesoMax - 2)}
                    title="Ler balança (simulado)"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--muted)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                  >
                    <Ruler className="h-4 w-4" />
                  </button>
                </div>
              </Field>
              <Field label="Valor declarado (R$)">
                <input
                  type="number"
                  min={0}
                  value={valorDeclarado || ""}
                  onChange={(e) => setValorDeclarado(Number(e.target.value))}
                  placeholder="0"
                  className={`h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 focus:outline-none focus:ring-[color:var(--ring)] ${
                    valorObrigatorioVazio ? "ring-[color:color-mix(in_oklab,var(--danger)_45%,transparent)]" : "ring-[color:var(--hairline)]"
                  }`}
                />
              </Field>
            </div>

            <Field label="Conteúdo declarado (descrição)" className="mt-3">
              <input
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Ex.: peças de vestuário"
                className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
            </Field>

            {/* Erros B.1 */}
            <AnimatePresence>
              {pesoExcede && tamanhoSugerido && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] px-3 py-2 text-[12px] font-medium text-[color:var(--danger)]"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Peso {peso} kg excede o tamanho {tamanho}. Sugerido: tamanho {tamanhoSugerido}.
                  <button onClick={() => setTamanho(tamanhoSugerido)} className="ml-1 underline">aplicar</button>
                </motion.p>
              )}
            </AnimatePresence>
            {valorObrigatorioVazio && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[color:var(--danger)]">
                <AlertTriangle className="h-3.5 w-3.5" /> Valor declarado é obrigatório para precificar e para a DC.
              </p>
            )}
          </StepCard>

          {/* 6 · Quem paga */}
          <StepCard n={6} icon={Wallet} title="Quem paga" hint="Remetente ou destinatário arca com o frete.">
            <div className="grid grid-cols-2 gap-2">
              {(["remetente", "destinatario"] as EncomendaPagador[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setQuemPaga(p)}
                  className={`h-11 rounded-lg text-sm font-medium capitalize transition-colors ${
                    quemPaga === p
                      ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]"
                      : "bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </StepCard>

          {/* 7 · DC */}
          <StepCard n={7} icon={FileSignature} title="Declaração de Conteúdo" hint="Abre o termo com cláusula de exclusão e assinatura em tela (aba dedicada).">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {dcAssinada
                  ? <StatusChip tone="success"><CheckCircle2 className="h-3 w-3" /> DC assinada</StatusChip>
                  : <StatusChip tone="warning"><AlertTriangle className="h-3 w-3" /> DC pendente de assinatura</StatusChip>}
              </div>
              <button
                onClick={() => setDcAssinada((v) => !v)}
                className="h-9 rounded-md bg-[color:var(--surface-elev)] px-3 text-xs font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
              >
                {dcAssinada ? "Refazer assinatura" : "Coletar assinatura (simular)"}
              </button>
            </div>
          </StepCard>
        </div>

        {/* Coluna fixa: preço + resumo + confirmação */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PrecoDestaque resultado={resultado} trecho={trecho} tamanho={tamanho} />

          <div className="surface-card p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Resumo do despacho</p>
            <div className="mt-2">
              <ResumoLinha label="Remetente"><span className="truncate">{remetente}</span></ResumoLinha>
              <ResumoLinha label="Destinatário">{destinatario || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Trecho"><span className="font-mono">{trecho}</span></ResumoLinha>
              <ResumoLinha label="Tamanho / peso">{tamanho} · {peso || 0} kg</ResumoLinha>
              <ResumoLinha label="Valor declarado">{brl(valorDeclarado)}</ResumoLinha>
              <ResumoLinha label="Quem paga"><span className="capitalize">{quemPaga}</span></ResumoLinha>
              <ResumoLinha label="Frete cobrado"><span className="text-[color:var(--brand)]">{brl(resultado.preco)}</span></ResumoLinha>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <PrimaryButton icon={Printer} disabled={!podeConfirmar} onClick={() => setEmitido(true)}>
                Confirmar e imprimir etiqueta
              </PrimaryButton>
              {!podeConfirmar && (
                <p className="text-[11px] text-muted-foreground">
                  Para confirmar: destinatário, valor declarado, peso compatível e DC assinada.
                </p>
              )}
              {emitido && (
                <div className="rounded-lg bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] px-3 py-2.5 text-[12px] text-[color:var(--success)]">
                  <p className="font-medium">Encomenda gerada · etiqueta + recibo impressos.</p>
                  <p className="mt-0.5 text-muted-foreground">Volume criado no TMS e frete lançado no caixa de encomendas. {offline && "Enfileirado offline."}</p>
                </div>
              )}
            </div>
          </div>

          <div className="surface-card p-4">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Regra A.1:</span> até {brl(ENCOMENDA_LIMITE_FIXO)} de valor declarado o preço é fixo por tamanho; acima, percentual sobre o declarado.
            </p>
            <p className="mt-1.5"><Tag tone="warning">🔶 tabela de preços pendente (Lucas)</Tag></p>
          </div>
        </div>
      </div>

      <TermoDC compact />
    </div>
  );
}

function StepCard({
  n, icon: Icon, title, hint, children,
}: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{n}</span>
            <h3 className="font-display text-base">{title}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
