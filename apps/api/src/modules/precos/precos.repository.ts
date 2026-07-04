import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface PrecoItemDto {
  id: string;
  tipo: string;
  versao: number;
  classe: string | null;
  subtipo: string | null;
  tamanho: string | null;
  origemSigla: string | null;
  destinoSigla: string | null;
  valor: number | null;
  percentual: number | null;
}

export interface PrecoPassagemMatrizDto {
  trecho: string;
  origemSigla: string;
  destinoSigla: string;
  classes: Record<string, number>;
}

export interface ReajustarTabelaPrecoInput {
  percentual: number;
  motivo?: string;
}

@Injectable()
export class PrecosRepository {
  constructor(private readonly db: DatabaseService) {}

  async listActive(tipo?: string): Promise<PrecoItemDto[]> {
    const values: unknown[] = [];
    const filter = tipo ? 'AND t.tipo = $1::tipo_tabela_preco' : '';
    if (tipo) values.push(tipo);

    const result = await this.db.query<{
      id: string;
      tipo: string;
      versao: number;
      classe: string | null;
      subtipo: string | null;
      tamanho: string | null;
      origem_sigla: string | null;
      destino_sigla: string | null;
      valor: string | null;
      percentual: string | null;
    }>(
      `
      SELECT i.id, t.tipo::text, t.versao, i.classe::text, i.subtipo, i.tamanho,
             i.origem_sigla, i.destino_sigla, i.valor, i.percentual
      FROM tabela_preco t
      JOIN item_preco i ON i.tabela_id = t.id
      WHERE t.ativo = true
      ${filter}
      ORDER BY i.origem_sigla, i.destino_sigla, i.classe, i.subtipo NULLS LAST
      `,
      values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      versao: row.versao,
      classe: row.classe,
      subtipo: row.subtipo,
      tamanho: row.tamanho,
      origemSigla: row.origem_sigla,
      destinoSigla: row.destino_sigla,
      valor: row.valor ? Number(row.valor) : null,
      percentual: row.percentual ? Number(row.percentual) : null,
    }));
  }

  async listPassagemMatrix(): Promise<PrecoPassagemMatrizDto[]> {
    const items = await this.listActive('passagem');
    const grouped = new Map<string, PrecoPassagemMatrizDto>();
    for (const item of items) {
      if (!item.origemSigla || !item.destinoSigla || !item.classe || item.valor === null) {
        continue;
      }
      const key = `${item.origemSigla}->${item.destinoSigla}`;
      const current =
        grouped.get(key) ??
        {
          trecho: `${item.origemSigla} -> ${item.destinoSigla}`,
          origemSigla: item.origemSigla,
          destinoSigla: item.destinoSigla,
          classes: {},
        };
      const classKey = item.subtipo ? `${item.classe}:${item.subtipo}` : item.classe;
      current.classes[classKey] = item.valor;
      grouped.set(key, current);
    }
    return [...grouped.values()];
  }

  async reajustarTabela(tipo: string, input: ReajustarTabelaPrecoInput, userId: string) {
    if (!['passagem', 'encomenda', 'carga'].includes(tipo)) {
      throw new BadRequestException('Tipo de tabela de preco invalido');
    }
    const percentual = Number(input.percentual);
    if (!Number.isFinite(percentual) || percentual === 0 || percentual <= -100 || percentual > 500) {
      throw new BadRequestException('Percentual de reajuste invalido');
    }
    const factor = 1 + percentual / 100;

    const table = await this.db.tx(async (client) => {
      const active = await client.query<{
        id: string;
        tipo: string;
        versao: number;
      }>(
        `
        SELECT id, tipo::text, versao
        FROM tabela_preco
        WHERE tipo = $1::tipo_tabela_preco AND ativo = true
        FOR UPDATE
        `,
        [tipo],
      );
      const current = active.rows[0];
      if (!current) {
        throw new NotFoundException('Tabela de preco ativa nao encontrada');
      }

      const nextVersion = await client.query<{ versao: number }>(
        'SELECT COALESCE(MAX(versao), 0) + 1 AS versao FROM tabela_preco WHERE tipo = $1::tipo_tabela_preco',
        [tipo],
      );

      await client.query('UPDATE tabela_preco SET ativo = false, vigente_ate = now() WHERE id = $1', [current.id]);

      const inserted = await client.query<{
        id: string;
        tipo: string;
        versao: number;
        motivo: string | null;
        percentual_reajuste: string | null;
        origem_versao_id: string | null;
      }>(
        `
        INSERT INTO tabela_preco (
          tipo, versao, ativo, motivo, percentual_reajuste, origem_versao_id, criado_por
        )
        VALUES ($1::tipo_tabela_preco, $2, true, $3, $4, $5, $6)
        RETURNING id, tipo::text, versao, motivo, percentual_reajuste, origem_versao_id
        `,
        [
          tipo,
          nextVersion.rows[0]?.versao ?? current.versao + 1,
          input.motivo ?? `Reajuste em massa ${percentual}%`,
          percentual,
          current.id,
          userId,
        ],
      );
      const next = inserted.rows[0];

      await client.query(
        `
        INSERT INTO item_preco (
          tabela_id, classe, subtipo, tamanho, tier, origem_sigla, destino_sigla,
          embarcacao_id, valor, percentual
        )
        SELECT
          $1, classe, subtipo, tamanho, tier, origem_sigla, destino_sigla,
          embarcacao_id,
          CASE WHEN valor IS NULL THEN NULL ELSE round(valor * $2::numeric, 2) END,
          CASE WHEN percentual IS NULL THEN NULL ELSE round(percentual * $2::numeric, 2) END
        FROM item_preco
        WHERE tabela_id = $3
        `,
        [next.id, factor, current.id],
      );

      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois)
        VALUES ('tabela_preco', $1, 'reajuste_preco', $3, $2::jsonb)
        `,
        [
          next.id,
          JSON.stringify({
            tipo,
            origemVersaoId: current.id,
            percentual,
            motivo: input.motivo ?? null,
          }),
          userId,
        ],
      );

      return {
        id: next.id,
        tipo: next.tipo,
        versao: next.versao,
        motivo: next.motivo,
        percentualReajuste: next.percentual_reajuste ? Number(next.percentual_reajuste) : null,
        origemVersaoId: next.origem_versao_id,
      };
    });

    return {
      tabela: table,
      itens: await this.listActive(tipo),
      matriz: tipo === 'passagem' ? await this.listPassagemMatrix() : undefined,
    };
  }
}
