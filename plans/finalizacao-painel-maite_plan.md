# Plano de Ação Mestre e As-Built: Finalização do Painel de Atendimento Maite (Fases 6, 7 e 8)

**Objetivo Geral:** Finalizar a implementação integral do Painel de Atendimento Maite através da entrega ponta a ponta dos três módulos centrais de aplicação: o Módulo de Alunos (CRUD com máscara monetária, inativação lógica protegida e rota dedicada `/alunos/:id`), o Módulo Closing (apontamento ágil de aulas por data literal ISO, categorização com multiplicadores, tabela de fechamento em acordeão, KPIs de competência e governança do cadeado contábil com Stored Procedures) e o Módulo Time Sheet & PIX (demonstrativo mensal tabular na geometria física A4 com supressão dinâmica de colunas, exportação assíncrona de PDF via dynamic import de `html2pdf.js`, impressão nativa vetorial e gestão da chave PIX).

**Status:** 🟢 Concluído (As-Built) — 2026-10-29  
**Documentos de Referência:**
- Glossário de Domínio Canônico: [GLOSSARY.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/GLOSSARY.md)
- Decisões de Arquitetura Aprovadas (ADRs):
  - [0001-datas-literais-strings-iso.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs/adr/0001-datas-literais-strings-iso.md)
  - [0002-inativacao-logica-on-delete-restrict.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs/adr/0002-inativacao-logica-on-delete-restrict.md)
  - [0003-cadeado-contabil-stored-procedures.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs/adr/0003-cadeado-contabil-stored-procedures.md)
  - [0004-dynamic-import-html2pdf.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs/adr/0004-dynamic-import-html2pdf.md)
  - [0005-roteamento-detalhes-aluno.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs/adr/0005-roteamento-detalhes-aluno.md)
- Referências Centrais de Arquitetura: [docs_config/](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs_config/) ([database.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs_config/database.md), [api_endpoints.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs_config/api_endpoints.md), [integracoes.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs_config/integracoes.md), [ui_components.md](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/docs_config/ui_components.md))
- Skills Especializadas Disponibilizadas: [painel/.agents/skills/](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/.agents/skills/) (`startmedia-compliance`, `web-design-guidelines`, `vercel-react-best-practices`, `supabase-postgres-best-practices`)

---

## 🚀 Roteiro de Execução por Fases do Projeto

> *Cada subetapa é **autocontida** e fornece todas as especificações e contratos técnicos necessários para quem vai codificar, sem fornecer o código pronto.*

---

### Fase 6: Módulo de Alunos (CRUD Completo, Inativação Lógica e Sub-rota Dedicada)
- **Domínio Técnico:** `frontend / web`
- **Skills de Referência:** `web-design-guidelines` / `startmedia-compliance`
- **Objetivo da Fase:** Substituir a página de placeholder do Módulo de Alunos por uma interface produtiva e acessível com busca instantânea por nome, abas de filtro por status ("Todos", "Ativos", "Inativos"), modal de cadastro e edição com máscara monetária BRL progressiva (`R$ 0,00`), inativação lógica estrita protegida por `ON DELETE RESTRICT` (ADR 0002) e sub-rota dedicada `/alunos/:id` integrada ao `PanelLayout` (ADR 0005) para exibição do perfil e histórico contábil de aulas.
- **Arquivos Afetados:**
  - `src/lib/formatters.ts`
  - `src/hooks/useStudents.ts`
  - `src/components/students/StudentCard/index.tsx`
  - `src/components/students/StudentCard/styles.module.css`
  - `src/components/students/StudentStatusFilter/index.tsx`
  - `src/components/students/StudentStatusFilter/styles.module.css`
  - `src/components/students/StudentFormModal/index.tsx`
  - `src/components/students/StudentFormModal/styles.module.css`
  - `src/components/students/StudentDeleteModal/index.tsx`
  - `src/components/students/StudentDeleteModal/styles.module.css`
  - `src/pages/Students/index.tsx`
  - `src/pages/Students/styles.module.css`
  - `src/pages/StudentDetail/components/StudentLessonHistoryTable/index.tsx`
  - `src/pages/StudentDetail/components/StudentLessonHistoryTable/styles.module.css`
  - `src/pages/StudentDetail/index.tsx`
  - `src/pages/StudentDetail/styles.module.css`
  - `src/pages/index.ts`
  - `src/App.tsx`

#### Etapa 6.1: Utilitários de Formatação & Camada de Dados Estendida
> **🔗 Relação com a Demanda:** Atende à necessidade de digitação assistida de valores monetários e blindagem contra erros de timezone e supressões de tipo.

- [x] **Subetapa 6.1.1: Módulo Utilitário de Formatação pt-BR (`src/lib/formatters.ts`)**
  - **Inputs:** `Intl.NumberFormat` nativo do ECMAScript, padrões de máscara do Brasil.
  - **Especificação Técnica:** Criar o arquivo `src/lib/formatters.ts` exportando:
    - `formatCurrency(value: number | null | undefined): string`: Converte número em moeda BRL (ex: `150` -> `"R$ 150,00"`; nulo/indefinido -> `"R$ 0,00"`).
    - `parseCurrencyToNumber(value: string): number`: Converte string com prefixos e separadores em float puro (`"R$ 1.250,50"` -> `1250.5`).
    - `formatCurrencyInput(value: string): string`: Máscara progressiva para digitação de centavos no input sem corromper o estado numérico final.
    - `formatDateBR(isoDateString: string | null | undefined): string`: Converte literal `'YYYY-MM-DD'` em `'DD/MM/YYYY'` via split por hífen sem construtor `new Date()` (ADR 0001).
    - `formatPhoneBR(phone: string | null | undefined): string`: Máscara de exibição telefônica no padrão nacional.
  - **Critério de Verificação:** Executar `npx tsc --noEmit` confirmando tipagem estrita de retorno e ausência de dependências externas.

