import { useState } from "react";
import { Users, Package, Boxes, Car, Paperclip, AlertTriangle, FileText, Wifi, Utensils, Coffee, Building2, Truck, Receipt, HandCoins, PenLine } from "lucide-react";
import {
  SectionHeader, StatusChip, GhostButton, brl,
} from "@/components/ops/primitives";
import { PRESTACOES_CONTAS, VIAGENS, EMBARCACOES, type PrestacaoStatus } from "@/mocks/data";

const STATUS_TONE: Record<PrestacaoStatus, "neutral" | "warning" | "success"> = {
  rascunho: "neutral",
  enviada: "warning",
  conferida: "success",
};
const STATUS_LABEL: Record<PrestacaoStatus, string> = {
  rascunho: "Rascunho (editável)",
  enviada: "Enviada (bloqueada)",
  conferida: "Conferida",
};

/**
 * B.10 — Prestação de contas do gerente da embarcação.
 * Espelha o formulário operacional real (modelo "PRESTAÇÃO DE CONTAS GERENTES AM VI"):
 * cabeçalho, receitas à bordo (espécie/PIX/total), cozinha por dia, lanchonete/internet,
 * passagens e fretes por agência (com comissão/saldo), despesas, redondas/gratificações,
 * fechamento com saldo repassado e área de assinatura. A divergência declarado × sistema
 * é mantida como faixa de conferência do financeiro.
 */
