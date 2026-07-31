#!/usr/bin/env node

/**
 * Carga visual idempotente para validar o cadastro de embarcacoes.
 *
 * Este script usa exclusivamente a API publica do painel: autentica, lista as
 * embarcacoes e executa os mesmos POST/PATCH disparados pelo formulario web.
 * Nenhum registro e inserido diretamente no banco.
 *
 * Uso:
 *   AJC_API_URL=https://api.exemplo.com/api \
 *   SEED_ADMIN_LOGIN=admin \
 *   SEED_ADMIN_PASSWORD='senha' \
 *   npm run seed:navegacao-validacao --workspace apps/api
 */

const apiUrl = (process.env.AJC_API_URL ?? "http://127.0.0.1:3000/api").replace(
  /\/$/,
  "",
);
const login = process.env.SEED_ADMIN_LOGIN;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!login || !password) {
  console.error(
    "Defina SEED_ADMIN_LOGIN e SEED_ADMIN_PASSWORD. O script nao possui senha padrao.",
  );
  process.exit(1);
}

const boats = [
  {
    nome: "[VALIDAÇÃO] F/B Marajó",
    tipo: "passeio_carga",
    status: "ativa",
    capacidadeCarga: 65,
    capacidadePax: capacity({
      rede: 120,
      rede_sala_vip: 36,
      suite_comum: 12,
      suite_master: 6,
      suite_master_vip: 4,
      mega_suite: 2,
    }),
  },
  {
    nome: "[VALIDAÇÃO] Expresso Tapajós",
    tipo: "passeio_carga",
    status: "manutencao",
    capacidadeCarga: 28,
    capacidadePax: capacity({
      rede: 84,
      camarote: 10,
      suite_comum: 8,
      suite_master: 4,
    }),
  },
  {
    nome: "[VALIDAÇÃO] Balsa Cargueira",
    tipo: "carga",
    status: "alugada",
    capacidadeCarga: 120,
    capacidadePax: capacity({}),
  },
];

const session = await request("/auth/login", {
  method: "POST",
  body: { login, password, dispositivo: "seed-navegacao-validacao" },
});
const token = session.accessToken;
const currentBoats = await request("/cadastros/embarcacoes", { token });

for (const boat of boats) {
  const current = currentBoats.find(
    (item) =>
      item.nome.toLocaleLowerCase("pt-BR") ===
      boat.nome.toLocaleLowerCase("pt-BR"),
  );
  if (current) {
    await request(`/cadastros/embarcacoes/${current.id}`, {
      method: "PATCH",
      token,
      body: boat,
    });
    console.log(`atualizada: ${boat.nome}`);
  } else {
    await request("/cadastros/embarcacoes", {
      method: "POST",
      token,
      body: boat,
    });
    console.log(`criada: ${boat.nome}`);
  }
}

console.log(`${boats.length} embarcacoes de validacao disponiveis no painel.`);

function capacity(entries) {
  const classes = Object.keys(entries);
  return {
    classes,
    capacidadePorClasse: Object.fromEntries(
      Object.entries(entries).map(([key, capacidade]) => [
        key,
        { supported: true, capacidade },
      ]),
    ),
  };
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join("; ")
      : (payload?.message ?? `${response.status} ${response.statusText}`);
    throw new Error(`${method} ${path}: ${message}`);
  }
  return payload;
}
