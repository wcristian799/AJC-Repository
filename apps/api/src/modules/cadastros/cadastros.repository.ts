import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { PasswordService } from '../auth/password.service';

export interface CidadeDto {
  sigla: string;
  nome: string;
  uf: string;
  isBase: boolean;
  ativo: boolean;
}

export interface EmbarcacaoDto {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  capacidadeCarga: number | null;
  capacidadePax: Record<string, unknown>;
}

export interface AgenteDto {
  id: string;
  nome: string;
  cidadeSigla: string;
  percentualComissao: number | null;
  ativo: boolean;
}

export interface ClienteDto {
  id: string;
  tipo: string;
  nome: string;
  cpfCnpj: string | null;
  cidadeSigla: string | null;
  agenteId: string | null;
  contatos: unknown[];
}

export interface SaveClienteInput {
  tipo?: 'PF' | 'PJ';
  nome?: string;
  cpfCnpj?: string | null;
  cidadeSigla?: string | null;
  agenteId?: string | null;
  contatos?: unknown[];
}

export interface SaveFornecedorInput {
  nome?: string;
  cnpj?: string | null;
  categoria?: string | null;
  contatos?: unknown[];
  dadosBancarios?: Record<string, unknown> | null;
}

export interface SaveColaboradorInput {
  nome?: string;
  funcao?: string | null;
  cidadeSigla?: string | null;
  contatoWhatsapp?: string | null;
}

export interface SaveEmbarcacaoInput {
  nome?: string;
  tipo?: 'passeio_carga' | 'carga';
  status?: 'ativa' | 'manutencao' | 'alugada';
  capacidadeCarga?: number | null;
  capacidadePax?: Record<string, unknown>;
}

export interface SaveUsuarioInput {
  nome?: string;
  login?: string;
  email?: string | null;
  perfilId?: string;
  password?: string;
  ativo?: boolean;
}

export interface SavePerfilInput {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
  permissions?: string[];
}

export interface UsuarioDto {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  perfilId: string;
  perfilNome: string;
  ativo: boolean;
}

export interface PerfilDto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  permissions: string[];
}

export interface FornecedorDto {
  id: string;
  nome: string;
  cnpj: string | null;
  categoria: string | null;
  contatos: unknown[];
  ativo: boolean;
}

export interface ColaboradorDto {
  id: string;
  nome: string;
  funcao: string | null;
  cidadeSigla: string | null;
  contatoWhatsapp: string | null;
  ativo: boolean;
}

