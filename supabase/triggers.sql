-- ==============================================================================
-- DATABASE TRIGGERS
-- Goal: Automate security policies (lock closed months), snapshots (hourly rate), 
-- and automatic timestamps updates.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. trg_set_updated_at (O Relógio Invisível)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicando o relógio em todas as tabelas vitais
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.profiles;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.students;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.lessons;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.payment_info;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.payment_info FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ------------------------------------------------------------------------------
-- 2. trg_set_hourly_rate_snapshot (O Carimbo do Preço)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_hourly_rate_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_rate NUMERIC(10,2);
BEGIN
  -- Nós só carimbamos automaticamente se o site não enviou um valor manual.
  -- Isso impede que dados históricos (como nosso seed.sql) sejam sobrescritos!
  IF NEW.hourly_rate_snapshot IS NULL THEN
    -- Vai na tabela students e descobre o preço que o aluno paga hoje
    SELECT hourly_rate INTO v_rate FROM public.students WHERE id = NEW.student_id;
    -- Grava e congela na aula atual
    NEW.hourly_rate_snapshot := COALESCE(v_rate, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_hourly_rate_snapshot ON public.lessons;
CREATE TRIGGER trg_set_hourly_rate_snapshot
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_hourly_rate_snapshot();


-- ------------------------------------------------------------------------------
-- 3. trg_check_closed_month (O Cadeado do Contador)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_closed_month()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_status TEXT;
  v_owner_id UUID;
BEGIN
  -- Passo 1: Pegar as datas da ação atual (novo cadastro ou exclusão)
  IF TG_OP = 'DELETE' THEN
    v_year := EXTRACT(YEAR FROM OLD.lesson_date);
    v_month := EXTRACT(MONTH FROM OLD.lesson_date);
    v_owner_id := OLD.owner_id;
  ELSE
    v_year := EXTRACT(YEAR FROM NEW.lesson_date);
    v_month := EXTRACT(MONTH FROM NEW.lesson_date);
    v_owner_id := NEW.owner_id;
  END IF;

  -- Passo 2: Ir na tabela de Fechamento de Mês e ver se o mês foi trancado
  SELECT status INTO v_status
  FROM public.monthly_closings
  WHERE owner_id = v_owner_id AND year = v_year AND month = v_month;

  -- Passo 3: Se o status for 'closed', bloqueia imediatamente disparando um Erro fatal
  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'Acesso Negado: O mês %/% já está fechado pelo contador e suas aulas não podem ser alteradas.', v_month, v_year;
  END IF;

  -- Bônus: Se o usuário estiver tentando EDITAR a data de uma aula antiga, o banco verifica a data antiga também.
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

DROP TRIGGER IF EXISTS trg_check_closed_month_lessons ON public.lessons;
CREATE TRIGGER trg_check_closed_month_lessons
  BEFORE INSERT OR UPDATE OR DELETE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_closed_month();

-- ------------------------------------------------------------------------------
-- 4. trg_reactivate_student_on_lesson (Reativação Automática de Aluno)
-- Reativa instantaneamente o aluno para 'active' se uma nova aula for inserida
-- para ele, garantindo atomicidade transacional e reatividade zero atrito
-- ------------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_reactivate_student_on_lesson ON public.lessons;
CREATE TRIGGER trg_reactivate_student_on_lesson
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_reactivate_student_on_lesson();

