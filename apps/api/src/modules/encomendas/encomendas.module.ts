import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TmsModule } from '../tms/tms.module';
import { EncomendasController } from './encomendas.controller';

@Module({
  imports: [AuthModule, TmsModule],
  controllers: [EncomendasController],
})
export class EncomendasModule {}
