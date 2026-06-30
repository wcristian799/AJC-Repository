import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Users, MapPin, FileSpreadsheet, X, History, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, KPIStat, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, brl, Tag,
} from "@/components/ops/primitives";
import { CIDADES, CLIENTES, AGENTES, HISTORICO_ENVIOS, COTACOES, type Cliente } from "@/mocks/data";

export const Route = createFileRoute("/app/crm")({
  head: () => ({ meta: [{ title: "CRM · AJC Suite" }] }),
  component: CRM,
});

type Tab = "clientes" | "agentes" | "alocacao" | "cotacoes";

function CRM() {
  const [tab, setTab] = useState<Tab>("clientes");
  const [aberto, setAberto] = useState<Cliente | null>(null);

  const totalCarteira = CLIENTES.reduce((s, c) => s + c.totalMovimentado, 0);
  const tabs: [Tab, string][] = [
    ["clientes", "Base de clientes"],
    ["agentes", "Agentes comerciais"],
    ["alocacao", "Alocação cliente × agente"],
    ["cotacoes", "Cotações"],
  ];

  return (
    <AppShell crumb="CRM">
      <SectionHeader
        eyebrow="Relacionamento"
        title="Clientes, agentes e histórico"
        description="Belém central · 7 cidades · 1 agente por cidade. Cada cliente alocado a exatamente um agente."
        actions={
          <>
            <GhostButton icon={FileSpreadsheet}>Exportar</GhostButton>
            <PrimaryButton icon={Plus}>Novo cliente</PrimaryButton>
          </>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPIStat index={0} label="Clientes ativos" value={String(CLIENTES.length)} hint="PF + PJ" icon={Users} />
        <KPIStat index={1} label="Agentes em campo" value={String(AGENTES.filter((a) => a.ativo).length)} hint="7 cidades atendidas" icon={MapPin} />
        <KPIStat index={2} label="Carteira movimentada" value={brl(totalCarteira)} hint="acumulado dos clientes" delta={{ value: "+9%", positive: true }} />
        <KPIStat index={3} label="Captação do mês (agentes)" value={brl(AGENTES.reduce((s, a) => s + a.volumeMes, 0))} hint="estimativa para comissão" />
      </section>

      <div className="mt-6 flex items-center gap-1 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${
              tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "clientes" && (
        <div className="mt-5 space-y-4">
          <FilterBar
            searchPlaceholder="Buscar por nome, CPF/CNPJ…"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-xs text-foreground ring-1 ring-[color:var(--hairline)]">
                  <option>Cidade/UF · todas</option>
                  {CIDADES.map((c) => <option key={c.sigla}>{c.nome}/PA</option>)}
                  <option>Outro estado</option>
                </select>
                <PrimaryButton icon={Plus}>Novo cliente</PrimaryButton>
              </div>
            }
          >
            <FilterChip active>Todos</FilterChip>
            <FilterChip>PF</FilterChip>
            <FilterChip>PJ</FilterChip>
            {CIDADES.slice(0, 4).map((c) => <FilterChip key={c.sigla}>{c.sigla}</FilterChip>)}
          </FilterBar>
          <div className="surface-card p-4">
            <p className="text-sm font-medium text-foreground">Cadastro rápido · campos aguardando Lucas</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {["Nome/Razão social", "CPF/CNPJ", "Telefone", "Cidade/UF"].map((campo) => (
                <div key={campo} className="rounded-md bg-[color:var(--muted)] px-3 py-2 text-xs text-muted-foreground ring-1 ring-[color:var(--hairline)]">{campo}</div>
              ))}
            </div>
          </div>
          <DataTable
            rows={CLIENTES}
            onRowClick={(r) => setAberto(r)}
            columns={[
              { key: "nome", header: "Cliente", render: (r) => (
                <div>
                  <p className="font-medium">{r.nome}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.documento}</p>
                </div>
              ) },
              { key: "tipo", header: "Tipo", render: (r) => <Tag tone={r.tipo === "PJ" ? "brand" : "neutral"}>{r.tipo}</Tag> },
              { key: "cidade", header: "Cidade" },
              { key: "agente", header: "Agente", render: (r) => AGENTES.find((a) => a.id === r.agenteId)?.nome ?? "—" },
              { key: "ultimoEnvio", header: "Último envio", render: (r) => <span className="font-mono text-xs">{r.ultimoEnvio}</span> },
              { key: "totalMovimentado", header: "Movimentado", align: "right", render: (r) => <span className="font-mono">{brl(r.totalMovimentado)}</span> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">Clique em um cliente para abrir a ficha 360º.</p>
        </div>
      )}

      {tab === "agentes" && (
        <div className="mt-5">
          <DataTable
            rows={AGENTES}
            columns={[
              { key: "nome", header: "Agente", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cidade", header: "Cidade" },
              { key: "comissaoPct", header: "Comissão", align: "right", render: (r) => <span className="font-mono">{r.comissaoPct.toFixed(1)}%</span> },
              { key: "clientes", header: "Clientes", align: "right" },
              { key: "volumeMes", header: "Captação do mês", align: "right", render: (r) => <span className="font-mono">{brl(r.volumeMes)}</span> },
              { key: "ativo", header: "Status", render: (r) => <StatusChip tone={r.ativo ? "success" : "offline"}>{r.ativo ? "Ativo" : "Inativo"}</StatusChip> },
            ]}
          />
        </div>
      )}

      {tab === "alocacao" && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {AGENTES.map((a) => {
            const meus = CLIENTES.filter((c) => c.agenteId === a.id);
            return (
              <div key={a.id} className="surface-card brand-rail brand-rail-left p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{a.cidade}</p>
                <p className="mt-1 font-display text-lg text-foreground">{a.nome}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Clientes</p>
                    <p className="big-numeric mt-1 text-2xl text-foreground">{meus.length || a.clientes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Comissão est.</p>
                    <p className="big-numeric mt-1 text-2xl text-[color:var(--brand)]">{brl(a.volumeMes * a.comissaoPct / 100)}</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Estimativa · fecha no Financeiro</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cotacoes" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar cotação, cliente, trecho…" right={<PrimaryButton icon={Plus}>Nova cotação</PrimaryButton>}>
            <FilterChip active>Todas</FilterChip>
            <FilterChip>Abertas</FilterChip>
            <FilterChip>Convertidas</FilterChip>
            <FilterChip>Expiradas</FilterChip>
          </FilterBar>
          <DataTable
            rows={COTACOES}
            columns={[
              { key: "id", header: "Cotação", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
              { key: "cliente", header: "Cliente", render: (r) => CLIENTES.find((c) => c.id === r.clienteId)?.nome ?? "—" },
              { key: "tipo", header: "Tipo", render: (r) => <Tag tone="brand">{r.tipo}</Tag> },
              { key: "trecho", header: "Trecho", render: (r) => <span className="font-display text-sm">{r.trecho}</span> },
              { key: "valor", header: "Valor estimado", align: "right", render: (r) => <span className="font-mono">{brl(r.valor)}</span> },
              { key: "validade", header: "Validade", render: (r) => <span className="text-xs text-muted-foreground">{r.validade}</span> },
              { key: "status", header: "Status", render: (r) => {
                const tone = r.status === "aberta" ? "info" : r.status === "convertida" ? "success" : "offline";
                return <StatusChip tone={tone as never}>{r.status}</StatusChip>;
              } },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">
            Cotação não compromete vaga. Campos finais da cotação vêm do Lucas; encomenda usa motor de preços (🔶 Lucas), carga/veículo usam tabela pronta.
          </p>
        </div>
      )}

      {/* Ficha 360º — drawer lateral */}
      <ClienteDrawer cliente={aberto} onClose={() => setAberto(null)} />
    </AppShell>
  );
}

function ClienteDrawer({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const agente = cliente ? AGENTES.find((a) => a.id === cliente.agenteId) : null;
  const envios = cliente ? HISTORICO_ENVIOS.filter((h) => h.clienteId === cliente.id) : [];
  const cotacoes = cliente ? COTACOES.filter((c) => c.clienteId === cliente.id) : [];

  return (
    <AnimatePresence>
      {cliente && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="surface-card fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto rounded-none border-l p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="champagne-eyebrow">Ficha 360º</span>
                <h3 className="mt-1 font-display text-2xl text-foreground">{cliente.nome}</h3>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{cliente.documento}</p>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--accent)] hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="surface-deep p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tipo · cidade</p>
                <p className="mt-1 text-sm font-medium text-foreground">{cliente.tipo} · {cliente.cidade}</p>
              </div>
              <div className="surface-deep p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Movimentado</p>
                <p className="mt-1 big-numeric text-lg text-foreground">{brl(cliente.totalMovimentado)}</p>
              </div>
            </div>

            <div className="mt-3 surface-deep flex items-center justify-between p-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Agente alocado</p>
                <p className="mt-1 text-sm font-medium text-foreground">{agente?.nome ?? "—"}</p>
              </div>
              <GhostButton icon={ArrowRight}>Realocar</GhostButton>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <History className="h-4 w-4 text-[color:var(--brand)]" />
              <h4 className="font-display text-base text-foreground">Histórico de envios</h4>
            </div>
            <ul className="mt-3 space-y-2">
              {envios.length === 0 && <li className="text-sm text-muted-foreground">Sem envios registrados.</li>}
              {envios.map((e, i) => (
                <li key={e.id} className={`surface-deep p-3 ${i < 2 ? "brand-rail brand-rail-left" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm text-foreground">{e.trecho}</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.data}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{e.volumes} vol · {e.conteudo}</span>
                    <span className="font-mono text-foreground/85">{brl(e.preco)}</span>
                  </div>
                  {i < 2 && <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--brand)]">Destaque · base de precificação</p>}
                </li>
              ))}
            </ul>

            {cotacoes.length > 0 && (
              <>
                <h4 className="mt-6 font-display text-base text-foreground">Cotações</h4>
                <ul className="mt-3 space-y-2">
                  {cotacoes.map((c) => (
                    <li key={c.id} className="surface-deep flex items-center justify-between p-3">
                      <span className="text-sm text-foreground">{c.tipo} · {c.trecho}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-foreground/85">{brl(c.valor)}</span>
                        <StatusChip tone={c.status === "aberta" ? "info" : c.status === "convertida" ? "success" : "offline"}>{c.status}</StatusChip>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-auto pt-6">
              <PrimaryButton icon={Plus}>Novo envio com base no histórico</PrimaryButton>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
