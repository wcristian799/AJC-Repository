import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigController } from './config.controller';
import { ConfigRepository } from './config.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ConfigController],
  providers: [ConfigRepository],
  exports: [ConfigRepository],
})
export class ConfigModule {}
