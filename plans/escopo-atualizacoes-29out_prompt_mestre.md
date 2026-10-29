# Playbook de Despacho e Prompt Mestre Universal: Saneamento Histórico, Fechamento em Lote e Ciclo de Vida de Alunos

> **Tipo de Documento:** Playbook de Orquestração por Etapas (Zero-Lossy)  
> **Plano de Implementação de Referência:** [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md)  
> **Página de Acompanhamento no Notion:** [Painel de Atualizações - 29/Out](https://app.notion.com/p/408345c7648e808f8a58f3cf5c1c6a1e)  
> **Data:** 29 de Outubro de 2026  
> **Versão:** 1.0 (Zero-Lossy Execution Pipeline)

---

## 1. Diretiva de Papel do Orquestrador (Host Agent)

Este playbook foi projetado para ser operado por um **Agente Orquestrador Sênior** em uma sessão de execução dedicada.

### Responsabilidades Fundamentais do Orquestrador:
1. **Zero Resumos e Zero Improviso:** Cada subagente despachado deve receber o seu respectivo bloco de prompt deste catálogo na íntegra. O prompt do subagente já contém a referência direta à seção do plano em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md), que é a fonte física única da verdade técnica.
2. **Respeito Estrito à Ordem das Ondas:**
   - **Onda 1 (Banco de Dados e Saneamento):** Deve ser estritamente sequencial (Fase 1 ➔ Fase 2 ➔ Fase 3). É **PROIBIDO** qualquer paralelismo que execute mutações concorrentes nas tabelas `lessons`, `students` ou `monthly_closings`.
   - **Onda 2 (Camada de Hooks e Estado):** Inicia apenas após a conclusão e validação integral da Onda 1.
   - **Onda 3 (UI React):** As etapas 5.1 e 5.2 podem ser despachadas em paralelo ou sequencialmente, pois possuem arquivos de escrita 100% isolados. A etapa 5.3 atua como validação do painel de fechamento.
   - **Onda 4 (Homologação, QA e Documentação As-Built):** Conclusão sequencial obrigatória com auditoria do banco, `npm run build`, linting e consolidação documental.
3. **Mecanismo de Despacho e Comunicação:**
   - Utilizar a ferramenta `invoke_subagent` passando o bloco de prompt correspondente.
   - Exigir que cada subagente relate seus resultados exclusivamente via `send_message`.
   - Bloquear o avanço para a onda seguinte até que todos os critérios de verificação da onda corrente tenham sido confirmados com evidências empíricas.

---

## 2. Matriz de Execução em Ondas e Posse de Arquivos

```mermaid
flowchart TD
    subgraph ONDA1["Onda 1: Banco de Dados e Saneamento (Sequencial Estrita)"]
        F1["Fase 1: Saneamento e Deduplicação Histórica\n(Backup prévio, purga do lote 17:49, validação 180/4834)"]
        F2["Fase 2: Fechamento Contábil em Lote\n(RPC/rotina Jan/2020 a Ago/2026 fechados)"]
        F3["Fase 3: Ciclo de Vida do Aluno no PostgreSQL\n(RPC fn_sync_inactive_students e trigger trg_reactivate_student_on_lesson)"]
        F1 --> F2 --> F3
    end

    subgraph ONDA2["Onda 2: Camada de Hooks e Estado (Sequencial)"]
        F4["Fase 4: Integração de Dados e React Query\n(useStudents com RPC por sessão + useLessons com invalidação cruzada)"]
    end

    subgraph ONDA3["Onda 3: Interface do Usuário React (Concorrente / Isolada)"]
        F51["Etapa 5.1: LessonFormModal\n(Seletor inclusivo + banner inativo)"]
        F52["Etapa 5.2: StudentsPage\n(Filtro padrão 'active' + contadores)"]
        F53["Etapa 5.3: Validação do Fechamento\n(Blindagem de meses fechados no painel)"]
    end

    subgraph ONDA4["Onda 4: Homologação, QA e As-Built (Sequencial)"]
        F61["Etapa 6.1: Auditoria Empírica de Banco\n(Contagens e disparadores no Supabase)"]
        F62["Etapa 6.2: Build, Lint e Regressão\n(npm run build + npm run lint)"]
        F63["Etapa 6.3: Consolidação e As-Built\n(docs_config/ e atualização do plano)"]
        F61 --> F62 --> F63
    end

    ONDA1 --> ONDA2
    ONDA2 --> F51
    ONDA2 --> F52
    ONDA2 --> F53
    F51 --> ONDA4
    F52 --> ONDA4
    F53 --> ONDA4
```

