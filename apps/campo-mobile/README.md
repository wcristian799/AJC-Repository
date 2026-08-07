# AJC Campo nativo

Contêiner Capacitor único para os sete postos do catálogo `/api/campo/aplicativos`. Ele abre somente `/campo`, usa o mesmo login/RBAC do backend e mantém o painel `/app/*` fora do pacote.

Defina `AJC_CAMPO_URL` com o domínio HTTPS homologado, execute `npm run android` e conclua a assinatura do APK/AAB no Android Studio. Câmera, rede, dispositivo e armazenamento seguro são plugins nativos; impressão Bluetooth e GPS em background só devem ser ativados após homologação do hardware/plugin.
