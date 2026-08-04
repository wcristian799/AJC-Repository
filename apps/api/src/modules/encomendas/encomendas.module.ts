import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { EncomendasController } from './encomendas.controller';
import { EncomendasRepository } from './encomendas.repository';
import { EncomendasStorageService } from './encomendas-storage.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EncomendasController],
  providers: [EncomendasRepository, EncomendasStorageService],
})
export class EncomendasModule {}
