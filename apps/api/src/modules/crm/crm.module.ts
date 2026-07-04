import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CrmController } from './crm.controller';
import { CrmRepository } from './crm.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CrmController],
  providers: [CrmRepository],
  exports: [CrmRepository],
})
export class CrmModule {}
