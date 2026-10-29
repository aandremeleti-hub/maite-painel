# 0004 - Dynamic Import Isolado para Exportação de PDF com html2pdf.js

A biblioteca de exportação `html2pdf.js` (~935 kB com suas dependências) é importada exclusivamente via `await import('html2pdf.js')` de forma dinâmica e sob demanda quando o usuário aciona o download da fatura. Essa decisão impede que o peso do motor de PDF degrade o carregamento inicial da aplicação SPA, isolando o módulo em um chunk separado no build do Vite e mantendo o carregamento do painel instantâneo.