- [x] **Subetapa 6.1.2: Expansão do Hook de Domínio de Alunos (`src/hooks/useStudents.ts`)**
  - **Inputs:** `src/types/database.types.ts`, `src/lib/queryKeys.ts`, cliente singleton `supabase`.
  - **Especificação Técnica:** Adicionar ao arquivo `src/hooks/useStudents.ts`:
    - Hook `useStudent(id: string | undefined)`: Consulta via `select('*').eq('id', id).single()` associada à chave `queryKeys.students.detail(id)`. Condição `enabled: !!id && !!user`.
    - Hook `useDeleteStudent()`: Mutação que intercepta código de erro Postgres `23503` (`foreign_key_violation` via `ON DELETE RESTRICT`) e emite mensagem de alerta amigável na UI orientando para a Inativação Lógica.
    - Mutação para inativação lógica `{ id: string, status: 'inactive' | 'active' }`, invalidando simultaneamente `queryKeys.students.all` e `queryKeys.students.detail(id)`.
  - **Critério de Verificação:** Compilação do hook sem erros no TypeScript e tratamento do erro `23503` com feedback via Sonner toast.

---

#### Etapa 6.2: Componentes Modulares de Alunos
> **🔗 Relação com a Demanda:** Fornece a componentização isolada em conformidade com o teto de 200 linhas do Manual STARTMEDIA.

