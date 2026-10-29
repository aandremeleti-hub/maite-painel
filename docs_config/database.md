# 📂 Referência de Arquitetura: Banco de Dados Supabase & PostgreSQL

**Última Atualização:** 2026-10-29  
**Origem do Conhecimento:** `14.9_relatorio_fase1.md`, `14.10_relatorio_fase2.md`, `14.11_relatorio_fase3.md`, `14.12_plano_fase4_recuperado.md`, `15_implementation_plan_v4.md`, `15.3_relatorio_fase4_completo.md`, `finalizacao-painel-maite_plan.md` (Fases 6, 7 e 8 As-Built), `escopo-atualizacoes-29out_plan.md` (Fases 1 a 6 As-Built), ADRs 0001, 0002, 0003, 0006 e 0007.

---

## 🎯 1. Escopo e Regras de Negócio

### 1.1. Propósito da Camada
Esta frente centraliza a modelagem relacional de dados, segurança em nível de linha (**Row Level Security - RLS**), regras automáticas de integridade por **Triggers** e inteligência contábil delegada ao motor PostgreSQL via **Stored Procedures (RPCs)** no projeto Supabase em nuvem (`sa-east-1` São Paulo, projeto `rvjfovxsxsbudirwqgtt`).

### 1.2. Regras de Negócio Cruciais
1. **Preservação do Histórico Real da Professora Maite:**
   - O banco de dados em produção foi migrado a partir de planilhas históricas de 2022 até 31 de agosto de 2026 (`seed.sql`, 807 KB).
   - Possui **180 alunos e 4.834 aulas reais** vinculadas ao UID oficial da Maite.
   - **É expressamente proibido** rodar migrações destrutivas (`DROP TABLE CASCADE` ou `TRUNCATE`) ou injetar dados falsos (mock).
2. **Snapshot de Preço da Hora-Aula (`hourly_rate_snapshot`):**
   - O valor da hora-aula é congelado em cada registro da tabela `lessons` no momento da criação da aula via trigger `trg_set_hourly_rate_snapshot`.
   - Se o preço do aluno for reajustado na tabela `students`, as aulas passadas **mantêm** o valor histórico intacto, garantindo conformidade contábil.
3. **Cadeado do Contador (Fechamento de Mês - ADR 0003):**
   - A tabela `monthly_closings` controla o ciclo de vida contábil com status `'open'` ou `'closed'`.
   - O gatilho `trg_check_closed_month_lessons` bloqueia qualquer tentativa de `INSERT`, `UPDATE` ou `DELETE` em aulas cuja data pertença a um mês com status `'closed'`.
   - A edição só é liberada se o mês for explicitamente reaberto pela RPC `fn_reopen_month`, protegida no frontend por modal de alta fricção.
4. **Integridade Referencial e Inativação Lógica Protegida (ADR 0002):**
   - A chave estrangeira `lessons.student_id` possui restrição estrita `REFERENCES public.students(id) ON DELETE RESTRICT`.
   - Exclusões físicas de alunos que possuem aulas registradas são rejeitadas pelo PostgreSQL disparando o código de erro `23503` (`foreign_key_violation`).
   - O sistema adota **Inativação Lógica** (`status = 'inactive'`) para preservar o histórico contábil, relatórios de faturamento e extratos passados.
5. **Tratamento de Datas Literais ISO sem Fuso Horário (ADR 0001):**
   - A coluna `lesson_date` é do tipo `DATE` e trafega exclusivamente como string literal no formato `'YYYY-MM-DD'`.
   - As delimitações mensais no banco usam `make_date(p_year, p_month, 1)` e `(v_start_date + INTERVAL '1 month')::DATE`, garantindo delimitação exata do primeiro ao último dia do mês sem interferência de fuso horário (ex: Brasília UTC-3).
6. **Fórmulas Contábeis por Categoria de Aula:**
   - Categorias suportadas: `standard` (padrão), `extended` (estendida), `absence` (falta), `cancelled` (cancelada), `courtesy` (cortesia).
   - `courtesy`: Faturamento = R$ 0,00; Total de aulas = 0.
   - `cancelled`: Faturamento = R$ 0,00; Total de aulas = 0.
   - `absence`: Se `charge_absence = false` ➔ Faturamento = R$ 0,00 e Total de aulas = 0. Se `charge_absence = true` ➔ Faturamento = `hourly_rate_snapshot * multiplier` e Total de aulas = `multiplier`.
   - `standard` e `extended`: Faturamento = `hourly_rate_snapshot * multiplier`; Total de aulas = `multiplier`.
