import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PrecosController } from './precos.controller';
import { PrecosRepository } from './precos.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PrecosController],
  providers: [PrecosRepository],
  exports: [PrecosRepository],
})
export class PrecosModule {}