- [x] **Subetapa 6.2.1: Componente de Cartão de Aluno (`src/components/students/StudentCard/`)**
  - **Inputs:** Interface `IStudentCardProps`, `IStudent`, componentes `Badge` e `Button`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` sob a tag `<article>` com `aria-labelledby`. Exibir nome do aluno, badge de status (`active` / `inactive`), badge condicional `NF` quando `requires_invoice === true`, valor da hora com classe tabular (`font-variant-numeric: tabular-nums`), data da primeira aula formatada via `formatDateBR`, anotações truncadas em 2 linhas com tooltip, link "Ver Detalhes" para `/alunos/:id`, botão "Editar" e atalho para o Time Sheet do aluno (`/timesheet?studentId=...`).
  - **Critério de Verificação:** Renderização fluida de cards no grid com menos de 200 linhas de código e consumo estrito de design tokens de `variables.css`.

- [x] **Subetapa 6.2.2: Componente de Filtro por Status (`src/components/students/StudentStatusFilter/`)**
  - **Inputs:** Interface `IStudentStatusFilterProps` com `currentStatus: 'all' | 'active' | 'inactive'`, contadores numéricos `{ all, active, inactive }` e callback `onSelectStatus`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com container `<div role="tablist">` e botões `<button role="tab">` para as abas "Todos", "Ativos" e "Inativos", com contadores em fonte tabular e realce ativo na cor primária da marca.
  - **Critério de Verificação:** Alternância de abas por clique e teclado (`:focus-visible`) atualizando o estado do componente pai.

- [x] **Subetapa 6.2.3: Modal de Cadastro e Edição de Aluno (`src/components/students/StudentFormModal/`)**
  - **Inputs:** Interface `IStudentFormModalProps`, `Modal`, `Input`, `Button`, utilitários de máscara de `formatters.ts`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com formulário acessível contendo: Nome Completo (obrigatório), Valor da Hora/Aula (com máscara progressiva `formatCurrencyInput`, convertido para float puro no payload), Checkbox "Requer emissão de Nota Fiscal" associado via `useId()`, Data de início da primeira aula (`YYYY-MM-DD`) e Observações gerais. Validação inline com `aria-invalid` e `role="alert"`. Aciona `useCreateStudent` ou `useUpdateStudent`.
  - **Critério de Verificação:** Bloqueio de submissão quando campos obrigatórios estiverem vazios e gravação correta de `hourly_rate` como valor numérico no Supabase.

- [x] **Subetapa 6.2.4: Modal de Confirmação de Inativação / Exclusão Segura (`src/components/students/StudentDeleteModal/`)**
  - **Inputs:** Interface `IStudentDeleteModalProps`, `IStudent`, ícones de advertência, regra de negócio ADR 0002.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com diálogo orientando que a **Inativação Lógica** é a prática segura que preserva o faturamento contábil das aulas. Ação primária em destaque: "Inativar Aluno" (`status = 'inactive'`). Ação secundária: "Excluir Registro Permanentemente" (rejeitada pelo banco via `RESTRICT` caso existam aulas, com feedback inline no modal recomendando inativação).
  - **Critério de Verificação:** Abertura do diálogo e verificação de que alunos com aulas registradas não podem ser excluídos fisicamente.

---

#### Etapa 6.3: Listagem Principal de Alunos (`StudentsPage`)
> **🔗 Relação com a Demanda:** Conecta a base de dados real dos 180 alunos à experiência de navegação do painel.

- [x] **Subetapa 6.3.1: Orquestração de Estado e Layout da Listagem (`src/pages/Students/index.tsx` e `styles.module.css`)**
  - **Inputs:** Hooks `useStudents`, componentes `StudentCard`, `StudentStatusFilter`, `StudentFormModal`, `StudentDeleteModal`.
  - **Especificação Técnica:** Refatorar `src/pages/Students/index.tsx` removendo o card de placeholder. Integrar estado de busca textual `searchTerm` (busca normalizada sem acentos), filtro de abas `selectedStatus`, cálculo memorizado via `useMemo` dos contadores e da lista filtrada. Header com título `<h1>Alunos</h1>` e botão primário `+ Novo Aluno`. Toolbar com input de busca com limpeza rápida e seletor de status. Seção principal com CSS Grid responsivo (1 coluna mobile, 2 tablet, 3 desktop).
  - **Critério de Verificação:** Exibição imediata dos 180 alunos reais da Maite em ambiente de desenvolvimento, busca responsiva e abertura correta dos modais.

- [x] **Subetapa 6.3.2: Estados de Carregamento (Skeleton), Empty States e Feedback Acessível**
  - **Inputs:** Classes CSS de animação shimmer, tokens de cor neutra de `variables.css`.
  - **Especificação Técnica:** Implementar grid esqueleto exibindo 6 cards placeholders animados enquanto `isLoading === true`. Implementar empty states específicos: quando não houver alunos cadastrados (com botão "+ Cadastrar Primeiro Aluno") e quando a busca não retornar resultados (com botão "Limpar busca"). Adicionar região `aria-live="polite"` invisível anunciando a quantidade de registros encontrados.
  - **Critério de Verificação:** Simulação de throttling no DevTools atestando ausência de saltos visuais (CLS) e feedback acessível em buscas sem resultado.

---

#### Etapa 6.4: Rota Dedicada de Detalhes do Aluno (`/alunos/:id`)
> **🔗 Relação com a Demanda:** Atende à decisão arquitetural ADR 0005, viabilizando deep-linking, histórico e navegação resiliente a reload (F5).

- [x] **Subetapa 6.4.1: Componente de Tabela de Histórico de Aulas (`src/pages/StudentDetail/components/StudentLessonHistoryTable/`)**
  - **Inputs:** Interface `IStudentLessonHistoryTableProps`, lista `ILesson[]`, `formatDateBR`, `formatCurrency`, `Badge`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com tabela semântica `<table>` contendo rolagem horizontal suave em mobile. Cabeçalho com colunas: Data, Categoria, Duração/Multiplicador, Tarifa Snapshot, Valor Calculado da Aula e Notas de Conteúdo. Valores monetários alinhados à direita com `font-variant-numeric: tabular-nums`. Empty state da tabela caso o aluno não tenha aulas.
  - **Critério de Verificação:** Tabela renderizada com escopos semânticos `scope="col"` e conformidade de tipografia tabular.

- [x] **Subetapa 6.4.2: Página de Detalhes do Aluno (`src/pages/StudentDetail/index.tsx` e `styles.module.css`)**
  - **Inputs:** `useParams`, `useNavigate`, hooks `useStudent`, `useLessons`, `StudentLessonHistoryTable`, `StudentFormModal`, `StudentDeleteModal`.
  - **Especificação Técnica:** Criar `src/pages/StudentDetail/index.tsx` consumindo o parâmetro `:id`. Consultas paralelas de perfil e aulas do aluno. Barra superior com botão "Voltar para Alunos" e breadcrumb. Header do aluno com nome em destaque `<h1>`, badges de status e NF, botões de ação: "Editar Cadastro", "Inativar Aluno" e atalho em destaque "Ir para Time Sheet" (`/timesheet?studentId=...`). Grid com 4 mini-cards de métricas: Valor Atual da Hora/Aula, Data da Primeira Aula, Total Histórico de Aulas e Faturamento Bruto Acumulado. Bloco de Observações Contratuais. Seção com tabela de histórico. Tratamento de ID inexistente.
  - **Critério de Verificação:** Acesso direto via URL `/alunos/:id` carregando os dados do aluno em recarregamento de página (F5) sem perda de contexto e arquivo com menos de 200 linhas.

- [x] **Subetapa 6.4.3: Registro de Rota no `src/App.tsx` e Barrel Export em `src/pages/index.ts`**
  - **Inputs:** `src/pages/index.ts`, `src/App.tsx`.
  - **Especificação Técnica:** Exportar `StudentDetailPage` no barrel export de `src/pages/index.ts`. No `src/App.tsx`, importar `StudentDetailPage` e registrar a rota filha `<Route path="/alunos/:id" element={<StudentDetailPage />} />` dentro do escopo protegido de `PanelLayout`.
  - **Critério de Verificação:** Navegação entre a listagem `/alunos` e a sub-rota `/alunos/:id` com histórico do navegador consistente.

---

#### Etapa 6.5: Homologação e Testes de Aceite da Fase 6
> **🔗 Relação com a Demanda:** Prova a integridade e conformidade técnica através de execução real.

- [x] **Subetapa 6.5.1: Verificação Estática de Tipagem TypeScript e Linting**
  - **Critério de Verificação:** Executar `npx tsc --noEmit` e `npm run lint` (`oxlint`) atestando zero erros de compilação, zero warnings e conformidade com o teto de 200 linhas por arquivo.
- [x] **Subetapa 6.5.2: Teste Funcional com Carga Real dos 180 Alunos Existentes**
  - **Critério de Verificação:** Conferência visual da renderização dos 180 alunos reais, validação de busca sem travamentos e precisão da soma dos contadores de abas (`Ativos + Inativos === Todos`).
- [x] **Subetapa 6.5.3: Teste de Mutações e Validação de Salvaguardas Contábeis (ADR 0002)**
  - **Critério de Verificação:** Cadastrar novo aluno de teste, editar seu valor de hora, inativar o registro conferindo a mudança da badge para `inactive` e tentar disparar exclusão física em aluno com histórico comprovando a interceptação segura do erro `23503` do PostgreSQL.
- [x] **Subetapa 6.5.4: Teste de Acessibilidade (WCAG 2.1 AA) e Responsividade Mobile**
  - **Critério de Verificação:** Navegação 100% operável via teclado com anéis de foco visíveis (`:focus-visible`), fechamento de modais com `Esc` e integridade de layout em viewports de 375px, 768px e 1440px.

---

### Fase 7: Módulo Closing (Apontamento de Aulas & Fechamento Mensal)
- **Domínio Técnico:** `frontend / web`
- **Skills de Referência:** `supabase-postgres-best-practices` / `vercel-react-best-practices` / `web-design-guidelines` / `startmedia-compliance`
- **Objetivo da Fase:** Implementar a interface executiva e operacional de Fechamento Mensal (Closing), substituindo a página de placeholder por um painel de alta performance com KPIs executivos calculados no PostgreSQL via Stored Procedures, modal de apontamento e edição de aulas (com validação estrita de datas literais ISO e categorização com multiplicadores), tabela consolidada em acordeão com agregação linear O(N+M) em memória e governança do Cadeado Contábil via RPCs `fn_close_month` e `fn_reopen_month` protegidas por modais de alta fricção (ADR 0003).
- **Arquivos Afetados:**
  - `src/pages/Closing/components/ClosingKpiCard/index.tsx`
  - `src/pages/Closing/components/ClosingKpiCard/styles.module.css`
  - `src/pages/Closing/components/ClosingKpiGrid/index.tsx`
  - `src/pages/Closing/components/ClosingKpiGrid/styles.module.css`
  - `src/pages/Closing/components/LessonFormModal/types.ts`
  - `src/pages/Closing/components/LessonFormModal/index.tsx`
  - `src/pages/Closing/components/LessonFormModal/styles.module.css`
  - `src/pages/Closing/utils/closingAggregator.ts`
  - `src/pages/Closing/components/ClosingLessonItem/index.tsx`
  - `src/pages/Closing/components/ClosingLessonItem/styles.module.css`
  - `src/pages/Closing/components/ClosingStudentRow/index.tsx`
  - `src/pages/Closing/components/ClosingStudentRow/styles.module.css`
  - `src/pages/Closing/components/ClosingTable/index.tsx`
  - `src/pages/Closing/components/ClosingTable/styles.module.css`
  - `src/pages/Closing/components/CloseMonthModal/index.tsx`
  - `src/pages/Closing/components/CloseMonthModal/styles.module.css`
  - `src/pages/Closing/components/ReopenMonthModal/index.tsx`
  - `src/pages/Closing/components/ReopenMonthModal/styles.module.css`
  - `src/pages/Closing/components/ClosingToolbar/index.tsx`
  - `src/pages/Closing/components/ClosingToolbar/styles.module.css`
  - `src/pages/Closing/index.tsx`
  - `src/pages/Closing/styles.module.css`

#### Etapa 7.1: Componentes de KPIs Executivos da Competência
> **🔗 Relação com a Demanda:** Integra as métricas consolidadas calculadas pelo banco de dados PostgreSQL diretamente na visão gerencial da professora.

- [x] **Subetapa 7.1.1: Card Individual de Métrica Executiva (`ClosingKpiCard`)**
  - **Inputs:** Interface `IClosingKpiCardProps`, tokens de `variables.css`, utilitários de `formatters.ts`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` sob a tag `<article>` com `aria-label`. Suporte a título, valor numérico com `font-variant-numeric: tabular-nums`, ícone Lucide temático em contêiner com fundo tonal, descrição de apoio, badge de status opcional e estado de skeleton screen de loading via `aria-busy`.
  - **Critério de Verificação:** Alinhamento perfeito de números de largura variável sem distorção visual e contraste em conformidade com WCAG 2.1 AA.

