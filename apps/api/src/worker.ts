import PgBoss from 'pg-boss';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Worker pg-boss — processo SEPARADO da api (mesmo código, comando diferente).
 * Usa o MESMO Postgres da aplicação (schema `pgboss`), sem Redis/broker externo.
 * Prova a separação web/jobs do ADR 00 §8.1.
 */
const QUEUE_HELLO = 'hello';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida no ambiente');
  }

  const boss = new PgBoss({ connectionString });
  boss.on('error', (err) => console.error('[worker] pg-boss error', err));
  await boss.start();
  console.log('[worker] pg-boss iniciado (schema pgboss)');

  await boss.createQueue(QUEUE_HELLO);
  await boss.work(QUEUE_HELLO, async ([job]) => {
    console.log('[worker] job processado:', job.id, job.data);
  });

  // Job de fumaça: prova ponta a ponta (enfileira → consome).
  if (process.env.WORKER_SMOKE === '1') {
    await boss.send(QUEUE_HELLO, { msg: 'olá do worker', at: new Date().toISOString() });
    console.log('[worker] job de fumaça enfileirado');
    await sleep(2000);
  }
}

main().catch((err) => {
  console.error('[worker] falhou:', err);
  process.exit(1);
});
