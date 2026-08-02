import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TmsController } from './tms.controller';
import { TmsDocumentService } from './tms-document.service';
import { TmsRepository } from './tms.repository';
import { TmsControlRepository } from './tms-control.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TmsController],
  providers: [TmsRepository, TmsControlRepository, TmsDocumentService],
  exports: [TmsRepository],
})
export class TmsModule {}