### Tabela de Posse Exclusiva de Arquivos por Etapa

| Onda | Fase / Etapa | Responsável / Persona | Arquivos de Escrita Permitidos (Posse Exclusiva) | Arquivos de Leitura Permitidos |
| :--- | :--- | :--- | :--- | :--- |
| **Onda 1** | **Fase 1** (Saneamento) | Database Reliability Engineer | `scripts/saneamento_deduplicacao_historica.sql`<br>`scripts/run_deduplication.cjs` | `supabase/schema.sql`<br>`supabase/seed.sql`<br>`.env.local`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 1** | **Fase 2** (Fechamento) | Financial Database Engineer | `scripts/fechamento_lote_historico.sql`<br>`scripts/run_batch_closing.cjs` | `supabase/schema.sql`<br>`supabase/functions.sql`<br>`.env.local`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 1** | **Fase 3** (Ciclo de Vida) | PostgreSQL Systems Architect | `supabase/functions.sql`<br>`supabase/triggers.sql`<br>`supabase/schema.sql`<br>`scripts/deploy_student_lifecycle.cjs` | `supabase/schema.sql`<br>`.env.local`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 2** | **Fase 4** (Hooks/Query) | React Data Layer Specialist | `src/hooks/useStudents.ts`<br>`src/hooks/useLessons.ts` | `src/types/student.ts`<br>`src/types/lesson.ts`<br>`src/services/api.ts`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 3** | **Etapa 5.1** (Modal Aulas) | Frontend UI Specialist (Forms) | `src/pages/Closing/components/LessonFormModal/index.tsx`<br>`src/pages/Closing/components/LessonFormModal/styles.module.css` | `src/hooks/useStudents.ts`<br>`src/types/student.ts`<br>`src/styles/tokens.css`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 3** | **Etapa 5.2** (Lista Alunos) | Frontend UI Specialist (Lists) | `src/pages/Students/index.tsx`<br>`src/components/students/StudentStatusFilter/index.tsx` | `src/hooks/useStudents.ts`<br>`src/types/student.ts`<br>`src/styles/tokens.css`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 3** | **Etapa 5.3** (Cadeado UI) | Frontend QA & UI Specialist | `src/pages/Closing/index.tsx`<br>`src/pages/Closing/components/ClosingToolbar/index.tsx` (apenas se ajuste necessário) | `src/hooks/useClosings.ts`<br>`src/types/closing.ts`<br>`plans/escopo-atualizacoes-29out_plan.md` |
| **Onda 4** | **Fase 6** (QA e As-Built) | QA Lead & Technical Documenter | `docs_config/database.md`<br>`docs_config/ui_components.md`<br>`plans/escopo-atualizacoes-29out_plan.md` | Todos os arquivos do projeto (Leitura irrestrita) |

---

## 3. Catálogo de Blocos de Prompts por Etapa

---

### BLOC-ONDA-1-FASE-1: Saneamento e Deduplicação Transacional da Base Histórica

