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

export interface PublicarTabelaEncomendaInput {
  motivo: string;
  itens: Array<{ origemSigla: string; destinoSigla: string; tamanho: string; valor: number; percentual: number }>;
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

  async publicarTabelaEncomenda(input: PublicarTabelaEncomendaInput, userId: string) {
    if (!input.motivo?.trim()) throw new BadRequestException('Motivo da publicacao obrigatorio');
    if (!Array.isArray(input.itens) || !input.itens.length) throw new BadRequestException('Cadastre ao menos um preco de encomenda');
    const config = await this.db.one<{ valor: { tamanhos?: Array<{ codigo: string; ativo: boolean }> } }>(`
      SELECT cv.valor FROM config_versao cv JOIN config_chave cc ON cc.id=cv.chave_id
      WHERE cc.chave='encomendas_operacao' AND cv.ativo=true LIMIT 1`);
    const sizeCodes = new Set((config?.valor?.tamanhos ?? []).filter((item) => item.ativo).map((item) => item.codigo));
    const keys = new Set<string>();
    for (const item of input.itens) {
      const origem = item.origemSigla?.trim().toUpperCase();
      const destino = item.destinoSigla?.trim().toUpperCase();
      const tamanho = item.tamanho?.trim().toUpperCase();
      if (!origem || !destino || origem === destino) throw new BadRequestException('Trecho de encomenda invalido');
      if (!sizeCodes.has(tamanho)) throw new BadRequestException(`Tamanho nao publicado: ${tamanho}`);
      if (!Number.isFinite(Number(item.valor)) || Number(item.valor) < 0) throw new BadRequestException('Valor fixo invalido');
      if (!Number.isFinite(Number(item.percentual)) || Number(item.percentual) <= 0 || Number(item.percentual) > 100) throw new BadRequestException('Percentual deve ser maior que zero e no maximo 100');
      const key = `${origem}|${destino}|${tamanho}`;
      if (keys.has(key)) throw new BadRequestException(`Preco duplicado: ${key}`);
      keys.add(key);
    }
    await this.db.tx(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('tabela_preco:encomenda'))");
      const cities = [...new Set(input.itens.flatMap((item) => [item.origemSigla.toUpperCase(), item.destinoSigla.toUpperCase()]))];
      const existing = await client.query<{ sigla: string }>('SELECT sigla FROM cidade WHERE sigla=ANY($1::varchar[]) AND ativo=true', [cities]);
      if (existing.rows.length !== cities.length) throw new BadRequestException('Uma ou mais cidades do preco nao existem ou estao inativas');
      const version = await client.query<{ versao: number }>("SELECT COALESCE(max(versao),0)+1 AS versao FROM tabela_preco WHERE tipo='encomenda'");
      await client.query("UPDATE tabela_preco SET ativo=false, vigente_ate=now() WHERE tipo='encomenda' AND ativo=true");
      const table = await client.query<{ id: string }>(`INSERT INTO tabela_preco (tipo,versao,ativo,motivo,criado_por) VALUES ('encomenda',$1,true,$2,$3) RETURNING id`, [version.rows[0].versao, input.motivo.trim(), userId]);
      for (const item of input.itens) {
        await client.query(`INSERT INTO item_preco (tabela_id,tamanho,origem_sigla,destino_sigla,valor,percentual)
          VALUES ($1,$2,$3,$4,$5,$6)`, [table.rows[0].id, item.tamanho.toUpperCase(), item.origemSigla.toUpperCase(), item.destinoSigla.toUpperCase(), item.valor, item.percentual]);
      }
      await client.query(`INSERT INTO audit_evento (entidade,entidade_id,acao,usuario_id,dados_depois)
        VALUES ('tabela_preco',$1,'publicar_encomendas',$2,$3::jsonb)`, [table.rows[0].id, userId, JSON.stringify({ versao: version.rows[0].versao, motivo: input.motivo, itens: input.itens.length })]);
    });
    return this.listActive('encomenda');
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
