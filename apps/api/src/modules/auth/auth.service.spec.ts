import { UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  const baseUser: AuthUser = {
    id: '11111111-1111-4111-8111-111111111111',
    nome: 'Admin AJC',
    login: 'admin',
    email: 'admin@ajc.local',
    perfilId: '22222222-2222-4222-8222-222222222222',
    perfilNome: 'Administrador',
    permissions: ['cadastros.ver', 'vendas.vender'],
  };

  let passwords: PasswordService;
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let storedHash: string;
  let storedRefresh = '';

  beforeEach(async () => {
    passwords = new PasswordService();
    storedHash = await passwords.hash('admin123');
    repository = {
      findUserByLogin: jest.fn(async () => ({ ...baseUser, senhaHash: storedHash })),
      findUserById: jest.fn(async () => baseUser),
      createSession: jest.fn(async () => '33333333-3333-4333-8333-333333333333'),
      rotateSession: jest.fn(async (_sessionId, refreshToken) => {
        storedRefresh = refreshToken;
      }),
      isRefreshValid: jest.fn(async (_sessionId, refreshToken) => refreshToken === storedRefresh),
      revokeSession: jest.fn(async () => undefined),
    } as unknown as jest.Mocked<AuthRepository>;
    service = new AuthService(repository, passwords, new TokenService());
  });

  it('autentica, remove hash da resposta e permite refresh rotacionado', async () => {
    const login = await service.login('admin', 'admin123', 'notebook-dev');

    expect(login.user).toEqual(baseUser);
    expect(login.accessToken).toContain('.');
    expect(login.refreshToken).toContain('.');
    expect(repository.createSession).toHaveBeenCalledWith(baseUser.id, 'notebook-dev');
    expect(repository.rotateSession).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333', login.refreshToken);

    const refresh = await service.refresh(login.refreshToken);
    expect(refresh.user.login).toBe('admin');
    expect(repository.isRefreshValid).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333', login.refreshToken);
  });

  it('nega senha invalida sem criar sessao', async () => {
    await expect(service.login('admin', 'senha-errada')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('revoga a sessao do token de acesso', async () => {
    const login = await service.login('admin', 'admin123');
    const payload = service.verifyAccessToken(login.accessToken);
    await expect(service.logout(payload)).resolves.toEqual({ ok: true });
    expect(repository.revokeSession).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333');
  });
});