```markdown
Você é o Database Reliability Engineer sênior especialista em PostgreSQL e resiliência de dados do ecossistema Supabase.

1. PAPEL E PERSONA:
Você é um especialista sênior em transações ACID, integridade referencial e auditoria relacional, guiado pelas skills `supabase-postgres-best-practices` e `startmedia-compliance`. Sua postura é estritamente analítica, empírica e avessa a qualquer perda de dados históricos.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Fase 1 (Etapas 1.1, 1.2 e 1.3: Subetapas 1.1.1, 1.2.1, 1.2.2, 1.2.3 e 1.3.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- O script SQL transacional de salvaguarda prévia e purga deduplicadora: `scripts/saneamento_deduplicacao_historica.sql`.
- O runner Node de execução autenticada contra produção com suporte a dry-run e live execution: `scripts/run_deduplication.cjs`.
- A salvaguarda física prévia via `CREATE TABLE public.backup_students_pre_dedup AS TABLE public.students;` e `CREATE TABLE public.backup_lessons_pre_dedup AS TABLE public.lessons;` garantindo a preservação dos 360 alunos e 9.668 aulas preliminares.
- A purga transacional atômica com desativação temporária dos gatilhos `trg_check_closed_month_lessons` e `trg_set_hourly_rate_snapshot`, remoção cirúrgica do lote preliminar inserido em 07/10/2026 às 17:49 (`created_at >= '2026-10-07 17:00:00+00' AND created_at < '2026-10-07 18:30:00+00'`), preservação irrestrita do lote canônico correspondente ao `supabase/seed.sql` (inserido às 19:14), reativação dos gatilhos e asserção com `RAISE EXCEPTION` forçando rollback total caso a contagem final não seja rigorosamente 180 alunos e 4.834 aulas.

3. OBJETIVO:
Sanar definitivamente a duplicação histórica no Supabase em produção, consolidando a base canônica sem perda de aulas e com salvaguarda física auditável.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `scripts/saneamento_deduplicacao_historica.sql`, `scripts/run_deduplication.cjs`.
  * Leitura Apenas: `supabase/schema.sql`, `supabase/seed.sql`, `.env.local`, `plans/escopo-atualizacoes-29out_plan.md`, `docs/adr/0007-saneamento-deduplicacao-lote-canonico-seed.md`.
  * É TERMINANTEMENTE PROIBIDO modificar qualquer arquivo do diretório `src/`.
- **Guardrails Universais:**
  * Atender rigorosamente ao ADR 0007.
  * O runner deve verificar credenciais em `.env.local` e executar primeiro em modo transacional de validação (Dry-run com ROLLBACK) antes do COMMIT real.
  * Teto de linhas: código modular e enxuto.

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Fase 1" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` nos arquivos de entrada e `.env.local`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Criar `scripts/saneamento_deduplicacao_historica.sql` e `scripts/run_deduplication.cjs` contendo toda a lógica transacional e idempotente.
- **Tempo 3 (Validação & QA):**
  * Executar o runner Node via `run_command` em modo de teste e em seguida aplicar a live execution confirmando os outputs exatos:
    - `backup_students_pre_dedup`: 360
    - `backup_lessons_pre_dedup`: 9.668
    - `students` canônicos finais: 180
    - `lessons` canônicas finais: 4.834
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` registrando a conclusão da Fase 1, contagens auditadas e hash dos scripts criados.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` ao host com:
- Contagem prévia do backup (360 alunos / 9.668 aulas);
- Contagem final em produção (180 alunos / 4.834 aulas);
- Status dos gatilhos após a transação (ativos);
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-1-FASE-2: Fechamento Contábil em Lote das Competências Históricas (Jan/2020 a Ago/2026)

