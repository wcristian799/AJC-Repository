export type PermissionCode = `${string}.${string}`;

export interface AuthUser {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  perfilId: string;
  perfilNome: string;
  permissions: PermissionCode[];
}

export interface AuthTokenPayload {
  sub: string;
  login: string;
  perfilId: string;
  perfilNome: string;
  permissions: PermissionCode[];
  sid: string;
  typ: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}
