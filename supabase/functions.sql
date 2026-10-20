-- ==============================================================================
-- SQL FUNCTIONS (Stored Procedures)
-- Goal: Calculate totals and handle the monthly closing logic directly in the DB.
-- Fully audited and compliant with 15_implementation_plan_v4.md (Fase 2 & Fase 4).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. fn_calculate_student_monthly_revenue
-- Calcula o faturamento de um único aluno em um mês específico
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_student_monthly_revenue(
  p_student_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS NUMERIC(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

-- ------------------------------------------------------------------------------
-- 2. fn_calculate_monthly_totals
-- Calcula o faturamento global e total de aulas de TODOS os alunos da professora
-- Blindado contra IDOR/BOLA e aplicando regras contábeis estritas para total_lessons
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_monthly_totals(
  p_owner_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  total_lessons NUMERIC(10,1),
  total_revenue NUMERIC(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

-- ------------------------------------------------------------------------------
-- 3. fn_close_month
-- Trava o mês para edições e salva os totais consolidados
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_close_month(
  p_owner_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_totals RECORD;
  v_existing_status TEXT;
BEGIN
  IF p_owner_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  -- 1. Verifica se já está fechado
  SELECT status INTO v_existing_status
  FROM public.monthly_closings
  WHERE owner_id = p_owner_id AND year = p_year AND month = p_month;

  IF v_existing_status = 'closed' THEN
    RAISE EXCEPTION 'Mês já está fechado e não pode ser alterado.';
  END IF;

  -- 2. Calcula os totais do mês usando a função anterior
  SELECT * INTO v_totals FROM public.fn_calculate_monthly_totals(p_owner_id, p_year, p_month);

  -- 3. Salva os resultados e altera o status para 'closed'
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

-- ------------------------------------------------------------------------------
-- 4. fn_get_student_monthly_detail
-- Retorna a lista detalhada de aulas para gerar o PDF do Time Sheet
-- ------------------------------------------------------------------------------
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

-- ------------------------------------------------------------------------------
-- 5. fn_reopen_month
-- Reabre a competência para correção (reverte status para 'open' e limpa closed_at)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_reopen_month(
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
