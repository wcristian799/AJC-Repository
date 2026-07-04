import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { NavegacaoController } from './navegacao.controller';
import { NavegacaoRepository } from './navegacao.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [NavegacaoController],
  providers: [NavegacaoRepository],
  exports: [NavegacaoRepository],
})
export class NavegacaoModule {}
