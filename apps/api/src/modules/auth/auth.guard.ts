import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTokenPayload, PermissionCode } from './auth.types';
import { PERMISSIONS_KEY } from './permissions.decorator';

type AuthenticatedRequest = Request & { user?: AuthTokenPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    const payload = this.auth.verifyAccessToken(token);
    this.requirePermissions(context, payload.permissions);
    request.user = payload;
    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException('Token ausente');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token invalido');
    }
    return token;
  }

  private requirePermissions(context: ExecutionContext, granted: PermissionCode[]): void {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return;
    }

    const grantedSet = new Set(granted);
    const missing = required.filter((permission) => !grantedSet.has(permission));
    if (missing.length > 0) {
      throw new ForbiddenException('Permissao insuficiente');
    }
  }
}