export function PrestacaoTab() {
  const [sel, setSel] = useState(PRESTACOES_CONTAS[1].id);
  const pc = PRESTACOES_CONTAS.find((p) => p.id === sel) ?? PRESTACOES_CONTAS[0];
  const viagem = VIAGENS.find((v) => v.id === pc.viagemId);
  const embarcacao = EMBARCACOES.find((e) => e.id === viagem?.embarcacaoId);
  const divergencia = pc.totalSistema - pc.totalDeclarado;
  const temDivergencia = divergencia !== 0;

  // --- Receitas à bordo (Espécie / PIX / Total) ---
  const receitasBordo = [
    { rotulo: "Passagens", especie: 6_240, pix: 12_840 },
    { rotulo: "Fretes STM/Almeirim", especie: 1_810, pix: 980 },
    { rotulo: "Fretes STM/Gurupá", especie: 640, pix: 1_220 },
    { rotulo: "Fretes STM/Porto de Moz", especie: 380, pix: 760 },
    { rotulo: "Fretes inter-trechos", especie: 420, pix: 950 },
    { rotulo: "Encomendas", especie: 740, pix: 2_140 },
    { rotulo: "Veículos", especie: 0, pix: 3_800 },
  ];

  // --- Cozinha por dia da viagem ---
  const cozinhaDias = [
    { dia: "Dia 1", cafe: 180, almoco: 420, jantar: 360 },
    { dia: "Dia 2", cafe: 210, almoco: 480, jantar: 390 },
    { dia: "Dia 3", cafe: 160, almoco: 360, jantar: 300 },
  ];

  // --- Lanchonete / Internet (Espécie / PIX / Total) ---
  const lanchonete = { especie: 540, pix: 1_280 };
  const internet = { especie: 220, pix: 1_160 };

  // --- Passagens por agência (Espécie / PIX-Conta / Total / Comissão / Saldo) ---
  const passagensAgencias = [
    { cidade: "Breves", especie: 1_240, pixConta: 2_180 },
    { cidade: "Gurupá", especie: 860, pixConta: 1_540 },
    { cidade: "Almeirim", especie: 1_120, pixConta: 2_360 },
    { cidade: "Prainha", especie: 640, pixConta: 1_180 },
    { cidade: "Monte Alegre", especie: 980, pixConta: 1_760 },
    { cidade: "Santarém", especie: 2_140, pixConta: 4_280 },
  ].map((a) => {
    const total = a.especie + a.pixConta;
    const comissao = Math.round(total * 0.1);
    return { ...a, total, comissao, saldo: total - comissao };
  });

  // --- Fretes por agência (Espécie / PIX-Conta / Total / Saldo) ---
  const fretesAgencias = [
    { cidade: "Gurupá", especie: 420, pixConta: 680 },
    { cidade: "Almeirim", especie: 360, pixConta: 540 },
    { cidade: "Prainha", especie: 180, pixConta: 320 },
    { cidade: "Monte Alegre", especie: 250, pixConta: 410 },
    { cidade: "Santarém", especie: 640, pixConta: 980 },
  ].map((a) => ({ ...a, total: a.especie + a.pixConta, saldo: a.especie + a.pixConta }));

  // --- Despesas (Descrição / Valor) ---
  const despesas = [
    { descricao: "Pagamento de carregador", valor: 480 },
    { descricao: "Pagamento de despacho", valor: 320 },
    { descricao: "Recolhimento de lixo/resíduos", valor: 180 },
    { descricao: "Pagamento de empilhador", valor: 260 },
    { descricao: "Compras — material/alimentação refeitório", valor: 640 },
    { descricao: "Diária no porto", valor: 220 },
  ];

  // --- Redondas e gratificações (Nome / Função / Valor) ---
  const redondas = [
    { nome: "José Carlos", funcao: "Marinheiro de convés", valor: 150 },
    { nome: "Antônio Lima", funcao: "Cozinha", valor: 120 },
    { nome: "Maria das Graças", funcao: "Camareira", valor: 120 },
  ];

  const totalReceitaBordoEspecie = receitasBordo.reduce((s, r) => s + r.especie, 0);
  const totalReceitaBordoPix = receitasBordo.reduce((s, r) => s + r.pix, 0);
  const totalCozinha = cozinhaDias.reduce((s, d) => s + d.cafe + d.almoco + d.jantar, 0);
  const totalLanchonete = lanchonete.especie + lanchonete.pix;
  const totalInternet = internet.especie + internet.pix;
  const totalPassagensAgencias = passagensAgencias.reduce((s, a) => s + a.total, 0);
  const totalSaldoPassagens = passagensAgencias.reduce((s, a) => s + a.saldo, 0);
  const totalFretesAgencias = fretesAgencias.reduce((s, a) => s + a.total, 0);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const totalRedondas = redondas.reduce((s, r) => s + r.valor, 0);

  const especieFechamento = totalReceitaBordoEspecie + lanchonete.especie + internet.especie;
  const pixFechamento = totalReceitaBordoPix + lanchonete.pix + internet.pix;
  const receitaTotal =
    totalReceitaBordoEspecie + totalReceitaBordoPix + totalCozinha + totalLanchonete +
    totalInternet + totalSaldoPassagens + totalFretesAgencias;
  const despesaTotal = totalDespesas + totalRedondas;
  const saldoRepassado = receitaTotal - despesaTotal;

  return (
    <div className="mt-5 space-y-4">
      <SectionHeader
        eyebrow="Gerente da embarcação"
        title="Prestação de contas da viagem"
        description="Espelha o formulário operacional do gerente: receitas à bordo, cozinha, lanchonete, internet, agências (com comissão/saldo), despesas, redondas e fechamento com saldo repassado. Cruza automaticamente com o contas a receber e sinaliza divergência declarado × sistema ao financeiro."
        actions={<GhostButton icon={FileText}>Emitir PDF</GhostButton>}
      />

      <div className="flex flex-wrap gap-2">
        {PRESTACOES_CONTAS.map((p) => {
          const v = VIAGENS.find((x) => x.id === p.viagemId);
          const active = p.id === sel;
          return (
            <button
              key={p.id}
              onClick={() => setSel(p.id)}
              className={`flex flex-col items-start rounded-lg px-4 py-2.5 text-left ring-1 transition-colors ${
                active
                  ? "bg-[color:color-mix(in_oklab,var(--brand)_12%,transparent)] ring-[color:var(--hairline-brand)]"
                  : "bg-[color:var(--muted)] ring-[color:var(--hairline)] hover:bg-[color:var(--accent)]"
              }`}
            >
              <span className="font-mono text-xs">{v?.codigo}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{p.gerente}</span>
            </button>
          );
        })}
      </div>

      {/* Cabeçalho do formulário real */}
      <div className="surface-card grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <CabecalhoCampo label="Embarcação" value={embarcacao?.nome ?? "—"} />
        <CabecalhoCampo label="Nº da viagem" value={viagem?.codigo ?? "—"} mono />
        <CabecalhoCampo label="Período da viagem" value={viagem ? `${viagem.saida} → ${viagem.retorno}` : "—"} />
        <CabecalhoCampo label="Caixa inicial declarado" value={brl(2_000)} mono />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Receitas à bordo (Espécie / PIX / Total) */}
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
            <Boxes className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Receitas à bordo</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-semibold">Espécie / item</th>
                <th className="px-5 py-2.5 text-right font-semibold">Espécie</th>
                <th className="px-5 py-2.5 text-right font-semibold">PIX</th>
                <th className="px-5 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {receitasBordo.map((r) => (
                <tr key={r.rotulo} className="border-b border-[color:var(--hairline)] last:border-0">
                  <td className="px-5 py-3 text-foreground/90">{r.rotulo}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(r.especie)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(r.pix)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--brand)]">{brl(r.especie + r.pix)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--surface-tint)] font-medium">
                <td className="px-5 py-3.5">Total</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalReceitaBordoEspecie)}</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalReceitaBordoPix)}</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm text-[color:var(--brand)]">{brl(totalReceitaBordoEspecie + totalReceitaBordoPix)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Resumo + divergência */}
        <div className="space-y-4">
          {temDivergencia ? (
            <div className="surface-card brand-rail brand-rail-left flex items-start gap-3 p-5" style={{ background: "color-mix(in oklab, var(--danger) 8%, var(--card))" }}>
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--danger)]" />
              <div>
                <p className="font-display text-base text-[color:var(--danger)]">Divergência de {brl(Math.abs(divergencia))}</p>
                <p className="mt-1 text-xs text-muted-foreground">Declarado pelo gerente difere do apurado pelo sistema. Sinalizado ao financeiro para conferência antes do fechamento.</p>
              </div>
            </div>
          ) : (
            <div className="surface-card p-5">
              <p className="font-display text-base text-[color:var(--success)]">Sem divergência</p>
              <p className="mt-1 text-xs text-muted-foreground">Declarado bate com o sistema. Pronto para conferência do financeiro.</p>
            </div>
          )}

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Resumo da viagem</h3>
              <StatusChip tone={STATUS_TONE[pc.status]} pulse={pc.status === "enviada"}>{STATUS_LABEL[pc.status]}</StatusChip>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ResumoItem icon={Users} label="Passageiros" value={pc.passageiros} />
              <ResumoItem icon={Package} label="Encomendas" value={pc.encomendas} />
              <ResumoItem icon={Boxes} label="Cargas" value={pc.cargas} />
              <ResumoItem icon={Car} label="Veículos" value={pc.veiculos} />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-[color:var(--hairline)] pt-3 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> {pc.anexos} anexo(s) · atualizado {pc.atualizadoEm}
            </div>
          </div>
        </div>
      </div>

      {/* Cozinha por dia + Lanchonete/Internet */}
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
            <Utensils className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Cozinha por dia</h3>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">PDV F&B completo = fase posterior</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 text-left">Dia</th>
                <th className="px-5 py-2.5 text-right">Café</th>
                <th className="px-5 py-2.5 text-right">Almoço</th>
                <th className="px-5 py-2.5 text-right">Jantar</th>
                <th className="px-5 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cozinhaDias.map((d) => (
                <tr key={d.dia} className="border-b border-[color:var(--hairline)] last:border-0">
                  <td className="px-5 py-3 font-medium">{d.dia}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(d.cafe)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(d.almoco)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(d.jantar)}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--brand)]">{brl(d.cafe + d.almoco + d.jantar)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--surface-tint)] font-medium">
                <td className="px-5 py-3.5" colSpan={4}>Total cozinha</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm text-[color:var(--brand)]">{brl(totalCozinha)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">Lanchonete</h3>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <ResumoLinha label="Espécie" value={brl(lanchonete.especie)} />
              <ResumoLinha label="PIX" value={brl(lanchonete.pix)} />
              <ResumoLinha label="Total" value={brl(totalLanchonete)} strong />
            </div>
          </div>
          <div className="surface-card p-5">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-[color:var(--brand)]" />
              <h3 className="font-display text-lg">Internet a bordo</h3>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <ResumoLinha label="Espécie" value={brl(internet.especie)} />
              <ResumoLinha label="PIX" value={brl(internet.pix)} />
              <ResumoLinha label="Total" value={brl(totalInternet)} strong />
            </div>
          </div>
        </div>
      </div>

      {/* Passagens por agência */}
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
          <Building2 className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Passagens — agências</h3>
          <p className="ml-auto text-xs text-muted-foreground">Comissão da agência abatida do saldo a repassar.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-2.5 text-left">Cidade / agência</th>
              <th className="px-5 py-2.5 text-right">Espécie</th>
              <th className="px-5 py-2.5 text-right">PIX / conta</th>
              <th className="px-5 py-2.5 text-right">Total geral</th>
              <th className="px-5 py-2.5 text-right">Comissão</th>
              <th className="px-5 py-2.5 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {passagensAgencias.map((a) => (
              <tr key={a.cidade} className="border-b border-[color:var(--hairline)] last:border-0">
                <td className="px-5 py-3 font-medium">{a.cidade}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.especie)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.pixConta)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.total)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs text-muted-foreground">−{brl(a.comissao)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--brand)]">{brl(a.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[color:var(--surface-tint)] font-medium">
              <td className="px-5 py-3.5">Total</td>
              <td className="px-5 py-3.5" colSpan={2} />
              <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalPassagensAgencias)}</td>
              <td className="px-5 py-3.5" />
              <td className="px-5 py-3.5 text-right font-mono text-sm text-[color:var(--brand)]">{brl(totalSaldoPassagens)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Fretes por agência */}
      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
          <Truck className="h-4 w-4 text-[color:var(--brand)]" />
          <h3 className="font-display text-lg">Fretes — agências</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-2.5 text-left">Cidade / agência</th>
              <th className="px-5 py-2.5 text-right">Espécie</th>
              <th className="px-5 py-2.5 text-right">PIX / conta</th>
              <th className="px-5 py-2.5 text-right">Total</th>
              <th className="px-5 py-2.5 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {fretesAgencias.map((a) => (
              <tr key={a.cidade} className="border-b border-[color:var(--hairline)] last:border-0">
                <td className="px-5 py-3 font-medium">{a.cidade}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.especie)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.pixConta)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs">{brl(a.total)}</td>
                <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--brand)]">{brl(a.saldo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[color:var(--surface-tint)] font-medium">
              <td className="px-5 py-3.5" colSpan={3}>Total fretes agências</td>
              <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalFretesAgencias)}</td>
              <td className="px-5 py-3.5 text-right font-mono text-sm text-[color:var(--brand)]">{brl(totalFretesAgencias)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Despesas + Redondas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
            <Receipt className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Despesas</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 text-left">Descrição</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((d) => (
                <tr key={d.descricao} className="border-b border-[color:var(--hairline)] last:border-0">
                  <td className="px-5 py-3 text-foreground/90">{d.descricao}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(d.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--surface-tint)] font-medium">
                <td className="px-5 py-3.5">Total despesas</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalDespesas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] px-5 py-4">
            <HandCoins className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="font-display text-lg">Redondas e gratificações</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-5 py-2.5 text-left">Nome</th>
                <th className="px-5 py-2.5 text-left">Função</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {redondas.map((r) => (
                <tr key={r.nome} className="border-b border-[color:var(--hairline)] last:border-0">
                  <td className="px-5 py-3 font-medium">{r.nome}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.funcao}</td>
                  <td className="px-5 py-3 text-right font-mono text-xs">{brl(r.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[color:var(--surface-tint)] font-medium">
                <td className="px-5 py-3.5" colSpan={2}>Total redondas</td>
                <td className="px-5 py-3.5 text-right font-mono text-sm">{brl(totalRedondas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Fechamento + assinatura */}
      <div className="surface-card overflow-hidden">
        <div className="border-b border-[color:var(--hairline)] px-5 py-4">
          <h3 className="font-display text-lg">Fechamento</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Receita total, despesa total e saldo a repassar — quebrados em espécie e PIX.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-2.5 text-left">Resumo</th>
              <th className="px-5 py-2.5 text-right">Espécie</th>
              <th className="px-5 py-2.5 text-right">PIX</th>
              <th className="px-5 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[color:var(--hairline)]">
              <td className="px-5 py-3 font-medium">Receita total</td>
              <td className="px-5 py-3 text-right font-mono text-xs">{brl(especieFechamento)}</td>
              <td className="px-5 py-3 text-right font-mono text-xs">{brl(pixFechamento)}</td>
              <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--success)]">{brl(receitaTotal)}</td>
            </tr>
            <tr className="border-b border-[color:var(--hairline)]">
              <td className="px-5 py-3 font-medium">Despesa total</td>
              <td className="px-5 py-3 text-right font-mono text-xs" colSpan={2}>—</td>
              <td className="px-5 py-3 text-right font-mono text-xs text-[color:var(--danger)]">−{brl(despesaTotal)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-[color:var(--surface-tint)] font-medium">
              <td className="px-5 py-3.5">Saldo repassado</td>
              <td className="px-5 py-3.5" colSpan={2} />
              <td className="px-5 py-3.5 text-right font-mono text-base text-[color:var(--brand)]">{brl(saldoRepassado)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="grid gap-4 border-t border-[color:var(--hairline)] px-5 py-5 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <PenLine className="mb-1 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Local e data</p>
              <div className="mt-2 h-px bg-[color:var(--hairline)]" />
              <p className="mt-1 text-xs text-muted-foreground">Santarém-PA, {pc.atualizadoEm}</p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <PenLine className="mb-1 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsável (gerente)</p>
              <div className="mt-2 h-px bg-[color:var(--hairline)]" />
              <p className="mt-1 text-xs text-muted-foreground">{pc.gerente}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CabecalhoCampo({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ResumoLinha({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md px-3 py-2 ring-1 ring-[color:var(--hairline)] ${strong ? "bg-[color:var(--surface-tint)]" : "bg-[color:var(--muted)]"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${strong ? "text-[color:var(--brand)]" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function ResumoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[color:var(--muted)] p-3 ring-1 ring-[color:var(--hairline)]">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <p className="big-numeric mt-1 text-xl text-foreground">{value}</p>
    </div>
  );
}