@Injectable()
export class CadastrosRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async listUsuarios(): Promise<UsuarioDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      login: string;
      email: string | null;
      perfil_id: string;
      perfil_nome: string;
      ativo: boolean;
    }>(
      `
      SELECT u.id, u.nome, u.login, u.email, u.perfil_id, p.nome AS perfil_nome, u.ativo
      FROM usuario u
      JOIN perfil p ON p.id = u.perfil_id
      WHERE u.excluido_em IS NULL
      ORDER BY u.ativo DESC, u.nome
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      login: row.login,
      email: row.email,
      perfilId: row.perfil_id,
      perfilNome: row.perfil_nome,
      ativo: row.ativo,
    }));
  }

  async listPerfis(): Promise<PerfilDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      descricao: string | null;
      ativo: boolean;
      permissions: string[] | null;
    }>(
      `
      SELECT p.id, p.nome, p.descricao, p.ativo,
             COALESCE(array_agg(pe.modulo || '.' || pe.acao ORDER BY pe.modulo, pe.acao)
               FILTER (WHERE pe.id IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM perfil p
      LEFT JOIN perfil_permissao pp ON pp.perfil_id = p.id
      LEFT JOIN permissao pe ON pe.id = pp.permissao_id
      GROUP BY p.id
      ORDER BY p.nome
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      permissions: row.permissions ?? [],
    }));
  }

  async createUsuario(input: SaveUsuarioInput, userId: string): Promise<UsuarioDto> {
    const nome = input.nome?.trim();
    const login = input.login?.trim().toLowerCase();
    if (!nome) throw new BadRequestException('nome obrigatorio');
    if (!login) throw new BadRequestException('login obrigatorio');
    if (!input.perfilId) throw new BadRequestException('perfil obrigatorio');
    if (!input.password || input.password.length < 6) throw new BadRequestException('senha deve ter ao menos 6 caracteres');
    await this.ensurePerfil(input.perfilId);
    const existing = await this.db.one('SELECT id FROM usuario WHERE login = $1 AND excluido_em IS NULL LIMIT 1', [login]);
    if (existing) throw new BadRequestException('Login ja cadastrado');
    const senhaHash = await this.passwordService.hash(input.password);
    const row = await this.db.one<{ id: string }>(
      `
      INSERT INTO usuario (nome, login, email, senha_hash, perfil_id, ativo, criado_por, atualizado_por)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), $7, $7)
      RETURNING id
      `,
      [nome, login, emptyToNull(input.email), senhaHash, input.perfilId, input.ativo ?? true, userId],
    );
    await this.audit('usuario', row!.id, 'criar', userId, withoutPassword(input));
    return this.findUsuario(row!.id);
  }

  async updateUsuario(id: string, input: SaveUsuarioInput, userId: string): Promise<UsuarioDto> {
    const current = await this.db.one('SELECT id FROM usuario WHERE id = $1 AND excluido_em IS NULL', [id]);
    if (!current) throw new NotFoundException('Usuario nao encontrado');
    if (input.perfilId) await this.ensurePerfil(input.perfilId);
    const login = input.login?.trim().toLowerCase();
    if (login) {
      const duplicate = await this.db.one('SELECT id FROM usuario WHERE login = $1 AND id <> $2 AND excluido_em IS NULL LIMIT 1', [login, id]);
      if (duplicate) throw new BadRequestException('Login ja cadastrado');
    }
    let senhaHash: string | null = null;
    if (input.password !== undefined) {
      if (input.password.length < 6) throw new BadRequestException('senha deve ter ao menos 6 caracteres');
      senhaHash = await this.passwordService.hash(input.password);
    }
    await this.db.query(
      `
      UPDATE usuario
      SET nome = COALESCE(NULLIF($2, ''), nome),
          login = COALESCE(NULLIF($3, ''), login),
          email = CASE WHEN $4::text IS NULL THEN email ELSE NULLIF($4, '') END,
          perfil_id = COALESCE($5::uuid, perfil_id),
          senha_hash = COALESCE($6, senha_hash),
          ativo = COALESCE($7, ativo),
          atualizado_por = $8,
          atualizado_em = now()
      WHERE id = $1 AND excluido_em IS NULL
      `,
      [
        id,
        input.nome ?? null,
        login ?? null,
        input.email === undefined ? null : input.email,
        input.perfilId ?? null,
        senhaHash,
        input.ativo ?? null,
        userId,
      ],
    );
    await this.audit('usuario', id, 'atualizar', userId, withoutPassword(input));
    return this.findUsuario(id);
  }

  async createPerfil(input: SavePerfilInput, userId: string): Promise<PerfilDto> {
    const nome = input.nome?.trim();
    if (!nome) throw new BadRequestException('nome obrigatorio');
    const row = await this.db.tx(async (client) => {
      const duplicate = await client.query('SELECT id FROM perfil WHERE nome = $1 LIMIT 1', [nome]);
      if (duplicate.rows[0]) throw new BadRequestException('Perfil ja cadastrado');
      const created = await client.query<{ id: string }>(
        `
        INSERT INTO perfil (nome, descricao, ativo)
        VALUES ($1, $2, COALESCE($3, true))
        RETURNING id
        `,
        [nome, emptyToNull(input.descricao), input.ativo ?? true],
      );
      await this.syncPerfilPermissions(client, created.rows[0].id, input.permissions ?? []);
      return created.rows[0];
    });
    await this.audit('perfil', row.id, 'criar', userId, input);
    return this.findPerfil(row.id);
  }

  async updatePerfil(id: string, input: SavePerfilInput, userId: string): Promise<PerfilDto> {
    const current = await this.db.one('SELECT id FROM perfil WHERE id = $1', [id]);
    if (!current) throw new NotFoundException('Perfil nao encontrado');
    await this.db.tx(async (client) => {
      if (input.nome?.trim()) {
        const duplicate = await client.query('SELECT id FROM perfil WHERE nome = $1 AND id <> $2 LIMIT 1', [input.nome.trim(), id]);
        if (duplicate.rows[0]) throw new BadRequestException('Perfil ja cadastrado');
      }
      await client.query(
        `
        UPDATE perfil
        SET nome = COALESCE(NULLIF($2, ''), nome),
            descricao = CASE WHEN $3::text IS NULL THEN descricao ELSE NULLIF($3, '') END,
            ativo = COALESCE($4, ativo),
            atualizado_em = now()
        WHERE id = $1
        `,
        [id, input.nome?.trim() ?? null, input.descricao === undefined ? null : input.descricao, input.ativo ?? null],
      );
      if (input.permissions) await this.syncPerfilPermissions(client, id, input.permissions);
    });
    await this.audit('perfil', id, 'atualizar', userId, input);
    return this.findPerfil(id);
  }

  async listCidades(): Promise<CidadeDto[]> {
    const result = await this.db.query<{
      sigla: string;
      nome: string;
      uf: string;
      is_base: boolean;
      ativo: boolean;
    }>(
      `
      SELECT sigla, nome, uf, is_base, ativo
      FROM cidade
      ORDER BY is_base DESC, nome
      `,
    );
    return result.rows.map((row) => ({
      sigla: row.sigla,
      nome: row.nome,
      uf: row.uf,
      isBase: row.is_base,
      ativo: row.ativo,
    }));
  }

  async listEmbarcacoes(): Promise<EmbarcacaoDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      tipo: string;
      status: string;
      capacidade_carga: string | null;
      capacidade_pax: Record<string, unknown> | null;
    }>(
      `
      SELECT id, nome, tipo::text, status::text, capacidade_carga, capacidade_pax
      FROM embarcacao
      WHERE excluido_em IS NULL
      ORDER BY nome
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      status: row.status,
      capacidadeCarga: row.capacidade_carga ? Number(row.capacidade_carga) : null,
      capacidadePax: row.capacidade_pax ?? {},
    }));
  }

  async createEmbarcacao(input: SaveEmbarcacaoInput, userId: string): Promise<EmbarcacaoDto> {
    const nome = input.nome?.trim();
    if (!nome) throw new BadRequestException('nome obrigatorio');
    const tipo = input.tipo ?? 'passeio_carga';
    if (!['passeio_carga', 'carga'].includes(tipo)) throw new BadRequestException('tipo de embarcacao invalido');
    const status = input.status ?? 'ativa';
    if (!['ativa', 'manutencao', 'alugada'].includes(status)) throw new BadRequestException('status de embarcacao invalido');
    const duplicate = await this.db.one('SELECT id FROM embarcacao WHERE lower(nome) = lower($1) AND excluido_em IS NULL LIMIT 1', [nome]);
    if (duplicate) throw new BadRequestException('Embarcacao ja cadastrada');
    const capacidadeCarga = input.capacidadeCarga === undefined || input.capacidadeCarga === null ? null : Number(input.capacidadeCarga);
    if (capacidadeCarga !== null && (!Number.isFinite(capacidadeCarga) || capacidadeCarga < 0)) {
      throw new BadRequestException('capacidadeCarga invalida');
    }
    const capacidadePax = sanitizeCapacidadePax(input.capacidadePax ?? {});
    const row = await this.db.one<{ id: string }>(
      `
      INSERT INTO embarcacao (nome, tipo, capacidade_carga, capacidade_pax, status)
      VALUES ($1, $2::tipo_embarcacao, $3, $4::jsonb, $5::status_embarcacao)
      RETURNING id
      `,
      [nome, tipo, capacidadeCarga, JSON.stringify(capacidadePax), status],
    );
    await this.audit('embarcacao', row!.id, 'criar', userId, { nome, tipo, status, capacidadeCarga, capacidadePax });
    return this.findEmbarcacao(row!.id);
  }

  async updateEmbarcacao(id: string, input: SaveEmbarcacaoInput, userId: string): Promise<EmbarcacaoDto> {
    const before = await this.findEmbarcacao(id);
    const nome = input.nome?.trim() ?? before.nome;
    if (!nome) throw new BadRequestException('nome obrigatorio');
    const tipo = input.tipo ?? (before.tipo as 'passeio_carga' | 'carga');
    if (!['passeio_carga', 'carga'].includes(tipo)) throw new BadRequestException('tipo de embarcacao invalido');
    const status = input.status ?? (before.status as 'ativa' | 'manutencao' | 'alugada');
    if (!['ativa', 'manutencao', 'alugada'].includes(status)) throw new BadRequestException('status de embarcacao invalido');
    const duplicate = await this.db.one(
      'SELECT id FROM embarcacao WHERE lower(nome) = lower($1) AND id <> $2::uuid AND excluido_em IS NULL LIMIT 1',
      [nome, id],
    );
    if (duplicate) throw new BadRequestException('Embarcacao ja cadastrada');
    const capacidadeCarga = input.capacidadeCarga === undefined ? before.capacidadeCarga : input.capacidadeCarga;
    if (capacidadeCarga !== null && capacidadeCarga !== undefined && (!Number.isFinite(Number(capacidadeCarga)) || Number(capacidadeCarga) < 0)) {
      throw new BadRequestException('capacidadeCarga invalida');
    }
    const capacidadePax = input.capacidadePax === undefined ? before.capacidadePax : sanitizeCapacidadePax(input.capacidadePax ?? {});
    await this.db.query(
      `
      UPDATE embarcacao
      SET nome = $2,
          tipo = $3::tipo_embarcacao,
          capacidade_carga = $4,
          capacidade_pax = $5::jsonb,
          status = $6::status_embarcacao,
          atualizado_em = now()
      WHERE id = $1::uuid AND excluido_em IS NULL
      `,
      [id, nome, tipo, capacidadeCarga ?? null, JSON.stringify(capacidadePax), status],
    );
    await this.audit('embarcacao', id, 'atualizar', userId, { before, after: { nome, tipo, status, capacidadeCarga, capacidadePax } });
    return this.findEmbarcacao(id);
  }

  async listAgentes(): Promise<AgenteDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      cidade_sigla: string;
      percentual_comissao: string | null;
      ativo: boolean;
    }>(
      `
      SELECT id, nome, cidade_sigla, percentual_comissao, ativo
      FROM agente
      WHERE excluido_em IS NULL
      ORDER BY nome
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      cidadeSigla: row.cidade_sigla,
      percentualComissao: row.percentual_comissao ? Number(row.percentual_comissao) : null,
      ativo: row.ativo,
    }));
  }

  async listClientes(): Promise<ClienteDto[]> {
    const result = await this.db.query<{
      id: string;
      tipo: string;
      nome: string;
      cpf_cnpj: string | null;
      cidade_sigla: string | null;
      agente_id: string | null;
      contatos: unknown[] | null;
    }>(
      `
      SELECT id, tipo::text, nome, cpf_cnpj, cidade_sigla, agente_id, contatos
      FROM cliente
      WHERE excluido_em IS NULL
      ORDER BY nome
      LIMIT 500
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      nome: row.nome,
      cpfCnpj: row.cpf_cnpj,
      cidadeSigla: row.cidade_sigla,
      agenteId: row.agente_id,
      contatos: row.contatos ?? [],
    }));
  }

  async createCliente(input: SaveClienteInput, userId: string): Promise<ClienteDto> {
    if (!input.nome?.trim()) throw new BadRequestException('nome obrigatorio');
    const tipo = input.tipo ?? guessTipoPessoa(input.cpfCnpj);
    const documento = emptyToNull(input.cpfCnpj);
    if (documento) {
      const existing = await this.db.one('SELECT id FROM cliente WHERE cpf_cnpj = $1 AND excluido_em IS NULL LIMIT 1', [documento]);
      if (existing) throw new BadRequestException('CPF/CNPJ ja cadastrado');
    }
    const row = await this.db.one(
      `
      INSERT INTO cliente (
        tipo, nome, cpf_cnpj, cidade_sigla, agente_id, contatos,
        criado_por, atualizado_por
      )
      VALUES ($1::tipo_pessoa, $2, $3, $4, $5, $6::jsonb, $7, $7)
      RETURNING id
      `,
      [
        tipo,
        input.nome.trim(),
        documento,
        emptyToNull(input.cidadeSigla),
        emptyToNull(input.agenteId),
        JSON.stringify(input.contatos ?? []),
        userId,
      ],
    );
    if (input.agenteId) {
      await this.db.query(
        `
        INSERT INTO cliente_agente_historico (cliente_id, agente_novo_id, motivo, realocado_por)
        VALUES ($1, $2, 'Cadastro inicial', $3)
        `,
        [row.id, input.agenteId, userId],
      );
    }
    return this.findCliente(row.id);
  }

  async updateCliente(id: string, input: SaveClienteInput & { motivoRealocacao?: string }, userId: string): Promise<ClienteDto> {
    const current = await this.db.one('SELECT id, agente_id FROM cliente WHERE id = $1 AND excluido_em IS NULL', [id]);
    if (!current) throw new NotFoundException('Cliente nao encontrado');
    const row = await this.db.one(
      `
      UPDATE cliente
      SET tipo = COALESCE($2::tipo_pessoa, tipo),
          nome = COALESCE(NULLIF($3, ''), nome),
          cpf_cnpj = CASE WHEN $4::text IS NULL THEN cpf_cnpj ELSE NULLIF($4, '') END,
          cidade_sigla = CASE WHEN $5::text IS NULL THEN cidade_sigla ELSE NULLIF($5, '') END,
          agente_id = CASE WHEN $6::text IS NULL THEN agente_id ELSE NULLIF($6, '')::uuid END,
          contatos = CASE WHEN $7::jsonb IS NULL THEN contatos ELSE $7::jsonb END,
          atualizado_por = $8,
          atualizado_em = now()
      WHERE id = $1 AND excluido_em IS NULL
      RETURNING id, agente_id
      `,
      [
        id,
        input.tipo ?? null,
        input.nome ?? null,
        input.cpfCnpj === undefined ? null : input.cpfCnpj,
        input.cidadeSigla === undefined ? null : input.cidadeSigla,
        input.agenteId === undefined ? null : input.agenteId,
        input.contatos === undefined ? null : JSON.stringify(input.contatos),
        userId,
      ],
    );
    if (input.agenteId !== undefined && input.agenteId && input.agenteId !== current.agente_id) {
      await this.db.query(
        `
        INSERT INTO cliente_agente_historico (
          cliente_id, agente_anterior_id, agente_novo_id, motivo, realocado_por
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [id, current.agente_id, input.agenteId, input.motivoRealocacao ?? 'Realocacao via CRM', userId],
      );
    }
    return this.findCliente(row.id);
  }

  private async findCliente(id: string): Promise<ClienteDto> {
    const row = await this.db.one<{
      id: string;
      tipo: string;
      nome: string;
      cpf_cnpj: string | null;
      cidade_sigla: string | null;
      agente_id: string | null;
      contatos: unknown[] | null;
    }>(
      `
      SELECT id, tipo::text, nome, cpf_cnpj, cidade_sigla, agente_id, contatos
      FROM cliente
      WHERE id = $1 AND excluido_em IS NULL
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Cliente nao encontrado');
    return {
      id: row.id,
      tipo: row.tipo,
      nome: row.nome,
      cpfCnpj: row.cpf_cnpj,
      cidadeSigla: row.cidade_sigla,
      agenteId: row.agente_id,
      contatos: row.contatos ?? [],
    };
  }

  async listFornecedores(): Promise<FornecedorDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      cnpj: string | null;
      categoria: string | null;
      contatos: unknown[] | null;
      ativo: boolean;
    }>(
      `
      SELECT id, nome, cnpj, categoria, contatos, ativo
      FROM fornecedor
      WHERE excluido_em IS NULL
      ORDER BY ativo DESC, nome
      LIMIT 500
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      cnpj: row.cnpj,
      categoria: row.categoria,
      contatos: row.contatos ?? [],
      ativo: row.ativo,
    }));
  }

  async createFornecedor(input: SaveFornecedorInput): Promise<FornecedorDto> {
    if (!input.nome?.trim()) throw new BadRequestException('nome obrigatorio');
    const cnpj = emptyToNull(input.cnpj);
    if (cnpj) {
      const existing = await this.db.one('SELECT id FROM fornecedor WHERE cnpj = $1 AND excluido_em IS NULL LIMIT 1', [cnpj]);
      if (existing) throw new BadRequestException('CNPJ ja cadastrado');
    }
    const row = await this.db.one<{ id: string }>(
      `
      INSERT INTO fornecedor (nome, cnpj, categoria, contatos, dados_bancarios, ativo)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, true)
      RETURNING id
      `,
      [
        input.nome.trim(),
        cnpj,
        emptyToNull(input.categoria),
        JSON.stringify(input.contatos ?? []),
        input.dadosBancarios ? JSON.stringify(input.dadosBancarios) : null,
      ],
    );
    if (!row) throw new BadRequestException('Fornecedor nao criado');
    return this.findFornecedor(row.id);
  }

  private async findFornecedor(id: string): Promise<FornecedorDto> {
    const row = await this.db.one<{
      id: string;
      nome: string;
      cnpj: string | null;
      categoria: string | null;
      contatos: unknown[] | null;
      ativo: boolean;
    }>(
      `
      SELECT id, nome, cnpj, categoria, contatos, ativo
      FROM fornecedor
      WHERE id = $1 AND excluido_em IS NULL
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Fornecedor nao encontrado');
    return {
      id: row.id,
      nome: row.nome,
      cnpj: row.cnpj,
      categoria: row.categoria,
      contatos: row.contatos ?? [],
      ativo: row.ativo,
    };
  }

  async listColaboradores(): Promise<ColaboradorDto[]> {
    const result = await this.db.query<{
      id: string;
      nome: string;
      funcao: string | null;
      cidade_sigla: string | null;
      contato_whatsapp: string | null;
      ativo: boolean;
    }>(
      `
      SELECT id, nome, funcao, cidade_sigla, contato_whatsapp, ativo
      FROM colaborador
      WHERE excluido_em IS NULL
      ORDER BY ativo DESC, nome
      LIMIT 500
      `,
    );
    return result.rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      funcao: row.funcao,
      cidadeSigla: row.cidade_sigla,
      contatoWhatsapp: row.contato_whatsapp,
      ativo: row.ativo,
    }));
  }

  async createColaborador(input: SaveColaboradorInput): Promise<ColaboradorDto> {
    if (!input.nome?.trim()) throw new BadRequestException('nome obrigatorio');
    const row = await this.db.one<{ id: string }>(
      `
      INSERT INTO colaborador (nome, funcao, cidade_sigla, contato_whatsapp, ativo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id
      `,
      [
        input.nome.trim(),
        emptyToNull(input.funcao),
        emptyToNull(input.cidadeSigla),
        emptyToNull(input.contatoWhatsapp),
      ],
    );
    if (!row) throw new BadRequestException('Colaborador nao criado');
    return this.findColaborador(row.id);
  }

  private async findColaborador(id: string): Promise<ColaboradorDto> {
    const row = await this.db.one<{
      id: string;
      nome: string;
      funcao: string | null;
      cidade_sigla: string | null;
      contato_whatsapp: string | null;
      ativo: boolean;
    }>(
      `
      SELECT id, nome, funcao, cidade_sigla, contato_whatsapp, ativo
      FROM colaborador
      WHERE id = $1 AND excluido_em IS NULL
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Colaborador nao encontrado');
    return {
      id: row.id,
      nome: row.nome,
      funcao: row.funcao,
      cidadeSigla: row.cidade_sigla,
      contatoWhatsapp: row.contato_whatsapp,
      ativo: row.ativo,
    };
  }

  private async findEmbarcacao(id: string): Promise<EmbarcacaoDto> {
    const row = await this.db.one<{
      id: string;
      nome: string;
      tipo: string;
      status: string;
      capacidade_carga: string | null;
      capacidade_pax: Record<string, unknown> | null;
    }>(
      `
      SELECT id, nome, tipo::text, status::text, capacidade_carga, capacidade_pax
      FROM embarcacao
      WHERE id = $1 AND excluido_em IS NULL
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Embarcacao nao encontrada');
    return {
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      status: row.status,
      capacidadeCarga: row.capacidade_carga ? Number(row.capacidade_carga) : null,
      capacidadePax: row.capacidade_pax ?? {},
    };
  }

  private async findUsuario(id: string): Promise<UsuarioDto> {
    const row = await this.db.one<{
      id: string;
      nome: string;
      login: string;
      email: string | null;
      perfil_id: string;
      perfil_nome: string;
      ativo: boolean;
    }>(
      `
      SELECT u.id, u.nome, u.login, u.email, u.perfil_id, p.nome AS perfil_nome, u.ativo
      FROM usuario u
      JOIN perfil p ON p.id = u.perfil_id
      WHERE u.id = $1 AND u.excluido_em IS NULL
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Usuario nao encontrado');
    return {
      id: row.id,
      nome: row.nome,
      login: row.login,
      email: row.email,
      perfilId: row.perfil_id,
      perfilNome: row.perfil_nome,
      ativo: row.ativo,
    };
  }

  private async findPerfil(id: string): Promise<PerfilDto> {
    const rows = await this.db.query<{
      id: string;
      nome: string;
      descricao: string | null;
      ativo: boolean;
      permissions: string[] | null;
    }>(
      `
      SELECT p.id, p.nome, p.descricao, p.ativo,
             COALESCE(array_agg(pe.modulo || '.' || pe.acao ORDER BY pe.modulo, pe.acao)
               FILTER (WHERE pe.id IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM perfil p
      LEFT JOIN perfil_permissao pp ON pp.perfil_id = p.id
      LEFT JOIN permissao pe ON pe.id = pp.permissao_id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [id],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Perfil nao encontrado');
    return {
      id: row.id,
      nome: row.nome,
      descricao: row.descricao,
      ativo: row.ativo,
      permissions: row.permissions ?? [],
    };
  }

  private async ensurePerfil(perfilId: string) {
    const row = await this.db.one('SELECT id FROM perfil WHERE id = $1 AND ativo = true', [perfilId]);
    if (!row) throw new BadRequestException('Perfil invalido ou inativo');
  }

  private async syncPerfilPermissions(client: PoolClient, perfilId: string, permissions: string[]) {
    const unique = [...new Set(permissions.map((p) => p.trim()).filter(Boolean))];
    await client.query('DELETE FROM perfil_permissao WHERE perfil_id = $1', [perfilId]);
    if (unique.length === 0) return;
    const result = await client.query<{ id: string; code: string }>(
      `
      SELECT id, modulo || '.' || acao AS code
      FROM permissao
      WHERE modulo || '.' || acao = ANY($1::text[])
      `,
      [unique],
    );
    const found = new Set(result.rows.map((row) => row.code));
    const missing = unique.filter((code) => !found.has(code));
    if (missing.length > 0) throw new BadRequestException(`Permissoes invalidas: ${missing.join(', ')}`);
    for (const row of result.rows) {
      await client.query(
        'INSERT INTO perfil_permissao (perfil_id, permissao_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [perfilId, row.id],
      );
    }
  }

  private async audit(entidade: string, entidadeId: string, acao: string, userId: string, dadosDepois: unknown) {
    await this.db.query(
      `
      INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [entidade, entidadeId, acao, userId, JSON.stringify(dadosDepois ?? {})],
    );
  }
}

function emptyToNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function guessTipoPessoa(doc?: string | null): 'PF' | 'PJ' {
  const digits = (doc ?? '').replace(/\D/g, '');
  return digits.length > 11 ? 'PJ' : 'PF';
}

function withoutPassword(input: SaveUsuarioInput) {
  const { password: _password, ...rest } = input;
  return rest;
}

function sanitizeCapacidadePax(input: Record<string, unknown>) {
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) throw new BadRequestException(`capacidade invalida para ${normalizedKey}`);
    output[normalizedKey] = Math.floor(numeric);
  }
  return output;
}
