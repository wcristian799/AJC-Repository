import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, UserCheck, MapPin, Scale, Wallet, FileSignature,
  CheckCircle2, AlertTriangle, Printer, Search, Ruler,
} from "lucide-react";
import {
  SectionHeader, PrimaryButton, GhostButton, StatusChip, Tag, OfflineBanner, brl,
} from "@/components/ops/primitives";
import { createEncomenda } from "@/lib/ajc-api";
import { calcularPrecoEncomenda, ENCOMENDA_TAMANHOS, sugerirTamanhoPorPeso } from "./pricing";
import { PrecoDestaque, TermoDC, ResumoLinha } from "./shared";
import type { ClienteEncomendaUi, EncomendaPagador, EncomendaTamanho, PrecoEncomendaTabela, ViagemEncomendaUi } from "./types";

/** B.1 — Despacho de encomenda (PDV / balcão do porto). */
export function DespachoTab({
  clientes = [],
  viagens = [],
  precos = [],
  limiteFixo = null,
}: {
  clientes?: ClienteEncomendaUi[];
  viagens?: ViagemEncomendaUi[];
  precos?: PrecoEncomendaTabela[];
  limiteFixo?: number | null;
}) {
  const clientesBase = useMemo<ClienteEncomendaUi[]>(() => (
    clientes
  ), [clientes]);
  const trechos = useMemo(() => precos.map((p) => p.trecho), [precos]);

  const [remetenteId, setRemetenteId] = useState(clientesBase[0]?.id ?? "");
  const [remetente, setRemetente] = useState(clientesBase[0]?.nome ?? "");
  const [remDoc, setRemDoc] = useState(clientesBase[0]?.documento ?? "");
  const [remContato, setRemContato] = useState("(91) 98888-1000");
  const [destinatario, setDestinatario] = useState("");
  const [destDoc, setDestDoc] = useState("");
  const [destContato, setDestContato] = useState("");
  const [trecho, setTrecho] = useState(trechos[0] ?? "");
  const [tamanho, setTamanho] = useState<EncomendaTamanho>("M");
  const [peso, setPeso] = useState(0);
  const [valorDeclarado, setValorDeclarado] = useState(0);
  const [conteudo, setConteudo] = useState("");
  const [quemPaga, setQuemPaga] = useState<EncomendaPagador>("remetente");
  const [documentoTipo, setDocumentoTipo] = useState<"DC" | "NF">("DC");
  const [dcAssinada, setDcAssinada] = useState(false);
  const [emitido, setEmitido] = useState(false);
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (remetenteId || clientesBase.length === 0) return;
    setRemetenteId(clientesBase[0].id);
    setRemetente(clientesBase[0].nome);
    setRemDoc(clientesBase[0].documento);
  }, [clientesBase, remetenteId]);

  useEffect(() => {
    if (!trechos.includes(trecho) && trechos[0]) setTrecho(trechos[0]);
  }, [trecho, trechos]);

  const resultado = useMemo(
    () => limiteFixo ? calcularPrecoEncomenda(precos, { trecho, tamanho, valorDeclarado, limiteFixo }) : null,
    [limiteFixo, precos, trecho, tamanho, valorDeclarado],
  );

  const tamSel = ENCOMENDA_TAMANHOS.find((t) => t.id === tamanho)!;
  const pesoExcede = peso > 0 && peso > tamSel.pesoMax;
  const tamanhoSugerido = peso > 0 ? sugerirTamanhoPorPeso(peso) : null;
  const valorObrigatorioVazio = valorDeclarado <= 0;
  const [origemSigla, destinoSigla] = trecho.split("->").map((p) => p.trim());
  const viagemDestino = useMemo(() => (
    viagens.find((v) => v.destino === destinoSigla || v.escalas.some((e) => e.cidade === destinoSigla))
  ), [destinoSigla, viagens]);
  const podeConfirmar = !!remetenteId && !!remDoc && !!remContato && !!destinatario && !!destDoc && !!destContato
    && !valorObrigatorioVazio && !pesoExcede && dcAssinada && !!viagemDestino && !!resultado && !emitindo;

  async function confirmarDespacho() {
    if (!podeConfirmar || !viagemDestino || !resultado) return;
    const numeroDc = `DC-${Date.now()}`;
    setEmitindo(true);
    setErro(null);
    setEmitido(false);
    try {
      await createEncomenda({
        viagemId: viagemDestino.id,
        clienteRemetenteId: remetenteId,
        destinatarioNome: destinatario,
        cidadeOrigemSigla: origemSigla || "BEL",
        cidadeDestinoSigla: destinoSigla,
        valorDeclarado,
        valorCobrado: resultado.preco,
        pesoTotal: peso || tamSel.pesoMax,
        totalVolumes: 1,
        numeroDocumento: documentoTipo === "DC" ? numeroDc : undefined,
        observacoes: JSON.stringify({
          destinatario,
          destinatarioDocumento: destDoc,
          destinatarioContato: destContato,
          remetenteContato: remContato,
          trecho,
          tamanho,
          conteudo,
          quemPaga,
          dcAssinada,
        }),
        clientUuid: crypto.randomUUID(),
        documento: {
          tipo: documentoTipo === "NF" ? "NFe" : "DC",
          numero: documentoTipo === "DC" ? numeroDc : undefined,
          valor: valorDeclarado,
          origem: "manual",
        },
      });
      setEmitido(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao criar encomenda");
    } finally {
      setEmitindo(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="PDV · balcão do porto"
        title="Despacho de encomenda"
        description="Fluxo do operador de caixa com balança ao lado: remetente → destinatário → trecho → tamanho/peso → valor declarado → preço automático → quem paga → Declaração de Conteúdo."
        actions={<GhostButton icon={Search}>Buscar encomenda</GhostButton>}
      />

      <OfflineBanner pending={2} />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <StepCard n={1} icon={User} title="Remetente" hint="CPF/CNPJ busca cadastro; se não existir, cadastro rápido.">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cliente cadastrado</label>
            <select
              value={remetenteId}
              onChange={(e) => {
                const cliente = clientesBase.find((c) => c.id === e.target.value);
                setRemetenteId(e.target.value);
                setRemetente(cliente?.nome ?? "");
                setRemDoc(cliente?.documento ?? "");
              }}
              className="mt-1 h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
            >
              {clientesBase.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} · {c.documento || "sem documento"}</option>
              ))}
            </select>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="CPF/CNPJ do remetente">
                <input value={remDoc} onChange={(e) => setRemDoc(e.target.value)} className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
              </Field>
              <Field label="Telefone do remetente">
                <input value={remContato} onChange={(e) => setRemContato(e.target.value)} className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
              </Field>
            </div>
          </StepCard>

          <StepCard n={2} icon={UserCheck} title="Destinatário" hint="Nome + contato para notificação de entrega (WhatsApp/SMS).">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nome do destinatário">
                <input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Nome completo" className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
              </Field>
              <Field label="CPF/CNPJ">
                <input value={destDoc} onChange={(e) => setDestDoc(e.target.value)} placeholder="CPF ou CNPJ" className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
              </Field>
              <Field label="Contato (telefone)">
                <input value={destContato} onChange={(e) => setDestContato(e.target.value)} placeholder="(00) 90000-0000" className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
              </Field>
            </div>
          </StepCard>

          <StepCard n={3} icon={MapPin} title="Trecho" hint="Cidade de origem → destino (preço varia por trecho).">
            <div className="flex flex-wrap gap-1.5">
              {trechos.map((t) => (
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
            {!viagemDestino && <p className="mt-2 text-[11px] text-[color:var(--warning)]">Sem viagem real carregada para esse destino. Carregue a API ou selecione outro trecho.</p>}
          </StepCard>

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
                  <input type="number" min={0} value={peso || ""} onChange={(e) => setPeso(Number(e.target.value))} placeholder="0" className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
                  <button onClick={() => setPeso(tamSel.pesoMax - 2)} title="Ler balança (simulado)" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--muted)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]">
                    <Ruler className="h-4 w-4" />
                  </button>
                </div>
              </Field>
              <Field label="Valor declarado (R$)">
                <input type="number" min={0} value={valorDeclarado || ""} onChange={(e) => setValorDeclarado(Number(e.target.value))} placeholder="0" className={`h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 focus:outline-none focus:ring-[color:var(--ring)] ${valorObrigatorioVazio ? "ring-[color:color-mix(in_oklab,var(--danger)_45%,transparent)]" : "ring-[color:var(--hairline)]"}`} />
              </Field>
            </div>

            <Field label="Conteúdo declarado (descrição)" className="mt-3">
              <input value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Ex.: peças de vestuário" className="h-10 w-full rounded-lg bg-[color:var(--muted)] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]" />
            </Field>

            <AnimatePresence>
              {pesoExcede && tamanhoSugerido && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] px-3 py-2 text-[12px] font-medium text-[color:var(--danger)]">
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

          <StepCard n={6} icon={Wallet} title="Quem paga" hint="Remetente ou destinatário arca com o frete.">
            <div className="grid grid-cols-2 gap-2">
              {(["remetente", "destinatario"] as EncomendaPagador[]).map((p) => (
                <button key={p} onClick={() => setQuemPaga(p)} className={`h-11 rounded-lg text-sm font-medium capitalize transition-colors ${quemPaga === p ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]" : "bg-[color:var(--muted)] text-foreground/80 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </StepCard>

          <StepCard n={7} icon={FileSignature} title="Declaração de Conteúdo" hint="Abre o termo com cláusula de exclusão e assinatura em tela (aba dedicada).">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["DC", "NF"] as const).map((tipo) => (
                <button key={tipo} onClick={() => setDocumentoTipo(tipo)} className={`h-10 rounded-lg text-sm font-medium ring-1 transition-colors ${documentoTipo === tipo ? "bg-[color:color-mix(in_oklab,var(--brand)_14%,transparent)] text-[color:var(--brand)] ring-[color:var(--hairline-brand)]" : "bg-[color:var(--muted)] text-foreground/80 ring-[color:var(--hairline)]"}`}>
                  {tipo === "DC" ? "Declaração de Conteúdo" : "Nota Fiscal"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {dcAssinada
                  ? <StatusChip tone="success"><CheckCircle2 className="h-3 w-3" /> DC assinada</StatusChip>
                  : <StatusChip tone="warning"><AlertTriangle className="h-3 w-3" /> DC pendente de assinatura</StatusChip>}
              </div>
              <button onClick={() => setDcAssinada((v) => !v)} className="h-9 rounded-md bg-[color:var(--surface-elev)] px-3 text-xs font-medium text-foreground/85 ring-1 ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]">
                {dcAssinada ? "Refazer assinatura" : "Coletar assinatura (simular)"}
              </button>
            </div>
          </StepCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <PrecoDestaque resultado={resultado} trecho={trecho} tamanho={tamanho} />

          <div className="surface-card p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Resumo do despacho</p>
            <div className="mt-2">
              <ResumoLinha label="Remetente"><span className="truncate">{remetente}</span></ResumoLinha>
              <ResumoLinha label="CPF/CNPJ remetente">{remDoc || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Telefone remetente">{remContato || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Destinatário">{destinatario || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="CPF/CNPJ destinatário">{destDoc || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Telefone destinatário">{destContato || <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Trecho"><span className="font-mono">{trecho}</span></ResumoLinha>
              <ResumoLinha label="Viagem">{viagemDestino?.codigo ?? <span className="text-muted-foreground">—</span>}</ResumoLinha>
              <ResumoLinha label="Tamanho / peso">{tamanho} · {peso || 0} kg</ResumoLinha>
              <ResumoLinha label="Valor declarado">{brl(valorDeclarado)}</ResumoLinha>
              <ResumoLinha label="Documento">{documentoTipo}</ResumoLinha>
              <ResumoLinha label="Quem paga"><span className="capitalize">{quemPaga}</span></ResumoLinha>
              <ResumoLinha label="Efeito financeiro">{quemPaga === "remetente" ? "entra no caixa" : "gera contas a receber"}</ResumoLinha>
              <ResumoLinha label="Frete cobrado"><span className="text-[color:var(--brand)]">{brl(resultado?.preco ?? 0)}</span></ResumoLinha>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <PrimaryButton icon={Printer} disabled={!podeConfirmar} onClick={confirmarDespacho}>
                {emitindo ? "Criando encomenda..." : "Confirmar e imprimir etiqueta"}
              </PrimaryButton>
              {!podeConfirmar && (
                <p className="text-[11px] text-muted-foreground">
                  Para confirmar: remetente/destinatário completos, valor declarado, peso compatível, viagem disponível e documento assinado/anexado.
                </p>
              )}
              {erro && (
                <div className="rounded-lg bg-[color:color-mix(in_oklab,var(--danger)_12%,transparent)] px-3 py-2.5 text-[12px] text-[color:var(--danger)]">
                  <p className="font-medium">Não foi possível criar a encomenda.</p>
                  <p className="mt-0.5 text-muted-foreground">{erro}</p>
                </div>
              )}
              {emitido && (
                <div className="rounded-lg bg-[color:color-mix(in_oklab,var(--success)_12%,transparent)] px-3 py-2.5 text-[12px] text-[color:var(--success)]">
                  <p className="font-medium">Encomenda gerada no backend · etiqueta + recibo prontos.</p>
                  <p className="mt-0.5 text-muted-foreground">Volume criado no TMS e frete registrado no fluxo de encomendas.</p>
                </div>
              )}
            </div>
          </div>

          <div className="surface-card p-4">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Regra A.1:</span> até {limiteFixo ? brl(limiteFixo) : "o limite configurado"} de valor declarado o preço é fixo por tamanho; acima, percentual sobre o declarado.
            </p>
            <p className="mt-1.5"><Tag tone="brand">tabela versionada</Tag></p>
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
