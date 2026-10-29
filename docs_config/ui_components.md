# 📂 Referência de Arquitetura: Componentes de UI, Design System & Shell de Layout

**Última Atualização:** 2026-10-29  
**Origem do Conhecimento:** `15.4_relatorio_fase5_compliance.md`, `15.5_relatorio_didatico_fase5.md`, `15_implementation_plan_v4.md`, `15.3_relatorio_fase4_completo.md`, `finalizacao-painel-maite_plan.md` (Fases 6, 7 e 8 As-Built), `escopo-atualizacoes-29out_plan.md` (Fases 1 a 6 As-Built), ADRs 0003, 0006 e 0007.

---

## 🎯 1. Escopo e Regras de Negócio

### 1.1. Propósito da Camada
Esta frente padroniza toda a camada de apresentação visual do **Painel de Atendimento Maite**, estruturada com React 19, TypeScript estrito, arquitetura de componentes modulares e **CSS Modules**. O design reproduz com precisão cirúrgica a identidade visual da marca Maite (Teal/Ameixa/Vinho), entregando uma experiência completa e fluida nos módulos de **Alunos**, **Fechamento Mensal (Closing)**, **Time Sheet & PIX** e **Configurações**.

### 1.2. Regras de Negócio e Conformidade STARTMEDIA (Manual v1.0)
1. **Idioma Estritamente em Inglês no Código:**  
   100% de pastas, arquivos, componentes, interfaces, variáveis e classes CSS são nomeados em inglês (`components/students`, `styles.module.css`, `handleSubmit`, `.sheetPaper`). Textos visíveis ao usuário final (labels, toasts, botões) são renderizados em português humanizado.
2. **Convenção de Tipagem com Prefixo `I`:**  
   Todas as interfaces TypeScript adotam obrigatoriamente o prefixo `I` (`IButtonProps`, `IStudentCardProps`, `IStudentFormModalProps`, `IClosingToolbarProps`, `ITimeSheetDocumentProps`, `IPanelLayoutProps`).
3. **Arquitetura CSS Modules Estrita:**  
   - Proibição absoluta de estilos inline arbitrários (`style={{`) no JSX para design.
   - Proibição de classes globais arbitrárias.
   - Cada componente ou página habita seu próprio diretório contendo `index.tsx` e `styles.module.css`.
4. **Governança de Design Tokens:**  
   - É proibido declarar cores hexadecimais, margens, paddings e fontes diretamente nos módulos CSS.
   - 100% dos valores consomem variáveis de design de `variables.css` (`var(--color-primary)`, `var(--spacing-md)`, `var(--radius-lg)`).
   - Cores corporativas oficiais Maite:
     - Primária: `--color-primary: #1f6965` (Teal / Verde Petróleo)
     - Secundária: `--color-secondary: #6e5673` (Ameixa / Púrpura)
     - Ação: `--color-action: #390645` (Vinho Escuro)
     - Tipografia: `--font-heading: 'DM Sans', sans-serif` e `--font-body: 'Lato', sans-serif`.
5. **Acessibilidade Mandatória (WCAG 2.1 AA):**  
   - Inputs e Selects possuem vinculação semântica com `<label htmlFor={inputId}>` via fallback nativo com `useId()`.
   - Elementos em erro utilizam `aria-invalid="true"` e mensagens de erro com `role="alert"`.
   - Modais utilizam `role="dialog"`, `aria-modal="true"`, foco gerenciado, tecla Escape e bloqueio de scroll de fundo.
   - Tabelas e cards usam escopos semânticos `<th>` com `scope="col"`, tags `<article>` com `aria-labelledby`, e regiões `aria-live="polite"` para contagem de registros.
6. **Teto de Linhas por Arquivo (Clean Code):**  
   Nenhum componente ou página ultrapassa **200 linhas de código**, respeitando o teto de manutenibilidade estabelecido na auditoria da Fase 5 e comprovado nas Fases 6, 7 e 8.
7. **Seletor Inclusivo de Alunos no Agendamento (`LessonFormModal`):**  
   O formulário de apontamento de aulas lista toda a base de alunos cadastrada (ativos e inativos). Os inativos recebem a tag textual `— (Inativo)` mantendo a ordenação alfabética natural. Quando um aluno inativo é selecionado, um container informativo sutil com ícone e contraste AA esclarece à usuária que o aluno será automaticamente reativado ao salvar a aula.
