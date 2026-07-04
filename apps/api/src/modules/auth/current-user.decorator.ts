import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from './auth.types';

export interface AuthenticatedRequest {
  user?: AuthTokenPayload;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthTokenPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser usado sem AuthGuard');
    }
    return request.user;
  },
);
