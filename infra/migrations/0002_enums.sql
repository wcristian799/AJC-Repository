-- =============================================================================
-- 0002_enums.sql
-- Bloco: §2 Enums e domínios (todos os CREATE TYPE da §2)
-- Cobre o passo 1 da ordem de criação (§15).
-- CREATE TYPE não aceita IF NOT EXISTS no PG16; cada tipo é envolvido em um
-- bloco DO que ignora duplicate_object, tornando a migration idempotente.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Acesso / pessoas
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_pessoa AS ENUM ('PF','PJ'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Navegação
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_embarcacao   AS ENUM ('passeio_carga','carga'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_embarcacao AS ENUM ('ativa','manutencao','alugada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_viagem     AS ENUM ('planejada','em_curso','concluida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE situacao_viagem   AS ENUM ('no_prazo','atencao','atrasado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_escala     AS ENUM ('planejada','notificada','confirmada','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- TMS / Carga
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_recebimento_carga  AS ENUM ('porto_balsa','direto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;  -- (b) = cross-docking
DO $$ BEGIN CREATE TYPE status_carga            AS ENUM ('aberta','conferida','embarcada','entregue','divergente','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_volume           AS ENUM ('recebido','conferido','embarcado','reconferido','desembarcado','entregue','divergente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_evento_volume      AS ENUM ('recebido','conferido','embarcado','reconferido','desembarcado','entregue','divergencia'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proprietario_palete     AS ENUM ('AJC','terceiro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_palete           AS ENUM ('livre','alocado','em_transito'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_documento_fiscal   AS ENUM ('NFe','NFCe','DC'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;  -- DC = Declaração de Conteúdo
DO $$ BEGIN CREATE TYPE status_documento_fiscal AS ENUM ('pendente','conferida','divergente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_registro_portaria  AS ENUM ('veiculo_carga','veiculo_transporte','pessoa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_prestacao        AS ENUM ('rascunho','enviada','conferida'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Vendas / Passagens
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE classe_passagem AS ENUM ('rede','rede_vip','camarote'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_bilhete    AS ENUM ('online','pdv','totem','contrato','cortesia','gratuidade'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_bilhete  AS ENUM ('emitido','validado','usado','cancelado','reembolsado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_gratuidade AS ENUM ('idoso','pcd','crianca','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;  -- 🔶 lista legal a confirmar

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_cotacao   AS ENUM ('encomenda','carga','veiculo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_cotacao AS ENUM ('aberta','convertida','expirada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Preços
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE tipo_tabela_preco AS ENUM ('passagem','encomenda','carga'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Caixa
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE status_caixa        AS ENUM ('aberto','fechado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_movimento_caixa AS ENUM ('venda_passagem','despacho_carga','sangria','suprimento','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE forma_pagamento     AS ENUM ('dinheiro','pix','cartao_credito','cartao_debito','contrato','cortesia','gratuidade'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE acao_audit AS ENUM ('criar','atualizar','excluir','transicao_status','validar','conferir','entregar','login','config_publicar','reajuste_preco'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
