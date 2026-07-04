import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AllocatePaleteInput, ConferirDocumentoInput, CreateCargaInput, EntregaInput, PrintEtiquetaInput, RegistroPortariaInput, SaveDeclaracaoConteudoInput, SavePrestacaoContasInput } from './tms.types';

@Injectable()
export class TmsRepository {
  constructor(private readonly db: DatabaseService) {}

  async listCargas(categoria?: 'carga' | 'encomenda') {
    const params: unknown[] = [];
    const filter = categoria ? 'AND c.categoria = $1' : '';
    if (categoria) params.push(categoria);
    const result = await this.db.query(
      `
      SELECT c.id, c.codigo, c.numero_pedido, c.categoria, c.status::text, c.viagem_id,
             c.destinatario_nome, c.valor_declarado, c.valor_cobrado, c.peso_total,
             c.cidade_origem_sigla, c.cidade_destino_sigla, c.tipo_recebimento::text,
             c.observacoes, c.criado_em,
             v.codigo AS viagem_codigo, cr.nome AS remetente_nome,
             count(vol.id)::int AS total_volumes
      FROM carga c
      JOIN viagem v ON v.id = c.viagem_id
      JOIN cliente cr ON cr.id = c.cliente_remetente_id
      LEFT JOIN volume vol ON vol.carga_id = c.id
      WHERE true ${filter}
      GROUP BY c.id, v.codigo, cr.nome
      ORDER BY c.criado_em DESC
      LIMIT 200
      `,
      params,
    );
    return result.rows.map((row) => ({
      ...row,
      valor_declarado: row.valor_declarado === null ? null : Number(row.valor_declarado),
      valor_cobrado: row.valor_cobrado === null ? null : Number(row.valor_cobrado),
      peso_total: row.peso_total === null ? null : Number(row.peso_total),
    }));
  }

