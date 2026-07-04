import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { VeiculosController } from './veiculos.controller';
import { VeiculosRepository } from './veiculos.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [VeiculosController],
  providers: [VeiculosRepository],
})
export class VeiculosModule {}