7. **Saneamento e Deduplicação da Base Histórica (ADR 0007):**
   - A duplicação acidental decorrente de duas cargas iniciais em 07/10/2026 foi resolvida de forma definitiva via transação atômica.
   - Salvaguarda física prévia em tabelas dedicadas: `public.backup_students_pre_dedup` (360 registros) e `public.backup_lessons_pre_dedup` (9.668 registros).
   - O lote canônico das 19:14 (idêntico ao `seed.sql`) foi preservado, consolidando a base estritamente em **180 alunos e 4.834 aulas**.
8. **Fechamento em Lote das Competências Históricas (ADR 0003):**
   - Todas as 80 competências entre **Janeiro/2020 e Agosto/2026** foram consolidadas com `status = 'closed'` na tabela `monthly_closings` com faturamento e total de aulas calculados pela rotina contábil oficial.
   - Competências sem movimentação foram devidamente seladas com `total_lessons_count = 0` e `total_revenue = 0.00`.
   - Competências ativas vigentes (**Setembro/2026 e Outubro/2026**) permanecem abertas (`status = 'open'`), aceitando mutações normais.
9. **Ciclo de Vida do Aluno no PostgreSQL (ADR 0006):**
   - **Inativação Automática (90 Dias):** Executada pela RPC `fn_sync_inactive_students(p_owner_id)`. Transiciona para `status = 'inactive'` alunos ativos cuja última aula ocorreu há mais de 90 dias ou que nunca tiveram aulas e foram cadastrados há mais de 90 dias.
   - **Reativação Atômica Instantânea:** Gerenciada pela trigger `trg_reactivate_student_on_lesson` no evento `BEFORE INSERT ON public.lessons`. Ao registrar qualquer aula para um aluno inativo, seu status é revertido de imediato para `active` na mesma transação.

### 1.3. Limitações Técnicas e Restrições
- **Criação de Usuários:** O Supabase GoTrue Auth exige criptografia interna; usuários mestres **nunca** devem ser criados via `INSERT INTO auth.users`, mas sim via painel do Supabase Auth ou SDK de cadastro.
- **Isolamento de Tenant (Single/Multi-tenant seguro):** Todas as tabelas possuem `owner_id UUID REFERENCES public.profiles(id)` e RLS estrito `owner_id = auth.uid()`.
- **Search Path Seguro:** Todas as funções com `SECURITY DEFINER` devem obrigatoriamente declarar `SET search_path = public, pg_temp` para impedir injeção por substituição de schema.

---

## ⚙️ 2. Especificação Técnica e Códigos-Chave

### 2.1. Modelagem Relacional (DDL das Tabelas)