- [x] **Subetapa 7.1.2: Grade Consolidada de KPIs da Competência (`ClosingKpiGrid`)**
  - **Inputs:** Hook `useCalculateMonthlyTotals(year, month)` de `src/hooks/useClosing.ts`, `Badge`, `ClosingKpiCard`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com grid CSS responsivo (4 colunas desktop, 2 tablet, 1 mobile). Integrar 4 cards ordenados:
    1. **Faturamento da Competência**: Formatado via `formatCurrency(data?.total_revenue)`, ícone `DollarSign`, variante `primary`.
    2. **Total de Aulas Apuradas**: Formatado com tratamento fracionário (`1,5 aulas`) e singular (`1 aula`), ícone `GraduationCap`.
    3. **Alunos Atendidos**: Quantitativo de estudantes com aulas no mês, ícone `Users`.
    4. **Status da Competência**: Badge `open` ("Aberta para Lançamentos") ou `closed` ("Fechada / Trancada") com ícone de cadeado.
  - **Critério de Verificação:** Alteração da competência nos controles da TopBar resultando na atualização imediata dos 4 KPIs via invalidação cirúrgica de cache.

---

#### Etapa 7.2: Modal de Lançamento e Edição de Aulas
> **🔗 Relação com a Demanda:** Substitui a anotação em agendas físicas e o preenchimento manual de planilhas.

- [x] **Subetapa 7.2.1: Modelagem e Contratos do Formulário de Aula (`LessonFormModal/types.ts`)**
  - **Inputs:** `ILesson`, `ICreateLessonDTO`, `IUpdateLessonDTO` de `src/hooks/useLessons.ts`.
  - **Especificação Técnica:** Criar `src/pages/Closing/components/LessonFormModal/types.ts` definindo as interfaces `ILessonFormModalProps` e `ILessonFormData`. Mapear categorias de aula de acordo com GLOSSARY.md: `standard` (1.0x), `extended` (1.5x+), `absence` (com flag `charge_absence`), `cancelled` (0.0x, R$ 0,00) e `courtesy` (0.0x, R$ 0,00).
  - **Critério de Verificação:** Compilação do arquivo de tipos com código de saída 0 no TypeScript.

