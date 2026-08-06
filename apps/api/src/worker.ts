import PgBoss from 'pg-boss';
import { Pool } from 'pg';
import { setTimeout as sleep } from 'node:timers/promises';
import { FiscalWorkerService } from './modules/fiscal/fiscal-worker.service';

/**
 * Worker pg-boss — processo SEPARADO da api (mesmo código, comando diferente).
 * Usa o MESMO Postgres da aplicação (schema `pgboss`), sem Redis/broker externo.
 * Prova a separação web/jobs do ADR 00 §8.1.
 */
const QUEUE_HELLO = 'hello';
const QUEUE_BPE = 'fiscal-bpe-emitir';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida no ambiente');
  }

  const boss = new PgBoss({ connectionString });
  const pool = new Pool({ connectionString });
  const fiscal = new FiscalWorkerService(pool);
  boss.on('error', (err) => console.error('[worker] pg-boss error', err));
  await boss.start();
  console.log('[worker] pg-boss iniciado (schema pgboss)');

  await boss.createQueue(QUEUE_HELLO);
  await boss.createQueue(QUEUE_BPE);
  await boss.work(QUEUE_HELLO, async ([job]) => {
    console.log('[worker] job processado:', job.id, job.data);
  });
  await boss.work(QUEUE_BPE, async (jobs) => {
    for (const job of jobs) {
      const documentId = String((job.data as { documentId?: unknown })?.documentId ?? '');
      if (!documentId) continue;
      const result = await fiscal.process(documentId);
      console.log('[worker] BP-e processado:', documentId, result);
    }
  });

  const scanFiscalOutbox = async () => {
    try {
      const ids = await fiscal.listReady();
      for (const documentId of ids) {
        await boss.send(QUEUE_BPE, { documentId }, {
          singletonKey: documentId,
          singletonSeconds: 300,
        });
      }
    } catch (error) {
      console.error('[worker] falha ao varrer outbox fiscal:', error);
    }
  };
  await scanFiscalOutbox();
  setInterval(() => void scanFiscalOutbox(), 10_000).unref();

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
