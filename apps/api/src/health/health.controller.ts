import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

/**
 * Health-check: reporta o processo E a conectividade do banco.
 * Com o Postgres no ar → db: "up". Com o Postgres derrubado → db: "down"
 * (não retorna 200 cego).
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'down';
    let dbError: string | undefined;
    try {
      await this.pool.query('SELECT 1');
      db = 'up';
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'ajc-api',
      db,
      ...(dbError ? { dbError } : {}),
      timestamp: new Date().toISOString(),
    };
  }
}
