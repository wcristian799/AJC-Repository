import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { OperacaoController } from './operacao.controller';
import { OperacaoRepository } from './operacao.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OperacaoController],
  providers: [OperacaoRepository],
})
export class OperacaoModule {}