  async findCarga(id: string) {
    const carga = await this.db.one(
      `
      SELECT c.*, v.codigo AS viagem_codigo, cr.nome AS remetente_nome
      FROM carga c
      JOIN viagem v ON v.id = c.viagem_id
      JOIN cliente cr ON cr.id = c.cliente_remetente_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [id],
    );
    if (!carga) return null;
    const volumes = await this.db.query('SELECT * FROM volume WHERE carga_id = $1 ORDER BY indice_volume', [id]);
    const documentos = await this.db.query('SELECT * FROM documento_fiscal WHERE carga_id = $1 ORDER BY criado_em', [id]);
    return { ...carga, volumes: volumes.rows, documentos: documentos.rows };
  }

  async listDocumentos() {
    const result = await this.db.query(
      `
      SELECT df.id, df.tipo::text, df.numero, df.valor, df.cliente_id, df.carga_id,
             df.arquivo_url, df.arquivo_hash, df.status::text, df.origem,
             df.criado_em, df.atualizado_em,
             c.codigo AS carga_codigo, c.numero_pedido, c.tipo_recebimento::text,
             c.cidade_origem_sigla, c.cidade_destino_sigla, c.peso_total,
             cli.nome AS cliente_nome,
             u.nome AS lancado_por_nome
      FROM documento_fiscal df
      LEFT JOIN carga c ON c.id = df.carga_id
      LEFT JOIN cliente cli ON cli.id = df.cliente_id
      LEFT JOIN usuario u ON u.id = df.lancado_por
      ORDER BY df.criado_em DESC
      LIMIT 300
      `,
    );
    return result.rows.map((row) => ({
      ...row,
      valor: row.valor === null ? null : Number(row.valor),
      peso_total: row.peso_total === null ? null : Number(row.peso_total),
    }));
  }

  async conferirDocumento(documentoId: string, input: ConferirDocumentoInput, userId: string) {
    if (!['conferida', 'divergente'].includes(input.status)) throw new BadRequestException('status de conferencia invalido');
    const current = await this.db.one<{ id: string; carga_id: string | null; status: string }>(
      'SELECT id, carga_id, status::text FROM documento_fiscal WHERE id = $1',
      [documentoId],
    );
    if (!current) throw new NotFoundException('Documento nao encontrado');
    await this.db.tx(async (client) => {
      await client.query(
        `
        UPDATE documento_fiscal
        SET status = $2::status_documento_fiscal,
            lancado_por = COALESCE(lancado_por, $3),
            atualizado_em = now()
        WHERE id = $1
        `,
        [documentoId, input.status, userId],
      );
      if (current.carga_id) {
        await client.query(
          `
          UPDATE carga
          SET status = CASE WHEN $2 = 'divergente' THEN 'divergente'::status_carga ELSE status END,
              atualizado_por = $3,
              atualizado_em = now()
          WHERE id = $1
          `,
          [current.carga_id, input.status, userId],
        );
      }
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois, client_uuid)
        VALUES ('documento_fiscal', $1, 'conferir', $2, $3::jsonb, $4::jsonb, $5)
        `,
        [
          documentoId,
          userId,
          JSON.stringify({ status: current.status }),
          JSON.stringify({ status: input.status, observacao: input.observacao ?? null, cargaId: current.carga_id }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.findDocumento(documentoId);
  }

  private async findDocumento(documentoId: string) {
    const result = await this.db.query(
      `
      SELECT df.id, df.tipo::text, df.numero, df.valor, df.cliente_id, df.carga_id,
             df.arquivo_url, df.arquivo_hash, df.status::text, df.origem,
             df.criado_em, df.atualizado_em,
             c.codigo AS carga_codigo, c.numero_pedido, c.tipo_recebimento::text,
             c.cidade_origem_sigla, c.cidade_destino_sigla, c.peso_total,
             cli.nome AS cliente_nome,
             u.nome AS lancado_por_nome
      FROM documento_fiscal df
      LEFT JOIN carga c ON c.id = df.carga_id
      LEFT JOIN cliente cli ON cli.id = df.cliente_id
      LEFT JOIN usuario u ON u.id = df.lancado_por
      WHERE df.id = $1
      LIMIT 1
      `,
      [documentoId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      ...row,
      valor: row.valor === null ? null : Number(row.valor),
      peso_total: row.peso_total === null ? null : Number(row.peso_total),
    };
  }

  async listDeclaracoesConteudo(categoria?: 'carga' | 'encomenda') {
    const params: unknown[] = [];
    const filter = categoria ? 'AND c.categoria = $1' : '';
    if (categoria) params.push(categoria);
    const result = await this.db.query(
      `
      SELECT dc.id, dc.carga_id, dc.valor_declarado, dc.descricao_informada,
             dc.config_termo_versao_id, dc.assinatura_url, dc.assinatura_hash,
             dc.aceite_em, dc.dispositivo, dc.ip,
             c.codigo AS carga_codigo, c.categoria, c.destinatario_nome,
             c.valor_declarado AS carga_valor_declarado,
             c.observacoes, cr.nome AS remetente_nome
      FROM declaracao_conteudo dc
      JOIN carga c ON c.id = dc.carga_id
      JOIN cliente cr ON cr.id = c.cliente_remetente_id
      WHERE true ${filter}
      ORDER BY dc.aceite_em DESC NULLS LAST, dc.id DESC
      LIMIT 300
      `,
      params,
    );
    return result.rows.map((row) => ({
      ...row,
      valor_declarado: row.valor_declarado === null ? null : Number(row.valor_declarado),
      carga_valor_declarado: row.carga_valor_declarado === null ? null : Number(row.carga_valor_declarado),
    }));
  }

  async createCarga(input: CreateCargaInput, userId: string) {
    const totalVolumes = input.totalVolumes ?? 1;
    if (totalVolumes < 1) throw new BadRequestException('totalVolumes deve ser maior que zero');
    if (input.clientUuid) {
      const existing = await this.db.one<{ id: string }>('SELECT id FROM carga WHERE client_uuid = $1 LIMIT 1', [input.clientUuid]);
      if (existing) return this.findCarga(existing.id);
    }
    const categoria = input.categoria ?? 'carga';
    const codigo = await this.nextCodigo(categoria === 'encomenda' ? 'ENC' : 'CG');
    const documentosSelecionados = await this.findDocumentosSelecionados(input.documentoIds, input.clienteRemetenteId);
    const primeiroDocumento = documentosSelecionados[0];
    const numeroPedido = input.numeroPedido ?? (await this.buildPedido(
      input.clienteRemetenteId,
      primeiroDocumento?.numero ?? input.documento?.numero ?? input.numeroDocumento,
      primeiroDocumento?.tipo ?? input.documento?.tipo,
    ));

    const cargaId = await this.db.tx(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO carga (
          codigo, numero_pedido, categoria, viagem_id, cliente_remetente_id, destinatario_id,
          destinatario_nome, cidade_origem_sigla, cidade_destino_sigla, tipo_recebimento,
          valor_declarado, valor_cobrado, peso_total, client_uuid, criado_por, atualizado_por, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::tipo_recebimento_carga,
                $11, $12, $13, $14, $15, $15, $16)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        RETURNING id
        `,
        [
          codigo,
          numeroPedido,
          categoria,
          input.viagemId,
          input.clienteRemetenteId,
          input.destinatarioId ?? null,
          input.destinatarioNome ?? null,
          input.cidadeOrigemSigla ?? null,
          input.cidadeDestinoSigla,
          input.tipoRecebimento ?? 'porto_balsa',
          input.valorDeclarado ?? null,
          input.valorCobrado ?? null,
          input.pesoTotal ?? null,
          input.clientUuid ?? null,
          userId,
          input.observacoes ?? null,
        ],
      );
      if (!inserted.rows[0] && input.clientUuid) {
        const existing = await client.query<{ id: string }>('SELECT id FROM carga WHERE client_uuid = $1 LIMIT 1', [input.clientUuid]);
        return existing.rows[0].id;
      }
      const id = inserted.rows[0].id;
      if (input.documento) {
        await client.query(
          `
          INSERT INTO documento_fiscal (tipo, numero, valor, cliente_id, carga_id, arquivo_url, arquivo_hash, origem, lancado_por)
          VALUES ($1::tipo_documento_fiscal, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            input.documento.tipo,
            input.documento.numero ?? input.numeroDocumento ?? null,
            input.documento.valor ?? input.valorDeclarado ?? null,
            input.clienteRemetenteId,
            id,
            input.documento.arquivoUrl ?? null,
            input.documento.arquivoHash ?? null,
            input.documento.origem ?? 'manual',
            userId,
          ],
        );
      }
      if (documentosSelecionados.length) {
        await client.query(
          `
          UPDATE documento_fiscal
          SET carga_id = $2,
              atualizado_em = now()
          WHERE id = ANY($1::uuid[])
          `,
          [documentosSelecionados.map((documento) => documento.id), id],
        );
      }
      const pesoPorVolume = input.pesoTotal ? input.pesoTotal / totalVolumes : null;
      for (let i = 1; i <= totalVolumes; i++) {
        await client.query(
          `
          INSERT INTO volume (carga_id, indice_volume, total_volumes, peso, status)
          VALUES ($1, $2, $3, $4, 'recebido')
          `,
          [id, i, totalVolumes, pesoPorVolume],
        );
      }
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('carga', $1, 'criar', $2, $3::jsonb, $4)
        ON CONFLICT (client_uuid) WHERE client_uuid IS NOT NULL DO NOTHING
        `,
        [
          id,
          userId,
          JSON.stringify({
            codigo,
            numeroPedido,
            categoria,
            viagemId: input.viagemId,
            clienteRemetenteId: input.clienteRemetenteId,
            cidadeOrigemSigla: input.cidadeOrigemSigla ?? null,
            cidadeDestinoSigla: input.cidadeDestinoSigla,
            totalVolumes,
            documentoIds: documentosSelecionados.map((documento) => documento.id),
            documento: primeiroDocumento
              ? { tipo: primeiroDocumento.tipo, numero: primeiroDocumento.numero, origem: primeiroDocumento.origem }
              : input.documento ? {
                tipo: input.documento.tipo,
                numero: input.documento.numero ?? input.numeroDocumento ?? null,
                origem: input.documento.origem ?? 'manual',
              } : null,
          }),
          input.clientUuid ?? null,
        ],
      );
      return id;
    });

    return this.findCarga(cargaId);
  }

  async saveDeclaracaoConteudo(cargaId: string, input: SaveDeclaracaoConteudoInput, userId: string) {
    validateDcProof(input);
    const carga = await this.db.one<{
      id: string;
      categoria: string;
      valor_declarado: string | null;
      observacoes: string | null;
    }>('SELECT id, categoria, valor_declarado, observacoes FROM carga WHERE id = $1', [cargaId]);
    if (!carga) throw new NotFoundException('Carga/encomenda nao encontrada');
    const valorDeclarado = input.valorDeclarado ?? (carga.valor_declarado === null ? null : Number(carga.valor_declarado));
    const descricao = input.descricaoInformada?.trim() || descricaoFromObs(carga.observacoes) || 'Conteudo declarado pelo cliente';
    const row = await this.db.tx(async (client) => {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM declaracao_conteudo WHERE carga_id = $1 ORDER BY aceite_em DESC NULLS LAST LIMIT 1',
        [cargaId],
      );
      if (existing.rows[0]) {
        await client.query(
          `
          UPDATE declaracao_conteudo
          SET valor_declarado = $2,
              descricao_informada = $3,
              assinatura_url = $4,
              assinatura_hash = $5,
              aceite_em = COALESCE($6::timestamptz, now()),
              dispositivo = $7
          WHERE id = $1
          `,
          [
            existing.rows[0].id,
            valorDeclarado,
            descricao,
            input.assinaturaUrl,
            input.assinaturaHash,
            input.aceiteEm ?? null,
            input.dispositivo ?? 'field-web',
          ],
        );
      } else {
        await client.query(
          `
          INSERT INTO declaracao_conteudo (
            carga_id, valor_declarado, descricao_informada, assinatura_url,
            assinatura_hash, aceite_em, dispositivo
          )
          VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7)
          `,
          [
            cargaId,
            valorDeclarado,
            descricao,
            input.assinaturaUrl,
            input.assinaturaHash,
            input.aceiteEm ?? null,
            input.dispositivo ?? 'field-web',
          ],
        );
      }
      await client.query(
        `
        UPDATE documento_fiscal
        SET arquivo_url = COALESCE($2, arquivo_url),
            arquivo_hash = COALESCE($3, arquivo_hash),
            status = 'conferida',
            lancado_por = COALESCE(lancado_por, $4),
            atualizado_em = now()
        WHERE carga_id = $1 AND tipo = 'DC'
        `,
        [cargaId, input.assinaturaUrl, input.assinaturaHash, userId],
      );
      const saved = await client.query('SELECT * FROM declaracao_conteudo WHERE carga_id = $1 ORDER BY aceite_em DESC NULLS LAST LIMIT 1', [cargaId]);
      return saved.rows[0];
    });
    return {
      ...row,
      valor_declarado: row.valor_declarado === null ? null : Number(row.valor_declarado),
    };
  }

  async listPaletes() {
    const result = await this.db.query(
      `
      SELECT p.*, pv.viagem_id, pv.cidade_destino_sigla, v.codigo AS viagem_codigo
      FROM palete p
      LEFT JOIN LATERAL (
        SELECT * FROM palete_viagem x WHERE x.palete_id = p.id ORDER BY x.alocado_em DESC LIMIT 1
      ) pv ON p.status <> 'livre'
      LEFT JOIN viagem v ON v.id = pv.viagem_id
      WHERE p.excluido_em IS NULL
      ORDER BY p.codigo
      `,
    );
    return result.rows;
  }

  async createPalete(codigo: string, proprietario = 'AJC', terceiroId?: string) {
    const row = await this.db.one(
      `
      INSERT INTO palete (codigo, proprietario, terceiro_id)
      VALUES ($1, $2::proprietario_palete, $3)
      ON CONFLICT (codigo) DO UPDATE SET atualizado_em = now()
      RETURNING *
      `,
      [codigo, proprietario, terceiroId ?? null],
    );
    return row;
  }

  async allocatePalete(paleteId: string, input: AllocatePaleteInput, userId: string) {
    if (!input.viagemId) throw new BadRequestException('viagemId obrigatorio');
    if (!input.cidadeDestinoSigla) throw new BadRequestException('cidadeDestinoSigla obrigatorio');
    const palete = await this.db.one<{ id: string; codigo: string; status: string }>(
      'SELECT id, codigo, status::text FROM palete WHERE id = $1 AND excluido_em IS NULL',
      [paleteId],
    );
    if (!palete) throw new NotFoundException('Palete nao encontrado');
    if (palete.status !== 'livre') {
      throw new BadRequestException(`${palete.codigo} ja esta ${palete.status}; libere o palete antes de nova alocacao`);
    }
    const viagem = await this.db.one<{ id: string; destino_sigla: string | null }>(
      'SELECT id, destino_sigla FROM viagem WHERE id = $1',
      [input.viagemId],
    );
    if (!viagem) throw new BadRequestException('Viagem nao encontrada');
    if (viagem.destino_sigla && viagem.destino_sigla !== input.cidadeDestinoSigla) {
      const escala = await this.db.one<{ id: string }>(
        'SELECT id FROM viagem_escala WHERE viagem_id = $1 AND cidade_sigla = $2 LIMIT 1',
        [input.viagemId, input.cidadeDestinoSigla],
      );
      if (!escala) throw new BadRequestException('Cidade destino nao pertence a viagem informada');
    }

    await this.db.tx(async (client) => {
      await client.query(
        `
        INSERT INTO palete_viagem (palete_id, viagem_id, cidade_destino_sigla)
        VALUES ($1, $2, $3)
        `,
        [paleteId, input.viagemId, input.cidadeDestinoSigla],
      );
      await client.query("UPDATE palete SET status = 'alocado' WHERE id = $1", [paleteId]);
      if (input.volumeIds?.length) {
        const volumes = await client.query<{ id: string; cidade_destino_sigla: string; palete_id: string | null }>(
          `
          SELECT vol.id, c.cidade_destino_sigla, vol.palete_id
          FROM volume vol
          JOIN carga c ON c.id = vol.carga_id
          WHERE vol.id = ANY($1::uuid[])
          `,
          [input.volumeIds],
        );
        if (volumes.rowCount !== input.volumeIds.length) throw new BadRequestException('Um ou mais volumes nao foram encontrados');
        const invalid = volumes.rows.find((volume) => volume.cidade_destino_sigla !== input.cidadeDestinoSigla || (volume.palete_id && volume.palete_id !== paleteId));
        if (invalid) throw new BadRequestException('Volumes devem estar livres e ter o mesmo destino do palete');
        await client.query('UPDATE volume SET palete_id = $1 WHERE id = ANY($2::uuid[])', [paleteId, input.volumeIds]);
      }
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
        VALUES ('palete', $1, 'atualizar', $2, $3::jsonb, $4)
        `,
        [
          paleteId,
          userId,
          JSON.stringify({
            status: 'alocado',
            viagemId: input.viagemId,
            cidadeDestinoSigla: input.cidadeDestinoSigla,
            volumeIds: input.volumeIds ?? [],
          }),
          input.clientUuid ?? null,
        ],
      );
    });
    return this.findPalete(paleteId);
  }

  async releasePalete(paleteId: string, userId: string) {
    const palete = await this.db.one<{ id: string; codigo: string; status: string }>(
      'SELECT id, codigo, status::text FROM palete WHERE id = $1 AND excluido_em IS NULL',
      [paleteId],
    );
    if (!palete) throw new NotFoundException('Palete nao encontrado');
    if (palete.status === 'livre') throw new BadRequestException(`${palete.codigo} ja esta livre`);
    await this.db.tx(async (client) => {
      await client.query("UPDATE palete SET status = 'livre' WHERE id = $1", [paleteId]);
      await client.query(
        `
        INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois)
        VALUES ('palete', $1, 'atualizar', $2, $3::jsonb, $4::jsonb)
        `,
        [paleteId, userId, JSON.stringify({ status: palete.status }), JSON.stringify({ status: 'livre' })],
      );
    });
    return this.findPalete(paleteId);
  }

  private async findPalete(paleteId: string) {
    const result = await this.db.query(
      `
      SELECT p.*, pv.viagem_id, pv.cidade_destino_sigla, v.codigo AS viagem_codigo
      FROM palete p
      LEFT JOIN LATERAL (
        SELECT * FROM palete_viagem x WHERE x.palete_id = p.id ORDER BY x.alocado_em DESC LIMIT 1
      ) pv ON p.status <> 'livre'
      LEFT JOIN viagem v ON v.id = pv.viagem_id
      WHERE p.id = $1 AND p.excluido_em IS NULL
      LIMIT 1
      `,
      [paleteId],
    );
    return result.rows[0] ?? null;
  }

  async listVolumes() {
    const result = await this.db.query(
      `
      SELECT vol.*, c.codigo AS carga_codigo, c.cidade_destino_sigla, c.categoria, p.codigo AS palete_codigo
      FROM volume vol
      JOIN carga c ON c.id = vol.carga_id
      LEFT JOIN palete p ON p.id = vol.palete_id
      ORDER BY vol.criado_em DESC
      LIMIT 300
      `,
    );
    return result.rows;
  }

  async listEtiquetas() {
    const result = await this.db.query(
      `
      SELECT ei.*, vol.id AS volume_uuid, vol.indice_volume, vol.total_volumes,
             c.codigo AS carga_codigo, c.cidade_destino_sigla, c.categoria,
             p.codigo AS palete_codigo, u.nome AS solicitado_por_nome
      FROM etiqueta_impressao ei
      JOIN volume vol ON vol.id = ei.volume_id
      JOIN carga c ON c.id = vol.carga_id
      LEFT JOIN palete p ON p.id = vol.palete_id
      LEFT JOIN usuario u ON u.id = ei.solicitado_por
      ORDER BY ei.criado_em DESC
      LIMIT 200
      `,
    );
    return result.rows;
  }

  async printEtiqueta(volumeId: string, input: PrintEtiquetaInput, userId: string) {
    const tipo = input.tipo ?? 'impressao';
    if (!['impressao', 'reimpressao'].includes(tipo)) throw new BadRequestException('tipo de etiqueta invalido');
    const volume = await this.db.one<{
      id: string;
      indice_volume: number;
      total_volumes: number;
      peso: string | null;
      carga_codigo: string;
      cidade_destino_sigla: string;
      categoria: string;
      palete_codigo: string | null;
    }>(
      `
      SELECT vol.id, vol.indice_volume, vol.total_volumes, vol.peso,
             c.codigo AS carga_codigo, c.cidade_destino_sigla, c.categoria,
             p.codigo AS palete_codigo
      FROM volume vol
      JOIN carga c ON c.id = vol.carga_id
      LEFT JOIN palete p ON p.id = vol.palete_id
      WHERE vol.id = $1
      `,
      [volumeId],
    );
    if (!volume) throw new NotFoundException('Volume nao encontrado');
    const printedBefore = await this.db.one<{ total: string }>(
      "SELECT count(*)::text AS total FROM etiqueta_impressao WHERE volume_id = $1 AND tipo IN ('impressao','reimpressao')",
      [volumeId],
    );
    if (tipo === 'impressao' && Number(printedBefore?.total ?? 0) > 0) {
      throw new BadRequestException('Volume ja possui etiqueta; use reimpressao para manter o mesmo UUID');
    }
    if (input.clientUuid) {
      const existing = await this.db.one('SELECT * FROM etiqueta_impressao WHERE client_uuid = $1 LIMIT 1', [input.clientUuid]);
      if (existing) return existing;
    }

    const prefix = tipo === 'reimpressao' ? 'RETIQ' : 'ETIQ';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const protocolo = await this.nextEtiquetaProtocolo(prefix);
      const payload = {
        protocolo,
        volumeUuid: volume.id,
        cargaCodigo: volume.carga_codigo,
        cidadeDestinoSigla: volume.cidade_destino_sigla,
        paleteCodigo: volume.palete_codigo,
        volume: `${volume.indice_volume}/${volume.total_volumes}`,
        peso: volume.peso === null ? null : Number(volume.peso),
        tipoOperacional: volume.total_volumes > 1 ? 'MP' : volume.palete_codigo ? 'PC' : 'PD',
        adapter: 'bluetooth-stub',
        observacao: 'Modelo/protocolo da impressora Bluetooth pendente; registro auditavel para fila offline.',
      };
      try {
        const row = await this.db.tx(async (client) => {
          const inserted = await client.query(
            `
            INSERT INTO etiqueta_impressao (
              volume_id, tipo, status, protocolo, printer_model, printer_mac,
              payload, solicitado_por, client_uuid
            )
            VALUES ($1, $2, 'stub_enfileirado', $3, $4, $5, $6::jsonb, $7, $8)
            RETURNING *
            `,
            [
              volumeId,
              tipo,
              protocolo,
              input.printerModel ?? null,
              input.printerMac ?? null,
              JSON.stringify(payload),
              userId,
              input.clientUuid ?? null,
            ],
          );
          await client.query(
            `
            INSERT INTO audit_evento (entidade, entidade_id, acao, usuario_id, dados_depois, client_uuid)
            VALUES ('etiqueta_impressao', $1, 'conferir', $2, $3::jsonb, $4)
            `,
            [inserted.rows[0].id, userId, JSON.stringify({ tipo, status: 'stub_enfileirado', protocolo, volumeId, payload }), input.clientUuid ?? null],
          );
          return inserted.rows[0];
        });
        return row;
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    throw new BadRequestException('Nao foi possivel gerar protocolo unico de etiqueta; tente novamente');
  }

  async addVolumeEvent(volumeId: string, tipo: string, userId: string, obs?: string, clientUuid?: string) {
    const row = await this.db.one(
      `
      INSERT INTO evento_volume (volume_id, tipo, usuario_id, obs, client_uuid)
      VALUES ($1, $2::tipo_evento_volume, $3, $4, $5)
      RETURNING *
      `,
      [volumeId, tipo, userId, obs ?? null, clientUuid ?? null],
    );
    const status = tipo === 'divergencia' ? 'divergente' : tipo;
    await this.db.query('UPDATE volume SET status = $2::status_volume WHERE id = $1', [volumeId, status]);
    return row;
  }

  async listPortaria() {
    return (await this.db.query('SELECT * FROM registro_portaria ORDER BY entrada_em DESC LIMIT 200')).rows;
  }

  async createPortaria(input: RegistroPortariaInput, userId: string) {
    return this.db.one(
      `
      INSERT INTO registro_portaria (placa, empresa, motorista_nome, tipo, porteiro_id, foto_url, client_uuid)
      VALUES ($1, $2, $3, $4::tipo_registro_portaria, $5, $6, $7)
      RETURNING *
      `,
      [input.placa ?? null, input.empresa, input.motoristaNome ?? null, input.tipo ?? 'veiculo_carga', userId, input.fotoUrl ?? null, input.clientUuid ?? null],
    );
  }

  async listEntregas() {
    const result = await this.db.query(
      `
      SELECT e.*, count(ev.volume_id)::int AS volumes
      FROM entrega_comprovante e
      LEFT JOIN entrega_volume ev ON ev.entrega_id = e.id
      GROUP BY e.id
      ORDER BY e.entregue_em DESC
      LIMIT 200
      `,
    );
    return result.rows;
  }

  async createEntrega(input: EntregaInput, userId: string) {
    if (!input.volumeIds?.length) throw new BadRequestException('volumeIds obrigatorio');
    validateLegalProof(input);
    const protocolo = await this.nextCodigo('ENT');
    const entregaId = await this.db.tx(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO entrega_comprovante (
          viagem_id, cidade_sigla, recebedor_nome, recebedor_doc, recebedor_avulso,
          justificativa, assinatura_url, assinatura_hash, foto1_url, foto2_url,
          foto1_hash, foto2_hash, protocolo, entregue_por_conferente_id, client_uuid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
        `,
        [
          input.viagemId ?? null,
          input.cidadeSigla,
          input.recebedorNome ?? null,
          input.recebedorDoc ?? null,
          input.recebedorAvulso ?? false,
          input.justificativa ?? null,
          input.assinaturaUrl ?? null,
          input.assinaturaHash ?? null,
          input.foto1Url ?? null,
          input.foto2Url ?? null,
          input.foto1Hash ?? null,
          input.foto2Hash ?? null,
          protocolo,
          userId,
          input.clientUuid ?? null,
        ],
      );
      for (const volumeId of input.volumeIds) {
        await client.query('INSERT INTO entrega_volume (entrega_id, volume_id) VALUES ($1, $2)', [inserted.rows[0].id, volumeId]);
        await client.query('UPDATE volume SET status = $2::status_volume WHERE id = $1', [volumeId, 'entregue']);
      }
      return inserted.rows[0].id;
    });
    return this.db.one('SELECT * FROM entrega_comprovante WHERE id = $1', [entregaId]);
  }

  async listPrestacoes() {
    const result = await this.db.query(
      `
      SELECT pc.id, pc.viagem_id, pc.gerente_id, u.nome AS gerente_nome,
             pc.total_declarado, pc.total_sistema, pc.divergencia, pc.status::text,
             pc.itens, pc.anexos, pc.criado_em, pc.atualizado_em,
             v.codigo AS viagem_codigo, v.data_hora_saida, v.data_hora_retorno,
             v.origem_sigla, v.destino_sigla, e.nome AS embarcacao_nome,
             COALESCE(b.total_passageiros, 0)::int AS passageiros,
             COALESCE(c.total_cargas, 0)::int AS cargas,
             COALESCE(c.total_encomendas, 0)::int AS encomendas,
             COALESCE(ev.total_veiculos, 0)::int AS veiculos
      FROM prestacao_contas pc
      JOIN viagem v ON v.id = pc.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      JOIN usuario u ON u.id = pc.gerente_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS total_passageiros
        FROM bilhete b
        WHERE b.viagem_id = v.id AND b.status <> 'cancelado'
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT
          count(*) FILTER (WHERE categoria = 'carga') AS total_cargas,
          count(*) FILTER (WHERE categoria = 'encomenda') AS total_encomendas
        FROM carga c
        WHERE c.viagem_id = v.id
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS total_veiculos
        FROM envio_veiculo x
        WHERE x.viagem_id = v.id AND x.status <> 'cancelada'
      ) ev ON true
      ORDER BY pc.atualizado_em DESC
      LIMIT 100
      `,
    );
    return result.rows.map((row) => this.mapPrestacao(row));
  }

  async findPrestacao(id: string) {
    const row = await this.db.one(
      `
      SELECT pc.id, pc.viagem_id, pc.gerente_id, u.nome AS gerente_nome,
             pc.total_declarado, pc.total_sistema, pc.divergencia, pc.status::text,
             pc.itens, pc.anexos, pc.criado_em, pc.atualizado_em,
             v.codigo AS viagem_codigo, v.data_hora_saida, v.data_hora_retorno,
             v.origem_sigla, v.destino_sigla, e.nome AS embarcacao_nome,
             COALESCE(b.total_passageiros, 0)::int AS passageiros,
             COALESCE(c.total_cargas, 0)::int AS cargas,
             COALESCE(c.total_encomendas, 0)::int AS encomendas,
             COALESCE(ev.total_veiculos, 0)::int AS veiculos
      FROM prestacao_contas pc
      JOIN viagem v ON v.id = pc.viagem_id
      JOIN embarcacao e ON e.id = v.embarcacao_id
      JOIN usuario u ON u.id = pc.gerente_id
      LEFT JOIN LATERAL (
        SELECT count(*) AS total_passageiros
        FROM bilhete b
        WHERE b.viagem_id = v.id AND b.status <> 'cancelado'
      ) b ON true
      LEFT JOIN LATERAL (
        SELECT
          count(*) FILTER (WHERE categoria = 'carga') AS total_cargas,
          count(*) FILTER (WHERE categoria = 'encomenda') AS total_encomendas
        FROM carga c
        WHERE c.viagem_id = v.id
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS total_veiculos
        FROM envio_veiculo x
        WHERE x.viagem_id = v.id AND x.status <> 'cancelada'
      ) ev ON true
      WHERE pc.id = $1
      LIMIT 1
      `,
      [id],
    );
    if (!row) throw new NotFoundException('Prestacao de contas nao encontrada');
    return this.mapPrestacao(row);
  }

  async savePrestacao(input: SavePrestacaoContasInput, gerenteId: string) {
    const totalSistema = await this.calcularTotalSistemaPrestacao(input.viagemId);
    const totalDeclarado = input.totalDeclarado ?? totalSistema;
    const row = await this.db.one<{ id: string }>(
      `
      INSERT INTO prestacao_contas (
        viagem_id, gerente_id, total_declarado, total_sistema, divergencia,
        status, itens, anexos
      )
      VALUES ($1, $2, $3::numeric, $4::numeric, $3::numeric - $4::numeric, $5::status_prestacao, $6::jsonb, $7::jsonb)
      ON CONFLICT (viagem_id, gerente_id) DO UPDATE
      SET total_declarado = EXCLUDED.total_declarado,
          total_sistema = EXCLUDED.total_sistema,
          divergencia = EXCLUDED.divergencia,
          status = EXCLUDED.status,
          itens = EXCLUDED.itens,
          anexos = EXCLUDED.anexos,
          atualizado_em = now()
      RETURNING id
      `,
      [
        input.viagemId,
        gerenteId,
        totalDeclarado,
        totalSistema,
        input.status ?? 'rascunho',
        JSON.stringify(input.itens ?? {}),
        JSON.stringify(input.anexos ?? []),
      ],
    );
    if (!row) throw new BadRequestException('Nao foi possivel salvar a prestacao de contas');
    return this.findPrestacao(row.id);
  }

  private async calcularTotalSistemaPrestacao(viagemId: string) {
    const row = await this.db.one<{ total: string }>(
      `
      SELECT (
        COALESCE((SELECT sum(preco_pago) FROM bilhete WHERE viagem_id = $1 AND status <> 'cancelado'), 0) +
        COALESCE((SELECT sum(valor_cobrado) FROM carga WHERE viagem_id = $1 AND status <> 'cancelada'), 0) +
        COALESCE((SELECT sum(valor_frete) FROM envio_veiculo WHERE viagem_id = $1 AND status <> 'cancelada'), 0)
      )::numeric(12,2)::text AS total
      `,
      [viagemId],
    );
    return Number(row?.total ?? 0);
  }

  private mapPrestacao(row: Record<string, any>) {
    return {
      ...row,
      total_declarado: row.total_declarado === null ? null : Number(row.total_declarado),
      total_sistema: row.total_sistema === null ? null : Number(row.total_sistema),
      divergencia: row.divergencia === null ? null : Number(row.divergencia),
      passageiros: Number(row.passageiros ?? 0),
      cargas: Number(row.cargas ?? 0),
      encomendas: Number(row.encomendas ?? 0),
      veiculos: Number(row.veiculos ?? 0),
    };
  }

  private async findDocumentosSelecionados(documentoIds: string[] | undefined, clienteId: string) {
    const ids = [...new Set((documentoIds ?? []).filter(Boolean))];
    if (!ids.length) return [] as Array<{ id: string; tipo: string; numero: string | null; origem: string | null }>;
    const result = await this.db.query<{ id: string; tipo: string; numero: string | null; cliente_id: string | null; carga_id: string | null; origem: string | null }>(
      `
      SELECT id, tipo::text, numero, cliente_id, carga_id, origem::text
      FROM documento_fiscal
      WHERE id = ANY($1::uuid[])
      ORDER BY criado_em, id
      `,
      [ids],
    );
    if (result.rows.length !== ids.length) {
      throw new BadRequestException('Documento selecionado nao encontrado');
    }
    const invalido = result.rows.find((documento) => documento.cliente_id !== clienteId);
    if (invalido) {
      throw new BadRequestException('Documento selecionado nao pertence ao cliente');
    }
    const vinculado = result.rows.find((documento) => documento.carga_id);
    if (vinculado) {
      throw new BadRequestException('Documento selecionado ja esta vinculado a uma carga');
    }
    return result.rows.map((documento) => ({
      id: documento.id,
      tipo: documento.tipo,
      numero: documento.numero,
      origem: documento.origem,
    }));
  }

  private async buildPedido(clienteId: string, numeroDocumento?: string | null, tipoDocumento?: string | null) {
    const cliente = await this.db.one<{ codigo: string | null; cpf_cnpj: string | null; nome: string }>('SELECT codigo, cpf_cnpj, nome FROM cliente WHERE id = $1', [clienteId]);
    const code = cliente?.codigo
      ? cliente.codigo.toUpperCase()
      : (cliente?.cpf_cnpj ?? cliente?.nome ?? 'CLIENTE').replace(/\W/g, '').slice(-6).toUpperCase();
    const doc = numeroDocumento
      ? `${tipoDocumento ? `${tipoDocumento.toLowerCase()}-` : ''}${numeroDocumento}`
      : 'SEM-DOC';
    return `${code}-${doc}`;
  }

  private async nextCodigo(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-%`;
    const row = await this.db.one<{ total: string }>('SELECT count(*)::text AS total FROM carga WHERE codigo LIKE $1', [like]);
    const total = prefix === 'ENT'
      ? await this.db.one<{ total: string }>('SELECT count(*)::text AS total FROM entrega_comprovante WHERE protocolo LIKE $1', [like])
      : row;
    return `${prefix}-${year}-${String(Number(total?.total ?? 0) + 1).padStart(4, '0')}`;
  }

  private async nextEtiquetaProtocolo(prefix: 'ETIQ' | 'RETIQ'): Promise<string> {
    const year = new Date().getFullYear();
    const base = `${prefix}-${year}-`;
    const row = await this.db.one<{ protocolo: string }>(
      'SELECT protocolo FROM etiqueta_impressao WHERE protocolo LIKE $1 ORDER BY protocolo DESC LIMIT 1',
      [`${base}%`],
    );
    const last = row?.protocolo?.slice(base.length);
    const next = Number(last ?? 0) + 1;
    return `${base}${String(next).padStart(4, '0')}`;
  }
}

function validateLegalProof(input: EntregaInput) {
  const required: Array<[string, string | undefined, string | undefined]> = [
    ['assinatura', input.assinaturaUrl, input.assinaturaHash],
    ['foto1', input.foto1Url, input.foto1Hash],
    ['foto2', input.foto2Url, input.foto2Hash],
  ];
  for (const [label, url, hash] of required) {
    if (!url?.trim()) throw new BadRequestException(`${label}Url obrigatorio`);
    if (!hash?.trim()) throw new BadRequestException(`${label}Hash obrigatorio`);
    if (url.startsWith('field://') || url.startsWith('stub:')) {
      throw new BadRequestException(`${label}Url deve apontar para evidencia capturada, nao stub/local fake`);
    }
    if (hash.startsWith('stub-') || !/^[a-f0-9]{64}$/i.test(hash)) {
      throw new BadRequestException(`${label}Hash deve ser SHA-256 hexadecimal real`);
    }
  }
}

function validateDcProof(input: SaveDeclaracaoConteudoInput) {
  if (!input.assinaturaUrl?.trim()) throw new BadRequestException('assinaturaUrl obrigatorio');
  if (!input.assinaturaHash?.trim()) throw new BadRequestException('assinaturaHash obrigatorio');
  if (input.assinaturaUrl.startsWith('field://') || input.assinaturaUrl.startsWith('stub:')) {
    throw new BadRequestException('assinaturaUrl deve apontar para evidencia capturada, nao stub/local fake');
  }
  if (input.assinaturaHash.startsWith('stub-') || !/^[a-f0-9]{64}$/i.test(input.assinaturaHash)) {
    throw new BadRequestException('assinaturaHash deve ser SHA-256 hexadecimal real');
  }
}

function descricaoFromObs(raw?: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.conteudo === 'string') return parsed.conteudo;
  } catch {
    return raw;
  }
  return null;
}
