import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { AuthUser, PermissionCode } from './auth.types';

interface UserRow {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  senha_hash: string;
  perfil_id: string;
  perfil_nome: string;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async findUserByLogin(login: string): Promise<(AuthUser & { senhaHash: string }) | null> {
    const row = await this.db.one<UserRow>(
      `
      SELECT u.id, u.nome, u.login, u.email, u.senha_hash, p.id AS perfil_id, p.nome AS perfil_nome
      FROM usuario u
      JOIN perfil p ON p.id = u.perfil_id
      WHERE u.login = $1
        AND u.ativo = true
        AND u.excluido_em IS NULL
        AND p.ativo = true
      LIMIT 1
      `,
      [login],
    );
    if (!row) return null;
    const permissions = await this.permissionsForProfile(row.perfil_id);
    return {
      id: row.id,
      nome: row.nome,
      login: row.login,
      email: row.email,
      perfilId: row.perfil_id,
      perfilNome: row.perfil_nome,
      permissions,
      senhaHash: row.senha_hash,
    };
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const row = await this.db.one<UserRow>(
      `
      SELECT u.id, u.nome, u.login, u.email, u.senha_hash, p.id AS perfil_id, p.nome AS perfil_nome
      FROM usuario u
      JOIN perfil p ON p.id = u.perfil_id
      WHERE u.id = $1
        AND u.ativo = true
        AND u.excluido_em IS NULL
        AND p.ativo = true
      LIMIT 1
      `,
      [id],
    );
    if (!row) return null;
    return {
      id: row.id,
      nome: row.nome,
      login: row.login,
      email: row.email,
      perfilId: row.perfil_id,
      perfilNome: row.perfil_nome,
      permissions: await this.permissionsForProfile(row.perfil_id),
    };
  }

  async createSession(userId: string, dispositivo?: string): Promise<string> {
    const expiraEm = new Date(Date.now() + this.refreshTtlMs()).toISOString();
    return this.db.tx(async (client) => {
      const result = await client.query<{ id: string }>(
        `
        INSERT INTO sessao (usuario_id, dispositivo, refresh_hash, expira_em)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [userId, dispositivo ?? null, `pending:${randomUUID()}`, expiraEm],
      );
      await client.query('UPDATE usuario SET ultimo_login_em = now() WHERE id = $1', [userId]);
      return result.rows[0].id;
    });
  }

  async rotateSession(sessionId: string, refreshToken: string, client?: PoolClient): Promise<void> {
    const executor = client ?? this.db;
    await executor.query(
      `
      UPDATE sessao
      SET refresh_hash = $2, expira_em = $3, revogada_em = NULL
      WHERE id = $1
      `,
      [sessionId, this.hashRefresh(refreshToken), new Date(Date.now() + this.refreshTtlMs()).toISOString()],
    );
  }

  async isRefreshValid(sessionId: string, refreshToken: string): Promise<boolean> {
    const row = await this.db.one<{ id: string }>(
      `
      SELECT id
      FROM sessao
      WHERE id = $1
        AND refresh_hash = $2
        AND revogada_em IS NULL
        AND expira_em > now()
      LIMIT 1
      `,
      [sessionId, this.hashRefresh(refreshToken)],
    );
    return Boolean(row);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db.query('UPDATE sessao SET revogada_em = now() WHERE id = $1', [sessionId]);
  }

  private async permissionsForProfile(perfilId: string): Promise<PermissionCode[]> {
    const result = await this.db.query<{ code: PermissionCode }>(
      `
      SELECT (pe.modulo || '.' || pe.acao)::text AS code
      FROM perfil_permissao pp
      JOIN permissao pe ON pe.id = pp.permissao_id
      WHERE pp.perfil_id = $1
      ORDER BY pe.modulo, pe.acao
      `,
      [perfilId],
    );
    return result.rows.map((row) => row.code);
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTtlMs(): number {
    return Number(process.env.AUTH_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60) * 1000;
  }
}
