import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthTokenPayload, AuthUser, TokenPair } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

export interface AuthResponse extends TokenPair {
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(login: string, password: string, dispositivo?: string): Promise<AuthResponse> {
    const user = await this.repository.findUserByLogin(login.trim());
    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const validPassword = await this.passwords.verify(password, user.senhaHash);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const sessionId = await this.repository.createSession(user.id, dispositivo);
    const response = this.buildResponse(user, sessionId);
    await this.repository.rotateSession(sessionId, response.refreshToken);
    return response;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.tokens.verify(refreshToken, 'refresh');
    const validSession = await this.repository.isRefreshValid(payload.sid, refreshToken);
    if (!validSession) {
      throw new UnauthorizedException('Sessao invalida');
    }

    const user = await this.repository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario inativo');
    }

    const response = this.buildResponse(user, payload.sid);
    await this.repository.rotateSession(payload.sid, response.refreshToken);
    return response;
  }

  async me(payload: AuthTokenPayload): Promise<AuthUser> {
    const user = await this.repository.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario inativo');
    }
    return user;
  }

  async logout(payload: AuthTokenPayload): Promise<{ ok: true }> {
    await this.repository.revokeSession(payload.sid);
    return { ok: true };
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    return this.tokens.verify(token, 'access');
  }

  private buildResponse(userWithHash: AuthUser & { senhaHash?: string }, sessionId: string): AuthResponse {
    const { senhaHash: _senhaHash, ...user } = userWithHash;
    return {
      user,
      ...this.tokens.createPair(user, sessionId),
    };
  }
}
