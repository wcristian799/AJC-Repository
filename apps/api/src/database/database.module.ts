import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

/**
 * Módulo de banco — expõe um Pool `pg` único, configurado por DATABASE_URL.
 * App desacoplado da hospedagem: trocar a env muda o alvo (VPS hoje, Cloud SQL/RDS amanhã).
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL não definida no ambiente');
        }
        return new Pool({ connectionString, max: 10 });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
