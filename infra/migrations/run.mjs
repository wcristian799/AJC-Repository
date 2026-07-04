#!/usr/bin/env node
/**
 * Runner de migrations — SQL puro sobre `pg`, sem ORM.
 *
 * Aplica, EM ORDEM, todos os arquivos `NNNN_*.sql` deste diretório que ainda
 * não constam em `schema_migrations`. Cada aplicação roda o arquivo inteiro e,
 * no sucesso, grava (versao, sha256) na tabela de controle.
 *
 * Uso (dentro do WSL, onde localhost:5432 é nativo):
 *   DATABASE_URL=postgresql://ajc:ajc_dev@localhost:5432/ajc node run.mjs
 *   node run.mjs --status     # só lista o que aplicou / o que falta
 *   node run.mjs --baseline   # marca todos os arquivos como aplicados SEM rodar
 *                             # (usar uma única vez para bancos já migrados à mão)
 *
 * Observações:
 * - A tabela `schema_migrations` é criada por 0008. Antes dela existir, o runner
 *   a cria on-the-fly para conseguir registrar (idempotente).
 * - Arquivos que contêm ALTER TYPE ... ADD VALUE não podem rodar dentro de uma
 *   transação junto ao uso do valor; por isso cada arquivo roda como veio
 *   (o próprio .sql decide se abre BEGIN/COMMIT). O runner não embrulha em TX.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// `pg` está em apps/api/node_modules (não hoisted para a raiz). Como este runner
// mora em infra/, a resolução ESM padrão não o encontra; ancoramos o require no
// package.json da api. PG_REQUIRE_BASE permite sobrescrever se o layout mudar.
const requireBase =
  process.env.PG_REQUIRE_BASE ?? join(__dirname, '../../apps/api/package.json');
const require = createRequire(requireBase);
const pg = require('pg');
const args = new Set(process.argv.slice(2));
const STATUS_ONLY = args.has('--status');
const BASELINE = args.has('--baseline');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não definida no ambiente.');
  process.exit(1);
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const files = readdirSync(__dirname)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

const client = new pg.Client({ connectionString });
await client.connect();

// Garante a tabela de controle mesmo antes de 0008 rodar.
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    versao      text PRIMARY KEY,
    hash        text NOT NULL,
    aplicado_em timestamptz NOT NULL DEFAULT now()
  );
`);

const applied = new Set(
  (await client.query('SELECT versao FROM schema_migrations')).rows.map((r) => r.versao),
);

const pending = files.filter((f) => !applied.has(f));

if (STATUS_ONLY) {
  console.log(`Aplicadas: ${files.length - pending.length}/${files.length}`);
  for (const f of files) console.log(`  ${applied.has(f) ? '✓' : '·'} ${f}`);
  await client.end();
  process.exit(0);
}

if (BASELINE) {
  for (const f of pending) {
    const sql = readFileSync(join(__dirname, f), 'utf8');
    await client.query(
      'INSERT INTO schema_migrations (versao, hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [f, sha256(sql)],
    );
    console.log(`baseline: registrado ${f} (sem executar)`);
  }
  await client.end();
  process.exit(0);
}

if (pending.length === 0) {
  console.log('Nada a aplicar — banco em dia.');
  await client.end();
  process.exit(0);
}

for (const f of pending) {
  const sql = readFileSync(join(__dirname, f), 'utf8');
  process.stdout.write(`>>> aplicando ${f} ... `);
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (versao, hash) VALUES ($1, $2) ON CONFLICT (versao) DO UPDATE SET hash = EXCLUDED.hash',
      [f, sha256(sql)],
    );
    console.log('ok');
  } catch (err) {
    console.log('FALHOU');
    console.error(err.message);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log(`Concluído: ${pending.length} migration(s) aplicada(s).`);
