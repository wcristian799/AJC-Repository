import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CadastrosModule } from './modules/cadastros/cadastros.module';
import { CaixaModule } from './modules/caixa/caixa.module';
import { ConfigModule } from './modules/config/config.module';
import { CrmModule } from './modules/crm/crm.module';
import { EncomendasModule } from './modules/encomendas/encomendas.module';
import { NavegacaoModule } from './modules/navegacao/navegacao.module';
import { OperacaoModule } from './modules/operacao/operacao.module';
import { PortalModule } from './modules/portal/portal.module';
import { PrecosModule } from './modules/precos/precos.module';
import { TmsModule } from './modules/tms/tms.module';
import { VeiculosModule } from './modules/veiculos/veiculos.module';
import { VendasModule } from './modules/vendas/vendas.module';

/**
 * AppModule — raiz do monolito modular.
 *
 * Os módulos de domínio do MVP (auth, config, cadastros, clientes, navegacao,
 * precos, tms, vendas, caixa, encomendas, crm, sync, notificacao, telemetria,
 * audit) serão registrados aqui conforme forem criados (E4-H2 em diante).
 * Regra de ouro: módulos se falam por interface de service, nunca por tabela alheia.
 */
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ConfigModule,
    CadastrosModule,
    PrecosModule,
    NavegacaoModule,
    TmsModule,
    VeiculosModule,
    EncomendasModule,
    VendasModule,
    CaixaModule,
    CrmModule,
    OperacaoModule,
    PortalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
