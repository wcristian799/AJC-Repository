import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import { HealthController } from './health.controller';
import { PG_POOL } from '../database/database.constants';

/**
 * Smoke test do harness (Jest + @nestjs/testing) e do contrato do health-check.
 * O Pool é mockado: sem banco real aqui — testa a lógica up/down do controller.
 */
describe('HealthController', () => {
  async function build(queryImpl: () => Promise<unknown>) {
    const poolMock = { query: jest.fn(queryImpl) } as unknown as Pool;
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PG_POOL, useValue: poolMock }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  it('reporta db up e status ok quando o SELECT 1 responde', async () => {
    const controller = await build(async () => ({ rows: [{ '?column?': 1 }] }));
    const res = await controller.check();
    expect(res.db).toBe('up');
    expect(res.status).toBe('ok');
    expect(res.service).toBe('ajc-api');
  });

  it('reporta db down e status degraded quando o banco falha', async () => {
    const controller = await build(async () => {
      throw new Error('connection refused');
    });
    const res = await controller.check();
    expect(res.db).toBe('down');
    expect(res.status).toBe('degraded');
    expect(res.dbError).toContain('connection refused');
  });
});
