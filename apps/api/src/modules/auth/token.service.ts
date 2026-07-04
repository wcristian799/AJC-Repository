import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { AuthTokenPayload, AuthUser, TokenPair } from './auth.types';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

@Injectable()
export class TokenService {
  private readonly secret = this.resolveSecret();
  private readonly accessTtlSeconds = Number(process.env.AUTH_ACCESS_TTL_SECONDS ?? 15 * 60);
  private readonly refreshTtlSeconds = Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60);

  createPair(user: AuthUser, sessionId: string): TokenPair {
    return {
      accessToken: this.sign(user, sessionId, 'access', this.accessTtlSeconds),
      refreshToken: this.sign(user, sessionId, 'refresh', this.refreshTtlSeconds),
      accessExpiresIn: this.accessTtlSeconds,
      refreshExpiresIn: this.refreshTtlSeconds,
    };
  }

  verify(token: string, expectedType: 'access' | 'refresh'): AuthTokenPayload {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Token invalido');
    }

    const expected = this.signature(encodedPayload);
    if (signature !== expected) {
      throw new UnauthorizedException('Assinatura invalida');
    }

    let payload: AuthTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Token malformado');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.typ !== expectedType || payload.exp <= now) {
      throw new UnauthorizedException('Token expirado ou tipo invalido');
    }

    return payload;
  }

  opaqueRefreshSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  private sign(user: AuthUser, sessionId: string, typ: 'access' | 'refresh', ttlSeconds: number): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      sub: user.id,
      login: user.login,
      perfilId: user.perfilId,
      perfilNome: user.perfilNome,
      permissions: user.permissions,
      sid: sessionId,
      typ,
      iat: now,
      exp: now + ttlSeconds,
    };
    const encodedPayload = base64url(JSON.stringify(payload));
    return `${encodedPayload}.${this.signature(encodedPayload)}`;
  }

  private signature(encodedPayload: string): string {
    return createHmac('sha256', this.secret).update(encodedPayload).digest('base64url');
  }

  private resolveSecret(): string {
    const secret = process.env.AUTH_TOKEN_SECRET ?? process.env.AUTH_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_TOKEN_SECRET precisa estar definido em producao');
    }
    return 'ajc-dev-auth-secret-change-me';
  }
}
