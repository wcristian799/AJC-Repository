import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { VendasController } from './vendas.controller';
import { VendasRepository } from './vendas.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VendasController],
  providers: [VendasRepository],
  exports: [VendasRepository],
})
export class VendasModule {}
