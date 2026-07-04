import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, PasswordService, TokenService, AuthGuard],
  exports: [AuthService, AuthGuard, PasswordService],
})
export class AuthModule {}