8. **Visualização Padrão Focada em Alunos Ativos (`StudentsPage`):**  
   O estado padrão de filtro na listagem principal de alunos inicia como `'active'`, garantindo que a usuária visualize de imediato apenas quem está com atendimento regular em andamento, mantendo abas de filtro (`StudentStatusFilter`) com contadores atualizados em tempo real para alternar entre `Ativos`, `Inativos` e `Todos`.

---

## ⚙️ 2. Especificação Técnica e Códigos-Chave

### 2.1. Tokens Globais do Design System (`src/styles/variables.css`)

```css
:root {
  /* Brand Identity Maite */
  --color-primary: #1f6965;
  --color-primary-hover: #17524f;
  --color-primary-light: #e8f3f2;
  --color-secondary: #6e5673;
  --color-action: #390645;
  --color-action-hover: #290432;

  /* Surfaces & Neutrals */
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text-main: #1e293b;
  --color-text-muted: #64748b;

  /* Badges & Status */
  --badge-active-bg: #ecfdf5;
  --badge-active-text: #047857;
  --badge-inactive-bg: #f1f5f9;
  --badge-inactive-text: #64748b;
  --badge-closed-bg: #fef2f2;
  --badge-closed-text: #b91c1c;
  --badge-courtesy-bg: #eff6ff;
  --badge-courtesy-text: #1d4ed8;

  /* Typography */
  --font-heading: 'DM Sans', sans-serif;
  --font-body: 'Lato', sans-serif;

  /* Spacings */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border Radii */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Z-Index Hierarchy */
  --z-sidebar: 100;
  --z-topbar: 90;
  --z-backdrop: 200;
  --z-modal: 300;
}
```

---

### 2.2. Biblioteca de Componentes UI Atômicos (`src/components/ui/`)

- **Button (`Button/index.tsx`):** Variantes `primary`, `secondary`, `outline`, `danger`, tamanhos `sm`, `md`, `lg`, suporte a ícones laterais e spinner animado integrado com `aria-busy`.
- **Badge (`Badge/index.tsx`):** 10 variantes de status financeiro, nota fiscal e frequência (`active`, `inactive`, `open`, `closed`, `standard`, `extended`, `absence`, `cancelled`, `courtesy`, `NF`).
- **Modal (`Modal/index.tsx`):** Renderizado isoladamente no DOM via `createPortal(..., document.body)` com bloqueio de scroll de fundo (`overflow: hidden`) e fechamento via tecla `Escape`.
- **Input & Select (`Input/index.tsx`, `Select/index.tsx`):** Encapsulamento com `forwardRef`, IDs automáticos via `useId()`, labels acessíveis, estados de erro acessíveis (`aria-invalid="true"`) e adornos de ícone.
- **Card (`Card/index.tsx`):** Composição modular com `Card`, `CardHeader`, `CardBody` e `CardFooter`.

---

### 2.3. Módulo de Alunos (Fase 6 As-Built)

1. **`StudentCard` (`src/components/students/StudentCard/`):**
   - Estrutura semântica sob tag `<article>` com `aria-labelledby`.
   - Exibe nome do aluno, badge de status (`active`/`inactive`), badge condicional roxa `NF` (`requires_invoice === true`), valor da hora com classe tabular (`font-variant-numeric: tabular-nums`), data da primeira aula formatada via `formatDateBR`, link "Ver Detalhes" para `/alunos/:id`, botão "Editar" e atalho para o Time Sheet (`/timesheet?studentId=...`).
2. **`StudentStatusFilter` (`src/components/students/StudentStatusFilter/`):**
   - Container `<div role="tablist">` e botões `<button role="tab">` com contadores numéricos tabulares em abas ("Todos", "Ativos", "Inativos").
3. **`StudentFormModal` (`src/components/students/StudentFormModal/`):**
   - Modal de cadastro e edição de aluno com máscara monetária progressiva em tempo real (`formatCurrencyInput`), gravação como float numérico puro no Supabase, toggle de nota fiscal e data literal de início.