```sql
-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES (Espelho de auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDENTS (Cadastro de Alunos)
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
    requires_invoice BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    first_lesson_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_owner_id ON public.students(owner_id);
CREATE INDEX idx_students_status ON public.students(status);

-- LESSONS (Lançamento de Aulas)
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_date DATE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('standard', 'extended', 'absence', 'cancelled', 'courtesy')),
    multiplier NUMERIC(3,1) NOT NULL,
    charge_absence BOOLEAN DEFAULT true,
    content_notes TEXT,
    hourly_rate_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_student_id ON public.lessons(student_id);
CREATE INDEX idx_lessons_date ON public.lessons(lesson_date);
CREATE INDEX idx_lessons_owner_date ON public.lessons(owner_id, lesson_date);

-- MONTHLY CLOSINGS (Fechamentos Contábeis)
CREATE TABLE public.monthly_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_lessons_count NUMERIC(10,1),
    total_revenue NUMERIC(12,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_closing_per_month UNIQUE (owner_id, year, month)
);

-- PAYMENT INFO (Dados Bancários e PIX)
CREATE TABLE public.payment_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pix_key TEXT NOT NULL,
    pix_type TEXT CHECK (pix_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
    bank_name TEXT,
    account_holder TEXT,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.2. Políticas de Segurança (Row Level Security - RLS)

```sql
-- Ativação do RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_info ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento por auth.uid()
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can manage own students" 
ON public.students FOR ALL 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage own lessons" 
ON public.lessons FOR ALL 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage own closings" 
ON public.monthly_closings FOR ALL 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can manage own payment info" 
ON public.payment_info FOR ALL 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
```

---

### 2.3. Gatilhos Automáticos (Triggers)

#### 1. Relógio Automático (`trg_set_updated_at`)
Atualiza a coluna `updated_at` automaticamente antes de qualquer `UPDATE`:
```sql
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.payment_info FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
```

#### 2. Carimbo de Preço Snapshot (`trg_set_hourly_rate_snapshot`)
Carimba o valor da hora do aluno cadastrado caso o valor venha nulo ou zerado no formulário:
```sql
CREATE OR REPLACE FUNCTION public.fn_set_hourly_rate_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_rate NUMERIC(10,2);
BEGIN
  IF NEW.hourly_rate_snapshot IS NULL OR NEW.hourly_rate_snapshot = 0.00 THEN
    SELECT hourly_rate INTO v_rate FROM public.students WHERE id = NEW.student_id;
    NEW.hourly_rate_snapshot := COALESCE(v_rate, 0.00);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_set_hourly_rate_snapshot
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_hourly_rate_snapshot();
```

#### 3. Cadeado do Fechamento de Mês (`trg_check_closed_month_lessons`)
Impede adulterações no passado contábil travado (ADR 0003):
```sql
CREATE OR REPLACE FUNCTION public.fn_check_closed_month()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_status TEXT;
  v_owner_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_year := EXTRACT(YEAR FROM OLD.lesson_date);
    v_month := EXTRACT(MONTH FROM OLD.lesson_date);
    v_owner_id := OLD.owner_id;
  ELSE
    v_year := EXTRACT(YEAR FROM NEW.lesson_date);
    v_month := EXTRACT(MONTH FROM NEW.lesson_date);
    v_owner_id := NEW.owner_id;
  END IF;

  SELECT status INTO v_status
  FROM public.monthly_closings
  WHERE owner_id = v_owner_id AND year = v_year AND month = v_month;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'Acesso Negado: O mês %/% já está fechado pelo contador e suas aulas não podem ser alteradas.', v_month, v_year;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_year := EXTRACT(YEAR FROM OLD.lesson_date);
    v_month := EXTRACT(MONTH FROM OLD.lesson_date);
    
    SELECT status INTO v_status
    FROM public.monthly_closings
    WHERE owner_id = OLD.owner_id AND year = v_year AND month = v_month;

    IF v_status = 'closed' THEN
      RAISE EXCEPTION 'Acesso Negado: A data original desta aula pertence a um mês já fechado. Você não pode movê-la.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_closed_month_lessons
  BEFORE INSERT OR UPDATE OR DELETE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_closed_month();

#### 4. Reativação Automática de Aluno (`trg_reactivate_student_on_lesson` - ADR 0006)
Reativa instantaneamente o aluno para `active` se uma nova aula for inserida para ele, garantindo atomicidade transacional e reatividade imediata:
```sql
CREATE OR REPLACE FUNCTION public.fn_reactivate_student_on_lesson()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_status TEXT;
BEGIN
  -- Consulta o status cadastral atual do aluno
  SELECT status INTO v_student_status
  FROM public.students
  WHERE id = NEW.student_id;

  -- Se estiver inativo, reativa imediatamente para active
  IF v_student_status = 'inactive' THEN
    UPDATE public.students
    SET status = 'active',
        updated_at = NOW()
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reactivate_student_on_lesson
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_reactivate_student_on_lesson();
```
```

---

### 2.4. Stored Procedures Oficiais (RPCs)

```sql
-- 1. Totais da Competência
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_totals(
  p_owner_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  total_lessons NUMERIC(10,1),
  total_revenue NUMERIC(12,2)
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_start_date DATE := make_date(p_year, p_month, 1);
  v_end_date DATE := (v_start_date + INTERVAL '1 month')::DATE;
BEGIN
  IF p_owner_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN category IN ('courtesy', 'cancelled') OR (category = 'absence' AND charge_absence = false) THEN 0
        ELSE multiplier 
      END
    ), 0)::NUMERIC(10,1) as total_lessons,
    COALESCE(SUM(
      CASE 
        WHEN category IN ('courtesy', 'cancelled') OR (category = 'absence' AND charge_absence = false) THEN 0
        ELSE hourly_rate_snapshot * multiplier 
      END
    ), 0)::NUMERIC(12,2) as total_revenue
  FROM public.lessons
  WHERE owner_id = p_owner_id
    AND lesson_date >= v_start_date
    AND lesson_date < v_end_date;
