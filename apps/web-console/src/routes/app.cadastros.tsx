import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, TrendingUp, Percent, ArrowDownUp, Check, X } from "lucide-react";
import { AppShell } from "@/components/ops/AppShell";
import {
  SectionHeader, DataTable, FilterBar, FilterChip, PrimaryButton, GhostButton,
  StatusChip, brl,
} from "@/components/ops/primitives";
import {
  createPerfilCadastro,
  createColaborador,
  createFornecedor,
  createUsuarioCadastro,
  listCidades,
  listColaboradores,
  listFornecedores,
  listPerfisCadastro,
  listPrecos,
  listPrecosPassagemMatriz,
  listUsuariosCadastro,
  reajustarTabelaPrecos,
  updatePerfilCadastro,
  updateUsuarioCadastro,
  type CidadeApi,
  type ColaboradorApi,
  type FornecedorApi,
  type PerfilCadastroApi,
  type PrecoItemApi,
  type PrecoPassagemMatrizApi,
  type UsuarioCadastroApi,
} from "@/lib/ajc-api";

export const Route = createFileRoute("/app/cadastros")({
  head: () => ({ meta: [{ title: "Cadastros · AJC Suite" }] }),
  component: Cadastros,
});

type Tab = "usuarios" | "perfis" | "precos_passagem" | "precos_carga" | "fornecedores" | "colaboradores";