- [x] **Subetapa 7.2.2: Componente do Modal de Formulário de Aula (`LessonFormModal`)**
  - **Inputs:** `Modal`, `Input`, `Select`, `Button`, hooks `useStudents`, `useAddLesson`, `useUpdateLesson`, regras ADR 0001 e ADR 0003.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css`. Formulário controlado com: Dropdown de Aluno (exibe apenas alunos `active`), Campo de Data tipo `date` delimitado pela competência ativa (manipulação estrita como string literal `YYYY-MM-DD` via `dateStr.split('-')`, sem `new Date()`), Dropdown de Categoria de Aula, Input numérico de multiplicador (habilitado conforme categoria), Checkbox condicional "Cobrar falta do aluno?" (renderizado exclusivamente quando `category === 'absence'`) e Textarea de Notas Pedagógicas com contador de 500 caracteres. Se a competência estiver fechada (`isMonthClosed === true`), exibir aviso de trava contábil com ícone `Lock` e desabilitar a submissão.
  - **Critério de Verificação:** Registro de nova aula no mês 10/2026 chamando a mutação `useAddLesson`, fechando o modal, emitindo toast de sucesso e atualizando a lista e KPIs instantaneamente sem reload.

---

#### Etapa 7.3: Tabela Consolidada de Fechamento em Acordeão
> **🔗 Relação com a Demanda:** Apresenta a visão unificada por aluno com eliminação de requisições N+1.

- [x] **Subetapa 7.3.1: Utilitário de Agregação em Memória O(N+M) (`closingAggregator.ts`)**
  - **Inputs:** Arrays `IStudent[]` e `ILesson[]`.
  - **Especificação Técnica:** Criar `src/pages/Closing/utils/closingAggregator.ts` implementando a função pura `aggregateClosingData(students, lessons): IStudentClosingSummary[]`. Mapear aulas por `student_id` via `Map`, calcular `totalLessonsCount` e `totalRevenue` em tempo de execução segundo as regras contábeis oficiais (cortesias, canceladas e faltas não cobradas contabilizam 0h e R$ 0,00; demais contabilizam `hourly_rate_snapshot * multiplier`), filtrar alunos com aulas no mês e ordenar alfabeticamente por nome.
  - **Critério de Verificação:** Teste de agregação com dezenas de aulas executando em menos de 2ms e conferência de paridade matemática dos centavos com a Stored Procedure `useCalculateMonthlyTotals`.

- [x] **Subetapa 7.3.2: Linha Individual de Aula com Ações de Mutação (`ClosingLessonItem`)**
  - **Inputs:** Interface `IClosingLessonItemProps`, `ILesson`, `formatDateBR`, `formatCurrency`, `Badge`, `Button`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com grid CSS alinhado contendo: Data da aula (`formatDateBR`), Badge semântico da categoria (`standard`, `extended`, `absence` cobrada/abonada, `cancelled`, `courtesy`), Preço Snapshot (`hourly_rate_snapshot`), Valor Final da Aula com classe tabular, Notas pedagógicas truncadas com tooltip acessível, Botão Editar (ícone `Pencil`, desabilitado se mês fechado) e Botão Excluir (ícone `Trash2`, desabilitado se mês fechado).
  - **Critério de Verificação:** Aulas de cortesia e faltas abonadas exibindo explicitamente `R$ 0,00` e desativação total dos botões quando a competência estiver com status `closed`.

- [x] **Subetapa 7.3.3: Linha Mestre de Aluno no Acordeão (`ClosingStudentRow`)**
  - **Inputs:** Interface `IClosingStudentRowProps`, `IStudentClosingSummary`, `Badge`, `Button`, `ClosingLessonItem`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com botão mestre do acordeão (`aria-expanded`, `aria-controls`). Exibir nome do aluno com badge `NF` condicional, contagem de aulas faturadas (ex: `4 aulas (4.0h)`), faturamento total consolidado em fonte tabular, atalho direto "Time Sheet" (direcionando para o demonstrativo do aluno), botão "+ Aula" (pré-selecionando o aluno no modal) e ícone `ChevronDown` com transição CSS animada de 180 graus. Área de detalhes interna renderizando a lista de `<ClosingLessonItem />` quando expandido.
  - **Critério de Verificação:** Expansão e recolhimento fluidos por clique e teclado (`Enter`/`Espaço`) e exibição do badge roxo `NF` para alunos que emitem nota fiscal.

- [x] **Subetapa 7.3.4: Tabela Mestra de Fechamento com Empty State (`ClosingTable`)**
  - **Inputs:** Interface `IClosingTableProps`, lista `IStudentClosingSummary[]`, `ClosingStudentRow`, `Card`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` encapsulando a listagem de acordeões. Barra de controle com botões "Expandir Todos" e "Recolher Todos" gerenciando um `Set<string>` de IDs. Estado de skeleton loading com 4 linhas placeholder e empty state temático com ícone `CalendarX` e botão "+ Registrar Primeira Aula" para competências sem registros.
  - **Critério de Verificação:** Renderização consistente em competências vazias e populadas e funcionamento do botão "Expandir Todos" sem congelamento de tela.

---

#### Etapa 7.4: Diálogos de Alta Fricção de Fechamento e Reabertura de Mês
> **🔗 Relação com a Demanda:** Atende à decisão arquitetural ADR 0003, blindando o patrimônio histórico contra mutações retrospectivas.

- [x] **Subetapa 7.4.1: Modal de Alta Fricção para Fechamento de Mês (`CloseMonthModal`)**
  - **Inputs:** `Modal`, `Button`, `Input`, hook `useCloseMonth`, utilitários de data e moeda.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css`. Título contextualizado com a competência. Resumo em destaque do faturamento e aulas que serão congelados no banco. Banner de alerta crítico informando sobre o travamento do Cadeado Contábil. Campo de confirmação textual obrigatório onde o usuário deve digitar textualmente a palavra `"FECHAR"`. O botão de confirmação permanece estritamente `disabled` enquanto a validação textual não for atendida. Aciona a RPC `fn_close_month` e revalida os caches.
  - **Critério de Verificação:** Botão de confirmação habilitado exclusivamente após digitação exata de "FECHAR" e execução bem-sucedida de `fn_close_month` selando o mês com `status = 'closed'`.

- [x] **Subetapa 7.4.2: Modal de Alta Fricção para Reabertura de Mês (`ReopenMonthModal`)**
  - **Inputs:** `Modal`, `Button`, hook `useReopenMonth`, utilitários de data.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css`. Alerta severo de auditoria contábil notificando que a reabertura invalida a trava de fechamento. Checkbox obrigatório de ciência explícita: "Estou ciente do impacto contábil e confirmo que desejo destravar os lançamentos desta competência." Botão de reabertura com variante de atenção (`variant="danger"`), habilitado apenas com o checkbox marcado. Aciona a RPC `fn_reopen_month` e reverte o status para `open`.
  - **Critério de Verificação:** Desbloqueio da competência via RPC `fn_reopen_month` somente após marcação consciente do checkbox, restaurando os botões de edição na interface.

