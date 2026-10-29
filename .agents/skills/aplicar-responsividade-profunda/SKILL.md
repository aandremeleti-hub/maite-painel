---
name: aplicar-responsividade-profunda
description: "Workflow otimizado para aplicação de responsividade completa e de alto nível em componentes UI"
---


# /aplicar-responsividade-profunda

## 🎯 Objetivo
Guiar a refatoração de componentes de UI para aplicar uma **responsividade completa e de alto nível (Premium)**. O objetivo não é apenas evitar barras de rolagem (fluidez), mas garantir que o componente adapte seu **layout, tipografia, estrutura e respiros (paddings)** de forma inteligente, oferecendo uma experiência nativa perfeita em Desktops, Tablets e Mobile.

## 🤖 Orquestração de Agentes e Skills
Conforme estabelecido pelo `orchestrator.md` e verificado via `find-skills`:
- **Agente Obrigatório:** Invoque o `frontend-specialist` para executar este workflow. Somente ele deve modificar os arquivos `.jsx` e `.css` da UI.
- **Skills Ativas Recomendadas:** Ao processar a responsividade, o agente deve agir utilizando os conhecimentos das skills `frontend-design`, `mobile-design` e `web-design-guidelines` (disponíveis na raiz do projeto) para garantir que as proporções visuais fiquem em alto nível.

## 🛠️ Passo a Passo de Execução

Ao atuar em um componente, o agente deve auditar e refatorar o `.css` (e o `.jsx` se houver classes dinâmicas) seguindo estas diretrizes:

### 1. Desengessar Contêineres (Fluidez Básica)
- Substitua dimensões estáticas: Troque `width: 500px` por `width: 100%; max-width: 500px;`.
- Troque alturas restritivas: `height: 500px` vira `min-height: 500px; height: auto;` (especialmente em textos e cards, permitindo que cresçam sem vazar).

### 2. Reestruturação Estratégica de Layout (O Fim do "Tudo Centralizado")
Não basta diminuir tudo. A geometria deve mudar.
- **Flex/Grid Direction:** Em breakpoints de tablet/mobile (`max-width: 1024px` e `768px`), elementos distribuídos em `row` devem ser alterados para `flex-direction: column`.
- **Realinhamento:** Textos ou blocos que funcionavam centralizados no desktop muitas vezes precisam de `align-items: flex-start` ou `text-align: left` para não ficarem com leitura "espremida".
- **Gaps proporcionais:** Reduza espaçamentos internos. Um `gap: 48px` no desktop deve ser reduzido para `gap: 24px` ou `16px` no mobile.

### 3. Escalonamento Tipográfico 
Textos não podem ser ilegíveis no desktop e nem gigantescos (ocupando a tela toda) no celular.
- Utilize regras CSS claras em media queries para reduzir os tamanhos (`font-size`) e as alturas de linha (`line-height`) dos títulos (`h1`, `h2`, `h3`) e subtítulos.

### 4. Proporção de Respiro (Paddings/Margins)
Evite os "grandes espaços mortos" em cima e embaixo do componente no celular.
- Adapte paddings globais de seções. Exemplo: um container com `padding: 120px 40px;` no desktop **DEVE** ter seus paddings de topo e base reduzidos substancialmente no mobile (ex: `padding: 60px 20px;`).

### 5. Media Queries com Propósito
- O componente não deve ter "gambiarras" no `@media` apenas para consertar quebras, mas sim diretrizes estruturais de redesign. Se você limpar os travamentos da base (Passo 1), o media query será usado exclusivamente para a Reestruturação (Passo 2, 3 e 4).

## ✅ Checklist de Qualidade Premium
- [ ] O agente utilizado foi o `frontend-specialist`?
- [ ] A reestruturação de Flexbox/Grid foi feita (de horizontal para vertical, se aplicável)?
- [ ] Títulos e parágrafos foram devidamente escalonados (reduzidos) nas media queries?
- [ ] Os enormes "espaços em branco" verticais e horizontais foram proporcionalmente reduzidos?
- [ ] O componente reflete as diretrizes das skills de `frontend-design` mantendo aspecto premium em qualquer viewport?