4. **`StudentDeleteModal` (`src/components/students/StudentDeleteModal/`):**
   - Modal de alta segurança com diálogo pedagógico orientando a **Inativação Lógica** para preservação contábil.
   - Caso o usuário tente exclusão física de aluno com aulas, intercepta o código PostgreSQL `23503` (ADR 0002) e exibe alerta inline orientativo.
5. **`StudentsPage` (`src/pages/Students/`):**
   - Orquestra busca de alunos com normalização de acentos (NFD), filtros de status com `useMemo`, grid CSS responsivo (1 a 3 colunas), skeletons animados e feedback `aria-live="polite"`.
6. **`StudentDetailPage` & `StudentLessonHistoryTable` (`src/pages/StudentDetail/`):**
   - Sub-rota dedicada `/alunos/:id` integrada ao `PanelLayout` (ADR 0005) e resiliente a recarregamentos (F5).
   - Apresenta 4 mini-cards de métricas (Tarifa Contratual, Primeira Aula, Total Histórico de Aulas e Faturamento Bruto Acumulado), bloco de notas contratuais e tabela semântica com rolagem horizontal suave em mobile.

---

### 2.4. Módulo Closing (Fase 7 As-Built)

1. **`ClosingKpiCard` & `ClosingKpiGrid` (`src/pages/Closing/components/`):**
   - 4 cards executivos ordenados: **Faturamento da Competência**, **Total de Aulas Apuradas** (com tratamento para singular/plural e fracionário), **Alunos Atendidos** e **Status da Competência** (badge `open` / `closed` com cadeado).
2. **`LessonFormModal` (`src/pages/Closing/components/LessonFormModal/`):**
   - Modal de apontamento de aulas. Dropdown restrito a alunos ativos, input de data delimitado pelo mês ativo (sem construtor `new Date()`), dropdown de categoria de aula (`standard`, `extended`, `absence`, `cancelled`, `courtesy`), multiplicador ajustável, checkbox condicional de cobrança de falta (`charge_absence`) e bloqueio com aviso de cadeado caso o mês esteja fechado.
3. **`closingAggregator.ts` (`src/pages/Closing/utils/`):**
   - Agregador puro em memória com complexidade linear O(N+M), agrupando aulas por aluno em `Map` e calculando contadores e faturamentos com 100% de paridade com o PostgreSQL.
4. **`ClosingTable`, `ClosingStudentRow` e `ClosingLessonItem`:**
   - Tabela de fechamento em acordeão com botões mestres "Expandir Todos" e "Recolher Todos".
   - Cada linha de aluno exibe nome, badge condicional `NF`, contagem de horas faturadas, total da competência e atalhos rápidos ("+ Aula", "Time Sheet").
   - Linhas individuais de aula com botões de edição e exclusão desabilitados automaticamente se o mês estiver com status `closed`.
5. **Modais de Alta Fricção de Fechamento e Reabertura (ADR 0003):**
   - **`CloseMonthModal`:** Exige digitação manual e estrita da palavra **`"FECHAR"`** para ativar o botão de confirmação, acionando a RPC `fn_close_month` e ativando o Cadeado Contábil.
   - **`ReopenMonthModal`:** Apresenta alerta severo de auditoria contábil e exige marcação de checkbox de ciência explícita para habilitar o botão de perigo (`variant="danger"`), acionando `fn_reopen_month`.
6. **`ClosingToolbar` & `ClosingPage`:**
   - Barra de comandos com busca instantânea e alternância contextual de botões baseada no status do mês. Arquivo de orquestração mantido estritamente abaixo de 200 linhas.

---

### 2.5. Módulo Time Sheet & Configurações (Fase 8 As-Built)