---

#### Etapa 7.5: Orquestração da Página Principal de Fechamento
> **🔗 Relação com a Demanda:** Unifica a interface do módulo de Fechamento mantendo conformidade com o teto de 200 linhas.

- [x] **Subetapa 7.5.1: Barra de Ferramentas e Ações da Competência (`ClosingToolbar`)**
  - **Inputs:** Interface `IClosingToolbarProps`, `Button`, `Input`, ícones Lucide.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` contendo campo de busca textual de alunos e grupo de ações com renderização condicional: se `monthStatus === 'open'`, exibe botão primário "+ Nova Aula" e botão "Fechar Mês"; se `monthStatus === 'closed'`, exibe botão "+ Nova Aula" desabilitado e botão "Reabrir Mês".
  - **Critério de Verificação:** Alternância dinâmica de botões de comando em estrita sincronia com o status vindo do banco de dados.

- [x] **Subetapa 7.5.2: Orquestração da Página Executiva de Fechamento (`ClosingPage`)**
  - **Inputs:** Hooks `useDateFilter`, `useMonthStatus`, `useCalculateMonthlyTotals`, `useStudents`, `useLessons`, subcomponentes da Fase 7.
  - **Especificação Técnica:** Refatorar `src/pages/Closing/index.tsx` e `styles.module.css` substituindo o placeholder. Integrar cabeçalho, banner de aviso caso a competência esteja fechada, grade `ClosingKpiGrid`, barra `ClosingToolbar`, tabela `ClosingTable` e os modais (`LessonFormModal`, `CloseMonthModal`, `ReopenMonthModal`). Arquivo mantido estritamente abaixo de 200 linhas de código.
  - **Critério de Verificação:** Navegação entre competências pela TopBar atualizando todos os dados em tempo real sem alertas de compilação.

---

#### Etapa 7.6: Homologação e Testes de Aceite da Fase 7
> **🔗 Relação com a Demanda:** Valida as regras de negócio contábeis diretamente contra a base de dados em nuvem.

- [x] **Subetapa 7.6.1: Roteiro de Testes Manuais e Validação de Regras Contábeis**
  - **Critério de Verificação:** Executar os cenários de teste:
    1. Lançar aula padrão (1.0x) em 10/2026 e conferir incremento no KPI de faturamento e total de aulas.
    2. Lançar falta com `charge_absence = false` e conferir que o faturamento computa R$ 0,00 e o total de aulas ministradas não é incrementado.
    3. Lançar falta com `charge_absence = true` e conferir cobrança normal.
    4. Lançar aula de cortesia e conferir faturamento zerado com preservação do registro histórico.
    5. Acessar a competência histórica 08/2026 fechada e constatar bloqueio visual dos botões de edição/exclusão.
    6. Reabrir 08/2026 pelo modal de alta fricção e validar transição para status `open`.
    7. Fechar 10/2026 pelo modal de alta fricção digitando "FECHAR" e validar transição para status `closed` com gravação em `monthly_closings`.
- [x] **Subetapa 7.6.2: Verificação de Conformidade e Critérios de Aceite**
  - **Critério de Verificação:** Executar `npm run build` e `npm run lint` atestando 0 erros, ausência total de construtores `new Date('YYYY-MM-DD')` no código de negócio e 100% de conformidade com STARTMEDIA Standard.

---

### Fase 8: Módulo Time Sheet & Configurações PIX
- **Domínio Técnico:** `frontend / web`
- **Skills de Referência:** `vercel-react-best-practices` / `web-design-guidelines` / `startmedia-compliance`
- **Objetivo da Fase:** Implementar a gestão completa de dados bancários/PIX da professora Maite na rota `/configuracoes` e disponibilizar o módulo de geração e exportação do **Time Sheet** individual na rota `/timesheet`, com documento formatado na geometria física A4 (210mm x 297mm), supressão inteligente da coluna de anotações quando vazia, exportação assíncrona em PDF de alta nitidez com Dynamic Import isolado de `html2pdf.js` (ADR 0004) e impressão vetorial nativa sem poluição de interface.
- **Arquivos Afetados:**
  - `src/lib/currencyUtils.ts`
  - `src/pages/Settings/components/PaymentInfoForm/index.tsx`
  - `src/pages/Settings/components/PaymentInfoForm/styles.module.css`
  - `src/pages/Settings/index.tsx`
  - `src/pages/Settings/styles.module.css`
  - `src/pages/TimeSheet/components/TimeSheetDocument/index.tsx`
  - `src/pages/TimeSheet/components/TimeSheetDocument/styles.module.css`
  - `src/pages/TimeSheet/components/TimeSheetToolbar/index.tsx`
  - `src/pages/TimeSheet/components/TimeSheetToolbar/styles.module.css`
  - `src/pages/TimeSheet/index.tsx`
  - `src/pages/TimeSheet/styles.module.css`

#### Etapa 8.1: Gestão de Dados Bancários e Chave PIX (SettingsPage)
> **🔗 Relação com a Demanda:** Permite que a professora configure e atualize seus dados bancários oficiais para recebimento de honorários.

- [x] **Subetapa 8.1.1: Componente de Formulário Bancário/PIX (`PaymentInfoForm`)**
  - **Inputs:** Interface `IPaymentInfoFormProps`, `IPaymentInfoFormData`, `Input`, `Select`, `Button`, hooks `useCreatePaymentInfo` e `useUpdatePaymentInfo`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css` com formulário acessível contendo: Nome do Titular da Conta, Nome da Instituição Bancária, Tipo de Chave PIX (CPF, CNPJ, E-mail, Telefone Celular, Chave Aleatória) e Chave PIX. Validação obrigatória da chave e titular antes do envio. Integração com as mutações correspondentes e invalidação de `queryKeys.paymentInfo.all`.
  - **Critério de Verificação:** Submissão do formulário com salvamento correto no Supabase e feedback via toast Sonner.

