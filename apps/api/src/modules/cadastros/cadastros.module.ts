import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CadastrosController } from './cadastros.controller';
import { CadastrosRepository } from './cadastros.repository';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CadastrosController],
  providers: [CadastrosRepository],
  exports: [CadastrosRepository],
})
export class CadastrosModule {}