1. **`TimeSheetDocument` (`src/pages/TimeSheet/components/TimeSheetDocument/`):**
   - Folha física no formato oficial **DIN A4 (210mm x 297mm)** com proporção 1 : 1.414, margem interna de 16mm e preview estilizado sobre mesa de trabalho física.
   - Cabeçalho oficial aderente ao `GLOSSARY.md` ("DEMONSTRATIVO DE AULAS MINISTRADAS" e "Time Sheet Mensal Individual" — vetado termos comerciais como boleto/fatura).
   - **Supressão Inteligente de Colunas:** Caso nenhum registro de aula contenha anotações pedagógicas (`content_notes`), a coluna é suprimida e a tabela redistribui a largura em 4 colunas; havendo anotações, a tabela expande para 5 colunas com quebra suave de linha.
   - Quebra de página protegida com `break-inside: avoid; page-break-inside: avoid;` nas linhas `<tr>`.
   - Carimbo oficial PIX com dados bancários da professora e botão interativo "Copiar Chave PIX" com toast Sonner, marcado com `.hideOnPrint` para não sair no PDF ou papel.
2. **`TimeSheetToolbar` (`src/pages/TimeSheet/components/TimeSheetToolbar/`):**
   - Dropdown de alunos sincronizado bidirecionalmente com os parâmetros de busca da URL (`?studentId=...`).
   - Botão de download assíncrono do PDF oficial com spinner animado (`isPending`) chamando o serviço `generateTimeSheetPDF`.
   - Botão secundário de impressão nativa vetorial chamando `window.print()`.
   - Banner de alerta preventivo com ícone `AlertTriangle` orientando para o cadastro de chave PIX caso nenhum dado bancário esteja registrado.
3. **`PaymentInfoForm` & `SettingsPage` (`src/pages/Settings/`):**
   - Interface de gerenciamento bancário da professora para cadastro e edição do titular, instituição financeira, tipo de chave e chave PIX, integrado aos hooks `useCreatePaymentInfo` e `useUpdatePaymentInfo`.
4. **Isolamento de Impressão (`@media print`):**
   - Regras CSS estritas que ocultam completamente elementos da carcaça do painel (Sidebar, TopBar, Toolbars) e imprimem exclusivamente a folha A4 em 100% de largura vetorial.

---

### 2.6. Sincronização Temporal Global & Roteamento SPA