- [x] **Subetapa 8.1.2: Integração e Refatoração Reativa da `SettingsPage`**
  - **Inputs:** `src/pages/Settings/index.tsx`, `src/pages/Settings/styles.module.css`, `PaymentInfoForm`, `Modal`.
  - **Especificação Técnica:** Refatorar a página de configurações. Se houver dados bancários salvos em `usePaymentInfo()`, exibir cartão formatado com botão "Editar Dados Bancários". Se não houver, exibir aviso com botão "Cadastrar Chave PIX". Abertura do formulário dentro do componente acessível `Modal`.
  - **Critério de Verificação:** Atualização dos dados em tempo real na tela após salvar no modal, sem necessidade de reload de página.

---

#### Etapa 8.2: Componente Visual do Demonstrativo A4 (`TimeSheetDocument`)
> **🔗 Relação com a Demanda:** Constrói o layout fidedigno da fatura/demonstrativo enviado aos alunos e responsáveis.

- [x] **Subetapa 8.2.1: Estrutura Geométrica A4 e Utilitário de Moeda Desacoplado**
  - **Inputs:** Padrão físico DIN A4 (210mm x 297mm), tokens de `variables.css`.
  - **Especificação Técnica:** Criar `src/lib/currencyUtils.ts` com função pura `formatCurrencyBRL`. Em `TimeSheetDocument/styles.module.css`, definir a folha `.sheetPaper` com dimensões fixas de `210mm` de largura, altura mínima de `297mm`, padding de `16mm`, fundo branco e sombras de elevação no preview de tela. Configurar regras de impressão `@media print` (`size: A4 portrait; margin: 0; box-shadow: none; border: none;`).
  - **Critério de Verificação:** Proporção exata 1 : 1.414 do padrão DIN A4 no viewport e compilação limpa do utilitário de moeda.

- [x] **Subetapa 8.2.2: Cabeçalho Institucional, Metadados do Aluno e Competência**
  - **Inputs:** Interface `ITimeSheetDocumentProps`, `IStudent`, `IStudentMonthlyDetail[]`, `IPaymentInfo`.
  - **Especificação Técnica:** Criar o cabeçalho oficial com títulos aderentes ao `GLOSSARY.md` ("DEMONSTRATIVO DE AULAS MINISTRADAS" e "Time Sheet Mensal Individual" — proibido termos como "Boleto" ou "Fatura"). Indicação da competência via `getMonthYearLabel(year, month)` e metadados do aluno (Nome, Valor da Hora Contratual formatado e data de emissão).
  - **Critério de Verificação:** Renderização da identidade oficial da marca Maite sem quebras de layout.

- [x] **Subetapa 8.2.3: Tabela Contábil com Supressão Inteligente de Coluna e Totalizadores**
  - **Inputs:** Lista de aulas `IStudentMonthlyDetail[]`, utilitários de data e moeda.
  - **Especificação Técnica:** Criar a tabela contábil. Implementar a **Supressão Inteligente de Coluna**: verificar `hasNotes = lessons.some(l => Boolean(l.content_notes?.trim()))`. Se `false`, omitir a coluna de anotações e expandir as demais; se `true`, renderizar com quebra de linha suave. Linhas da tabela com classe CSS aplicando `break-inside: avoid; page-break-inside: avoid;` para impedir cortes no meio da linha entre páginas A4. Quadro de totalizadores com contagem de aulas faturáveis, total de horas e valor consolidado na cor primária `--color-primary`.
  - **Critério de Verificação:** Alunos sem anotações pedagógicas geram documento com tabela de 4 colunas; alunos com ao menos uma anotação geram tabela completa de 5 colunas sem distorção.

- [x] **Subetapa 8.2.4: Carimbo de Pagamento PIX e Microinteração de Cópia**
  - **Inputs:** Objeto `IPaymentInfo`, utilitário `navigator.clipboard`.
  - **Especificação Técnica:** Renderizar bloco no rodapé do documento contendo Titular, Banco, Tipo e Chave PIX, com texto de instrução para envio de comprovante. Incluir botão interativo "Copiar Chave PIX" com ícone `Copy` e feedback via toast Sonner. Aplicar classe utilitária `.hideOnPrint` para ocultar o botão de cópia na exportação em PDF e na impressão em papel.
  - **Critério de Verificação:** Clicar no botão copia a chave PIX para o clipboard e confirmação de que o botão não aparece na impressão ou no PDF exportado.

---

#### Etapa 8.3: Toolbar de Exportação e Seleção de Aluno (`TimeSheetToolbar`)
> **🔗 Relação com a Demanda:** Centraliza o seletor de alunos e os comandos de download de PDF e impressão.

- [x] **Subetapa 8.3.1: Seletor de Aluno com Deep-Linking e Sincronização via URL**
  - **Inputs:** Interface `ITimeSheetToolbarProps`, `Select`, `useDateFilter`.
  - **Especificação Técnica:** Criar `index.tsx` e `styles.module.css`. Dropdown de seleção de alunos com placeholder orientativo. Badge exibindo a competência selecionada na TopBar. Sincronização de seleção com o parâmetro de URL `?studentId=...`.
  - **Critério de Verificação:** Seleção de aluno alterando a URL sem recarregar a página e inicialização automática caso a URL já contenha `?studentId=...`.

