import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService, AuthResponse } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthTokenPayload, AuthUser } from './auth.types';

interface LoginBody {
  login?: unknown;
  password?: unknown;
  dispositivo?: unknown;
}

interface RefreshBody {
  refreshToken?: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody): Promise<AuthResponse> {
    const login = this.requiredString(body.login, 'login');
    const password = this.requiredString(body.password, 'password');
    const dispositivo = this.optionalString(body.dispositivo, 'dispositivo');
    return this.auth.login(login, password, dispositivo);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshBody): Promise<AuthResponse> {
    const refreshToken = this.requiredString(body.refreshToken, 'refreshToken');
    return this.auth.refresh(refreshToken);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthTokenPayload): Promise<{ ok: true }> {
    return this.auth.logout(user);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload): Promise<AuthUser> {
    return this.auth.me(user);
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} obrigatorio`);
    }
    return value.trim();
  }

  private optionalString(value: unknown, field: string): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} invalido`);
    }
    return value.trim();
  }
}
