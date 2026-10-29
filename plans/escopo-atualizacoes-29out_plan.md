# Plano de Ação Mestre e As-Built: Saneamento Histórico, Fechamento em Lote e Ciclo de Vida de Alunos

**Objetivo Geral:** Executar ponta a ponta a deduplicação e saneamento da base de dados histórica (removendo 4.834 aulas e 180 alunos do lote duplicado e salvaguardando o lote canônico), efetuar o fechamento contábil em lote de todas as competências entre Janeiro/2020 e Agosto/2026, implementar a inteligência do ciclo de vida dos alunos no PostgreSQL (inativação automática de 90 dias via RPC e reativação instantânea via Trigger) e atualizar a experiência da interface web (modal de agendamento inclusivo e listagem filtrada por padrão em ativos).

**Status:** 🟢 Concluído (As-Built)  
**Documentos de Referência:**
- Glossário de Domínio: [`./GLOSSARY.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/GLOSSARY.md)
- Decisões de Arquitetura:
  - [`./docs/adr/0001-datas-literais-strings-iso.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs/adr/0001-datas-literais-strings-iso.md)
  - [`./docs/adr/0002-inativacao-logica-on-delete-restrict.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs/adr/0002-inativacao-logica-on-delete-restrict.md)
  - [`./docs/adr/0003-cadeado-contabil-stored-procedures.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs/adr/0003-cadeado-contabil-stored-procedures.md)
  - [`./docs/adr/0006-ciclo-vida-aluno-trigger-e-rpc.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs/adr/0006-ciclo-vida-aluno-trigger-e-rpc.md)
  - [`./docs/adr/0007-saneamento-deduplicacao-lote-canonico-seed.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs/adr/0007-saneamento-deduplicacao-lote-canonico-seed.md)