- [x] **Subetapa 8.3.2: Botões de Exportação (Download PDF via Dynamic Import e Impressão Nativa)**
  - **Inputs:** `Button`, `src/services/pdfGenerator.ts`, `window.print`.
  - **Especificação Técnica:** Botão primário "Baixar PDF Oficial" (aciona assincronamente `generateTimeSheetPDF` com prop `isPending={isGeneratingPdf}` com spinner, desabilitado se não houver aluno ou aulas). Botão secundário "Imprimir / PDF Vetorial" (aciona `window.print()`).
  - **Critério de Verificação:** Disparo do download de PDF com nome padronizado `TimeSheet_[NomeAluno]_[Mes]_[Ano].pdf` e acionamento da janela de impressão nativa.

- [x] **Subetapa 8.3.3: Alerta Preventivo de Ausência de Dados Bancários / PIX**
  - **Inputs:** Flag booleana `hasPaymentInfo`.
  - **Especificação Técnica:** Se nenhuma chave PIX estiver cadastrada no banco, renderizar banner de aviso com ícone `AlertTriangle` e link direto para `/configuracoes` com o texto "Cadastrar chave PIX agora".
  - **Critério de Verificação:** Ocultação automática do aviso assim que uma chave PIX for salva no sistema.

---

#### Etapa 8.4: Orquestração da Página Principal do Time Sheet (`TimeSheetPage`)
> **🔗 Relação com a Demanda:** Integra toolbar, preview A4 e estados vazios com suporte a deep-linking.

- [x] **Subetapa 8.4.1: Gerenciamento de Estado, Sincronização e Machine de Visualização**
  - **Inputs:** Hooks `useDateFilter`, `useSearchParams`, `useStudents`, `useStudentMonthlyDetail`, `usePaymentInfo`, `TimeSheetToolbar`, `TimeSheetDocument`.
  - **Especificação Técnica:** Refatorar `src/pages/TimeSheet/index.tsx` substituindo o placeholder. Conectar ref DOM `printAreaRef` ao componente `TimeSheetDocument`. Orquestrar chamadas de geração de PDF e impressão. Arquivo com menos de 200 linhas de código.
  - **Critério de Verificação:** Troca de competência ou aluno recarregando o extrato contábil correspondente em tempo real.

- [x] **Subetapa 8.4.2: Viewport Responsivo de Preview A4 e Tratamento de Estados Vazios**
  - **Inputs:** Tokens de superfície de `variables.css`.
  - **Especificação Técnica:** Criar contêiner `.previewViewport` com fundo neutro escurecido centralizando a folha A4 como em uma mesa de trabalho física, com suporte a rolagem horizontal suave em telas menores. Empty states explicativos: quando nenhum aluno estiver selecionado e quando o aluno selecionado não tiver aulas registradas no mês.
  - **Critério de Verificação:** Visualização estética do documento A4 centralizado e responsividade preservada em laptops e tablets.

- [x] **Subetapa 8.4.3: Regras Globais de Isolamento para Impressão (`@media print`)**
  - **Inputs:** `src/pages/TimeSheet/styles.module.css`.
  - **Especificação Técnica:** Declarar regra `@media print` estrita que oculta totalmente Sidebar, TopBar, Breadcrumbs e toolbars (`display: none !important`), remove margens de containers pais e exibe unicamente a folha A4 em 100% de largura sem bordas ou sombras.
  - **Critério de Verificação:** Prévia do diálogo de impressão (Ctrl+P) exibindo exclusivamente a folha do Time Sheet sem elementos da carcaça do painel.

---

#### Etapa 8.5: Homologação e Testes de Aceite da Fase 8
> **🔗 Relação com a Demanda:** Prova a integridade documental e o desacoplamento de bundles (ADR 0004).

- [x] **Subetapa 8.5.1: Teste de Aceite — Validação de Bundle e Dynamic Import do PDF (ADR 0004)**
  - **Critério de Verificação:** Executar `npm run build` e confirmar na pasta `dist/assets/` que a biblioteca `html2pdf.js` (~935 kB) foi compilada em um chunk assíncrono isolado, mantendo o bundle inicial em ~519 kB.
- [x] **Subetapa 8.5.2: Teste de Aceite — Navegação por Deep-Linking e Sincronização de Competência**
  - **Critério de Verificação:** Acessar a URL `/timesheet?studentId=[ID]&ano=2026&mes=08` e conferir a sincronização do aluno e da competência de Agosto de 2026 no Time Sheet.
- [x] **Subetapa 8.5.3: Teste de Aceite — Supressão Inteligente da Coluna de Anotações**
  - **Critério de Verificação:** Testar aluno sem anotações (4 colunas na tabela) e aluno com anotações (5 colunas na tabela com notas legíveis).
- [x] **Subetapa 8.5.4: Teste de Aceite — Ciclo de Vida dos Dados Bancários e Chave PIX**
  - **Critério de Verificação:** Atualizar a chave PIX em `/configuracoes` e constatar a atualização imediata no rodapé do Time Sheet em `/timesheet`, com teste de cópia via clipboard.
- [x] **Subetapa 8.5.5: Teste de Aceite — Renderização Física A4 e Impressão Nativa (Ctrl+P)**
  - **Critério de Verificação:** Baixar o PDF oficial e validar nitidez vetorial com escala 2x, ausência de borrões e ausência de elementos espúrios na impressão via Ctrl+P.
- [x] **Subetapa 8.5.6: Teste de Aceite — Conformidade STARTMEDIA e Validação Estática**
  - **Critério de Verificação:** Executar `npx tsc --noEmit` e `npm run lint` obtendo zero erros e conformidade de 100% dos arquivos com o teto de 200 linhas.

---

## 🏁 Encerramento e Handoff para a Fase 3
O plano mestre estruturado acima compila a especificação técnica atômica e autocontida para a finalização completa do sistema (Fases 6, 7 e 8). Ele está gravado no workspace do projeto e pronto para ser consumido pela esteira de prompts e execução técnica.
