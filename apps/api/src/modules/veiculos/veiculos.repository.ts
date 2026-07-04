import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface CreateVeiculoInput {
  tipo: 'veiculo' | 'maquina';
  viagemId?: string;
  origemCadastro?: 'pdv' | 'comercial' | 'gerente_porto';
  placa?: string;
  modelo: string;
  remetenteClienteId?: string;
  remetenteNome?: string;
  remetenteDocumento?: string;
  remetenteTelefone?: string;
  destinatarioClienteId?: string;
  destinatarioNome?: string;
  destinatarioDocumento?: string;
  destinatarioTelefone?: string;
  cidadeOrigemSigla?: string;
  cidadeDestinoSigla?: string;
  valorFrete?: number;
  agenteId?: string;
  clientUuid?: string;
}

@Injectable()
export class VeiculosRepository {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    return (
      await this.db.query(
        `
        SELECT ev.*, v.codigo AS viagem_codigo
        FROM envio_veiculo ev
        LEFT JOIN viagem v ON v.id = ev.viagem_id
        WHERE ev.excluido_em IS NULL
        ORDER BY ev.criado_em DESC
        LIMIT 200
        `,
      )
    ).rows;
  }

  async find(id: string) {
    const envio = await this.db.one('SELECT * FROM envio_veiculo WHERE id = $1 AND excluido_em IS NULL', [id]);
    if (!envio) return null;
    const fotos = await this.db.query('SELECT * FROM envio_veiculo_foto WHERE envio_id = $1 ORDER BY criado_em', [id]);
    const eventos = await this.db.query('SELECT * FROM envio_veiculo_evento WHERE envio_id = $1 ORDER BY criado_em', [id]);
    return { ...envio, fotos: fotos.rows, eventos: eventos.rows };
  }

  async create(input: CreateVeiculoInput, userId: string) {
    const codigo = await this.nextCodigo();
    return this.db.tx(async (client) => {
      const inserted = await client.query(
        `
        INSERT INTO envio_veiculo (
          codigo, tipo, viagem_id, origem_cadastro, status, placa, modelo,
          remetente_cliente_id, remetente_nome, remetente_documento, remetente_telefone,
          destinatario_cliente_id, destinatario_nome, destinatario_documento, destinatario_telefone,
          cidade_origem_sigla, cidade_destino_sigla, valor_frete, agente_id,
          client_uuid, criado_por, atualizado_por
        )
        VALUES (
          $1, $2::tipo_envio_veiculo, $3, $4::origem_cadastro_envio, 'vistoria',
          $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20
        )
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        RETURNING *
        `,
        [
          codigo,
          input.tipo,
          input.viagemId ?? null,
          input.origemCadastro ?? 'gerente_porto',
          input.placa ?? null,
          input.modelo.trim(),
          input.remetenteClienteId ?? null,
          input.remetenteNome?.trim() || null,
          input.remetenteDocumento?.trim() || null,
          input.remetenteTelefone?.trim() || null,
          input.destinatarioClienteId ?? null,
          input.destinatarioNome?.trim() || null,
          input.destinatarioDocumento?.trim() || null,
          input.destinatarioTelefone?.trim() || null,
          input.cidadeOrigemSigla?.trim().toUpperCase() || null,
          input.cidadeDestinoSigla?.trim().toUpperCase() || null,
          input.valorFrete ?? null,
          input.agenteId ?? null,
          input.clientUuid ?? null,
          userId,
        ],
      );

      if (!inserted.rows[0] && input.clientUuid) {
        const existing = await client.query('SELECT * FROM envio_veiculo WHERE client_uuid = $1 AND excluido_em IS NULL LIMIT 1', [input.clientUuid]);
        return existing.rows[0];
      }

      const row = inserted.rows[0];
      await client.query(
        `
        INSERT INTO envio_veiculo_evento (envio_id, tipo, local_sigla, registrado_por, client_uuid)
        VALUES ($1, 'cadastrado', $2, $3, $4)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        `,
        [row.id, input.cidadeOrigemSigla?.trim().toUpperCase() || null, userId, input.clientUuid ?? null],
      );
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('envio_veiculo', $1, 'criar', $2, $3::jsonb, $4)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        `,
        [
          row.id,
          userId,
          JSON.stringify({
            codigo: row.codigo,
            tipo: row.tipo,
            placa: row.placa,
            modelo: row.modelo,
            status: row.status,
            cidadeOrigemSigla: row.cidade_origem_sigla,
            cidadeDestinoSigla: row.cidade_destino_sigla,
          }),
          input.clientUuid ?? null,
        ],
      );
      return row;
    });
  }

  async addFoto(envioId: string, body: { etapa: string; angulo: string; fotoUrl: string; fotoHash?: string; clientUuid?: string }, userId: string) {
    const row = await this.db.one(
      `
      INSERT INTO envio_veiculo_foto (envio_id, etapa, angulo, foto_url, foto_hash, registrado_por, client_uuid)
      VALUES ($1, $2::etapa_foto_envio, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [envioId, body.etapa, body.angulo, body.fotoUrl, body.fotoHash ?? null, userId, body.clientUuid ?? null],
    );
    await this.addEvento(envioId, body.etapa === 'vistoria' ? 'vistoriado' : 'entregue', userId);
    return row;
  }

  async addEvento(envioId: string, tipo: string, userId: string, etiquetaCodigo?: string, localSigla?: string, observacao?: string, clientUuid?: string) {
    const row = await this.db.one(
      `
      INSERT INTO envio_veiculo_evento (envio_id, tipo, etiqueta_codigo, local_sigla, observacao, registrado_por, client_uuid)
      VALUES ($1, $2::tipo_evento_envio_veiculo, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [envioId, tipo, etiquetaCodigo ?? null, localSigla ?? null, observacao ?? null, userId, clientUuid ?? null],
    );
    const statusByEvent: Record<string, string> = {
      vistoriado: 'embarque',
      etiquetado: 'embarque',
      bipe_subida: 'em_transito',
      bipe_descida: 'entrega',
      entregue: 'entregue',
      cancelado: 'cancelada',
    };
    if (statusByEvent[tipo]) {
      await this.db.query('UPDATE envio_veiculo SET status = $2::status_envio_veiculo, atualizado_por = $3 WHERE id = $1', [envioId, statusByEvent[tipo], userId]);
    }
    return row;
  }

  private async nextCodigo() {
    const year = new Date().getFullYear();
    const row = await this.db.one<{ total: string }>('SELECT count(*)::text AS total FROM envio_veiculo WHERE codigo LIKE $1', [`VEI-${year}-%`]);
    return `VEI-${year}-${String(Number(row?.total ?? 0) + 1).padStart(4, '0')}`;
  }
}
