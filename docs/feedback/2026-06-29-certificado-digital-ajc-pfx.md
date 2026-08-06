# Certificado Digital Recebido — AJC

> Fonte recebida em 2026-06-29:
> `C:\Users\Administrador\Downloads\2866916_A__J__C__NAVEGACAO_LTDA_10736847000192 (1).pfx`
>
> Tamanho observado: 9.466 bytes. Nome do arquivo indica AJC Navegação LTDA e CNPJ `10.736.847/0001-92`.

## Leitura Executiva

O arquivo `.pfx` provavelmente é um certificado digital A1 com chave privada, usado para assinatura/autenticação em fluxos fiscais. Isso destrava parcialmente a pendência de **certificado digital** citada para BP-e/SEFAZ-PA, mas não resolve sozinho a emissão fiscal.

## Segurança

- Não copiar este arquivo para dentro do repositório.
- Não commitar `.pfx`, `.p12`, `.key`, `.pem` ou senha de certificado.
- Não colar senha de certificado em chat, docs versionados ou código.
- Armazenar em cofre/secret manager quando a integração fiscal for implementada.
- `.gitignore` do repo bloqueia `*.pfx`, `*.p12`, `*.jks` e `*.keystore` para reduzir risco de vazamento acidental.

## O Que Fica Parcialmente Resolvido

- A pendência "certificado digital" deixa de ser totalmente aberta: o arquivo PFX foi recebido.
- O front pode continuar mostrando BP-e como opção/obrigatoriedade por canal conforme reunião.
- O backend fiscal poderá prever configuração segura para certificado A1, mas a implementação ainda depende das validações abaixo.

## Atualização 05/ago/2026

- AJC confirmou que já emite BP-e por outro sistema; o credenciamento operacional deixa de ser bloqueio presumido.
- Fornecedor escolhido: **NS BP-e API**.
- Adapter real, outbox, worker, webhook, download e cancelamento foram implementados na migration 0037 e no módulo fiscal.
- O PFX será mantido no cofre/painel da NS, não em volume da aplicação.

## Pendências para ativação

- Senha do arquivo PFX.
- Validade do certificado.
- Cadeia emissora e tipo de certificado, por exemplo e-CNPJ A1.
- Confirmação de que este certificado pode ser usado no fluxo BP-e da AJC.
- Contratação/liberação da conta NS e token de homologação/produção.
- Upload seguro do PFX e confirmação da validade no painel NS.
- Série exclusiva, próximo número e códigos fiscais aprovados pelo contador/NS.
- Homologação completa antes da troca para produção.
- Política operacional de renovação antes do vencimento.
- Decisão de onde guardar o certificado em produção: secret manager, volume seguro ou serviço fiscal terceirizado.

## Impacto no Roadmap

Antes de construir o backend definitivo do Portal online:

1. Validar o PFX com a senha correta em ambiente local controlado.
2. Confirmar validade, CNPJ, cadeia e usos do certificado.
3. Executar o onboarding NS em `docs/deploy/NS-BPe-Onboarding.md`.
4. Definir gateway de pagamento e emissão fiscal como dois fluxos plugáveis, ligados por estados de pedido/pagamento/bilhete.