function Cadastros() {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [reajuste, setReajuste] = useState(0);
  const [preview, setPreview] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioCadastroApi[]>([]);
  const [perfis, setPerfis] = useState<PerfilCadastroApi[]>([]);
  const [cidades, setCidades] = useState<CidadeApi[]>([]);
  const [precosPassagem, setPrecosPassagem] = useState<PrecoPassagemMatrizApi[]>([]);
  const [precosCarga, setPrecosCarga] = useState<PrecoItemApi[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorApi[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorApi[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [reajustando, setReajustando] = useState(false);
  const [showFornecedorForm, setShowFornecedorForm] = useState(false);
  const [showColaboradorForm, setShowColaboradorForm] = useState(false);
  const [showUsuarioForm, setShowUsuarioForm] = useState(false);
  const [showPerfilForm, setShowPerfilForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [usuarioEditandoId, setUsuarioEditandoId] = useState<string | null>(null);
  const [perfilEditandoId, setPerfilEditandoId] = useState<string | null>(null);
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", login: "", email: "", perfilId: "", password: "", ativo: true });
  const [novoPerfil, setNovoPerfil] = useState({ nome: "", descricao: "", ativo: true, permissions: [] as string[] });
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: "", cnpj: "", categoria: "", contato: "" });
  const [novoColaborador, setNovoColaborador] = useState({ nome: "", funcao: "", cidadeSigla: "BEL", whatsapp: "" });

  const fator = 1 + (preview ? reajuste : 0) / 100;
  const cidadesOpcoes = cidades.map((c) => ({ sigla: c.sigla, nome: c.nome }));
  const permissoesReais = useMemo(() => {
    const values = new Set<string>();
    perfis.forEach((p) => p.permissions.forEach((perm) => values.add(perm)));
    return [...values].sort();
  }, [perfis]);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [usuariosApi, perfisApi, cidadesApi, passagemApi, cargaApi, fornecedoresApi, colaboradoresApi] = await Promise.all([
          listUsuariosCadastro(),
          listPerfisCadastro(),
          listCidades(),
          listPrecosPassagemMatriz(),
          listPrecos({ tipo: "carga" }),
          listFornecedores(),
          listColaboradores(),
        ]);
        if (!alive) return;
        setUsuarios(usuariosApi);
        setPerfis(perfisApi);
        setCidades(cidadesApi);
        setPrecosPassagem(passagemApi);
        setPrecosCarga(cargaApi);
        setFornecedores(fornecedoresApi);
        setColaboradores(colaboradoresApi);
      } catch (error) {
        console.error(error);
        setErro(error instanceof Error ? error.message : "Falha ao carregar cadastros");
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  async function salvarFornecedor() {
    if (!novoFornecedor.nome.trim()) {
      setErro("Informe o nome do fornecedor.");
      return;
    }
    setSalvando(true);
    try {
      const created = await createFornecedor({
        nome: novoFornecedor.nome,
        cnpj: novoFornecedor.cnpj || null,
        categoria: novoFornecedor.categoria || null,
        contatos: novoFornecedor.contato ? [{ tipo: "whatsapp", valor: novoFornecedor.contato }] : [],
      });
      setFornecedores((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setNovoFornecedor({ nome: "", cnpj: "", categoria: "", contato: "" });
      setShowFornecedorForm(false);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar fornecedor");
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovoUsuario() {
    setUsuarioEditandoId(null);
    setNovoUsuario({ nome: "", login: "", email: "", perfilId: perfis[0]?.id ?? "", password: "", ativo: true });
    setShowUsuarioForm(true);
  }

  function editarUsuario(usuario: UsuarioCadastroApi) {
    setUsuarioEditandoId(usuario.id);
    setNovoUsuario({
      nome: usuario.nome,
      login: usuario.login,
      email: usuario.email ?? "",
      perfilId: usuario.perfilId,
      password: "",
      ativo: usuario.ativo,
    });
    setShowUsuarioForm(true);
  }

  async function salvarUsuario() {
    if (!novoUsuario.nome.trim() || !novoUsuario.login.trim() || !novoUsuario.perfilId) {
      setErro("Informe nome, login e perfil do usuario.");
      return;
    }
    if (!usuarioEditandoId && novoUsuario.password.length < 6) {
      setErro("Informe uma senha inicial com ao menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: novoUsuario.nome,
        login: novoUsuario.login,
        email: novoUsuario.email || null,
        perfilId: novoUsuario.perfilId,
        ativo: novoUsuario.ativo,
        ...(novoUsuario.password ? { password: novoUsuario.password } : {}),
      };
      const saved = usuarioEditandoId
        ? await updateUsuarioCadastro(usuarioEditandoId, payload)
        : await createUsuarioCadastro(payload);
      setUsuarios((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setShowUsuarioForm(false);
      setUsuarioEditandoId(null);
      setNovoUsuario({ nome: "", login: "", email: "", perfilId: perfis[0]?.id ?? "", password: "", ativo: true });
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar usuario");
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovoPerfil() {
    setPerfilEditandoId(null);
    setNovoPerfil({ nome: "", descricao: "", ativo: true, permissions: [] });
    setShowPerfilForm(true);
  }

  function abrirNovoCadastroGeral() {
    if (tab === "usuarios") {
      abrirNovoUsuario();
      return;
    }
    if (tab === "perfis") {
      abrirNovoPerfil();
      return;
    }
    if (tab === "fornecedores") {
      setShowFornecedorForm(true);
      return;
    }
    if (tab === "colaboradores") {
      setShowColaboradorForm(true);
      return;
    }
    setTab("usuarios");
    abrirNovoUsuario();
  }

  function editarPerfil(perfil: PerfilCadastroApi) {
    setPerfilEditandoId(perfil.id);
    setNovoPerfil({
      nome: perfil.nome,
      descricao: perfil.descricao ?? "",
      ativo: perfil.ativo,
      permissions: perfil.permissions,
    });
    setShowPerfilForm(true);
  }

  async function salvarPerfil() {
    if (!novoPerfil.nome.trim()) {
      setErro("Informe o nome do perfil.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: novoPerfil.nome,
        descricao: novoPerfil.descricao || null,
        ativo: novoPerfil.ativo,
        permissions: novoPerfil.permissions,
      };
      const saved = perfilEditandoId
        ? await updatePerfilCadastro(perfilEditandoId, payload)
        : await createPerfilCadastro(payload);
      setPerfis((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => a.nome.localeCompare(b.nome)));
      setShowPerfilForm(false);
      setPerfilEditandoId(null);
      setNovoPerfil({ nome: "", descricao: "", ativo: true, permissions: [] });
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar perfil");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarColaborador() {
    if (!novoColaborador.nome.trim()) {
      setErro("Informe o nome do colaborador.");
      return;
    }
    setSalvando(true);
    try {
      const created = await createColaborador({
        nome: novoColaborador.nome,
        funcao: novoColaborador.funcao || null,
        cidadeSigla: novoColaborador.cidadeSigla || null,
        contatoWhatsapp: novoColaborador.whatsapp || null,
      });
      setColaboradores((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setNovoColaborador({ nome: "", funcao: "", cidadeSigla: "BEL", whatsapp: "" });
      setShowColaboradorForm(false);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar colaborador");
    } finally {
      setSalvando(false);
    }
  }

  async function aplicarReajustePassagem() {
    if (!Number.isFinite(reajuste) || reajuste === 0) {
      setErro("Informe um percentual de reajuste diferente de zero.");
      return;
    }
    setReajustando(true);
    try {
      const response = await reajustarTabelaPrecos("passagem", {
        percentual: reajuste,
        motivo: `Reajuste aplicado em Cadastros (${reajuste > 0 ? "+" : ""}${reajuste}%)`,
      });
      setPrecosPassagem(response.matriz ?? await listPrecosPassagemMatriz());
      setPreview(false);
      setReajuste(0);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao aplicar reajuste de passagem");
    } finally {
      setReajustando(false);
    }
  }

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
        actions={<PrimaryButton icon={Plus} onClick={abrirNovoCadastroGeral}>Novo cadastro</PrimaryButton>}
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
      {erro && <p className="mt-3 text-xs text-[color:var(--danger)]">{erro}</p>}

      {tab === "usuarios" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar usuário…" right={<PrimaryButton icon={Plus} onClick={abrirNovoUsuario}>Novo usuario</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Ativos</FilterChip>
            <FilterChip>Inativos</FilterChip>
          </FilterBar>
          {showUsuarioForm && (
            <div className="surface-card grid gap-3 p-4 md:grid-cols-6">
              <input value={novoUsuario.nome} onChange={(e) => setNovoUsuario((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome" className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)] md:col-span-2" />
              <input value={novoUsuario.login} onChange={(e) => setNovoUsuario((v) => ({ ...v, login: e.target.value }))} placeholder="Login" className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
              <input value={novoUsuario.email} onChange={(e) => setNovoUsuario((v) => ({ ...v, email: e.target.value }))} placeholder="E-mail" className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
              <select value={novoUsuario.perfilId} onChange={(e) => setNovoUsuario((v) => ({ ...v, perfilId: e.target.value }))} className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]">
                <option value="">Perfil</option>
                {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <input type="password" value={novoUsuario.password} onChange={(e) => setNovoUsuario((v) => ({ ...v, password: e.target.value }))} placeholder={usuarioEditandoId ? "Nova senha opcional" : "Senha inicial"} className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
              <label className="inline-flex h-10 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={novoUsuario.ativo} onChange={(e) => setNovoUsuario((v) => ({ ...v, ativo: e.target.checked }))} />Ativo</label>
              <div className="flex gap-2 md:col-span-5">
                <PrimaryButton icon={Check} disabled={salvando} onClick={salvarUsuario}>{salvando ? "Salvando..." : usuarioEditandoId ? "Salvar usuario" : "Criar usuario"}</PrimaryButton>
                <GhostButton icon={X} onClick={() => setShowUsuarioForm(false)}>Cancelar</GhostButton>
              </div>
            </div>
          )}
          <DataTable
            rows={usuarios.map((u) => ({
              id: u.id,
              nome: u.nome,
              login: u.login,
              perfil: u.perfilNome,
              cidade: "-",
              ativo: u.ativo,
            }))}
            columns={[
              { key: "nome", header: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
              { key: "login", header: "Login", render: (r) => <span className="font-mono text-xs">{r.login}</span> },
              { key: "perfil", header: "Perfil" },
              { key: "cidade", header: "Cidade", render: (r) => r.cidade ?? "—" },
              { key: "ativo", header: "Status", render: (r) => (
                <StatusChip tone={r.ativo ? "success" : "offline"}>{r.ativo ? "Ativo" : "Inativo"}</StatusChip>
              ) },
            ]}
            onRowClick={(row) => {
              const usuario = usuarios.find((u) => u.id === row.id);
              if (usuario) editarUsuario(usuario);
            }}
          />
        </div>
      )}

      {tab === "perfis" && (
        <div className="mt-5 space-y-4">
          <div className="flex justify-end"><PrimaryButton icon={Plus} onClick={abrirNovoPerfil}>Novo perfil</PrimaryButton></div>
          {showPerfilForm && (
            <div className="surface-card space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                <input value={novoPerfil.nome} onChange={(e) => setNovoPerfil((v) => ({ ...v, nome: e.target.value }))} placeholder="Nome do perfil" className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
                <input value={novoPerfil.descricao} onChange={(e) => setNovoPerfil((v) => ({ ...v, descricao: e.target.value }))} placeholder="Descricao" className="h-10 rounded-lg bg-[color:var(--muted)] px-3 text-sm ring-1 ring-[color:var(--hairline)]" />
                <label className="inline-flex h-10 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={novoPerfil.ativo} onChange={(e) => setNovoPerfil((v) => ({ ...v, ativo: e.target.checked }))} />Ativo</label>
              </div>
              <div className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2 xl:grid-cols-4">
                {permissoesReais.map((perm) => {
                  const checked = novoPerfil.permissions.includes(perm);
                  return (
                    <label key={perm} className="flex items-center gap-2 rounded-md bg-[color:var(--muted)] px-3 py-2 font-mono text-[11px] ring-1 ring-[color:var(--hairline)]">
                      <input type="checkbox" checked={checked} onChange={(e) => setNovoPerfil((v) => ({ ...v, permissions: e.target.checked ? [...v.permissions, perm] : v.permissions.filter((p) => p !== perm) }))} />
                      {perm}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <PrimaryButton icon={Check} disabled={salvando} onClick={salvarPerfil}>{salvando ? "Salvando..." : perfilEditandoId ? "Salvar perfil" : "Criar perfil"}</PrimaryButton>
                <GhostButton icon={X} onClick={() => setShowPerfilForm(false)}>Cancelar</GhostButton>
              </div>
            </div>
          )}
          <div className="surface-card overflow-hidden">
            <header className="border-b border-[color:var(--hairline)] px-5 py-4">
              <h3 className="font-display text-lg">Matriz de permissoes</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Cada perfil possui permissoes por modulo.acao. Clique no nome do perfil para editar.</p>
            </header>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--muted)]">
                  <tr>
                    <th className="sticky left-0 z-10 bg-[color:var(--muted)] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Permissao</th>
                    {perfis.map((p) => (
                      <th key={p.id} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><button onClick={() => editarPerfil(p)} className="hover:text-foreground">{p.nome}</button></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissoesReais.map((perm) => (
                    <tr key={perm} className="border-t border-[color:var(--hairline)]">
                      <td className="sticky left-0 z-10 bg-[color:var(--card)] px-4 py-3 font-mono text-xs">{perm}</td>
                      {perfis.map((perfil) => {
                        const has = perfil.permissions.includes(perm);
                        return (
                          <td key={perfil.id} className="px-3 py-3 text-center">
                            {has ? <Check className="mx-auto h-4 w-4 text-[color:var(--success)]" strokeWidth={2.4} /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" strokeWidth={1.8} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {tab === "precos_passagem" && (
        <div className="mt-5 space-y-4">
          <div className="surface-card flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">Cobrança intertrecho</span>
            <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
              {cidadesOpcoes.map((c) => <option key={c.sigla}>Saindo de {c.nome}</option>)}
            </select>
            <select className="h-9 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)]">
              {cidadesOpcoes.map((c) => <option key={c.sigla}>Indo para {c.nome}</option>)}
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
              <PrimaryButton icon={TrendingUp} disabled={reajustando || reajuste === 0} onClick={aplicarReajustePassagem}>
                {reajustando ? "Aplicando..." : "Aplicar reajuste"}
              </PrimaryButton>
            </div>
          </div>
          {preview && reajuste !== 0 && (
            <div className="rounded-md bg-[color:color-mix(in_oklab,var(--brand)_10%,transparent)] px-4 py-2.5 text-xs text-[color:var(--brand)] ring-1 ring-[color:var(--hairline-brand)]">
              Pré-visualização ativa · valores exibidos com {reajuste > 0 ? "+" : ""}{reajuste}%. Confirme em "Aplicar reajuste" para gravar a nova versão.
            </div>
          )}
          <DataTable
            rows={precosPassagem.map((p, i) => ({
                  id: p.trecho + i,
                  trecho: p.trecho,
                  rede: p.classes.rede ?? 0,
                  vip: p.classes.rede_sala_vip ?? p.classes["rede_sala_vip:inteira"] ?? 0,
                  camaroteRoyal: p.classes.suite_master ?? p.classes["suite_master:2_pessoas"] ?? p.classes.camarote ?? 0,
                }))}
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
            rows={precosCarga.map((p, i) => ({
                  id: p.id,
                  idx: i,
                  tier: p.classe ?? `T${i + 1}`,
                  descricao: [p.origemSigla, p.destinoSigla].filter(Boolean).join(" -> ") || p.subtipo || "Tabela de carga",
                  percentual: p.percentual ?? 0,
                }))}
            columns={[
              { key: "tier", header: "Tier", render: (r) => <span className="font-mono font-semibold">{r.tier}</span> },
              { key: "descricao", header: "Descrição" },
              { key: "cliente", header: "Cliente vinculado", render: (r) => <span className="text-xs text-muted-foreground">{r.idx % 2 === 0 ? "Tabela geral" : "Ferragens Amazônia"}</span> },
              { key: "destino", header: "Destino", render: (r) => <span className="font-mono text-xs">{cidadesOpcoes[(r.idx + 2) % cidadesOpcoes.length]?.sigla ?? "-"}</span> },
              { key: "percentual", header: "% sobre declarado", align: "right", render: (r) => <span className="font-mono font-semibold">{r.percentual.toFixed(1)}%</span> },
            ]}
          />
        </div>
      )}

      {tab === "fornecedores" && (
        <div className="mt-5 space-y-4">
          <FilterBar searchPlaceholder="Buscar fornecedor, CNPJ…" right={<PrimaryButton icon={Plus} onClick={() => setShowFornecedorForm((value) => !value)}>Novo fornecedor</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Ativos</FilterChip>
            <FilterChip>Inativos</FilterChip>
          </FilterBar>
          {showFornecedorForm && (
            <div className="surface-card grid gap-3 p-4 md:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_auto]">
              <input
                value={novoFornecedor.nome}
                onChange={(event) => setNovoFornecedor((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Nome do fornecedor"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <input
                value={novoFornecedor.cnpj}
                onChange={(event) => setNovoFornecedor((current) => ({ ...current, cnpj: event.target.value }))}
                placeholder="CNPJ"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <input
                value={novoFornecedor.categoria}
                onChange={(event) => setNovoFornecedor((current) => ({ ...current, categoria: event.target.value }))}
                placeholder="Categoria"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <input
                value={novoFornecedor.contato}
                onChange={(event) => setNovoFornecedor((current) => ({ ...current, contato: event.target.value }))}
                placeholder="WhatsApp/contato"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <PrimaryButton icon={Plus} disabled={salvando} onClick={salvarFornecedor}>Salvar</PrimaryButton>
            </div>
          )}
          <DataTable
            rows={fornecedores.map((f) => ({
                  id: f.id,
                  nome: f.nome,
                  cnpj: f.cnpj ?? "-",
                  categoria: f.categoria ?? "-",
                  contato: Array.isArray(f.contatos) && f.contatos[0] && typeof f.contatos[0] === "object" && "valor" in f.contatos[0]
                    ? String((f.contatos[0] as { valor?: unknown }).valor ?? "-")
                    : "-",
                  ativo: f.ativo,
                }))}
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
          <FilterBar searchPlaceholder="Buscar colaborador, função…" right={<PrimaryButton icon={Plus} onClick={() => setShowColaboradorForm((value) => !value)}>Novo colaborador</PrimaryButton>}>
            <FilterChip active>Todos</FilterChip>
            <FilterChip>Tripulação</FilterChip>
            <FilterChip>Atendimento</FilterChip>
          </FilterBar>
          {showColaboradorForm && (
            <div className="surface-card grid gap-3 p-4 md:grid-cols-[1.2fr_0.9fr_0.8fr_1fr_auto]">
              <input
                value={novoColaborador.nome}
                onChange={(event) => setNovoColaborador((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Nome do colaborador"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <input
                value={novoColaborador.funcao}
                onChange={(event) => setNovoColaborador((current) => ({ ...current, funcao: event.target.value }))}
                placeholder="Função"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <select
                value={novoColaborador.cidadeSigla}
                onChange={(event) => setNovoColaborador((current) => ({ ...current, cidadeSigla: event.target.value }))}
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              >
                {cidadesOpcoes.map((cidade) => <option key={cidade.sigla} value={cidade.sigla}>{cidade.sigla}</option>)}
              </select>
              <input
                value={novoColaborador.whatsapp}
                onChange={(event) => setNovoColaborador((current) => ({ ...current, whatsapp: event.target.value }))}
                placeholder="WhatsApp"
                className="h-10 rounded-md bg-[color:var(--muted)] px-3 text-sm text-foreground ring-1 ring-[color:var(--hairline)] focus:outline-none focus:ring-[color:var(--ring)]"
              />
              <PrimaryButton icon={Plus} disabled={salvando} onClick={salvarColaborador}>Salvar</PrimaryButton>
            </div>
          )}
          <DataTable
            rows={colaboradores.map((c, i) => ({
                  id: c.id,
                  idx: i,
                  nome: c.nome,
                  funcao: c.funcao ?? "-",
                  cidade: c.cidadeSigla ?? "-",
                  whatsapp: c.contatoWhatsapp ?? "-",
                }))}
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


