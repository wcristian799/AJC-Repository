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

## Pendências Que Continuam

- Senha do arquivo PFX.
- Validade do certificado.
- Cadeia emissora e tipo de certificado, por exemplo e-CNPJ A1.
- Confirmação de que este certificado pode ser usado no fluxo BP-e da AJC.
- Credenciamento da AJC na SEFAZ-PA para BP-e.
- Fornecedor/API/biblioteca fiscal para emissão de BP-e.
- Ambiente de homologação e produção.
- Política operacional de renovação antes do vencimento.
- Decisão de onde guardar o certificado em produção: secret manager, volume seguro ou serviço fiscal terceirizado.

## Impacto no Roadmap

Antes de construir o backend definitivo do Portal online:

1. Validar o PFX com a senha correta em ambiente local controlado.
2. Confirmar validade, CNPJ, cadeia e usos do certificado.
3. Confirmar com contador/fornecedor fiscal o caminho BP-e/SEFAZ-PA.
4. Definir gateway de pagamento e emissão fiscal como dois fluxos plugáveis, ligados por estados de pedido/pagamento/bilhete.
