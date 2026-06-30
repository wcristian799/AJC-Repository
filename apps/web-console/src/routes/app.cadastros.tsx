import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, TrendingUp, Percent, ArrowDownUp, Check, X } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, brl,
} from "@/components/ops/primitives";
import {
  USUARIOS, MATRIZ_PERMISSOES, PERMISSOES, PRECOS_PASSAGEM, PRECOS_CARGA,
  FORNECEDORES, COLABORADORES, CIDADES,
} from "@/mocks/data";

export const Route = createFileRoute("/app/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros · AJC Suite" }] }),
  component: Cadastros,
});

type Tab = "usuarios" | "perfis" | "precos_passagem" | "precos_carga" | "fornecedores" | "colaboradores";

function Cadastros() {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [reajuste, setReajuste] = useState(0);
  const [preview, setPreview] = useState(false);

  const fator = 1 + (preview ? reajuste : 0) / 100;

  const tabs: [Tab, string][] = [
    ["usuarios", "Usuários"],
    ["perfis", "Perfis e permissões"],
    ["precos_passagem", "Preços · Passagem"],
    ["precos_carga", "Preços · Carga"],
    ["fornecedores", "Fornecedores"],
    ["colaboradores", "Colaboradores"],
  ];

  return (
    <AppShell crumb="Cadastros">
      <SectionHeader
        eyebrow="Dados-mestre"
        title="Cadastros e motor de preços"
        description="RBAC, preços com reajuste em massa, fornecedores, agentes e colaboradores."
        actions={<PrimaryButton icon={Plus}>Novo cadastro</PrimaryButton>}
      />

      <div className="mt-6 flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative -mb-px px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-[2px] bg-[color:var(--brand)]" />}
          </button>
        ))}
      </div>

      {tab === "usuarios" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar usuário…" right={<PrimaryButton icon={Plus}>Novo usuário</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Ativos</FilterChip>
            <FilterChip>Inativos</FilterChip>
          </FilterBar>
          <DataTable
            rows={USUARIOS}
            columns={[
              { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "login", header: "Login", render: (r) => <span className="font-mono text-xs">{r.login}</span> },
              { key: "perfil", header: "Perfil" },
              { key: "cidade", header: "Cidade", render: (r) => r.cidade ?? "—" },
              { key: "ativo", header: "Status", render: (r) => (
                <StatusChip tone={r.ativo ? "success" : "offline"}>{r.ativo ? "Ativo" : "Inativo"}</StatusChip>
              ) },
            ]}
          />
        </div>
      )}

      {tab === "perfis" && (
        <div className="mt-5 surface-card overflow-hidden">
          <header className="border-b border-[color:var(--hairline)] px-5 py-4">
            <h3 className="font-display text-lg">Matriz de permissões</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Cada perfil → conjunto de permissões por módulo.ação. Cadastros e telas respeitam a permissão.</p>
          </header>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--muted)]">
                <tr>
                  <th className="sticky left-0 z-10 bg-[color:var(--muted)] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Permissão</th>
                  {Object.keys(MATRIZ_PERMISSOES).map((p) => (
                    <th key={p} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSOES.map((perm) => (
                  <tr key={perm} className="border-t border-[color:var(--hairline)]">
                    <td className="sticky left-0 z-10 bg-[color:var(--card)] px-4 py-3 font-mono text-xs">{perm}</td>
                    {Object.entries(MATRIZ_PERMISSOES).map(([perfil, perms]) => {
                      const has = perms.includes(perm);
                      return (
                        <td key={perfil} className="px-3 py-3 text-center">
                          {has
                            ? <Check className="mx-auto h-4 w-4 text-[color:var(--success)]" strokeWidth={2.4} />
                            : <X className="mx-auto h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "precos_passagem" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">Cobrança intertrecho</span>
            <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
              {CIDADES.map((c) => <option key={c.sigla}>Saindo de {c.nome}</option>)}
            </select>
            <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
              {CIDADES.map((c) => <option key={c.sigla}>Indo para {c.nome}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">Tabela final será repassada pelo Lucas.</span>
          </div>
          <div className="surface-card flex flex-wrap items-center gap-3 p-4">
            <Percent className="h-4 w-4 text-[color:var(--brand)]" />
            <span className="text-sm font-medium">Reajuste em massa</span>
            <span className="text-xs text-muted-foreground">aplica % a todos os trechos desta tabela.</span>
            <div className="ml-auto flex items-center gap-2">
              <input
                type="number"
                value={reajuste}
                onChange={(e) => { setReajuste(Number(e.target.value)); setPreview(false); }}
                className="h-9 w-24 rounded-md bg-[color:var(--muted)] px-3 text-right font-mono text-sm ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <span className="text-sm font-medium">%</span>
              <GhostButton icon={ArrowDownUp} onClick={() => setPreview((p) => !p)}>{preview ? "Ocultar prévia" : "Pré-visualizar"}</GhostButton>
              <PrimaryButton icon={TrendingUp}>Aplicar reajuste</PrimaryButton>
            </div>
          </div>
          {preview && reajuste !== 0 && (
            <div className="rounded-md bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-4 py-2.5 text-xs text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
              Pré-visualização ativa · valores exibidos com {reajuste > 0 ? "+" : ""}{reajuste}%. Confirme em "Aplicar reajuste" para gravar a nova versão.
            </div>
          )}
          <DataTable
            rows={PRECOS_PASSAGEM.map((p, i) => ({ id: String(i), ...p }))}
            columns={[
              { key: "trecho", header: "Trecho", render: (r) => <span className="font-display">{r.trecho}</span> },
              { key: "rede", header: "Rede", align: "right", render: (r) => <span className="font-mono">{brl(r.rede * fator)}</span> },
              { key: "vip", header: "Rede VIP", align: "right", render: (r) => <span className="font-mono">{brl(r.vip * fator)}</span> },
              { key: "camaroteRoyal", header: "Camarote Royal", align: "right", render: (r) => <span className="font-mono">{brl(r.camaroteRoyal * fator)}</span> },
            ]}
          />
        </div>
      )}

      {tab === "precos_carga" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card p-4">
            <p className="text-sm font-medium text-foreground">Variação por cliente e cidade destino</p>
            <p className="mt-1 text-xs text-muted-foreground">Tabela de carga pode ser amarrada a cliente específico e variar por destino/intertrecho.</p>
          </div>
          <DataTable
            rows={PRECOS_CARGA.map((p, i) => ({ id: String(i), idx: i, ...p }))}
            columns={[
              { key: "tier", header: "Tier", render: (r) => <span className="font-mono font-semibold">{r.tier}</span> },
              { key: "descricao", header: "Descrição" },
              { key: "cliente", header: "Cliente vinculado", render: (r) => <span className="text-xs text-muted-foreground">{r.idx % 2 === 0 ? "Tabela geral" : "Ferragens Amazônia"}</span> },
              { key: "destino", header: "Destino", render: (r) => <span className="font-mono text-xs">{CIDADES[(r.idx + 2) % CIDADES.length].sigla}</span> },
              { key: "percentual", header: "% sobre declarado", align: "right", render: (r) => <span className="font-mono font-semibold">{r.percentual.toFixed(1)}%</span> },
            ]}
          />
        </div>
      )}

      {tab === "fornecedores" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar fornecedor, CNPJ…" right={<PrimaryButton icon={Plus}>Novo fornecedor</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Ativos</FilterChip>
            <FilterChip>Inativos</FilterChip>
          </FilterBar>
          <DataTable
            rows={FORNECEDORES}
            columns={[
              { key: "nome", header: "Fornecedor", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cnpj", header: "CNPJ", render: (r) => <span className="font-mono text-xs">{r.cnpj}</span> },
              { key: "categoria", header: "Categoria", render: (r) => <span className="text-xs">{r.categoria}</span> },
              { key: "contato", header: "Contato", render: (r) => <span className="text-xs text-muted-foreground">{r.contato}</span> },
              { key: "ativo", header: "Status", render: (r) => <StatusChip tone={r.ativo ? "success" : "offline"}>{r.ativo ? "Ativo" : "Inativo"}</StatusChip> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">Fornecedores vinculam a contas a pagar e compras (Financeiro).</p>
        </div>
      )}

      {tab === "colaboradores" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar colaborador, função…" right={<PrimaryButton icon={Plus}>Novo colaborador</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Tripulação</FilterChip>
            <FilterChip>Atendimento</FilterChip>
          </FilterBar>
          <DataTable
            rows={COLABORADORES.map((c, i) => ({ ...c, idx: i }))}
            columns={[
              { key: "nome", header: "Colaborador", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "cpf", header: "CPF", render: (r) => <span className="font-mono text-xs text-muted-foreground">{`000.000.00${r.idx}-0${r.idx}`}</span> },
              { key: "funcao", header: "Função", render: (r) => <span className="text-xs">{r.funcao}</span> },
              { key: "cidade", header: "Cidade" },
              { key: "whatsapp", header: "WhatsApp", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.whatsapp}</span> },
            ]}
          />
          <p className="text-center text-[11px] text-muted-foreground">WhatsApp é usado para notificação de escala (Navegação).</p>
        </div>
      )}
    </AppShell>
  );
}
