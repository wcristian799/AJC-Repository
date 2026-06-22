import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

/**
 * AppModule — raiz do monolito modular.
 *
 * Os módulos de domínio do MVP (auth, config, cadastros, clientes, navegacao,
 * precos, tms, vendas, caixa, encomendas, crm, sync, notificacao, telemetria,
 * audit) serão registrados aqui conforme forem criados (E4-H2 em diante).
 * Regra de ouro: módulos se falam por interface de service, nunca por tabela alheia.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class AppModule {}
