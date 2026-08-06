-- Cliente de passagem separado do CRM e filtros operacionais de vendas.
BEGIN;

CREATE TABLE IF NOT EXISTS cliente_passagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(160) NOT NULL,
  cpf varchar(14),
  data_nascimento date,
  telefone varchar(30),
  sexo varchar(30),
  criado_por uuid REFERENCES usuario(id),
  atualizado_por uuid REFERENCES usuario(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  ativo boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_passagem_cpf ON cliente_passagem(cpf) WHERE cpf IS NOT NULL AND ativo;
CREATE INDEX IF NOT EXISTS ix_cliente_passagem_nome ON cliente_passagem(nome);

ALTER TABLE bilhete ADD COLUMN IF NOT EXISTS cliente_passagem_id uuid REFERENCES cliente_passagem(id);
ALTER TABLE bilhete ADD COLUMN IF NOT EXISTS passageiro_data_nascimento date;
ALTER TABLE bilhete ADD COLUMN IF NOT EXISTS passageiro_telefone varchar(30);
ALTER TABLE bilhete ADD COLUMN IF NOT EXISTS passageiro_sexo varchar(30);
CREATE INDEX IF NOT EXISTS ix_bilhete_cliente_passagem ON bilhete(cliente_passagem_id);

UPDATE config_versao cv SET valor = jsonb_set(cv.valor, '{limitePesoEncomenda}', COALESCE(cv.valor->'limitePesoEncomenda','30'::jsonb), true)
FROM config_chave cc WHERE cc.id=cv.chave_id AND cc.chave='encomendas_operacao';

COMMIT;