END;
$$;

-- 2. Fechar Mês Oficialmente
CREATE OR REPLACE FUNCTION public.fn_close_month(
  p_owner_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_totals RECORD;
  v_existing_status TEXT;
BEGIN
  IF p_owner_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  SELECT status INTO v_existing_status
  FROM public.monthly_closings
  WHERE owner_id = p_owner_id AND year = p_year AND month = p_month;

  IF v_existing_status = 'closed' THEN
    RAISE EXCEPTION 'Mês já está fechado e não pode ser alterado.';
  END IF;

  SELECT * INTO v_totals FROM public.fn_calculate_monthly_totals(p_owner_id, p_year, p_month);

  INSERT INTO public.monthly_closings (
    owner_id, year, month, total_lessons_count, total_revenue, status, closed_at
  ) VALUES (
    p_owner_id, p_year, p_month, v_totals.total_lessons, v_totals.total_revenue, 'closed', NOW()
  )
  ON CONFLICT (owner_id, year, month) 
  DO UPDATE SET 
    total_lessons_count = EXCLUDED.total_lessons_count,
    total_revenue = EXCLUDED.total_revenue,
    status = 'closed',
    closed_at = NOW();
END;
$$;

-- 3. Reabrir Competência para Ajuste
CREATE OR REPLACE FUNCTION public.fn_reopen_month(
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_owner_id UUID := (select auth.uid());
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Acesso Negado: Usuário não autenticado.';
  END IF;

  UPDATE public.monthly_closings
  SET status = 'open', closed_at = NULL
  WHERE owner_id = v_owner_id AND year = p_year AND month = p_month;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fechamento não encontrado para %/%.', p_month, p_year;
  END IF;
END;
$$;

-- 4. Extrato Detalhado do Aluno no Mês
CREATE OR REPLACE FUNCTION public.fn_get_student_monthly_detail(
  p_student_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  lesson_date DATE,
  category TEXT,
  multiplier NUMERIC(3,1),
  content_notes TEXT,
  hourly_rate_snapshot NUMERIC(10,2),
  lesson_value NUMERIC(10,2)
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_start_date DATE := make_date(p_year, p_month, 1);
  v_end_date DATE := (v_start_date + INTERVAL '1 month')::DATE;
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_date,
    l.category,
    l.multiplier,
    l.content_notes,
    l.hourly_rate_snapshot,
    (CASE 
      WHEN l.category = 'courtesy' THEN 0
      WHEN l.category = 'cancelled' THEN 0
      WHEN l.category = 'absence' AND l.charge_absence = false THEN 0
      ELSE l.hourly_rate_snapshot * l.multiplier
    END)::NUMERIC(10,2) as lesson_value
  FROM public.lessons l
  WHERE l.student_id = p_student_id
    AND l.owner_id = (select auth.uid())
    AND l.lesson_date >= v_start_date
    AND l.lesson_date < v_end_date
  ORDER BY l.lesson_date ASC;
END;
$$;

-- 5. Faturamento Individual do Aluno
CREATE OR REPLACE FUNCTION public.fn_calculate_student_monthly_revenue(
  p_student_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS NUMERIC(10,2)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_total NUMERIC(10,2) := 0;
  v_start_date DATE := make_date(p_year, p_month, 1);
  v_end_date DATE := (v_start_date + INTERVAL '1 month')::DATE;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN category = 'courtesy' THEN 0
      WHEN category = 'cancelled' THEN 0
      WHEN category = 'absence' AND charge_absence = false THEN 0
      ELSE hourly_rate_snapshot * multiplier
    END
  ), 0)
  INTO v_total
  FROM public.lessons
  WHERE student_id = p_student_id
    AND owner_id = (select auth.uid())
    AND lesson_date >= v_start_date
    AND lesson_date < v_end_date;

  RETURN v_total;
END;
$$;

-- 6. Sincronização Periódica de Alunos Inativos (Regra dos 90 Dias - ADR 0006)
CREATE OR REPLACE FUNCTION public.fn_sync_inactive_students(
  p_owner_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_updated_count INTEGER := 0;
BEGIN
  -- Prevenção de IDOR: exige compatibilidade com auth.uid() ou superuser/service_role
  IF v_caller_id IS NOT NULL AND p_owner_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'Acesso não autorizado: owner_id divergente do usuário autenticado.';
  ELSIF v_caller_id IS NULL AND (SELECT current_user) NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Acesso não autorizado: credenciais ausentes.';
  END IF;

  WITH candidates AS (
    SELECT s.id
    FROM public.students s
    LEFT JOIN (
      SELECT student_id, MAX(lesson_date) AS max_lesson_date
      FROM public.lessons
      GROUP BY student_id
    ) l ON l.student_id = s.id
    WHERE s.owner_id = p_owner_id
      AND s.status = 'active'
      AND (
        (l.max_lesson_date IS NOT NULL AND l.max_lesson_date < CURRENT_DATE - INTERVAL '90 days')
        OR
        (l.max_lesson_date IS NULL AND s.created_at < NOW() - INTERVAL '90 days')
      )
  )
  UPDATE public.students s
  SET 
    status = 'inactive',
    updated_at = NOW()
  FROM candidates c
  WHERE s.id = c.id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sync_inactive_students(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sync_inactive_students(UUID) TO service_role;
```

---

## 🔗 3. Arquivos Ativos e Referências no Projeto

- [schema.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/supabase/schema.sql) — *Definição DDL das tabelas, chaves primárias, estrangeiras e índices.*
- [rls_policies.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/supabase/rls_policies.sql) — *Políticas de segurança Row Level Security baseadas em `auth.uid()`.*
- [functions.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/supabase/functions.sql) — *Stored Procedures de cálculos monetários, fechamento e reabertura.*
- [triggers.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/supabase/triggers.sql) — *Triggers de atualização de timestamps, snapshot de tarifa e trava de mês fechado.*
- [database.types.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/types/database.types.ts) — *Dicionário de tipos estrito do TypeScript mapeando as tabelas e RPCs.*
- [seed.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/supabase/seed.sql) — *Script de carga histórica com 180 alunos e 4.834 aulas (2022 a 08/2026).*
- [useStudents.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useStudents.ts) — *Hooks CRUD de alunos com interceptador para erro 23503 (`ON DELETE RESTRICT`).*
- [useLessons.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useLessons.ts) — *Hooks de lançamentos de aulas com injeção automática de `owner_id` e controle temporal.*
- [useClosing.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/useClosing.ts) — *Hooks de consumo das 5 RPCs de totais, fechamento e reabertura de competência.*
- [usePaymentInfo.ts](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/src/hooks/usePaymentInfo.ts) — *Hooks para manipulação de registros de dados bancários e chave PIX.*
- [saneamento_deduplicacao_historica.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/scripts/saneamento_deduplicacao_historica.sql) — *Script SQL transacional com backup físico e purga do lote duplicado (ADR 0007).*
- [run_deduplication.cjs](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/scripts/run_deduplication.cjs) — *Runner Node com execução em dois tempos (Dry-run e Live) para saneamento histórico.*
- [fechamento_lote_historico.sql](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/scripts/fechamento_lote_historico.sql) — *Script SQL para consolidação em lote das 80 competências (Jan/2020 a Ago/2026).*
- [run_batch_closing.cjs](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/scripts/run_batch_closing.cjs) — *Runner Node de fechamento em lote com cálculo contábil idempotente.*
- [deploy_student_lifecycle.cjs](file:///c:/Users/Andre/Documents/Andr%C3%A9/Antigravity/startmedia-maite/painel/scripts/deploy_student_lifecycle.cjs) — *Script de implantação da RPC de 90 dias e da trigger de reativação imediata.*

---

## 🧠 4. Lições Aprendidas, Erros Comuns & Gotchas (Essencial)

> [!IMPORTANT]
> **Gotchas e Erros Evitados no Banco de Dados:**
> 
> 1. **Salvaguarda de Integridade Referencial (`ON DELETE RESTRICT` - ADR 0002):**  
>    Tentar deletar fisicamente um aluno com aulas vinculadas aciona imediatamente o erro Postgres `23503` (`foreign_key_violation`). A camada de UI intercepta esse código e exibe mensagem amigável recomendando a **Inativação Lógica** (`status = 'inactive'`), blindando os demonstrativos contábeis contra perda de dados.
> 
> 2. **Cadeado Contábil no Nível do PostgreSQL (ADR 0003):**  
>    A integridade do faturamento não depende unicamente da UI: a trigger `trg_check_closed_month_lessons` bloqueia `INSERT`, `UPDATE` ou `DELETE` no PostgreSQL caso o mês esteja com `status = 'closed'` em `monthly_closings`. Se uma requisição direta tentar burlar o frontend, o banco rejeita com `RAISE EXCEPTION`.
> 
> 3. **O "Chute" do UID do Usuário (Erro Crítico da Fase 1):**  
>    Nunca gere ou assuma um UUID aleatório para o proprietário (`owner_id`). O `owner_id` DEVE ser o ID real do usuário autenticado no Supabase GoTrue Auth (`auth.users.id`). Chutar IDs em scripts de seed gera dados inacessíveis pelo RLS. Se faltar a chave de produção, o agente deve parar e solicitar ao usuário.
> 
> 4. **Alucinação sobre os Dados Históricos Reais (Erro da Fase 2):**  
>    Registros de aulas com multiplicadores altos (ex: `multiplier = 9` ou `4.5`) ou dezenas de aulas em um único mês **NÃO são dados de teste**. São registros fidedignos de aulas em grupo, pacotes fechados ou anotações históricas da cliente convertidos do Excel. Nunca altere ou descarte dados sob suposição infundada.
> 
> 5. **Desalinhamento DDL vs. Nomenclatura do Plano (Erro da Fase 2):**  
>    Planos sugeriam colunas `closing_year` e `closing_month`, mas a tabela criada na Fase 1 utiliza `year` e `month`. A fonte da verdade técnica é SEMPRE o `schema.sql`. Antes de escrever queries ou triggers, consulte o código real.
> 
> 6. **A Armadilha do `hourly_rate_snapshot = 0.00` (Resolvido na Fase 4):**  
>    Se o frontend omitir o preço ao cadastrar uma aula, o formulário pode enviar `0.00` ou `null`. A trigger valida `IF NEW.hourly_rate_snapshot IS NULL OR NEW.hourly_rate_snapshot = 0.00 THEN` para buscar o preço atual na tabela `students`. Caso contrário, a aula seria salva com tarifa zerada.
> 
> 7. **Ponto Cego de Validação Temporal (10/2026 vs. 08/2026):**  
>    O `seed.sql` encerra-se em 31/08/2026. Consultar a competência 10/2026 retornará totais zerados (`total_lessons: 0`, `total_revenue: 0`) porque o mês está vazio, e não porque a função falhou. Para testar extratos com volume real de aulas, a competência de referência é **08/2026** (com 96 aulas e 27 alunos).
> 
> 8. **Desativação Temporária de Gatilhos em Deduplicação Transacional (ADR 0007):**  
>    Ao executar purga de registros históricos antigos em lote, gatilhos como `trg_check_closed_month_lessons` bloqueiam a deleção de aulas do passado. A transação deve desativar temporariamente os gatilhos (`ALTER TABLE public.lessons DISABLE TRIGGER ...`) e reativá-los obrigatoriamente antes do `COMMIT`.
> 
> 9. **Atomicidade Transacional na Reativação do Aluno (ADR 0006):**  
>    A trigger `trg_reactivate_student_on_lesson` executa no tempo `BEFORE INSERT` em `lessons`. Isso garante que antes do registro da aula ser persistido, o aluno já tem seu status atualizado para `active`, eliminando inconsistências temporais e necessidade de múltiplas chamadas de API pelo frontend.
> 
> 10. **Controle de Sessão para Execução de RPC de Sincronização:**  
>    A rotina `fn_sync_inactive_students` examina todos os alunos e aulas. Para evitar sobrecarga desnecessária do banco em cada render ou consulta de listagem, o hook armazena um flag no `sessionStorage` (`maite_synced_inactive_students`), executando a sincronização apenas uma vez por sessão de navegação.
