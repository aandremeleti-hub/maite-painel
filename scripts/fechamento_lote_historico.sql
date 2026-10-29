-- ==============================================================================
-- Script: fechamento_lote_historico.sql
-- Descrição: Rotina Administrativa de Fechamento Contábil em Lote (Jan/2020 a Ago/2026)
-- Referência: ADR 0003, docs_config/database.md e plans/escopo-atualizacoes-29out_plan.md (Fase 2)
-- Owner ID Oficial: '701bc0b3-cf1a-4b84-ab01-f77cedae2eea' (Professora Maite)
-- ==============================================================================

BEGIN;

-- 1. Validação prévia de existência do perfil
DO $$
DECLARE
  v_owner_id UUID := '701bc0b3-cf1a-4b84-ab01-f77cedae2eea';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_owner_id) THEN
    RAISE EXCEPTION 'Abortando: Perfil do owner % não encontrado em public.profiles.', v_owner_id;
  END IF;
END $$;

-- 2. Fechamento contábil em lote via CTE temporal
WITH months_series AS (
  SELECT 
    '701bc0b3-cf1a-4b84-ab01-f77cedae2eea'::UUID AS owner_id,
    EXTRACT(YEAR FROM s)::INTEGER AS year,
    EXTRACT(MONTH FROM s)::INTEGER AS month,
    s::DATE AS start_date,
    (s + INTERVAL '1 month')::DATE AS end_date
  FROM generate_series('2020-01-01'::DATE, '2026-08-01'::DATE, '1 month'::INTERVAL) AS s
),
monthly_metrics AS (
  SELECT
    m.owner_id,
    m.year,
    m.month,
    COALESCE(SUM(
      CASE 
        WHEN l.category IN ('courtesy', 'cancelled') OR (l.category = 'absence' AND l.charge_absence = false) THEN 0
        ELSE l.multiplier 
      END
    ), 0)::NUMERIC(10,1) AS total_lessons_count,
    COALESCE(SUM(
      CASE 
        WHEN l.category IN ('courtesy', 'cancelled') OR (l.category = 'absence' AND l.charge_absence = false) THEN 0
        ELSE l.hourly_rate_snapshot * l.multiplier 
      END
    ), 0)::NUMERIC(12,2) AS total_revenue
  FROM months_series m
  LEFT JOIN public.lessons l ON l.owner_id = m.owner_id 
                            AND l.lesson_date >= m.start_date 
                            AND l.lesson_date < m.end_date
  -- Guardrail estrito: nunca incluir ou processar Setembro/2026 em diante
  WHERE (m.year < 2026) OR (m.year = 2026 AND m.month <= 8)
  GROUP BY m.owner_id, m.year, m.month
)
INSERT INTO public.monthly_closings (
  owner_id,
  year,
  month,
  total_lessons_count,
  total_revenue,
  status,
  closed_at
)
SELECT 
  owner_id,
  year,
  month,
  total_lessons_count,
  total_revenue,
  'closed'::TEXT AS status,
  NOW() AS closed_at
FROM monthly_metrics
ON CONFLICT (owner_id, year, month)
DO UPDATE SET
  total_lessons_count = EXCLUDED.total_lessons_count,
  total_revenue = EXCLUDED.total_revenue,
  status = 'closed',
  closed_at = NOW();

-- 3. Asserções rigorosas de conformidade contábil e guardrails
DO $$
DECLARE
  v_owner_id UUID := '701bc0b3-cf1a-4b84-ab01-f77cedae2eea';
  v_closed_count INTEGER;
  v_illegal_closed INTEGER;
BEGIN
  -- Validar que exatamente 80 competências (2020-01 a 2026-08) estão registradas como 'closed'
  SELECT COUNT(*) INTO v_closed_count
  FROM public.monthly_closings
  WHERE owner_id = v_owner_id
    AND status = 'closed'
    AND ((year BETWEEN 2020 AND 2025) OR (year = 2026 AND month <= 8));

  IF v_closed_count != 80 THEN
    RAISE EXCEPTION 'Validação contábil violada: Esperado 80 meses fechados, encontrado: %', v_closed_count;
  END IF;

  -- Validar que nenhuma competência >= 2026-09 foi fechada
  SELECT COUNT(*) INTO v_illegal_closed
  FROM public.monthly_closings
  WHERE owner_id = v_owner_id
    AND status = 'closed'
    AND ((year = 2026 AND month >= 9) OR (year > 2026));

  IF v_illegal_closed > 0 THEN
    RAISE EXCEPTION 'Validação de guardrail violada: Existem % meses fechados indevidamente em/após 2026-09!', v_illegal_closed;
  END IF;

  RAISE NOTICE 'Fechamento em lote concluído com sucesso: 80 competências seladas (Jan/2020 a Ago/2026).';
END $$;

COMMIT;
