import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TmsController } from './tms.controller';
import { TmsRepository } from './tms.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TmsController],
  providers: [TmsRepository],
  exports: [TmsRepository],
})
export class TmsModule {}
