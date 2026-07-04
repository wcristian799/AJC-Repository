import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CaixaController } from './caixa.controller';
import { CaixaRepository } from './caixa.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CaixaController],
  providers: [CaixaRepository],
  exports: [CaixaRepository],
})
export class CaixaModule {}
