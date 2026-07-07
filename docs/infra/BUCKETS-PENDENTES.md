# Buckets Pendentes - Object Storage AJC

> Arquivo canonico para todo upload/blob do projeto.
> Sempre que surgir novo fluxo com `*_url`, `*_hash`, anexo, foto, assinatura ou documento,
> registre aqui antes de concluir a tarefa.
>
> Decisao atual de hospedagem: usar **MinIO** self-hosted na stack Docker/Coolify da AJC.
> Bucket/nome final, politica e lifecycle podem ser refinados depois, mas a pendencia precisa entrar aqui.

## Regras

- Nao assumir Supabase, S3 publico ou provedor externo sem decisao registrada.
- Enquanto o bucket real nao estiver ligado no fluxo, usar referencia auditavel no banco e marcar o bucket como `pendente`.
- Ao implementar um novo upload, atualizar este arquivo e o `docs/STATUS.md`.
- Quando um bucket sair de pendente e entrar em uso real, trocar o status para `ativo` e documentar credencial/politica no deploy.

## Buckets

| Bucket sugerido | Status | Modulo | Uso |
|---|---|---|---|
| `documentos-fiscais` | pendente | TMS / Encomendas | NF-e, NFC-e, DC e anexos de documentos fiscais (`documento_fiscal.arquivo_url`) |
| `declaracoes-conteudo-assinaturas` | pendente | Encomendas | Assinaturas da declaracao de conteudo (`declaracao_conteudo.assinatura_url`) |
| `portaria-fotos` | pendente | TMS | Fotos de registro de portaria (`registro_portaria.foto_url`) |
| `recebimento-fotos` | pendente | TMS | Fotos de recebimento/carga (`carga_recebimento.foto_url`) |
| `entregas-comprovantes` | pendente | TMS | Assinatura e fotos obrigatorias de entrega (`entrega_comprovante.assinatura_url`, `foto1_url`, `foto2_url`) |
| `prestacoes-anexos` | pendente | TMS | PDFs e comprovantes anexos da prestacao de contas (`prestacao_contas.anexos`) |
| `veiculos-fotos-checklist` | pendente | Veiculos/Maquinas | Fotos por etapa/checklist (`envio_veiculo_foto.foto_url`) |
| `vendas-gratuidades-documentos` | pendente | Vendas | Comprovantes/documentos de gratuidade (`gratuidade.documento_url`) |

## Hospedagem recomendada

- Plataforma: MinIO self-hosted no mesmo VPS/Coolify da stack MVP.
- Motivo: S3-compatible, leve, portavel e sem travar a AJC em um provedor antes da decisao final de cloud.
- Exposicao recomendada: endpoint S3 interno para API/worker e console MinIO protegido por dominio/admin separado.
- Backup: volume proprio + rotina externa junto do backup do Postgres.

## Proximos passos

1. Subir servico `minio` no `docker-compose.coolify.yml`.
2. Definir variaveis `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_API_URL`, `MINIO_PUBLIC_URL`.
3. Criar rotina/bootstrap para garantir buckets obrigatorios.
4. Ligar cada fluxo de upload gradualmente, com hash SHA-256 e trilha de auditoria.
