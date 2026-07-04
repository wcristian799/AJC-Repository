import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PortalController } from './portal.controller';
import { PortalRepository } from './portal.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PortalController],
  providers: [PortalRepository],
})
export class PortalModule {}
