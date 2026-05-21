# Grabado – Horas Funcionários

Aplicativo PWA para controle de horas de funcionários.

## Como usar

1. Abra index.html em um navegador.
2. Instale como PWA (botão instalar no navegador).

## Ícones

Adicione ícones PNG em /icons/ e /www/icons/:
- icon-192.png (192x192)
- icon-512.png (512x512)

## Converter para APK

1. Instale Node.js
2. npm install -g @capacitor/core @capacitor/cli
3. npm install @capacitor/android
4. npx cap init "Grabado" "com.grabado.app" --web-dir=www
5. npx cap add android
6. npx cap sync android
7. npx cap open android
8. No Android Studio:
   - Abra o projeto
   - Build > Build Bundle(s)/APK(s) > Build APK(s)
   - O APK será gerado em android/app/build/outputs/apk/debug/app-debug.apk

## Funcionalidades

- Registros offline com LocalStorage
- Navegação por abas
- Busca avançada
- Relatórios com gráficos simples
- Modal para adicionar/editar
- Animações e UX moderna