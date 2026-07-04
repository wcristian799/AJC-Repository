#!/usr/bin/env node
/**
 * Seed runner do AJC.
 *
 * Aplica o seed SQL idempotente e finaliza os pontos que precisam de logica
 * do runtime, como hash PBKDF2 da senha do admin de desenvolvimento.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const requireBase =
  process.env.PG_REQUIRE_BASE ?? join(__dirname, '../../apps/api/package.json');
const require = createRequire(requireBase);
const pg = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL nao definida no ambiente.');
  process.exit(1);
}

const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
const adminLogin = process.env.SEED_ADMIN_LOGIN ?? 'admin';

function hashPassword(password) {
  const iterations = 120_000;
  const salt = randomBytes(16).toString('base64url');
  const digest = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
}

const classesByBoat = {
  'F/B AMAZONAS II': ['rede', 'suite_comum', 'suite_master', 'suite_master_vip', 'mega_suite'],
  'F/B AMAZONAS III': ['rede', 'suite_comum', 'suite_master', 'suite_master_vip', 'mega_suite'],
  'F/B AMAZONAS IV': ['rede', 'suite_comum', 'suite_master', 'suite_master_vip', 'mega_suite'],
  'F/B AMAZONAS V': ['rede', 'rede_sala_vip', 'camarote', 'suite_comum', 'suite_master', 'suite_master_vip', 'mega_suite'],
  'F/B AMAZONAS VI': ['rede', 'suite_comum', 'suite_comum_vip', 'suite_master', 'suite_master_vip', 'mega_suite'],
  'F/B PARU (CARGAS)': [],
};

const classOccupancy = {
  rede: 1,
  rede_sala_vip: 1,
  camarote: 2,
  suite_comum: 2,
  suite_comum_vip: 2,
  suite_master: 2,
  suite_master_vip: 2,
  mega_suite: 2,
};

const routeTemplates = [
  {
    id: 'bel-alm-terca',
    rotulo: 'Belem -> Almeirim',
    origemSigla: 'BEL',
    destinoSigla: 'ALM',
    embarcacaoNome: 'F/B AMAZONAS V',
    saidaTexto: 'Terca-feira 17h/18h (validar)',
    pendencias: ['FAQ diverge entre saida 17h e 18h'],
    paradas: [
      { cidadeSigla: 'BRV', texto: 'quarta-feira 09h' },
      { cidadeSigla: 'GUR', texto: 'quarta-feira 20h' },
      { cidadeSigla: 'PMZ', texto: 'quinta-feira 08h' },
      { cidadeSigla: 'ALM', texto: 'quinta-feira 14h (chegada)' },
    ],
  },
  {
    id: 'bel-stm-quarta',
    rotulo: 'Belem -> Santarem (quarta)',
    origemSigla: 'BEL',
    destinoSigla: 'STM',
    embarcacaoNome: 'F/B AMAZONAS VI',
    saidaTexto: 'Quarta-feira 17h/18h (validar)',
    pendencias: ['FAQ diverge entre saida 17h e 18h', 'chegada em Santarem 10h/inicio da tarde'],
    paradas: [
      { cidadeSigla: 'BRV', texto: 'quinta-feira 09h' },
      { cidadeSigla: 'GUR', texto: 'quinta-feira 20h' },
      { cidadeSigla: 'ALM', texto: 'sexta-feira 09h' },
      { cidadeSigla: 'PRA', texto: 'sexta-feira 17h' },
      { cidadeSigla: 'MTA', texto: 'sexta-feira 23h' },
      { cidadeSigla: 'STM', texto: 'sabado 10h/inicio da tarde' },
    ],
  },
  {
    id: 'bel-stm-sexta',
    rotulo: 'Belem -> Santarem (sexta)',
    origemSigla: 'BEL',
    destinoSigla: 'STM',
    embarcacaoNome: 'F/B AMAZONAS IV',
    saidaTexto: 'Sexta-feira 17h/18h (validar)',
    pendencias: ['FAQ diverge entre saida 17h e 18h', 'chegada em Santarem 19h/inicio da tarde'],
    paradas: [
      { cidadeSigla: 'BRV', texto: 'sabado 09h' },
      { cidadeSigla: 'GUR', texto: 'sabado 20h' },
      { cidadeSigla: 'ALM', texto: 'domingo 09h' },
      { cidadeSigla: 'PRA', texto: 'domingo 17h' },
      { cidadeSigla: 'MTA', texto: 'domingo 23h' },
      { cidadeSigla: 'STM', texto: 'segunda-feira 19h/inicio da tarde' },
    ],
  },
  {
    id: 'stm-bel-sabado',
    rotulo: 'Santarem -> Belem (retorno sabado)',
    origemSigla: 'STM',
    destinoSigla: 'BEL',
    embarcacaoNome: 'F/B AMAZONAS VI',
    saidaTexto: 'Sabado 16h',
    pendencias: ['Prainha 00h: validar se dia correto e domingo'],
    paradas: [
      { cidadeSigla: 'PRA', texto: '00h (dia a validar)' },
      { cidadeSigla: 'ALM', texto: 'domingo 08h' },
      { cidadeSigla: 'GUR', texto: 'domingo 16h' },
      { cidadeSigla: 'BRV', texto: 'segunda-feira 02h' },
      { cidadeSigla: 'BEL', texto: 'segunda-feira 19h (chegada)' },
    ],
  },
];

const passagemPrices = [
  ['PRA', [['rede', 'inteira', 240], ['rede', 'meia', 120], ['suite_comum', 'fechada', 920], ['suite_comum_vip', 'AMZ6', 970], ['suite_master', '2_pessoas', 1030], ['suite_master_vip', '2_pessoas', 1200], ['mega_suite', '2_pessoas', 1400]]],
  ['MTA', [['rede', 'inteira', 285], ['rede', 'meia', 142], ['suite_comum', 'fechada', 920], ['suite_comum_vip', 'AMZ6', 970], ['suite_master', '2_pessoas', 1030], ['suite_master_vip', '2_pessoas', 1200], ['mega_suite', '2_pessoas', 1400]]],
  ['STM', [['rede', 'inteira', 360], ['rede', 'meia', 180], ['suite_comum', 'fechada', 920], ['suite_comum_vip', 'AMZ6', 970], ['suite_master', '2_pessoas', 1030], ['suite_master_vip', '2_pessoas', 1200], ['mega_suite', '2_pessoas', 1400]]],
  ['BRV', [['rede', 'inteira', 100], ['rede', 'meia', 50], ['rede_sala_vip', 'inteira', 140], ['rede_sala_vip', 'meia', 70], ['camarote', 'fechado', 430], ['suite_comum', 'fechada', 540], ['suite_comum_vip', 'AMZ6', 590], ['suite_master', '2_pessoas', 760], ['suite_master_vip', '2_pessoas', 860], ['mega_suite', '2_pessoas', 1190]]],
  ['GUR', [['rede', 'inteira', 190], ['rede', 'meia', 95], ['rede_sala_vip', 'inteira', 220], ['rede_sala_vip', 'meia', 110], ['camarote', 'fechado', 540], ['suite_comum', 'fechada', 700], ['suite_comum_vip', 'AMZ6', 750], ['suite_master', '2_pessoas', 860], ['suite_master_vip', '2_pessoas', 970], ['mega_suite', '2_pessoas', 1190]]],
  ['ALM', [['rede', 'inteira', 225], ['rede', 'meia', 112.5], ['rede_sala_vip', 'inteira', 250], ['rede_sala_vip', 'meia', 125], ['camarote', 'fechado', 540], ['suite_comum', 'fechada', 700], ['suite_comum_vip', 'AMZ6', 750], ['suite_master', '2_pessoas', 860], ['suite_master_vip', '2_pessoas', 970], ['mega_suite', '2_pessoas', 1190]]],
  ['PMZ', [['rede', 'inteira', 210], ['rede', 'meia', 105], ['rede_sala_vip', 'inteira', 240], ['rede_sala_vip', 'meia', 120], ['camarote', 'fechado', 540], ['suite_comum', 'fechada', 700], ['suite_comum_vip', 'AMZ6', 750], ['suite_master', '2_pessoas', 860], ['suite_master_vip', '2_pessoas', 970], ['mega_suite', '2_pessoas', 1190]]],
];

const encomendaPrices = [
  ['STM', { P: 35, M: 55, G: 80, percentual: 6.0 }],
  ['BRV', { P: 20, M: 32, G: 48, percentual: 4.5 }],
  ['MTA', { P: 32, M: 50, G: 72, percentual: 5.5 }],
  ['PRA', { P: 28, M: 44, G: 64, percentual: 5.0 }],
  ['ALM', { P: 26, M: 40, G: 58, percentual: 5.0 }],
  ['PMZ', { P: 24, M: 38, G: 54, percentual: 4.8 }],
  ['GUR', { P: 22, M: 34, G: 50, percentual: 4.5 }],
];

function capacidadePaxFor(nome) {
  return Object.fromEntries(
    (classesByBoat[nome] ?? []).map((classe) => [
      classe,
      { supported: true, ocupacaoPessoas: classOccupancy[classe], capacidade: null },
    ]),
  );
}

const files = readdirSync(__dirname)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

const client = new pg.Client({ connectionString });
await client.connect();

try {
  for (const file of files) {
    process.stdout.write(`>>> seed ${file} ... `);
    await client.query(readFileSync(join(__dirname, file), 'utf8'));
    console.log('ok');
  }

  const passwordHash = hashPassword(adminPassword);
  await client.query(
    `
    UPDATE usuario
    SET senha_hash = $2, atualizado_em = now()
    WHERE login = $1
    `,
    [adminLogin, passwordHash],
  );

  await client.query(
    `
    INSERT INTO perfil_permissao (perfil_id, permissao_id)
    SELECT p.id, pe.id
    FROM perfil p
    CROSS JOIN permissao pe
    WHERE p.nome = 'Administrador'
    ON CONFLICT DO NOTHING
    `,
  );

  const admin = await client.query('SELECT id FROM usuario WHERE login = $1 LIMIT 1', [adminLogin]);
  const adminId = admin.rows[0]?.id;
  if (!adminId) throw new Error(`Usuario admin ${adminLogin} nao encontrado`);

  await seedCommercialBase();

  for (const [nome, classes] of Object.entries(classesByBoat)) {
    const tipo = nome.includes('PARU') ? 'carga' : 'passeio_carga';
    const capacidadeCarga = nome.includes('PARU') ? 84 : null;
    const capacidadePax = capacidadePaxFor(nome);
    const current = await client.query('SELECT id FROM embarcacao WHERE nome = $1 AND excluido_em IS NULL LIMIT 1', [nome]);
    if (current.rows[0]?.id) {
      await client.query(
        `
        UPDATE embarcacao
        SET tipo = $2::tipo_embarcacao,
            capacidade_carga = $3,
            capacidade_pax = $4::jsonb,
            atualizado_em = now()
        WHERE id = $1
        `,
        [current.rows[0].id, tipo, capacidadeCarga, JSON.stringify({ classes, capacidadePorClasse: capacidadePax })],
      );
    } else {
      await client.query(
        `
        INSERT INTO embarcacao (nome, tipo, capacidade_carga, capacidade_pax, status)
        VALUES ($1, $2::tipo_embarcacao, $3, $4::jsonb, 'ativa')
        `,
        [nome, tipo, capacidadeCarga, JSON.stringify({ classes, capacidadePorClasse: capacidadePax })],
      );
    }
  }

  await publishSeedConfig('route_templates_faq_2026', 'navegacao', 'Templates de paradas do FAQ 2026', routeTemplates, adminId);
  await publishSeedConfig('classes_embarcacao_lucas_2026', 'navegacao', 'Matriz de classes por embarcacao recebida do Lucas', classesByBoat, adminId);
  await publishSeedConfig(
    'formas_pagamento_passagem',
    'vendas',
    'Formas de pagamento atuais do FAQ 2026',
    { formas: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'], parcelamento: 'ate_2x_com_acrescimo_maquina' },
    adminId,
  );
  await publishSeedConfig(
    'regras_publicas_meia_isencao_faq_2026',
    'vendas',
    'Regras publicas do FAQ; validar juridicamente antes de automatizar elegibilidade',
    {
      crianca0a5: 'isento',
      crianca6a11: 'meia',
      estudanteIdJovemInterpass: 'meia mediante central',
      idoso60mais: 'meia conforme FAQ; validar regra legal final',
    },
    adminId,
  );
  await publishSeedConfig(
    'limite_cortesia',
    'vendas',
    'Limite operacional de cortesias por viagem',
    { porViagem: 3 },
    adminId,
  );
  await publishSeedConfig(
    'tamanhos_encomenda',
    'encomendas',
    'Tamanhos P/M/G e limite de valor declarado para preco fixo de encomenda',
    {
      limiteFixo: 1000,
      tamanhos: [
        { id: 'P', pesoMax: 10 },
        { id: 'M', pesoMax: 20 },
        { id: 'G', pesoMax: 40 },
      ],
    },
    adminId,
  );

  const tabelaPassagemId = await seedPassagemPrices(adminId);
  const tabelaEncomendaId = await seedEncomendaPrices(adminId);
  await seedSampleTrips();
  await seedColaboradoresEscalas();
  await seedTmsOperations(adminId);
  await seedVendasCaixa(adminId);
  await seedPrestacaoContas(adminId);
  await seedCrmCotacoes(adminId);
  await seedFinanceiroTitulos(adminId);

  console.log(`Seed canonico: ${Object.keys(classesByBoat).length} embarcacoes, ${routeTemplates.length} templates FAQ, tabela passagem ${tabelaPassagemId}, tabela encomenda ${tabelaEncomendaId}.`);
  console.log(`Seed concluido. Usuario dev: ${adminLogin}. Senha via SEED_ADMIN_PASSWORD ou padrao admin123.`);
} catch (err) {
  console.error('Seed falhou.');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

async function publishSeedConfig(chave, categoria, descricao, valor, autorId) {
  const currentChave = await client.query('SELECT id FROM config_chave WHERE chave = $1 LIMIT 1', [chave]);
  let chaveId = currentChave.rows[0]?.id;
  if (chaveId) {
    await client.query(
      'UPDATE config_chave SET categoria = $2, descricao = $3, atualizado_em = now() WHERE id = $1',
      [chaveId, categoria, descricao],
    );
  } else {
    const inserted = await client.query(
      'INSERT INTO config_chave (chave, categoria, descricao) VALUES ($1, $2, $3) RETURNING id',
      [chave, categoria, descricao],
    );
    chaveId = inserted.rows[0].id;
  }
  await client.query('UPDATE config_versao SET ativo = false, vigente_ate = now() WHERE chave_id = $1', [chaveId]);
  const currentVersion = await client.query('SELECT id FROM config_versao WHERE chave_id = $1 AND versao = 1 LIMIT 1', [chaveId]);
  if (currentVersion.rows[0]?.id) {
    await client.query(
      `
      UPDATE config_versao
      SET valor = $2::jsonb, ativo = true, vigente_ate = NULL, publicado_em = now(), autor_id = $3
      WHERE id = $1
      `,
      [currentVersion.rows[0].id, JSON.stringify(valor), autorId],
    );
  } else {
    await client.query(
      `
      INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
      VALUES ($1, 1, $2::jsonb, true, $3)
      `,
      [chaveId, JSON.stringify(valor), autorId],
    );
  }
}

async function seedCommercialBase() {
  const agentes = [
    ['Marcos Pinheiro', 'BRV', 5],
    ['Renato Lima', 'ALM', 6],
    ['Helena Castro', 'MTA', 6],
    ['Tulio Barbosa', 'STM', 6],
  ];
  for (const [nome, cidade, comissao] of agentes) {
    const current = await client.query('SELECT id FROM agente WHERE nome = $1 AND excluido_em IS NULL LIMIT 1', [nome]);
    if (current.rows[0]?.id) {
      await client.query('UPDATE agente SET cidade_sigla = $2, percentual_comissao = $3, atualizado_em = now() WHERE id = $1', [current.rows[0].id, cidade, comissao]);
    } else {
      await client.query('INSERT INTO agente (nome, cidade_sigla, percentual_comissao) VALUES ($1, $2, $3)', [nome, cidade, comissao]);
    }
  }

  const clientes = [
    ['PJ', 'Comercial Ribeira Ltda.', '12.345.678/0001-09', 'STM', 'Tulio Barbosa'],
    ['PJ', 'Atacadao Santarem', '55.667.881/0001-22', 'STM', 'Tulio Barbosa'],
    ['PJ', 'Ferragens Amazonia', '44.998.220/0001-11', 'MTA', 'Helena Castro'],
    ['PF', 'Jose Carvalho', '458.220.110-22', 'GUR', null],
    ['PF', 'Ana Maria Lopes', '302.811.554-09', 'ALM', 'Renato Lima'],
  ];
  for (const [tipo, nome, doc, cidade, agenteNome] of clientes) {
    const agente = agenteNome ? await client.query('SELECT id FROM agente WHERE nome = $1 LIMIT 1', [agenteNome]) : { rows: [] };
    const current = await client.query('SELECT id FROM cliente WHERE cpf_cnpj = $1 AND excluido_em IS NULL LIMIT 1', [doc]);
    const contatos = JSON.stringify([{ tipo: 'whatsapp', valor: '(91) 99999-0000' }]);
    if (current.rows[0]?.id) {
      await client.query(
        'UPDATE cliente SET tipo = $2::tipo_pessoa, nome = $3, cidade_sigla = $4, agente_id = $5, contatos = $6::jsonb, atualizado_em = now() WHERE id = $1',
        [current.rows[0].id, tipo, nome, cidade, agente.rows[0]?.id ?? null, contatos],
      );
    } else {
      await client.query(
        'INSERT INTO cliente (tipo, nome, cpf_cnpj, cidade_sigla, agente_id, contatos) VALUES ($1::tipo_pessoa, $2, $3, $4, $5, $6::jsonb)',
        [tipo, nome, doc, cidade, agente.rows[0]?.id ?? null, contatos],
      );
    }
  }
}

async function seedPassagemPrices(adminId) {
  await client.query("UPDATE tabela_preco SET ativo = false, vigente_ate = now() WHERE tipo = 'passagem'");
  const currentTabela = await client.query("SELECT id FROM tabela_preco WHERE tipo = 'passagem' AND versao = 1 LIMIT 1");
  let tabelaId = currentTabela.rows[0]?.id;
  if (tabelaId) {
    await client.query(
      "UPDATE tabela_preco SET ativo = true, vigente_ate = NULL, motivo = 'FAQ 2026 - seed inicial' WHERE id = $1",
      [tabelaId],
    );
  } else {
    const inserted = await client.query(
      `
      INSERT INTO tabela_preco (tipo, versao, ativo, motivo, criado_por)
      VALUES ('passagem', 1, true, 'FAQ 2026 - seed inicial', $1)
      RETURNING id
      `,
      [adminId],
    );
    tabelaId = inserted.rows[0].id;
  }
  await client.query('UPDATE bilhete SET item_preco_id = NULL WHERE item_preco_id IN (SELECT id FROM item_preco WHERE tabela_id = $1)', [tabelaId]);
  await client.query('DELETE FROM item_preco WHERE tabela_id = $1', [tabelaId]);
  for (const [destino, items] of passagemPrices) {
    for (const [classe, subtipo, valor] of items) {
      await client.query(
        `
        INSERT INTO item_preco (tabela_id, classe, subtipo, origem_sigla, destino_sigla, valor)
        VALUES ($1, $2::classe_passagem, $3, 'BEL', $4, $5)
        `,
        [tabelaId, classe, subtipo, destino, valor],
      );
    }
  }
  return tabelaId;
}

async function seedEncomendaPrices(adminId) {
  await client.query("UPDATE tabela_preco SET ativo = false, vigente_ate = now() WHERE tipo = 'encomenda'");
  const currentTabela = await client.query("SELECT id FROM tabela_preco WHERE tipo = 'encomenda' AND versao = 1 LIMIT 1");
  let tabelaId = currentTabela.rows[0]?.id;
  if (tabelaId) {
    await client.query(
      "UPDATE tabela_preco SET ativo = true, vigente_ate = NULL, motivo = 'Tabela inicial de encomendas - pendente validacao Lucas' WHERE id = $1",
      [tabelaId],
    );
  } else {
    const inserted = await client.query(
      `
      INSERT INTO tabela_preco (tipo, versao, ativo, motivo, criado_por)
      VALUES ('encomenda', 1, true, 'Tabela inicial de encomendas - pendente validacao Lucas', $1)
      RETURNING id
      `,
      [adminId],
    );
    tabelaId = inserted.rows[0].id;
  }
  await client.query('DELETE FROM item_preco WHERE tabela_id = $1', [tabelaId]);
  for (const [destino, values] of encomendaPrices) {
    for (const tamanho of ['P', 'M', 'G']) {
      await client.query(
        `
        INSERT INTO item_preco (tabela_id, tamanho, origem_sigla, destino_sigla, valor)
        VALUES ($1, $2, 'BEL', $3, $4)
        `,
        [tabelaId, tamanho, destino, values[tamanho]],
      );
    }
    await client.query(
      `
      INSERT INTO item_preco (tabela_id, origem_sigla, destino_sigla, percentual)
      VALUES ($1, 'BEL', $2, $3)
      `,
      [tabelaId, destino, values.percentual],
    );
  }
  return tabelaId;
}

async function seedSampleTrips() {
  await seedTrip({
    codigo: 'V-2026-0001',
    embarcacaoNome: 'F/B AMAZONAS VI',
    origem: 'BEL',
    destino: 'STM',
    saida: '2026-07-08T18:00:00-03:00',
    retorno: '2026-07-11T13:00:00-03:00',
    capacidade: { rede: 180, suite_comum: 12, suite_comum_vip: 4, suite_master: 8, suite_master_vip: 4, mega_suite: 2 },
    escalas: [
      ['BRV', '2026-07-09T09:00:00-03:00', null],
      ['GUR', '2026-07-09T20:00:00-03:00', null],
      ['ALM', '2026-07-10T09:00:00-03:00', null],
      ['PRA', '2026-07-10T17:00:00-03:00', null],
      ['MTA', '2026-07-10T23:00:00-03:00', null],
      ['STM', '2026-07-11T10:00:00-03:00', 'FAQ informa 10h/inicio da tarde; validar'],
    ],
  });
  await seedTrip({
    codigo: 'V-2026-0002',
    embarcacaoNome: 'F/B AMAZONAS IV',
    origem: 'BEL',
    destino: 'STM',
    saida: '2026-07-10T18:00:00-03:00',
    retorno: '2026-07-13T19:00:00-03:00',
    capacidade: { rede: 160, suite_comum: 10, suite_master: 8, suite_master_vip: 4, mega_suite: 2 },
    escalas: [
      ['BRV', '2026-07-11T09:00:00-03:00', null],
      ['GUR', '2026-07-11T20:00:00-03:00', null],
      ['ALM', '2026-07-12T09:00:00-03:00', null],
      ['PRA', '2026-07-12T17:00:00-03:00', null],
      ['MTA', '2026-07-12T23:00:00-03:00', null],
      ['STM', '2026-07-13T19:00:00-03:00', 'FAQ informa 19h/inicio da tarde; validar'],
    ],
  });
  await seedTrip({
    codigo: 'V-2026-0003',
    embarcacaoNome: 'F/B AMAZONAS V',
    origem: 'BEL',
    destino: 'ALM',
    saida: '2026-07-14T18:00:00-03:00',
    retorno: '2026-07-16T14:00:00-03:00',
    capacidade: { rede: 180, rede_sala_vip: 40, camarote: 12, suite_comum: 10, suite_master: 8, suite_master_vip: 4, mega_suite: 2 },
    escalas: [
      ['BRV', '2026-07-15T09:00:00-03:00', null],
      ['GUR', '2026-07-15T20:00:00-03:00', null],
      ['PMZ', '2026-07-16T08:00:00-03:00', null],
      ['ALM', '2026-07-16T14:00:00-03:00', null],
    ],
  });
}

async function seedTrip(trip) {
  const emb = await client.query('SELECT id FROM embarcacao WHERE nome = $1 AND excluido_em IS NULL LIMIT 1', [trip.embarcacaoNome]);
  if (!emb.rows[0]?.id) throw new Error(`Embarcacao nao encontrada: ${trip.embarcacaoNome}`);
  const currentViagem = await client.query('SELECT id FROM viagem WHERE codigo = $1 LIMIT 1', [trip.codigo]);
  let viagemId = currentViagem.rows[0]?.id;
  if (viagemId) {
    await client.query(
      `
      UPDATE viagem
      SET embarcacao_id = $2,
          origem_sigla = $3,
          destino_sigla = $4,
          data_hora_saida = $5,
          data_hora_retorno = $6,
          capacidade_pax_disponivel = $7::jsonb,
          atualizado_em = now()
      WHERE id = $1
      `,
      [viagemId, emb.rows[0].id, trip.origem, trip.destino, trip.saida, trip.retorno, JSON.stringify(trip.capacidade)],
    );
  } else {
    const inserted = await client.query(
      `
      INSERT INTO viagem (codigo, embarcacao_id, origem_sigla, destino_sigla, data_hora_saida, data_hora_retorno, capacidade_pax_disponivel, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'seed FAQ 2026')
      RETURNING id
      `,
      [trip.codigo, emb.rows[0].id, trip.origem, trip.destino, trip.saida, trip.retorno, JSON.stringify(trip.capacidade)],
    );
    viagemId = inserted.rows[0].id;
  }
  await client.query('DELETE FROM viagem_escala WHERE viagem_id = $1', [viagemId]);
  for (const [index, [cidade, prevista, observacao]] of trip.escalas.entries()) {
    await client.query(
      `
      INSERT INTO viagem_escala (viagem_id, cidade_sigla, ordem, data_hora_prevista, observacao)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [viagemId, cidade, index + 1, prevista, observacao],
    );
  }
}

async function seedColaboradoresEscalas() {
  const colaboradores = [
    ['Capitao Raimundo Alves', 'Comandante', 'BEL', '+5591988001001'],
    ['Maria das Gracas Costa', 'Imediato', 'BEL', '+5591988001002'],
    ['Joao Nonato Pereira', 'Maquinista', 'BEL', '+5591988001003'],
    ['Antonio Lima Souza', 'Marinheiro', 'STM', '+5591988001004'],
    ['Carlos Mendes Rocha', 'Comissario', 'BEL', '+5591988001005'],
    ['Lucia Ferreira Santos', 'Bilheteira', 'BEL', '+5591988001006'],
  ];
  for (const colaborador of colaboradores) {
    await seedColaborador(...colaborador);
  }

  const viagem1 = await getId('viagem', 'codigo', 'V-2026-0001');
  const viagem2 = await getId('viagem', 'codigo', 'V-2026-0002');
  const viagem3 = await getId('viagem', 'codigo', 'V-2026-0003');

  const escalas = [
    ['Capitao Raimundo Alves', viagem1, 'Comandante', 'confirmada', '2026-07-07T12:10:00-03:00', '2026-07-07T12:18:00-03:00'],
    ['Maria das Gracas Costa', viagem1, 'Imediato', 'confirmada', '2026-07-07T12:10:00-03:00', '2026-07-07T12:16:00-03:00'],
    ['Joao Nonato Pereira', viagem1, 'Maquinista', 'notificada', '2026-07-07T12:11:00-03:00', null],
    ['Carlos Mendes Rocha', viagem2, 'Comissario', 'planejada', null, null],
    ['Lucia Ferreira Santos', viagem2, 'Bilheteira', 'confirmada', '2026-07-09T05:30:00-03:00', '2026-07-09T05:42:00-03:00'],
    ['Joao Nonato Pereira', viagem2, 'Maquinista', 'notificada', '2026-07-09T18:40:00-03:00', null],
    ['Antonio Lima Souza', viagem3, 'Marinheiro', 'planejada', null, null],
  ];
  for (const escala of escalas) {
    await seedEscalaColaborador(...escala);
  }
}

async function seedColaborador(nome, funcao, cidadeSigla, whatsapp) {
  const current = await client.query('SELECT id FROM colaborador WHERE nome = $1 AND excluido_em IS NULL LIMIT 1', [nome]);
  if (current.rows[0]?.id) {
    await client.query(
      `
      UPDATE colaborador
      SET funcao = $2, cidade_sigla = $3, contato_whatsapp = $4, ativo = true, atualizado_em = now()
      WHERE id = $1
      `,
      [current.rows[0].id, funcao, cidadeSigla, whatsapp],
    );
    return current.rows[0].id;
  }
  const inserted = await client.query(
    `
    INSERT INTO colaborador (nome, funcao, cidade_sigla, contato_whatsapp, ativo)
    VALUES ($1, $2, $3, $4, true)
    RETURNING id
    `,
    [nome, funcao, cidadeSigla, whatsapp],
  );
  return inserted.rows[0].id;
}

async function seedEscalaColaborador(nomeColaborador, viagemId, funcao, status, notificadoEm, confirmadoEm) {
  const colaborador = await client.query('SELECT id FROM colaborador WHERE nome = $1 AND excluido_em IS NULL LIMIT 1', [nomeColaborador]);
  if (!colaborador.rows[0]?.id) throw new Error(`colaborador nao encontrado: ${nomeColaborador}`);
  const current = await client.query(
    `
    SELECT id
    FROM escala_colaborador
    WHERE colaborador_id = $1 AND viagem_id = $2 AND funcao = $3
    LIMIT 1
    `,
    [colaborador.rows[0].id, viagemId, funcao],
  );
  if (current.rows[0]?.id) {
    await client.query(
      `
      UPDATE escala_colaborador
      SET status = $2::status_escala,
          notificado_em = $3,
          confirmado_em = $4,
          atualizado_em = now()
      WHERE id = $1
      `,
      [current.rows[0].id, status, notificadoEm, confirmadoEm],
    );
    return;
  }
  await client.query(
    `
    INSERT INTO escala_colaborador (
      colaborador_id, viagem_id, funcao, status, notificado_em, confirmado_em
    )
    VALUES ($1, $2, $3, $4::status_escala, $5, $6)
    `,
    [colaborador.rows[0].id, viagemId, funcao, status, notificadoEm, confirmadoEm],
  );
}

async function seedTmsOperations(adminId) {
  await seedPalete('AJC-014', 'AJC');
  await seedPalete('AJC-021', 'AJC');
  await seedPalete('TER-101', 'terceiro');

  const viagem = await getId('viagem', 'codigo', 'V-2026-0001');
  const viagem2 = await getId('viagem', 'codigo', 'V-2026-0002');
  const comercial = await getCliente('Comercial Ribeira Ltda.');
  const atacadao = await getCliente('Atacadao Santarem');
  const jose = await getCliente('Jose Carvalho');

  const carga1 = await seedCarga({
    codigo: 'CG-2026-0001',
    numeroPedido: '000109-NFE-352406120017',
    categoria: 'carga',
    viagemId: viagem,
    clienteId: comercial,
    origem: 'BEL',
    destino: 'STM',
    valorDeclarado: 84500,
    valorCobrado: 4280,
    pesoTotal: 40,
    totalVolumes: 2,
    documento: ['NFe', '352406120017', 84500, 'cliente'],
    userId: adminId,
  });
  await seedCarga({
    codigo: 'ENC-2026-0001',
    numeroPedido: '11022-DC-2026-0190',
    categoria: 'encomenda',
    viagemId: viagem,
    clienteId: jose,
    destinatarioNome: 'Maria Carvalho',
    origem: 'BEL',
    destino: 'GUR',
    valorDeclarado: 180,
    valorCobrado: 22,
    pesoTotal: 4,
    totalVolumes: 1,
    documento: ['DC', 'DC-2026-0190', 180, 'manual'],
    userId: adminId,
  });
  await seedCarga({
    codigo: 'CG-2026-0002',
    numeroPedido: '00122-NFE-352406120099',
    categoria: 'carga',
    viagemId: viagem2,
    clienteId: atacadao,
    origem: 'BEL',
    destino: 'STM',
    valorDeclarado: 218400,
    valorCobrado: 6120,
    pesoTotal: 70,
    totalVolumes: 2,
    documento: ['NFe', '352406120099', 218400, 'cliente'],
    userId: adminId,
  });

  const volumes = await client.query('SELECT id FROM volume WHERE carga_id = $1 ORDER BY indice_volume', [carga1]);
  const palete = await getId('palete', 'codigo', 'AJC-014');
  for (const volume of volumes.rows) {
    await client.query('UPDATE volume SET palete_id = $2 WHERE id = $1', [volume.id, palete]);
  }
  await client.query(
    `
    INSERT INTO palete_viagem (palete_id, viagem_id, cidade_destino_sigla)
    SELECT $1, $2, 'STM'
    WHERE NOT EXISTS (SELECT 1 FROM palete_viagem WHERE palete_id = $1 AND viagem_id = $2)
    `,
    [palete, viagem],
  );
  await client.query("UPDATE palete SET status = 'em_transito' WHERE id = $1", [palete]);

  await seedPortaria(adminId);
  await seedEntrega(viagem, volumes.rows.map((v) => v.id), adminId);
  await seedVeiculo(viagem, comercial, adminId);
}

async function seedPalete(codigo, proprietario) {
  const current = await client.query('SELECT id FROM palete WHERE codigo = $1 LIMIT 1', [codigo]);
  if (current.rows[0]?.id) {
    await client.query('UPDATE palete SET proprietario = $2::proprietario_palete, atualizado_em = now() WHERE id = $1', [current.rows[0].id, proprietario]);
  } else {
    await client.query('INSERT INTO palete (codigo, proprietario) VALUES ($1, $2::proprietario_palete)', [codigo, proprietario]);
  }
}

async function seedCarga(data) {
  const current = await client.query('SELECT id FROM carga WHERE codigo = $1 LIMIT 1', [data.codigo]);
  let cargaId = current.rows[0]?.id;
  if (cargaId) {
    await client.query(
      `
      UPDATE carga
      SET numero_pedido = $2, categoria = $3, viagem_id = $4, cliente_remetente_id = $5,
          destinatario_nome = $6, cidade_origem_sigla = $7, cidade_destino_sigla = $8,
          valor_declarado = $9, valor_cobrado = $10, peso_total = $11, atualizado_em = now()
      WHERE id = $1
      `,
      [cargaId, data.numeroPedido, data.categoria, data.viagemId, data.clienteId, data.destinatarioNome ?? null, data.origem, data.destino, data.valorDeclarado, data.valorCobrado, data.pesoTotal],
    );
  } else {
    const inserted = await client.query(
      `
      INSERT INTO carga (
        codigo, numero_pedido, categoria, viagem_id, cliente_remetente_id, destinatario_nome,
        cidade_origem_sigla, cidade_destino_sigla, tipo_recebimento, valor_declarado,
        valor_cobrado, peso_total, criado_por, atualizado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'porto_balsa', $9, $10, $11, $12, $12)
      RETURNING id
      `,
      [data.codigo, data.numeroPedido, data.categoria, data.viagemId, data.clienteId, data.destinatarioNome ?? null, data.origem, data.destino, data.valorDeclarado, data.valorCobrado, data.pesoTotal, data.userId],
    );
    cargaId = inserted.rows[0].id;
  }

  await client.query('DELETE FROM documento_fiscal WHERE carga_id = $1', [cargaId]);
  await client.query(
    `
    INSERT INTO documento_fiscal (tipo, numero, valor, cliente_id, carga_id, status, lancado_por, origem)
    VALUES ($1::tipo_documento_fiscal, $2, $3, $4, $5, 'conferida', $6, $7)
    `,
    [data.documento[0], data.documento[1], data.documento[2], data.clienteId, cargaId, data.userId, data.documento[3]],
  );

  await client.query('DELETE FROM entrega_volume WHERE volume_id IN (SELECT id FROM volume WHERE carga_id = $1)', [cargaId]);
  await client.query('DELETE FROM evento_volume WHERE volume_id IN (SELECT id FROM volume WHERE carga_id = $1)', [cargaId]);
  await client.query('DELETE FROM volume WHERE carga_id = $1', [cargaId]);
  for (let i = 1; i <= data.totalVolumes; i++) {
    await client.query(
      `
      INSERT INTO volume (carga_id, indice_volume, total_volumes, peso, status)
      VALUES ($1, $2, $3, $4, 'recebido')
      `,
      [cargaId, i, data.totalVolumes, data.pesoTotal / data.totalVolumes],
    );
  }
  if (data.categoria === 'encomenda') {
    await client.query('DELETE FROM declaracao_conteudo WHERE carga_id = $1', [cargaId]);
    await client.query(
      `
      INSERT INTO declaracao_conteudo (carga_id, valor_declarado, descricao_informada, aceite_em, dispositivo)
      VALUES ($1, $2, 'Conteudo informado no despacho da encomenda', now(), 'seed')
      `,
      [cargaId, data.valorDeclarado],
    );
  }
  return cargaId;
}

async function seedPortaria(adminId) {
  const exists = await client.query("SELECT id FROM registro_portaria WHERE placa = 'QAB-1D23' AND saida_em IS NULL LIMIT 1");
  if (!exists.rows[0]?.id) {
    await client.query(
      `
      INSERT INTO registro_portaria (placa, empresa, motorista_nome, tipo, porteiro_id, foto_url)
      VALUES ('QAB-1D23', 'Transportes Tapajos', 'Edivaldo Sena', 'veiculo_carga', $1, 'storage://seed/portaria-qab.jpg')
      `,
      [adminId],
    );
  }
}

async function seedEntrega(viagemId, volumeIds, adminId) {
  const exists = await client.query("SELECT id FROM entrega_comprovante WHERE protocolo = 'ENT-2026-0001' LIMIT 1");
  let entregaId = exists.rows[0]?.id;
  if (!entregaId) {
    const inserted = await client.query(
      `
      INSERT INTO entrega_comprovante (
        viagem_id, cidade_sigla, recebedor_nome, recebedor_doc, assinatura_url,
        foto1_url, foto2_url, protocolo, entregue_por_conferente_id
      )
      VALUES ($1, 'STM', 'Tulio Barbosa', '012.345.678-90', 'storage://seed/assinatura.png',
              'storage://seed/entrega-1.jpg', 'storage://seed/entrega-2.jpg', 'ENT-2026-0001', $2)
      RETURNING id
      `,
      [viagemId, adminId],
    );
    entregaId = inserted.rows[0].id;
  }
  await client.query('DELETE FROM entrega_volume WHERE entrega_id = $1', [entregaId]);
  for (const volumeId of volumeIds) {
    await client.query('INSERT INTO entrega_volume (entrega_id, volume_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [entregaId, volumeId]);
  }
}

async function seedVeiculo(viagemId, clienteId, adminId) {
  const exists = await client.query("SELECT id FROM envio_veiculo WHERE codigo = 'VEI-2026-0001' LIMIT 1");
  let envioId = exists.rows[0]?.id;
  if (!envioId) {
    const inserted = await client.query(
      `
      INSERT INTO envio_veiculo (
        codigo, tipo, viagem_id, origem_cadastro, status, placa, modelo,
        remetente_cliente_id, destinatario_nome, cidade_origem_sigla, cidade_destino_sigla,
        valor_frete, criado_por, atualizado_por
      )
      VALUES ('VEI-2026-0001', 'veiculo', $1, 'gerente_porto', 'em_transito', 'RXA-7B43',
              'Fiat Strada', $2, 'Tulio Barbosa', 'BEL', 'STM', 1850, $3, $3)
      RETURNING id
      `,
      [viagemId, clienteId, adminId],
    );
    envioId = inserted.rows[0].id;
  }
  await client.query('DELETE FROM envio_veiculo_evento WHERE envio_id = $1', [envioId]);
  for (const tipo of ['cadastrado', 'vistoriado', 'etiquetado', 'bipe_subida']) {
    await client.query('INSERT INTO envio_veiculo_evento (envio_id, tipo, registrado_por, etiqueta_codigo, local_sigla) VALUES ($1, $2::tipo_evento_envio_veiculo, $3, $4, $5)', [envioId, tipo, adminId, tipo === 'etiquetado' ? 'VEI-2026-0001' : null, tipo === 'bipe_subida' ? 'BEL' : null]);
  }
}

async function seedVendasCaixa(adminId) {
  const caixaId = await seedCaixa(adminId);
  const viagem = await getId('viagem', 'codigo', 'V-2026-0001');
  const viagem2 = await getId('viagem', 'codigo', 'V-2026-0002');
  const jose = await getCliente('Jose Carvalho');
  const ana = await getCliente('Ana Maria Lopes');
  const itemRedeStm = await getPrecoPassagem('STM', 'rede', 'inteira');
  const itemRedeMeiaStm = await getPrecoPassagem('STM', 'rede', 'meia');
  const itemSuiteStm = await getPrecoPassagem('STM', 'suite_master', '2_pessoas');

  await seedBilhete({
    codigo: 'BIL-2026-00001',
    qr: 'AJC-9001-X9',
    viagemId: viagem,
    clienteId: jose,
    passageiroNome: 'Jose Carvalho',
    passageiroDocumento: '458.220.110-22',
    classe: 'rede',
    tipo: 'pdv',
    canal: 'pdv',
    itemPrecoId: itemRedeStm,
    precoPago: 360,
    status: 'emitido',
    formaPagamento: 'pix',
    caixaId,
    userId: adminId,
  });
  await seedBilhete({
    codigo: 'BIL-2026-00002',
    qr: 'AJC-9002-K2',
    viagemId: viagem,
    clienteId: ana,
    passageiroNome: 'Ana Maria Lopes',
    passageiroDocumento: '302.811.554-09',
    classe: 'rede',
    tipo: 'online',
    canal: 'portal',
    itemPrecoId: itemRedeMeiaStm,
    precoPago: 180,
    status: 'validado',
    formaPagamento: 'cartao_credito',
    caixaId,
    userId: adminId,
  });
  await seedBilhete({
    codigo: 'BIL-2026-00003',
    qr: 'AJC-9003-Z1',
    viagemId: viagem,
    passageiroNome: 'Familia Andrade',
    passageiroDocumento: '712.345.678-90',
    classe: 'suite_master',
    subtipo: '2_pessoas',
    assento: 'SM-03',
    tipo: 'online',
    canal: 'portal',
    itemPrecoId: itemSuiteStm,
    precoPago: 1030,
    status: 'emitido',
    formaPagamento: 'pix',
    caixaId,
    userId: adminId,
  });
  await seedBilhete({
    codigo: 'BIL-2026-00004',
    qr: 'AJC-9004-A8',
    viagemId: viagem,
    passageiroNome: 'Maria Conceicao',
    passageiroDocumento: '312.345.678-90',
    classe: 'rede',
    tipo: 'gratuidade',
    canal: 'pdv',
    precoPago: 0,
    status: 'emitido',
    formaPagamento: 'gratuidade',
    caixaId,
    userId: adminId,
    gratuidadeTipo: 'idoso',
  });

  const cortesiaId = await seedCortesia({
    codigo: 'AJC-CORT-1042',
    viagemId: viagem2,
    classe: 'rede',
    motivo: 'Imprensa - cobertura institucional',
    userId: adminId,
  });
  const cortesiaBilhete = await seedBilhete({
    codigo: 'BIL-2026-00005',
    qr: 'AJC-9005-B7',
    viagemId: viagem2,
    passageiroNome: 'Imprensa - convidado',
    passageiroDocumento: null,
    classe: 'rede',
    tipo: 'cortesia',
    canal: 'agente',
    precoPago: 0,
    status: 'emitido',
    formaPagamento: 'cortesia',
    caixaId,
    userId: adminId,
  });
  await client.query('UPDATE cortesia SET bilhete_id = $2 WHERE id = $1', [cortesiaId, cortesiaBilhete]);
}

async function seedPrestacaoContas(adminId) {
  const viagem = await getId('viagem', 'codigo', 'V-2026-0001');
  const totalSistemaRow = await client.query(
    `
    SELECT (
      COALESCE((SELECT sum(preco_pago) FROM bilhete WHERE viagem_id = $1 AND status <> 'cancelado'), 0) +
      COALESCE((SELECT sum(valor_cobrado) FROM carga WHERE viagem_id = $1 AND status <> 'cancelada'), 0) +
      COALESCE((SELECT sum(valor_frete) FROM envio_veiculo WHERE viagem_id = $1 AND status <> 'cancelada'), 0)
    )::numeric(12,2) AS total
    `,
    [viagem],
  );
  const totalSistema = Number(totalSistemaRow.rows[0]?.total ?? 0);
  const itens = {
    caixaInicial: 2000,
    receitasBordo: [
      { rotulo: 'Passagens', especie: 1240, pix: 540 },
      { rotulo: 'Fretes STM/Almeirim', especie: 810, pix: 980 },
      { rotulo: 'Fretes STM/Gurupa', especie: 640, pix: 1220 },
      { rotulo: 'Fretes STM/Porto de Moz', especie: 380, pix: 760 },
      { rotulo: 'Fretes inter-trechos', especie: 420, pix: 950 },
      { rotulo: 'Encomendas', especie: 0, pix: 22 },
      { rotulo: 'Veiculos', especie: 0, pix: 1850 },
    ],
    cozinhaDias: [
      { dia: 'Dia 1', cafe: 180, almoco: 420, jantar: 360 },
      { dia: 'Dia 2', cafe: 210, almoco: 480, jantar: 390 },
      { dia: 'Dia 3', cafe: 160, almoco: 360, jantar: 300 },
    ],
    lanchonete: { especie: 540, pix: 1280 },
    internet: { especie: 220, pix: 1160 },
    passagensAgencias: [
      { cidade: 'Breves', especie: 1240, pixConta: 2180, comissaoPct: 10 },
      { cidade: 'Gurupa', especie: 860, pixConta: 1540, comissaoPct: 10 },
      { cidade: 'Almeirim', especie: 1120, pixConta: 2360, comissaoPct: 10 },
      { cidade: 'Prainha', especie: 640, pixConta: 1180, comissaoPct: 10 },
      { cidade: 'Monte Alegre', especie: 980, pixConta: 1760, comissaoPct: 10 },
      { cidade: 'Santarem', especie: 2140, pixConta: 4280, comissaoPct: 10 },
    ],
    fretesAgencias: [
      { cidade: 'Gurupa', especie: 420, pixConta: 680 },
      { cidade: 'Almeirim', especie: 360, pixConta: 540 },
      { cidade: 'Prainha', especie: 180, pixConta: 320 },
      { cidade: 'Monte Alegre', especie: 250, pixConta: 410 },
      { cidade: 'Santarem', especie: 640, pixConta: 980 },
    ],
    despesas: [
      { descricao: 'Pagamento de carregador', valor: 480 },
      { descricao: 'Pagamento de despacho', valor: 320 },
      { descricao: 'Recolhimento de lixo/residuos', valor: 180 },
      { descricao: 'Pagamento de empilhador', valor: 260 },
      { descricao: 'Compras - material/alimentacao refeitorio', valor: 640 },
      { descricao: 'Diaria no porto', valor: 220 },
    ],
    redondas: [
      { nome: 'Jose Carlos', funcao: 'Marinheiro de conves', valor: 150 },
      { nome: 'Antonio Lima', funcao: 'Cozinha', valor: 120 },
      { nome: 'Maria das Gracas', funcao: 'Camareira', valor: 120 },
    ],
    assinatura: { local: 'Santarem-PA', responsavel: 'Administrador AJC' },
  };
  const totalDeclarado = Math.round((totalSistema + 118.5) * 100) / 100;

  await client.query(
    `
    INSERT INTO prestacao_contas (
      viagem_id, gerente_id, total_declarado, total_sistema, divergencia,
      status, itens, anexos
    )
    VALUES ($1, $2, $3::numeric, $4::numeric, $3::numeric - $4::numeric, 'enviada', $5::jsonb, $6::jsonb)
    ON CONFLICT (viagem_id, gerente_id) DO UPDATE
    SET total_declarado = EXCLUDED.total_declarado,
        total_sistema = EXCLUDED.total_sistema,
        divergencia = EXCLUDED.divergencia,
        status = EXCLUDED.status,
        itens = EXCLUDED.itens,
        anexos = EXCLUDED.anexos,
        atualizado_em = now()
    `,
    [
      viagem,
      adminId,
      totalDeclarado,
      totalSistema,
      JSON.stringify(itens),
      JSON.stringify([{ url: 'storage://seed/prestacao-v-2026-0001.pdf', hash: 'seed-prestacao-v-2026-0001' }]),
    ],
  );
}

async function seedCrmCotacoes(adminId) {
  const comercial = await getCliente('Comercial Ribeira Ltda.');
  const atacadao = await getCliente('Atacadao Santarem');
  const ferragens = await getCliente('Ferragens Amazonia');
  const tulio = await getAgente('Tulio Barbosa');
  const helena = await getAgente('Helena Castro');

  const cotacoes = [
    {
      tipo: 'carga',
      clienteId: atacadao,
      agenteId: tulio,
      origem: 'BEL',
      destino: 'STM',
      parametros: { volumes: 12, conteudo: 'Mercearia paletizada' },
      valor: 4280,
      validadeDias: 5,
      status: 'aberta',
    },
    {
      tipo: 'veiculo',
      clienteId: ferragens,
      agenteId: helena,
      origem: 'BEL',
      destino: 'MTA',
      parametros: { modelo: 'Fiat Strada', placa: 'RXA-7B43' },
      valor: 1850,
      validadeDias: 4,
      status: 'aberta',
    },
    {
      tipo: 'encomenda',
      clienteId: comercial,
      agenteId: tulio,
      origem: 'BEL',
      destino: 'STM',
      parametros: { tamanho: 'M', valorDeclarado: 320 },
      valor: 320,
      validadeDias: -2,
      status: 'convertida',
    },
  ];

  for (const cotacao of cotacoes) {
    const current = await client.query(
      `
      SELECT id
      FROM cotacao
      WHERE cliente_id = $1 AND tipo = $2::tipo_cotacao
        AND origem_sigla = $3 AND destino_sigla = $4
      LIMIT 1
      `,
      [cotacao.clienteId, cotacao.tipo, cotacao.origem, cotacao.destino],
    );
    const validade = new Date(Date.now() + cotacao.validadeDias * 24 * 60 * 60 * 1000).toISOString();
    if (current.rows[0]?.id) {
      await client.query(
        `
        UPDATE cotacao
        SET agente_id = $2, parametros = $3::jsonb, valor_estimado = $4,
            validade = $5, status = $6::status_cotacao, criado_por = $7,
            atualizado_em = now()
        WHERE id = $1
        `,
        [current.rows[0].id, cotacao.agenteId, JSON.stringify(cotacao.parametros), cotacao.valor, validade, cotacao.status, adminId],
      );
    } else {
      await client.query(
        `
        INSERT INTO cotacao (
          tipo, cliente_id, agente_id, origem_sigla, destino_sigla,
          parametros, valor_estimado, validade, status, criado_por
        )
        VALUES ($1::tipo_cotacao, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::status_cotacao, $10)
        `,
        [cotacao.tipo, cotacao.clienteId, cotacao.agenteId, cotacao.origem, cotacao.destino, JSON.stringify(cotacao.parametros), cotacao.valor, validade, cotacao.status, adminId],
      );
    }
  }
}

async function seedFinanceiroTitulos(adminId) {
  const comercial = await getCliente('Comercial Ribeira Ltda.');
  const atacadao = await getCliente('Atacadao Santarem');
  const ferragens = await getCliente('Ferragens Amazonia');
  const tulio = await getAgente('Tulio Barbosa');
  const helena = await getAgente('Helena Castro');
  const bilheteOnline = await getId('bilhete', 'codigo', 'BIL-2026-00002');
  const cargaAtacadao = await getId('carga', 'codigo', 'CG-2026-0002');
  const cargaComercial = await getId('carga', 'codigo', 'ENC-2026-0001');

  const titulos = [
    {
      uuid: '11111111-1111-4111-8111-111111111001',
      tipo: 'receber',
      descricao: 'Passagem portal - BIL-2026-00002',
      parteNome: 'Ana Maria Lopes',
      vencimento: '2026-07-03',
      valor: 180,
      status: 'recebido',
      origem: 'portal',
      clienteId: await getCliente('Ana Maria Lopes'),
      bilheteId: bilheteOnline,
      observacao: 'Titulo gerado a partir de venda online seedada',
    },
    {
      uuid: '11111111-1111-4111-8111-111111111002',
      tipo: 'receber',
      descricao: 'Frete carga CG-2026-0002',
      parteNome: 'Atacadao Santarem',
      vencimento: '2026-07-08',
      valor: 4280,
      status: 'aberto',
      origem: 'tms',
      clienteId: atacadao,
      cargaId: cargaAtacadao,
      observacao: 'Recebimento operacional vinculado a carga conferida',
    },
    {
      uuid: '11111111-1111-4111-8111-111111111003',
      tipo: 'receber',
      descricao: 'Encomenda ENC-2026-0001',
      parteNome: 'Comercial Ribeira Ltda.',
      vencimento: '2026-07-02',
      valor: 320,
      status: 'vence_semana',
      origem: 'encomenda',
      clienteId: comercial,
      cargaId: cargaComercial,
      observacao: 'Valor declarado/cobrado de encomenda seedada',
    },
    {
      uuid: '11111111-1111-4111-8111-111111111004',
      tipo: 'pagar',
      descricao: 'Comissao agente Santarem',
      parteNome: 'Tulio Barbosa',
      vencimento: '2026-07-15',
      valor: 256.8,
      status: 'aberto',
      origem: 'crm',
      agenteId: tulio,
      observacao: 'Estimativa sobre captacao CRM; regra final configuravel',
    },
    {
      uuid: '11111111-1111-4111-8111-111111111005',
      tipo: 'pagar',
      descricao: 'Comissao agente Monte Alegre',
      parteNome: 'Helena Castro',
      vencimento: '2026-07-15',
      valor: 111,
      status: 'aberto',
      origem: 'crm',
      agenteId: helena,
      observacao: 'Estimativa sobre cotacao de veiculo',
    },
    {
      uuid: '11111111-1111-4111-8111-111111111006',
      tipo: 'pagar',
      descricao: 'Despesa operacional de porto',
      parteNome: 'Ferragens Amazonia',
      vencimento: '2026-06-28',
      valor: 640,
      status: 'vencida',
      origem: 'prestacao_contas',
      clienteId: ferragens,
      observacao: 'Exemplo de despesa operacional minima; Compras/DRE ficam fase posterior',
    },
  ];

  for (const titulo of titulos) {
    await client.query(
      `
      INSERT INTO financeiro_titulo (
        tipo, descricao, parte_nome, vencimento, valor, status, origem,
        observacao, cliente_id, agente_id, carga_id, bilhete_id,
        criado_por, atualizado_por, client_uuid
      )
      VALUES (
        $1::tipo_titulo_financeiro, $2, $3, $4::date, $5,
        $6::status_titulo_financeiro, $7, $8, $9, $10, $11, $12,
        $13, $13, $14::uuid
      )
      ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO UPDATE
      SET descricao = EXCLUDED.descricao,
          parte_nome = EXCLUDED.parte_nome,
          vencimento = EXCLUDED.vencimento,
          valor = EXCLUDED.valor,
          status = EXCLUDED.status,
          origem = EXCLUDED.origem,
          observacao = EXCLUDED.observacao,
          cliente_id = EXCLUDED.cliente_id,
          agente_id = EXCLUDED.agente_id,
          carga_id = EXCLUDED.carga_id,
          bilhete_id = EXCLUDED.bilhete_id,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = now()
      `,
      [
        titulo.tipo,
        titulo.descricao,
        titulo.parteNome,
        titulo.vencimento,
        titulo.valor,
        titulo.status,
        titulo.origem,
        titulo.observacao,
        titulo.clienteId ?? null,
        titulo.agenteId ?? null,
        titulo.cargaId ?? null,
        titulo.bilheteId ?? null,
        adminId,
        titulo.uuid,
      ],
    );
  }
}

async function seedCaixa(adminId) {
  const current = await client.query("SELECT id FROM caixa WHERE referencia = 'Caixa do Porto - Belem' LIMIT 1");
  if (current.rows[0]?.id) {
    await client.query(
      "UPDATE caixa SET tipo = 'porto', operador_id = $2, valor_abertura = 250, status = 'aberto', fechado_em = NULL WHERE id = $1",
      [current.rows[0].id, adminId],
    );
    return current.rows[0].id;
  }
  const inserted = await client.query(
    `
    INSERT INTO caixa (operador_id, tipo, referencia, valor_abertura)
    VALUES ($1, 'porto', 'Caixa do Porto - Belem', 250)
    RETURNING id
    `,
    [adminId],
  );
  return inserted.rows[0].id;
}

async function seedBilhete(data) {
  const current = await client.query('SELECT id FROM bilhete WHERE codigo = $1 LIMIT 1', [data.codigo]);
  let bilheteId = current.rows[0]?.id;
  if (bilheteId) {
    await client.query(
      `
      UPDATE bilhete
      SET viagem_id = $2, cliente_id = $3, passageiro_nome = $4, passageiro_documento = $5,
          classe = $6::classe_passagem, subtipo = $7, tipo = $8::tipo_bilhete, canal = $9,
          item_preco_id = $10, preco_pago = $11, qr_token = $12, status = $13::status_bilhete,
          assento = $14, atualizado_em = now()
      WHERE id = $1
      `,
      [bilheteId, data.viagemId, data.clienteId ?? null, data.passageiroNome, data.passageiroDocumento, data.classe, data.subtipo ?? null, data.tipo, data.canal, data.itemPrecoId ?? null, data.precoPago, data.qr, data.status, data.assento ?? null],
    );
  } else {
    const inserted = await client.query(
      `
      INSERT INTO bilhete (
        codigo, viagem_id, cliente_id, passageiro_nome, passageiro_documento,
        classe, subtipo, tipo, canal, item_preco_id, preco_pago, qr_token,
        status, assento, criado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6::classe_passagem, $7, $8::tipo_bilhete, $9,
              $10, $11, $12, $13::status_bilhete, $14, $15)
      RETURNING id
      `,
      [data.codigo, data.viagemId, data.clienteId ?? null, data.passageiroNome, data.passageiroDocumento, data.classe, data.subtipo ?? null, data.tipo, data.canal, data.itemPrecoId ?? null, data.precoPago, data.qr, data.status, data.assento ?? null, data.userId],
    );
    bilheteId = inserted.rows[0].id;
  }

  await client.query('DELETE FROM gratuidade WHERE bilhete_id = $1', [bilheteId]);
  if (data.gratuidadeTipo) {
    await client.query(
      'INSERT INTO gratuidade (bilhete_id, tipo_legal, registrado_por) VALUES ($1, $2::tipo_gratuidade, $3)',
      [bilheteId, data.gratuidadeTipo, data.userId],
    );
  }

  await client.query('UPDATE bilhete SET caixa_movimento_id = NULL WHERE id = $1', [bilheteId]);
  await client.query('DELETE FROM caixa_movimento WHERE bilhete_id = $1', [bilheteId]);
  if (data.caixaId) {
    const movimento = await client.query(
      `
      INSERT INTO caixa_movimento (caixa_id, tipo, forma_pagamento, valor, bilhete_id, criado_por, observacao)
      VALUES ($1, 'venda_passagem', $2::forma_pagamento, $3, $4, $5, $6)
      RETURNING id
      `,
      [data.caixaId, data.formaPagamento, data.precoPago, bilheteId, data.userId, `Seed ${data.codigo}`],
    );
    await client.query('UPDATE bilhete SET caixa_movimento_id = $2 WHERE id = $1', [bilheteId, movimento.rows[0].id]);
  }
  return bilheteId;
}

async function seedCortesia(data) {
  const current = await client.query('SELECT id FROM cortesia WHERE codigo = $1 LIMIT 1', [data.codigo]);
  if (current.rows[0]?.id) {
    await client.query(
      'UPDATE cortesia SET viagem_id = $2, classe = $3::classe_passagem, motivo = $4, concedido_por = $5 WHERE id = $1',
      [current.rows[0].id, data.viagemId, data.classe, data.motivo, data.userId],
    );
    return current.rows[0].id;
  }
  const inserted = await client.query(
    `
    INSERT INTO cortesia (codigo, viagem_id, classe, motivo, concedido_por)
    VALUES ($1, $2, $3::classe_passagem, $4, $5)
    RETURNING id
    `,
    [data.codigo, data.viagemId, data.classe, data.motivo, data.userId],
  );
  return inserted.rows[0].id;
}

async function getPrecoPassagem(destino, classe, subtipo) {
  const row = await client.query(
    `
    SELECT ip.id
    FROM item_preco ip
    JOIN tabela_preco tp ON tp.id = ip.tabela_id
    WHERE tp.tipo = 'passagem' AND tp.ativo = true
      AND ip.origem_sigla = 'BEL' AND ip.destino_sigla = $1
      AND ip.classe = $2::classe_passagem AND ip.subtipo = $3
    LIMIT 1
    `,
    [destino, classe, subtipo],
  );
  return row.rows[0]?.id ?? null;
}

async function getId(table, column, value) {
  const allowedTables = new Set(['viagem', 'palete', 'bilhete', 'carga']);
  const allowedColumns = new Set(['codigo']);
  if (!allowedTables.has(table) || !allowedColumns.has(column)) throw new Error('getId invalido');
  const row = await client.query(`SELECT id FROM ${table} WHERE ${column} = $1 LIMIT 1`, [value]);
  if (!row.rows[0]?.id) throw new Error(`${table}.${column} nao encontrado: ${value}`);
  return row.rows[0].id;
}

async function getCliente(nome) {
  const row = await client.query('SELECT id FROM cliente WHERE nome = $1 LIMIT 1', [nome]);
  if (!row.rows[0]?.id) throw new Error(`cliente nao encontrado: ${nome}`);
  return row.rows[0].id;
}

async function getAgente(nome) {
  const row = await client.query('SELECT id FROM agente WHERE nome = $1 LIMIT 1', [nome]);
  if (!row.rows[0]?.id) throw new Error(`agente nao encontrado: ${nome}`);
  return row.rows[0].id;
}
