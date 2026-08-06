import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { FiscalController } from './fiscal.controller';
import { FiscalRepository } from './fiscal.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FiscalController],
  providers: [FiscalRepository],
  exports: [FiscalRepository],
})
export class FiscalModule {}
