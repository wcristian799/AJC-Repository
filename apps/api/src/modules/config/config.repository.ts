import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface ConfigValueDto {
  chave: string;
  categoria: string | null;
  descricao: string | null;
  versao: number;
  valor: unknown;
  vigenteDesde: string;
  publicadoEm: string;
}

@Injectable()
export class ConfigRepository {
  constructor(private readonly db: DatabaseService) {}

  async listActive(): Promise<ConfigValueDto[]> {
    const result = await this.db.query<{
      chave: string;
      categoria: string | null;
      descricao: string | null;
      versao: number;
      valor: unknown;
      vigente_desde: Date;
      publicado_em: Date;
    }>(
      `
      SELECT c.chave, c.categoria, c.descricao, v.versao, v.valor, v.vigente_desde, v.publicado_em
      FROM config_chave c
      JOIN config_versao v ON v.chave_id = c.id AND v.ativo = true
      WHERE c.ativo = true
      ORDER BY c.categoria NULLS LAST, c.chave
      `,
    );
    return result.rows.map(this.mapConfig);
  }

  async findActive(chave: string): Promise<ConfigValueDto | null> {
    const row = await this.db.one<{
      chave: string;
      categoria: string | null;
      descricao: string | null;
      versao: number;
      valor: unknown;
      vigente_desde: Date;
      publicado_em: Date;
    }>(
      `
      SELECT c.chave, c.categoria, c.descricao, v.versao, v.valor, v.vigente_desde, v.publicado_em
      FROM config_chave c
      JOIN config_versao v ON v.chave_id = c.id AND v.ativo = true
      WHERE c.chave = $1
        AND c.ativo = true
      LIMIT 1
      `,
      [chave],
    );
    return row ? this.mapConfig(row) : null;
  }

  async publish(chave: string, valor: unknown, autorId: string): Promise<ConfigValueDto> {
    return this.db.tx(async (client) => {
      const chaveResult = await client.query<{ id: string }>(
        `
        INSERT INTO config_chave (chave, categoria, descricao)
        VALUES ($1, 'runtime', 'Criada via API')
        ON CONFLICT (chave) DO UPDATE SET atualizado_em = now()
        RETURNING id
        `,
        [chave],
      );
      const chaveId = chaveResult.rows[0].id;
      const versaoResult = await client.query<{ next_versao: number }>(
        'SELECT COALESCE(MAX(versao), 0) + 1 AS next_versao FROM config_versao WHERE chave_id = $1',
        [chaveId],
      );
      const nextVersao = versaoResult.rows[0].next_versao;

      await client.query(
        `
        UPDATE config_versao
        SET ativo = false, vigente_ate = now()
        WHERE chave_id = $1 AND ativo = true
        `,
        [chaveId],
      );
      await client.query(
        `
        INSERT INTO config_versao (chave_id, versao, valor, ativo, autor_id)
        VALUES ($1, $2, $3::jsonb, true, $4)
        `,
        [chaveId, nextVersao, JSON.stringify(valor), autorId],
      );
      const row = await client.query<{
        chave: string;
        categoria: string | null;
        descricao: string | null;
        versao: number;
        valor: unknown;
        vigente_desde: Date;
        publicado_em: Date;
      }>(
        `
        SELECT c.chave, c.categoria, c.descricao, v.versao, v.valor, v.vigente_desde, v.publicado_em
        FROM config_chave c
        JOIN config_versao v ON v.chave_id = c.id AND v.ativo = true
        WHERE c.id = $1
        `,
        [chaveId],
      );
      return this.mapConfig(row.rows[0]);
    });
  }

  private mapConfig(row: {
    chave: string;
    categoria: string | null;
    descricao: string | null;
    versao: number;
    valor: unknown;
    vigente_desde: Date;
    publicado_em: Date;
  }): ConfigValueDto {
    return {
      chave: row.chave,
      categoria: row.categoria,
      descricao: row.descricao,
      versao: row.versao,
      valor: row.valor,
      vigenteDesde: row.vigente_desde.toISOString(),
      publicadoEm: row.publicado_em.toISOString(),
    };
  }
}