- Arquitetura de Referência: [`./docs_config/database.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs_config/database.md) e [`./docs_config/ui_components.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/docs_config/ui_components.md)
- Acompanhamento do Projeto: [Página de Acompanhamento no Notion](https://app.notion.com/p/408345c7648e808f8a58f3cf5c1c6a1e)

---

## 🚀 Roteiro de Execução por Fases do Projeto

> *Cada subetapa é **autocontida** e fornece todas as especificações e contratos técnicos necessários para quem vai codificar, sem fornecer o código pronto.*

---

### Fase 1: Saneamento e Deduplicação Transacional da Base Histórica
- **Domínio Técnico:** `database / postgresql-migration`
- **Skill de Referência:** `supabase-postgres-best-practices`
- **Objetivo da Fase:** Sanar em nível de infraestrutura a duplicação dos dados em produção no Supabase, purgando com salvaguarda física prévia o lote preliminar redundante (inserido em 07/10/2026 às 17:49) e mantendo como canônico o lote íntegro correspondente ao `seed.sql` (inserido em 07/10/2026 às 19:14), consolidando exatamente 180 alunos e 4.834 aulas reais.
- **Arquivos Afetados:**
  - `scripts/saneamento_deduplicacao_historica.sql` (novo script de execução transacional)
  - `scripts/run_deduplication.cjs` (runner Node de execução autenticada contra produção)

#### Etapa 1.1: Estruturação das Tabelas Físicas de Salvaguarda (Backup Prévio)
> **🔗 Relação com a Demanda:** Cumprimento da salvaguarda prévia mandatória exigida pelo escopo e alinhada na Q2 e ADR 0007 para impedir qualquer perda de dados históricos da professora Maite.

  - [x] **Subetapa 1.1.1:** Especificar e criar o script transacional para geração das tabelas físicas `public.backup_students_pre_dedup` e `public.backup_lessons_pre_dedup`.
    - **Inputs:** Schema público das tabelas `students` e `lessons`.
    - **Especificação Técnica:** O comando deve utilizar `CREATE TABLE ... AS TABLE ...` clonando integralmente registros, dados e tipos de `public.students` e `public.lessons`. As tabelas de backup devem ser criadas com permissões restritas e carimbo de execução, assegurando que o estado anterior de 360 alunos e 9.668 aulas fique totalmente preservado para auditoria.
    - **Output e Verificação:** Consulta de contagem em ambas as tabelas de backup retornando com precisão `count(*) = 360` para estudantes e `count(*) = 9668` para aulas antes de qualquer mutação.

#### Etapa 1.2: Remapeamento Relacional e Purga Atômica do Lote Duplicado
> **🔗 Relação com a Demanda:** Alinhamento técnico das decisões Q1, Q3 e ADR 0007.

  - [x] **Subetapa 1.2.1:** Configurar a transação com desativação temporária dos gatilhos de integridade.
    - **Inputs:** Tabelas `students` e `lessons`.
    - **Especificação Técnica:** Abrir bloco de transação segura (`BEGIN`) e aplicar `ALTER TABLE public.lessons DISABLE TRIGGER trg_check_closed_month_lessons` e `ALTER TABLE public.lessons DISABLE TRIGGER trg_set_hourly_rate_snapshot`. Isso previne interrupções indevidas causadas pelo cadeado de competência ou mutações não intencionais no carimbo histórico de preços.
    - **Output e Verificação:** Confirmação do status dos gatilhos no catálogo do Postgres (`pg_trigger`) indicando estado desativado para a sessão transacional.

  - [x] **Subetapa 1.2.2:** Identificar a chave canônica e executar a exclusão das aulas e alunos excedentes do lote preliminar.
    - **Inputs:** Registros de `students` e `lessons` filtrados pelo timestamp do lote excedente (`created_at >= '2026-10-07 17:00:00+00' AND created_at < '2026-10-07 18:30:00+00'`) cruzados com os IDs canônicos do lote oficial (`created_at >= '2026-10-07 19:00:00+00'`).
    - **Especificação Técnica:** 
      1. Garantir que todas as aulas pertençam exclusivamente aos IDs canônicos de estudantes do lote das 19:14 (que coincidem 100% com `supabase/seed.sql`).
      2. Excluir os 4.834 registros de `lessons` pertencentes ao lote das 17:49.
      3. Excluir os 180 registros de `students` pertencentes ao lote das 17:49 (incluindo variações como `Ana Claudia Scalioni (Auditado)`).
      4. Validar antes do `COMMIT` que a contagem final na tabela `students` seja rigorosamente 180 e na tabela `lessons` seja rigorosamente 4.834. Caso contrário, disparar exceção com `RAISE EXCEPTION` forçando `ROLLBACK` total.
    - **Output e Verificação:** Bloco de auditoria transacional validado com zero discrepâncias.

  - [x] **Subetapa 1.2.3:** Reativação dos gatilhos e encerramento da transação (`COMMIT`).
    - **Inputs:** Tabelas `lessons`.
    - **Especificação Técnica:** Reativar os gatilhos `trg_check_closed_month_lessons` e `trg_set_hourly_rate_snapshot` via `ALTER TABLE ... ENABLE TRIGGER ...` e submeter o `COMMIT`.
    - **Output e Verificação:** Estado dos gatilhos reativado no catálogo `pg_trigger` e confirmação de persistência no banco.

#### Etapa 1.3: Runner Automatizado de Execução Autenticada e Validação Pós-Saneamento
> **🔗 Relação com a Demanda:** Resposta às perguntas operacionais 2 e 3 do alinhamento (execução via script Node autenticado com dry-run).

  - [x] **Subetapa 1.3.1:** Desenvolver e executar o runner Node com verificação em dois tempos (Dry-run e Live Execution).
    - **Inputs:** `scripts/saneamento_deduplicacao_historica.sql`, credenciais do Supabase (`.env.local`).
    - **Especificação Técnica:** O runner autentica no Supabase, executa primeiro o teste transacional com `ROLLBACK` emitindo relatório detalhado das contagens esperadas vs apuradas e, após sucesso do dry-run, executa a aplicação definitiva com criação de backup e `COMMIT`.
    - **Output e Verificação:** Relatório final no console registrando: Estudantes = 180, Aulas = 4.834, Backup Estudantes = 360, Backup Aulas = 9.668.

---

### Fase 2: Fechamento Contábil em Lote das Competências Históricas (Jan/2020 a Ago/2026)
- **Domínio Técnico:** `database / accounting-logic`
- **Skill de Referência:** `supabase-postgres-best-practices`
- **Objetivo da Fase:** Estabelecer a integridade fiscal e contábil do histórico passado através da Stored Procedure oficial, consolidando os meses de Janeiro/2020 a Agosto/2026 como `closed` com suas respectivas receitas e horas calculadas na tabela `monthly_closings`, selando meses inativos e preservando Setembro/2026 e Outubro/2026 como `open`.
- **Arquivos Afetados:**
  - `scripts/fechamento_lote_historico.sql` (novo script SQL de processamento em lote)
  - `scripts/run_batch_closing.cjs` (runner Node de execução autenticada)

#### Etapa 2.1: Desenvolvimento da Rotina Administrativa de Fechamento em Lote
> **🔗 Relação com a Demanda:** Alinhamento técnico da decisão Q4 e ADR 0003.

  - [x] **Subetapa 2.1.1:** Especificar a rotina PL/pgSQL de consolidação contábil do intervalo Jan/2020 a Ago/2026.
    - **Inputs:** Tabela `lessons` saneada, `owner_id = '701bc0b3-cf1a-4b84-ab01-f77cedae2eea'`, tabela `monthly_closings`.
    - **Especificação Técnica:**
      1. Percorrer a série temporal de competências compreendidas entre Ano 2020 Mês 1 até Ano 2026 Mês 8 através de `generate_series`.
      2. Para cada competência, aplicar a fórmula contábil oficial (ADR 0003 e `docs_config/database.md`): desconsiderar `courtesy`, `cancelled` e faltas não cobradas (`absence` com `charge_absence = false`); somar `multiplier` para o total de aulas e `hourly_rate_snapshot * multiplier` para o faturamento bruto.
      3. Inserir ou atualizar na tabela `monthly_closings` com `status = 'closed'`, `closed_at = NOW()`, e os totais calculados (meses sem movimentação devem ser gravados como `status = 'closed'`, `total_lessons_count = 0` e `total_revenue = 0.00`).
      4. Assegurar que competências iguais ou posteriores a Setembro/2026 (`2026-09` e `2026-10`) **NÃO** sejam tocadas por esta rotina.
    - **Output e Verificação:** Script SQL idempotente e livre de violações de chave única `unique_closing_per_month`.

#### Etapa 2.2: Execução do Fechamento e Auditoria Contábil
> **🔗 Relação com a Demanda:** Validação da trava de meses históricos.

  - [x] **Subetapa 2.2.1:** Executar a rotina em lote via script autenticado e validar a matriz de competências.
    - **Inputs:** `scripts/fechamento_lote_historico.sql`, banco de dados Supabase.
    - **Especificação Técnica:** Executar a rotina administrativa e realizar consulta analítica agrupando todas as competências gravadas em `monthly_closings`.
    - **Output e Verificação:** Consulta SQL comprovando que:
      - Todas as competências de Jan/2020 a Ago/2026 estão gravadas com `status = 'closed'`.
      - Competências de Set/2026 e Out/2026 permanecem com `status = 'open'` (ou inexistentes em closings, comportando-se como abertas).
      - Tentativa de mutação teste (`UPDATE` ou `INSERT`) em aula de data histórica (ex: `2024-05-10`) é sumariamente rejeitada pelo gatilho `trg_check_closed_month_lessons`.

---

### Fase 3: Infraestrutura do Ciclo de Vida do Aluno no PostgreSQL
- **Domínio Técnico:** `database / stored-procedures-triggers`
- **Skill de Referência:** `supabase-postgres-best-practices`
- **Objetivo da Fase:** Criar as estruturas de banco de dados responsáveis pelo ciclo de vida inteligente dos alunos: Stored Procedure de sincronização periódica (regra dos 90 dias) e Trigger atômica de reativação imediata ao lançar nova aula.
- **Arquivos Afetados:**
  - `supabase/functions.sql` (adição da RPC `fn_sync_inactive_students`)
  - `supabase/triggers.sql` (adição da trigger `trg_reactivate_student_on_lesson`)
  - `supabase/schema.sql` (registro das definições oficiais)
  - `scripts/deploy_student_lifecycle.cjs` (runner de aplicação no banco remoto)

#### Etapa 3.1: Stored Procedure de Sincronização dos 90 Dias (`fn_sync_inactive_students`)
> **🔗 Relação com a Demanda:** Decisão técnica Q5 e ADR 0006.

  - [x] **Subetapa 3.1.1:** Especificar a função PL/pgSQL de sincronização de inativação.
    - **Inputs:** Parâmetro `p_owner_id UUID`.
    - **Especificação Técnica:** 
      - A função deve ser declarada como `SECURITY DEFINER` com `SET search_path = public, pg_temp`.
      - Validação de segurança: garantir que `p_owner_id IS NOT DISTINCT FROM auth.uid()`.
      - Critério de Inativação: Alunos com status `'active'` cujo `owner_id = p_owner_id` que atendam a:
        1. A maior data de aula registrada (`MAX(lesson_date)`) for anterior a `CURRENT_DATE - INTERVAL '90 days'`; OU
        2. Não possuírem nenhuma aula registrada e cuja data de criação (`created_at`) for anterior a `NOW() - INTERVAL '90 days'`.
      - Ação: Atualizar esses registros para `status = 'inactive'` e carimbar `updated_at = NOW()`.
      - Retorno: Retornar a quantidade de alunos transicionados para `inactive`.
    - **Output e Verificação:** Chamada da RPC retornando o número exato de alunos inativados de acordo com os dados reais.

#### Etapa 3.2: Trigger Atômica de Reativação no Lançamento de Aula (`trg_reactivate_student_on_lesson`)
> **🔗 Relação com a Demanda:** Decisão técnica Q6 e ADR 0006.

  - [x] **Subetapa 3.2.1:** Especificar a função de gatilho e o trigger de reativação em `lessons`.
    - **Inputs:** Tabela `lessons` e tabela `students`.
    - **Especificação Técnica:**
      - Criar a função `public.fn_reactivate_student_on_lesson() RETURNS TRIGGER`.
      - Em `BEFORE INSERT ON public.lessons`, verificar se o aluno referenciado por `NEW.student_id` possui `status = 'inactive'`.
      - Se afirmativo, executar `UPDATE public.students SET status = 'active', updated_at = NOW() WHERE id = NEW.student_id;`.
      - Retornar `NEW` para que a inserção da aula prossiga normalmente dentro da mesma transação.
      - Vincular o gatilho `trg_reactivate_student_on_lesson BEFORE INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.fn_reactivate_student_on_lesson();`.
    - **Output e Verificação:** Teste de inserção de aula para aluno inativo resultando na mudança imediata de seu status para `active` no registro de `students`.

---

### Fase 4: Integração de Dados e Camada de Hooks (Data Layer / React Query)
- **Domínio Técnico:** `frontend / react-query`
- **Skill de Referência:** `vercel-react-best-practices`
- **Objetivo da Fase:** Integrar as novas capacidades de banco com a camada de estado da aplicação React, adicionando a sincronização assíncrona por sessão e garantindo que mutações de aulas atualizem instantaneamente o cache de alunos.
- **Arquivos Afetados:**
  - `src/hooks/useStudents.ts`
  - `src/hooks/useLessons.ts`

#### Etapa 4.1: Acionamento Assíncrono da Sincronização de Inativos por Sessão
> **🔗 Relação com a Demanda:** Alinhamento técnico da decisão Q5.

  - [x] **Subetapa 4.1.1:** Especificar a chamada da RPC `fn_sync_inactive_students` no ciclo de vida de dados dos alunos.
    - **Inputs:** `useStudents.ts`, cliente Supabase autenticado, `sessionStorage`.
    - **Especificação Técnica:**
      - Criar uma rotina controlada de verificação: checar se a chave `'maite_synced_inactive_students'` já existe no `sessionStorage`.
      - Caso não exista, invocar de forma assíncrona/não-bloqueante a RPC `supabase.rpc('fn_sync_inactive_students', { p_owner_id: user.id })`.
      - Ao concluir com sucesso, gravar o carimbo no `sessionStorage` para impedir novas chamadas repetidas na mesma sessão de navegação.
      - Garantir que qualquer erro na RPC seja tratado silenciosamente no log sem interromper a consulta primária de listagem de alunos.
    - **Output e Verificação:** Inspeção no DevTools demonstrando apenas uma chamada RPC na abertura da sessão e cache gravado.

#### Etapa 4.2: Invalidação Concorrente de Cache no Hook de Criação de Aulas
> **🔗 Relação com a Demanda:** Decisão técnica Q6 para garantir reatividade imediata na interface.

  - [x] **Subetapa 4.2.1:** Atualizar a mutação `useAddLesson` para invalidar as listas de estudantes.
    - **Inputs:** `src/hooks/useLessons.ts` (`useAddLesson`).
    - **Especificação Técnica:**
      - Localizar o callback `onSuccess` da mutation `useAddLesson`.
      - Além de invalidar `queryKeys.lessons.all`, adicionar a invalidação de `queryKeys.students.all` e `queryKeys.students.detail(variables.student_id)`.
      - Assegurar que caso a aula inserida pertença a uma competência aberta, a invalidação de fechamento (`queryKeys.closings.all`) permaneça preservada.
    - **Output e Verificação:** Lançamento de nova aula refletindo imediatamente a alteração de status na interface de alunos sem necessidade de recarregar a página.

---

### Fase 5: Experiência do Usuário e Telas (UI React - Fechamento e Alunos)
- **Domínio Técnico:** `frontend / react-ui`
- **Skill de Referência:** `frontend-design`, `web-design-guidelines`
- **Objetivo da Fase:** Adequar a interface para refletir com clareza o status de fechamento histórico e tornar a seleção e gestão de alunos fluida e transparente, permitindo agendar qualquer aluno (ativo ou inativo) e navegando por filtros limpos na tela de alunos.
- **Arquivos Afetados:**
  - `src/pages/Closing/components/LessonFormModal/index.tsx`
  - `src/pages/Closing/components/LessonFormModal/styles.module.css`
  - `src/pages/Students/index.tsx`
  - `src/components/students/StudentStatusFilter/index.tsx`

#### Etapa 5.1: Reformulação do Seletor de Alunos no Modal de Aulas (`LessonFormModal`)
> **🔗 Relação com a Demanda:** Alinhamento técnico da decisão Q7.

  - [x] **Subetapa 5.1.1:** Ajustar a listagem de opções para incluir alunos inativos com sufixo visual e ordenação unificada.
    - **Inputs:** `src/pages/Closing/components/LessonFormModal/index.tsx` (`studentOptions`).
    - **Especificação Técnica:**
      - Remover o filtro que restringe `s.status === 'active'`.
      - Mapear todos os alunos cadastrados: se `s.status === 'inactive'`, formatar o rótulo como `${s.name} — (Inativo)`; caso contrário, apenas `${s.name}`.
      - Manter a ordenação alfabética pelo nome natural do aluno.
    - **Output e Verificação:** Seletor de alunos exibindo toda a base cadastral com identificação visual nítida para alunos inativos.

  - [x] **Subetapa 5.1.2:** Inserir aviso contextual discreto no formulário quando um aluno inativo for selecionado.
    - **Inputs:** Estado `studentId` do formulário, lista de estudantes.
    - **Especificação Técnica:**
      - Detectar quando o `studentId` selecionado corresponder a um aluno com `status === 'inactive'`.
      - Renderizar abaixo do select um container informativo sutil com ícone amigável (ex: `Sparkles` ou `Info`), indicando: *"Este aluno está inativo há mais de 90 dias e será reativado automaticamente ao confirmar este lançamento."*
    - **Output e Verificação:** Alerta visível apenas ao selecionar alunos inativos e oculto para alunos ativos.

#### Etapa 5.2: Ajuste do Padrão de Visualização na Tela de Gestão de Alunos (`StudentsPage`)
> **🔗 Relação com a Demanda:** Requisito de limpeza cotidiana da interface da professora.

  - [x] **Subetapa 5.2.1:** Configurar o filtro padrão da listagem principal para `'active'`.
    - **Inputs:** `src/pages/Students/index.tsx` (estado `status`).
    - **Especificação Técnica:**
      - Alterar o valor inicial do estado `useState<StudentStatusFilterType>('all')` para `'active'`.
      - Garantir que as abas do `StudentStatusFilter` exibam as contagens corretas (`Ativos`, `Inativos`, `Todos`) com suporte completo à navegação por teclado e acessibilidade.
    - **Output e Verificação:** Abertura da página `/alunos` exibindo de imediato apenas os alunos ativos, com opção funcional de alternar com 1 clique para "Inativos" ou "Todos".

#### Etapa 5.3: Validação da Trava de Edição em Competências Históricas no Painel de Fechamento
> **🔗 Relação com a Demanda:** Frente 2 do escopo e ADR 0003.

  - [x] **Subetapa 5.3.1:** Validar e refinar o comportamento do painel de fechamento para meses fechados.
    - **Inputs:** `src/pages/Closing/index.tsx`, `ClosingToolbar`, `ClosingTable`.
    - **Especificação Técnica:**
      - Garantir que ao navegar para qualquer competência de Jan/2020 a Ago/2026, a badge exiba `"Fechado"` com variante fechada e o banner do Cadeado Contábil esteja visível.
      - Validar que o botão "+ Nova Aula" na toolbar esteja desabilitado com tooltip informativo.
      - Validar que os botões de ação na tabela de aulas (Editar e Excluir) estejam completamente desabilitados ou ocultos para o período selado.
    - **Output e Verificação:** Inspeção visual e funcional garantindo blindagem contra edições acidentais no passado.

---

### Fase 6: Auditoria Ponta a Ponta, Testes de Regressão e As-Built
- **Domínio Técnico:** `qa / e2e-audit`
- **Skill de Referência:** `verify-changes`, `lint-and-validate`
- **Objetivo da Fase:** Realizar a verificação empírica final de toda a aplicação: validar as métricas no banco de dados Supabase, rodar suíte de type-check e linting no frontend, testar fluxos de usuário e atualizar a documentação consolidada em `docs_config/`.
- **Arquivos Afetados:**
  - `docs_config/database.md`
  - `docs_config/ui_components.md`
  - `plans/escopo-atualizacoes-29out_plan.md` (atualização para As-Built)

#### Etapa 6.1: Auditoria Empírica dos Dados e Regras de Banco
> **🔗 Relação com a Demanda:** Garantia de conformidade das 3 frentes no PostgreSQL.

  - [x] **Subetapa 6.1.1:** Executar script de auditoria de consistência no Supabase.
    - **Inputs:** Banco de produção do Supabase.
    - **Especificação Técnica:**
      - Validar contagem final: `students` = 180 (distribuídos entre ativos e inativos pela regra de 90 dias); `lessons` = 4.834.
      - Validar integridade dos fechamentos: todas as competências de Jan/2020 a Ago/2026 registradas com status `closed`; Set/2026 e Out/2026 com status `open`.
      - Testar a reativação via trigger: inserir uma aula de teste para um aluno inativo em competência aberta e verificar reativação para `active`; em seguida remover a aula de teste.
    - **Output e Verificação:** Relatório de conformidade sem erros.

#### Etapa 6.2: Verificação de Build, Lint e Regressão de Interface
> **🔗 Relação com a Demanda:** Qualidade estrita de código e integridade da build.

  - [x] **Subetapa 6.2.1:** Executar compilação TypeScript e análise estática do frontend.
    - **Inputs:** Todo o projeto `painel`.
    - **Especificação Técnica:**
      - Executar `npm run build` (tsc + vite build) garantindo zero erros de tipagem.
      - Executar `npm run lint` validando a conformidade de estilos e regras globais.
    - **Output e Verificação:** Build bem-sucedida com bundle gerado sem warnings críticos.

#### Etapa 6.3: Atualização Consolidada da Documentação e Encerramento
> **🔗 Relação com a Demanda:** Atualização do repositório como fonte de verdade perene.

  - [x] **Subetapa 6.3.1:** Atualizar os arquivos de referência arquitetural em `docs_config/` e fechar o As-Built.
    - **Inputs:** `docs_config/database.md`, `docs_config/ui_components.md`.
    - **Especificação Técnica:**
      - Adicionar em `docs_config/database.md` a especificação da RPC `fn_sync_inactive_students`, da trigger `trg_reactivate_student_on_lesson` e o registro do saneamento histórico.
      - Atualizar `docs_config/ui_components.md` registrando a nova dinâmica do seletor de alunos no `LessonFormModal` e o filtro padrão de alunos.
      - Alterar o status deste plano para `🟢 Concluído (As-Built)` ao término da execução.
    - **Output e Verificação:** Documentações perfeitamente atualizadas e sincronizadas com o estado real do sistema.

---

## 🏁 Encerramento e Homologação As-Built
O escopo de saneamento histórico, fechamento contábil em lote e automação do ciclo de vida de alunos foi executado e homologado em sua totalidade:
- **Base Saneada:** 180 alunos e 4.834 aulas oficiais em produção, com backup prévio em `backup_students_pre_dedup` (360) e `backup_lessons_pre_dedup` (9.668).
- **Competências Fechadas:** 80 competências seladas (Jan/2020 a Ago/2026 com status `closed`), Set/2026 e Out/2026 abertas (`open`).
- **Ciclo de Vida:** RPC `fn_sync_inactive_students` e trigger `trg_reactivate_student_on_lesson` testadas e ativas.
- **Frontend & UX:** Modal de aulas inclusivo (`LessonFormModal`), filtro inicial em alunos ativos (`StudentsPage`) e invalidação de cache concorrente.
- **Auditoria de Qualidade:** `npm run build` e `npm run lint` com 0 erros, todos os arquivos dentro do teto de 200 linhas.
- **Documentação:** `docs_config/database.md` e `docs_config/ui_components.md` consolidados.
- **Status:** 🟢 **Concluído (As-Built)**.