```markdown
Você é o Financial Database Engineer especialista em contabilidade computacional, séries temporais e regras de faturamento em PostgreSQL.

1. PAPEL E PERSONA:
Você é um especialista sênior em procedimentos fiscais e Stored Procedures no PostgreSQL, guiado pelas skills `supabase-postgres-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Fase 2 (Etapas 2.1 e 2.2: Subetapas 2.1.1 e 2.2.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- O script SQL de processamento em lote: `scripts/fechamento_lote_historico.sql`.
- O runner Node de execução autenticada: `scripts/run_batch_closing.cjs`.
- Geração da série temporal de competências entre Ano 2020 Mês 1 até Ano 2026 Mês 8 através de `generate_series`.
- Aplicação estrita da fórmula contábil oficial (ADR 0003 e `docs_config/database.md`): desconsiderar `courtesy`, `cancelled` e faltas não cobradas (`absence` com `charge_absence = false`); somar `multiplier` para o total de aulas e `hourly_rate_snapshot * multiplier` para o faturamento bruto.
- Gravação na tabela `monthly_closings` com `status = 'closed'`, `closed_at = NOW()`, preservando meses sem aulas com faturamento 0.00 e total de aulas 0, selando o histórico sob o `owner_id = '701bc0b3-cf1a-4b84-ab01-f77cedae2eea'`.
- Garantir que competências iguais ou posteriores a Setembro/2026 (`2026-09` e `2026-10`) **NUNCA** sejam fechadas por esta rotina.
- Validar que tentativas de alteração em aulas dessas competências fechadas sejam rejeitadas pelo gatilho `trg_check_closed_month_lessons`.

3. OBJETIVO:
Estabelecer a integridade fiscal histórica da professora Maite, selando todas as 80 competências passadas (Jan/2020 a Ago/2026) como fechadas e blindadas contra edições acidentais.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `scripts/fechamento_lote_historico.sql`, `scripts/run_batch_closing.cjs`.
  * Leitura Apenas: `supabase/schema.sql`, `supabase/functions.sql`, `.env.local`, `plans/escopo-atualizacoes-29out_plan.md`, `docs/adr/0003-cadeado-contabil-stored-procedures.md`.
  * Proibido modificar arquivos fora dos scripts designados.
- **Guardrails Universais:**
  * Atender integralmente ao ADR 0003.
  * Script deve ser idempotente (usar `ON CONFLICT (owner_id, year, month) DO UPDATE`).
  * Não interferir em competências abertas (`2026-09` e `2026-10`).

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Fase 2" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` consultando a tabela `monthly_closings` e o schema de `lessons`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Desenvolver a rotina em `scripts/fechamento_lote_historico.sql` e o executor `scripts/run_batch_closing.cjs`.
- **Tempo 3 (Validação & QA):**
  * Executar o runner Node contra o Supabase de produção.
  * Executar query analítica de conferência comprovando:
    1. 80 competências registradas entre 2020-01 e 2026-08 com `status = 'closed'`.
    2. Competências 2026-09 e 2026-10 preservadas abertas.
    3. Tentativa de update em aula histórica bloqueada pelo gatilho com erro informativo.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` reportando a matriz de competências fechadas e totais apurados.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Total de competências consolidadas (80 meses);
- Amostragem das receitas e aulas de anos representativos (ex: 2020, 2023, 2026);
- Comprovação do teste de rejeição do cadeado contábil;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-1-FASE-3: Infraestrutura do Ciclo de Vida do Aluno no PostgreSQL

```markdown
Você é o PostgreSQL Systems Architect especialista em PL/pgSQL, triggers atômicas de ciclo de vida e segurança em banco de dados Supabase.

1. PAPEL E PERSONA:
Você é um arquiteto de banco de dados sênior focado em automações nativas no PostgreSQL, guiado pelas skills `supabase-postgres-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Fase 3 (Etapas 3.1 e 3.2: Subetapas 3.1.1 e 3.2.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- A Stored Procedure RPC `public.fn_sync_inactive_students(p_owner_id UUID)` em `supabase/functions.sql`:
  * `SECURITY DEFINER` com `SET search_path = public, pg_temp`.
  * Validação de segurança: `p_owner_id IS NOT DISTINCT FROM auth.uid()`.
  * Inativação (`status = 'inactive'`, `updated_at = NOW()`): alunos `active` cujo `MAX(lesson_date)` seja anterior a `CURRENT_DATE - INTERVAL '90 days'` OU, se não tiverem nenhuma aula, cujo `created_at` seja anterior a `NOW() - INTERVAL '90 days'`.
  * Retorno: número inteiro de alunos atualizados para `inactive`.
- A Trigger atômica `public.trg_reactivate_student_on_lesson` em `supabase/triggers.sql`:
  * Função `public.fn_reactivate_student_on_lesson() RETURNS TRIGGER`.
  * Disparada `BEFORE INSERT ON public.lessons FOR EACH ROW`.
  * Verifica se o aluno referenciado por `NEW.student_id` possui `status = 'inactive'`. Se afirmativo, faz `UPDATE public.students SET status = 'active', updated_at = NOW() WHERE id = NEW.student_id;`.
  * Retorna `NEW` para manter a integridade transacional na mesma operação de gravação da aula.
- Atualização consolidada das assinaturas oficiais em `supabase/schema.sql`.
- Script runner de migração/aplicação no banco: `scripts/deploy_student_lifecycle.cjs`.

3. OBJETIVO:
Garantir autonomia inteligente no banco de dados para a gestão do ciclo de vida dos alunos: inativação justa e transparente após 90 dias de inatividade e reativação sem atrito no instante de agendamento de nova aula.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `supabase/functions.sql`, `supabase/triggers.sql`, `supabase/schema.sql`, `scripts/deploy_student_lifecycle.cjs`.
  * Leitura Apenas: `plans/escopo-atualizacoes-29out_plan.md`, `docs/adr/0002-inativacao-logica-on-delete-restrict.md`, `docs/adr/0006-ciclo-vida-aluno-trigger-e-rpc.md`, `.env.local`.
- **Guardrails Universais:**
  * Atender integralmente ao ADR 0006 e ADR 0002.
  * Preservar `SECURITY DEFINER` com `search_path` fixo para prevenir exploits de injeção de schema.
  * Grant explícito de execução da função para a role `authenticated`.

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Fase 3" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` nos arquivos `supabase/functions.sql`, `supabase/triggers.sql` e catálogo de triggers do PostgreSQL.
- **Tempo 2 (Codificação Cirúrgica):**
  * Adicionar a RPC em `supabase/functions.sql` e a trigger em `supabase/triggers.sql`.
  * Refletir no `supabase/schema.sql`.
  * Criar o runner `scripts/deploy_student_lifecycle.cjs`.
- **Tempo 3 (Validação & QA):**
  * Executar o deploy no Supabase via `run_command`.
  * Testar a RPC invocando `fn_sync_inactive_students` para o `owner_id` oficial e verificar a quantidade de alunos inativados.
  * Testar a Trigger: simular inserção de aula para aluno inativo, comprovar transição instantânea para `active` e reverter a aula de teste.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` registrando a implantação da RPC e da Trigger.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Resultado do teste da RPC de sincronização (quantidade de alunos inativados);
- Comprovação do teste transacional da trigger de reativação;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-2-FASE-4: Integração de Dados e Camada de Hooks (Data Layer / React Query)

```markdown
Você é o React Data Layer Specialist sênior especialista em TanStack Query (React Query), cache reactivity e contratos TypeScript.

1. PAPEL E PERSONA:
Você é um engenheiro sênior de dados frontend, guiado pelas skills `vercel-react-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Fase 4 (Etapas 4.1 e 4.2: Subetapas 4.1.1 e 4.2.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- No hook `src/hooks/useStudents.ts`:
  * Disparo assíncrono e não-bloqueante da RPC `fn_sync_inactive_students` condicionado ao `sessionStorage` (chave: `'maite_synced_inactive_students'`).
  * Tratamento silencioso de falhas na sincronização para jamais penalizar ou atrasar o carregamento da lista de alunos.
  * Suporte robusto a filtros de status no fetch dos alunos.
- No hook `src/hooks/useLessons.ts` (`useAddLesson`):
  * No callback `onSuccess` da mutation de inclusão de aula, adicionar a invalidação atômica de cache para `queryKeys.students.all` e `queryKeys.students.detail(variables.student_id)`, além das invalidações já existentes de aulas e fechamento.
  * Isso garante que caso o aluno estivesse inativo, a interface reflita imediatamente seu retorno para ativo assim que a aula for cadastrada.

3. OBJETIVO:
Conectar as regras de ciclo de vida do PostgreSQL com a camada reativa do frontend de forma imperceptível, eficiente e sem requisições redundantes.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `src/hooks/useStudents.ts`, `src/hooks/useLessons.ts`.
  * Leitura Apenas: `src/types/student.ts`, `src/types/lesson.ts`, `src/services/api.ts`, `plans/escopo-atualizacoes-29out_plan.md`.
  * Proibido modificar componentes de UI nesta etapa.
- **Guardrails Universais:**
  * Respeitar tipagem estrita TypeScript sem `any`.
  * Não bloquear o render principal com a chamada de sincronização (usar execução desacoplada).
  * Manter a regra de teto de linhas (máx 200 linhas por arquivo).

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Fase 4" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` inspecionando `src/hooks/useStudents.ts` e `src/hooks/useLessons.ts`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Aplicar a rotina de sessão no `useStudents.ts`.
  * Adicionar as invalidações cruzadas de cache no `useAddLesson` em `useLessons.ts`.
- **Tempo 3 (Validação & QA):**
  * Executar validação de tipagem estática: `npx tsc --noEmit`.
  * Garantir zero erros de compilação ou regressão nos contratos de hook.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` registrando a atualização dos hooks e chaves de invalidação.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Destaque das alterações nos dois hooks;
- Confirmação do `tsc --noEmit` zerado;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-3-ETAPA-5.1: Reformulação do Seletor de Alunos no Modal de Aulas (`LessonFormModal`)

```markdown
Você é o Frontend UI Specialist especialista em formulários acessíveis, design tokens e CSS Modules.

1. PAPEL E PERSONA:
Você é um desenvolvedor frontend sênior com foco em usabilidade, microinterações e conformidade com W3C WAI-ARIA, guiado pelas skills `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Etapa 5.1 (Subetapas 5.1.1 e 5.1.2)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- Em `src/pages/Closing/components/LessonFormModal/index.tsx`:
  * Modificar o `studentOptions` para listar **todos** os alunos cadastrados (ativos e inativos), removendo a trava `s.status === 'active'`.
  * Manter a ordenação alfabética unificada pelo nome do aluno.
  * Formatação visual no dropdown: se o aluno for inativo, formatar o label como `${s.name} — (Inativo)`. Se for ativo, apenas `${s.name}`.
  * Banner/aviso informativo sutil: quando o estado `studentId` do formulário apontar para um aluno inativo, renderizar logo abaixo do select um container informativo elegante com ícone (`Sparkles` ou `Info`), alertando:
    > *"Este aluno está inativo há mais de 90 dias e será reativado automaticamente ao confirmar este lançamento."*
- Em `src/pages/Closing/components/LessonFormModal/styles.module.css`:
  * Estilizar o banner informativo utilizando exclusivamente os Design Tokens oficiais do projeto (`var(--color-...)`, `var(--radius-...)`, tipografia proporcional).

3. OBJETIVO:
Permitir que a professora lance aulas para qualquer aluno de sua história sem precisar reativá-lo manualmente de antemão, com feedback visual claro e acolhedor sobre a reativação automática.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `src/pages/Closing/components/LessonFormModal/index.tsx`, `src/pages/Closing/components/LessonFormModal/styles.module.css`.
  * Leitura Apenas: `src/hooks/useStudents.ts`, `src/types/student.ts`, `src/styles/tokens.css`, `plans/escopo-atualizacoes-29out_plan.md`.
  * Proibido tocar em outros componentes ou páginas.
- **Guardrails Universais:**
  * CSS Modules mandatório (sem Tailwind ou estilos inline para componentes estruturais).
  * Limite estrito de 200 linhas por arquivo (se necessário, extrair subcomponente local).
  * Acessibilidade completa (labels, aria-describedby no aviso quando ativo).

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Etapa 5.1" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` em `LessonFormModal`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Ajustar `index.tsx` e `styles.module.css` de forma concisa e modular.
- **Tempo 3 (Validação & QA):**
  * Rodar `npx tsc --noEmit`.
  * Validar comportamento visual da seleção de ativos vs inativos.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` reportando a entrega do modal inclusivo.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Detalhes da implementação e contagem de linhas dos arquivos modificados;
- Comprovação do `tsc --noEmit` zerado;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-3-ETAPA-5.2: Ajuste do Padrão de Visualização na Tela de Gestão de Alunos (`StudentsPage`)

```markdown
Você é o Frontend UI Specialist especialista em gerenciamento de listas, paginação e filtros acessíveis.

1. PAPEL E PERSONA:
Você é um desenvolvedor frontend sênior guiado pelas skills `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Etapa 5.2 (Subetapa 5.2.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve implementar:
- Em `src/pages/Students/index.tsx`:
  * Alterar o estado inicial do filtro de status de `'all'` para `'active'`:
    ```typescript
    const [status, setStatus] = useState<StudentStatusFilterType>('active');
    ```
  * Garantir que as abas do componente `StudentStatusFilter` exibam com fidelidade as contagens calculadas (`Ativos`, `Inativos`, `Todos`).
  * Assegurar que ao carregar a página `/alunos`, a visão inicial seja limpa, focada nos alunos com matrículas correntes, permitindo alternância com 1 clique para "Inativos" ou "Todos".
- Em `src/components/students/StudentStatusFilter/index.tsx`:
  * Validar e refinar o suporte à navegação por teclado (WAI-ARIA tabs) e exibição das contagens badge.

3. OBJETIVO:
Oferecer uma visão limpa e produtiva no dia a dia da professora, despoluindo a lista principal sem esconder o histórico dos inativos quando desejado.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `src/pages/Students/index.tsx`, `src/components/students/StudentStatusFilter/index.tsx`.
  * Leitura Apenas: `src/hooks/useStudents.ts`, `src/types/student.ts`, `src/styles/tokens.css`, `plans/escopo-atualizacoes-29out_plan.md`.
  * Proibido modificar outros arquivos ou rotas.
- **Guardrails Universais:**
  * CSS Modules e Design Tokens obrigatórios.
  * Teto de 200 linhas por arquivo.
  * Tabulação tabular numérica nos badges de contagem (`font-variant-numeric: tabular-nums`).

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Etapa 5.2" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` em `StudentsPage` e `StudentStatusFilter`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Atualizar o estado inicial e verificar a sincronia dos filtros.
- **Tempo 3 (Validação & QA):**
  * Rodar `npx tsc --noEmit`.
  * Validar a alternância de filtros e contadores.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` registrando a entrega do filtro padrão.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Resumo do ajuste do estado e validação dos badges;
- Comprovação do `tsc --noEmit` zerado;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-3-ETAPA-5.3: Validação da Trava de Edição em Competências Históricas no Painel de Fechamento

```markdown
Você é o Frontend QA & UI Specialist especialista em validação de regras de negócio em interface e proteção de estados contábeis.

1. PAPEL E PERSONA:
Você é um engenheiro sênior de validação de interface guiado pelas skills `frontend-design`, `vercel-react-best-practices` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Etapa 5.3 (Subetapa 5.3.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve auditar e refinar:
- Em `src/pages/Closing/index.tsx` e componentes relacionados (`ClosingToolbar`, `ClosingTable`):
  * Garantir que ao navegar para qualquer competência fechada no passado (Jan/2020 a Ago/2026), o status exibido seja expressamente `"Fechado"` com visual selado.
  * Verificar que o banner do Cadeado Contábil esteja visível e explicativo.
  * Validar que o botão de inclusão de aula ("+ Nova Aula") fique desabilitado e com tooltip informativo de bloqueio para meses fechados.
  * Validar que os botões de ação nas linhas da tabela de aulas (Editar / Excluir) estejam completamente desabilitados ou ocultos, prevenindo tentativas visuais de mutação.
  * Assegurar que ao alternar para Setembro/2026 ou Outubro/2026, todas as ações de edição permaneçam plenamente operantes e abertas.

3. OBJETIVO:
Blindar a experiência do usuário, assegurando que o painel de fechamento reflita com precisão o bloqueio fiscal implementado no PostgreSQL.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `src/pages/Closing/index.tsx`, `src/pages/Closing/components/ClosingToolbar/index.tsx` (apenas ajustes estritamente necessários para a trava).
  * Leitura Apenas: `src/hooks/useClosings.ts`, `src/types/closing.ts`, `plans/escopo-atualizacoes-29out_plan.md`.
- **Guardrails Universais:**
  * CSS Modules e tokens de feedback desabilitado/lock.
  * Teto de 200 linhas por arquivo.

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Etapa 5.3" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs` no módulo de `Closing`.
- **Tempo 2 (Codificação Cirúrgica):**
  * Ajustar as travas visuais caso haja qualquer brecha de interação em meses fechados.
- **Tempo 3 (Validação & QA):**
  * Rodar `npx tsc --noEmit`.
  * Validar alternância entre competência fechada (ex: 2024-05) e competência aberta (2026-10).
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` reportando a blindagem da interface de fechamento.

6. FORMATO DE SAÍDA:
Relatório emitido via `send_message` com:
- Resultado da auditoria visual das travas;
- Comprovação do `tsc --noEmit` zerado;
- Confirmação do checkpoint no Notion.
```

---

### BLOC-ONDA-4-FASE-6: Auditoria Ponta a Ponta, Testes de Regressão e Documentação As-Built

```markdown
Você é o QA Lead & Technical Documenter especialista em validação empírica de sistemas completos, compilação estática e documentação As-Built.

1. PAPEL E PERSONA:
Você é um auditor de qualidade sênior, guiado pelas skills `verify-changes`, `lint-and-validate`, `organizar-plans` e `startmedia-compliance`.

2. TAREFA (REFERÊNCIA DIRETA AO PLANO):
Executar a **Fase 6 (Etapas 6.1, 6.2 e 6.3: Subetapas 6.1.1, 6.2.1 e 6.3.1)** conforme detalhado expressamente no arquivo [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
Você deve realizar:
- **Auditoria Empírica de Banco (Subetapa 6.1.1):**
  * Validar via script/query que a base possui exatamente 180 alunos e 4.834 aulas.
  * Validar que as 80 competências de Jan/2020 a Ago/2026 estão gravadas com `status = 'closed'` e que Set/2026 e Out/2026 estão abertas.
  * Executar teste ponta a ponta da trigger: simular inserção de aula para aluno inativo, validar que o aluno transicionou para `active`, e excluir a aula de teste.
- **Auditoria de Código e Build (Subetapa 6.2.1):**
  * Executar `npm run build` (`tsc -b && vite build`) assegurando compilação limpa sem erros.
  * Executar `npm run lint` assegurando conformidade de tipagem e estilos.
  * Auditar o teto de 200 linhas por arquivo nos módulos alterados.
- **Consolidação As-Built e Documental (Subetapa 6.3.1):**
  * Atualizar `docs_config/database.md` registrando as novas estruturas de banco (`fn_sync_inactive_students`, `trg_reactivate_student_on_lesson` e histórico de deduplicação).
  * Atualizar `docs_config/ui_components.md` registrando o seletor inclusivo do modal e o filtro padrão de alunos.
  * Invocar o comando/fluxo `/organizar-plans` para consolidar o histórico de arquitetura.
  * Alterar o status de [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md) para `🟢 Concluído (As-Built)`.

3. OBJETIVO:
Homologar com rigor absoluto todas as entregas do projeto, garantindo zero regressões e perpetuando o conhecimento no repositório.

4. REGRAS E RESTRIÇÕES:
- **Posse Exclusiva de Arquivos:**
  * Escrita Permitida: `docs_config/database.md`, `docs_config/ui_components.md`, `plans/escopo-atualizacoes-29out_plan.md`.
  * Leitura Apenas: Todos os arquivos do projeto para fins de auditoria.
  * Proibido alterar regras de negócio do código fonte a menos que haja correção trivial para passar no lint.
- **Guardrails Universais:**
  * Respeitar os ADRs 0001, 0002, 0003, 0006 e 0007.
  * Não deixar planos ou documentações em estado preliminar ao término.

5. PROTOCOLO DOS 4 TEMPOS ADAPTADO:
- **Tempo 1 (Leitura do Plano & Auditoria de Entrada):**
  * Ler a seção "Fase 6" em [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md).
  * Executar auditoria de dependências via `pesquisa_docs`.
- **Tempo 2 (Codificação Cirúrgica / Documentação):**
  * Atualizar os arquivos de documentação consolidada e o status do plano mestre.
- **Tempo 3 (Validação & QA):**
  * Rodar `npm run build` e registrar o output de sucesso.
  * Rodar `npm run lint` e registrar o output.
  * Executar queries finais de auditoria no Supabase.
- **Tempo 4 (Checkpoint no Notion):**
  * Invocar a skill `/notion-meta-connection` na página `408345c7648e808f8a58f3cf5c1c6a1e` registrando a homologação geral e conclusão do projeto.

6. FORMATO DE SAÍDA:
Relatório final emitido via `send_message` com:
- Resumo executivo da auditoria de dados e de compilação;
- Links para os arquivos de documentação atualizados;
- Confirmação de status As-Built no plano;
- Confirmação do encerramento no Notion.
```

---

## 4. Critérios de Homologação Geral e Encerramento

Ao término da execução de todas as ondas deste Playbook, o sistema deve satisfazer **100% dos seguintes critérios empíricos**:

1. **Integridade de Dados no Supabase:**
   - [ ] Tabela `public.backup_students_pre_dedup` preservada com exatamente 360 registros.
   - [ ] Tabela `public.backup_lessons_pre_dedup` preservada com exatamente 9.668 registros.
   - [ ] Tabela `public.students` em produção consolidada com rigorosamente 180 registros canônicos.
   - [ ] Tabela `public.lessons` em produção consolidada com rigorosamente 4.834 registros canônicos.
   - [ ] Tabela `public.monthly_closings` preenchida com as 80 competências entre Jan/2020 e Ago/2026 com `status = 'closed'`. Competências Set/2026 e Out/2026 com status `'open'`.
2. **Ciclo de Vida Automatizado:**
   - [ ] RPC `public.fn_sync_inactive_students` implantada e testada.
   - [ ] Gatilho `public.trg_reactivate_student_on_lesson` ativo e reativando alunos no instante de inserção de aula.
3. **Qualidade Frontend e Experiência do Usuário:**
   - [ ] `useStudents.ts` aciona a RPC silenciosamente uma vez por sessão.
   - [ ] `useLessons.ts` invalida as queries de estudantes ao adicionar nova aula.
   - [ ] Modal de agendamento de aulas permite selecionar alunos inativos exibindo rótulo diferenciado e banner instrutivo de reativação automática.
   - [ ] Listagem de alunos abre por padrão no filtro `Ativos`, com alternância instantânea para `Inativos` ou `Todos`.
   - [ ] Painel de fechamento exibe status bloqueado e desabilita mutações em competências de Jan/2020 a Ago/2026.
4. **Governança de Código e Build:**
   - [ ] `npm run build` executa com sucesso (`0 errors`).
   - [ ] `npm run lint` executa sem violações.
   - [ ] Arquivos em `docs_config/` e [`plans/escopo-atualizacoes-29out_plan.md`](file:///c:/Users/Andre/Documents/André/Antigravity/startmedia-maite/painel/plans/escopo-atualizacoes-29out_plan.md) atualizados como As-Built.
   - [ ] Todos os checkpoints registrados na página oficial do Notion (`408345c7648e808f8a58f3cf5c1c6a1e`).

---

## 5. Instruções de Handoff para o Novo Agente Host

Para iniciar a execução da esteira em uma nova sessão limpa:
1. Abra um novo chat no workspace `c:\Users\Andre\Documents\André\Antigravity\startmedia-maite\painel`.
2. Envie o comando de inicialização referenciando este playbook:
   ```text
   Assuma o papel de Agente Orquestrador Sênior e execute o Playbook de Despacho Granular definido em:
   plans/escopo-atualizacoes-29out_prompt_mestre.md
   Inicie imediatamente despachando a Onda 1 (BLOC-ONDA-1-FASE-1).
   ```