- **`DateFilterContext.tsx`:** Gerencia a competência ativa via Search Params da URL (`?ano=YYYY&mes=MM`), com sanitização contra valores inválidos.
- **Árvore de Rotas Atualizada (`src/App.tsx`):**
```typescript
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<PanelLayout />}>
            <Route path="/" element={<Navigate to="/alunos" replace />} />
            <Route path="/alunos" element={<StudentsPage />} />
            <Route path="/alunos/:id" element={<StudentDetailPage />} />
            <Route path="/fechamento" element={<ClosingPage />} />
            <Route path="/timesheet" element={<TimeSheetPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/dev/test-hooks" element={<TestHooks />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🔗 3. Arquivos Ativos e Referências no Projeto

- [variables.css](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/styles/variables.css) — *Centralizador de tokens CSS da marca Maite (cores, fontes, espaçamentos).*
- [global.css](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/styles/global.css) — *CSS reset moderno e regras de foco `:focus-visible`.*
- [Button](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/ui/Button/index.tsx) — *Botão acessível com 4 variantes e estado de loading com spinner.*
- [Badge](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/ui/Badge/index.tsx) — *Pílula indicadora com 10 variantes de status e dot opcional.*
- [Modal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/ui/Modal/index.tsx) — *Caixa de diálogo via React Portal com bloqueio de scroll e tecla Escape.*
- [StudentCard](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/students/StudentCard/index.tsx) — *Card individual do aluno com dados tabulares e links.*
- [StudentStatusFilter](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/students/StudentStatusFilter/index.tsx) — *Abas de filtro de alunos com contadores em tempo real para Ativos, Inativos e Todos.*
- [StudentFormModal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/students/StudentFormModal/index.tsx) — *Modal de cadastro/edição com máscara monetária e validação.*
- [StudentDeleteModal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/components/students/StudentDeleteModal/index.tsx) — *Diálogo explicativo de inativação lógica vs exclusão física.*
- [StudentsPage](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Students/index.tsx) — *Página de listagem de alunos com filtro inicial padrão focado em 'active'.*
- [StudentDetailPage](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/StudentDetail/index.tsx) — *Página de detalhamento de aluno na rota dedicada `/alunos/:id`.*
- [LessonFormModal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Closing/components/LessonFormModal/index.tsx) — *Modal de apontamento e edição de aulas no Closing com seletor inclusivo de alunos e aviso contextual.*
- [CloseMonthModal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Closing/components/CloseMonthModal/index.tsx) — *Modal de alta fricção com confirmação textual para fechamento contábil.*
- [ReopenMonthModal](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Closing/components/ReopenMonthModal/index.tsx) — *Modal de alta fricção com checkbox para reabertura de competência.*
- [TimeSheetDocument](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/TimeSheet/components/TimeSheetDocument/index.tsx) — *Documento físico A4 com supressão inteligente de colunas e carimbo PIX.*
- [TimeSheetToolbar](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/TimeSheet/components/TimeSheetToolbar/index.tsx) — *Barra de comandos do Time Sheet com exportação PDF e impressão.*
- [PaymentInfoForm](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/pages/Settings/components/PaymentInfoForm/index.tsx) — *Formulário de configuração bancária e chave PIX.*
- [App.tsx](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/App.tsx) — *Árvore de rotas SPA da aplicação.*

---

## 🧠 4. Lições Aprendidas, Erros Comuns & Gotchas (Essencial)

> [!IMPORTANT]
> **Gotchas e Erros Evitados na Camada Visual e Layout:**
> 
> 1. **Bloqueio de Scroll em Modais (`createPortal`):**  
>    Ao abrir modais, salvar o valor original de `document.body.style.overflow` e aplicar `hidden`. Na desmontagem (`return () =>`), restaurar o valor anterior para não prender a barra de rolagem da página.
> 
> 2. **Tratamento de Alunos com Aulas vs Exclusão Física (ADR 0002):**  
>    A tentativa de deletar um aluno com histórico causa rejeição pelo Postgres. O componente `StudentDeleteModal` implementa tratamento de erro inline com destaque em vermelho e direcionamento para a Inativação Lógica, evitando que o usuário se confunda com erros técnicos.
> 
> 3. **Proporção A4 e Quebras de Tabela na Impressão:**  
>    Tabelas impressas em papel A4 sem a regra `break-inside: avoid;` podem ter linhas cortadas ao meio na divisa de página. A aplicação mandatória de `page-break-inside: avoid; break-inside: avoid;` em todas as linhas `<tr>` resolve de forma definitiva o problema em relatórios extensos.
> 
> 4. **Supressão Inteligente da Coluna de Conteúdo:**  
>    Renderizar a coluna "Conteúdo / Anotações" em branco quando nenhuma aula possui observação desperdiça 37% da largura útil da folha A4. O cálculo memorizado `hasNotes = lessons.some(l => Boolean(l.content_notes?.trim()))` readequa dinamicamente a geometria para 4 colunas com larguras proporcionais harmoniosas.
> 
> 5. **O Teto de 200 Linhas por Arquivo (STARTMEDIA Compliance):**  
>    Tanto na Fase 6, quanto nas Fases 7 e 8, telas complexas foram mantidas rigorosamente sob o teto de 200 linhas graças à extração modular cirúrgica de componentes (ex: `ClosingKpiGrid`, `ClosingTable`, `ClosingStudentRow`, `TimeSheetDocument`, `TimeSheetToolbar`).
> 
> 6. **Reatividade Instantânea no Ciclo de Vida do Aluno (React Query Cache Invalidation):**  
>    Ao salvar uma nova aula via `useAddLesson`, é mandatória a invalidação simultânea de `queryKeys.lessons.all`, `queryKeys.students.all` e `queryKeys.students.detail(student_id)`. Como a inserção no banco aciona a trigger de reativação imediata (`trg_reactivate_student_on_lesson`), essa invalidação concorrente assegura que a listagem de alunos e as contagens reflitam o status `'active'` imediatamente sem reload da página.
> 
> 7. **Preservação de Acessibilidade no Seletor Inclusivo de Alunos:**  
>    O sufixo visual `— (Inativo)` nas opções do `<select>` do `LessonFormModal` mantém clareza semântica para leitores de tela e evita erros de seleção acidental, enquanto o box informativo possui contraste adequado conforme WCAG 2.1 AA informando sobre a reativação automática.
