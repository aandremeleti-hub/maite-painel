-- ==============================================================================
-- SCRIPT DE SANEAMENTO E DEDUPLICAÇÃO HISTÓRICA - BANCO DE PRODUÇÃO
-- Referência: ADR 0007 / Plano As-Planned (Fase 1: Etapas 1.1, 1.2 e 1.3)
-- Objetivo: Purgar lote preliminar (17:49) e consolidar lote canônico (19:14)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- ETAPA 1.1: ESTRUTURAÇÃO DAS TABELAS FÍSICAS DE SALVAGUARDA (BACKUP PRÉVIO)
-- Preservação irrestrita do estado anterior: 360 alunos e 9.668 aulas
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backup_students_pre_dedup AS TABLE public.students;
CREATE TABLE IF NOT EXISTS public.backup_lessons_pre_dedup AS TABLE public.lessons;

-- ------------------------------------------------------------------------------
-- ETAPA 1.2: TRANSAÇÃO ATÔMICA DE PURGA E REVALIDAÇÃO
-- ------------------------------------------------------------------------------
BEGIN;

-- Subetapa 1.2.1: Desativação temporária dos gatilhos de integridade e snapshot
ALTER TABLE public.lessons DISABLE TRIGGER trg_check_closed_month_lessons;
ALTER TABLE public.lessons DISABLE TRIGGER trg_set_hourly_rate_snapshot;

-- Subetapa 1.2.2: Purga cirúrgica do lote preliminar redundante (07/10/2026 ~17:49)
DELETE FROM public.lessons
WHERE created_at >= '2026-10-07 17:00:00+00'
  AND created_at < '2026-10-07 18:30:00+00';

DELETE FROM public.students
WHERE created_at >= '2026-10-07 17:00:00+00'
  AND created_at < '2026-10-07 18:30:00+00';

-- Subetapa 1.2.3: Reativação imediata dos gatilhos de integridade
ALTER TABLE public.lessons ENABLE TRIGGER trg_check_closed_month_lessons;
ALTER TABLE public.lessons ENABLE TRIGGER trg_set_hourly_rate_snapshot;

-- Auditoria e asserção com RAISE EXCEPTION forçando rollback total caso haja anomalia
DO $$
DECLARE
  v_students_count INTEGER;
  v_lessons_count INTEGER;
  v_backup_students_count INTEGER;
  v_backup_lessons_count INTEGER;
  v_active_triggers INTEGER;
BEGIN
  SELECT count(*) INTO v_students_count FROM public.students;
  SELECT count(*) INTO v_lessons_count FROM public.lessons;
  SELECT count(*) INTO v_backup_students_count FROM public.backup_students_pre_dedup;
  SELECT count(*) INTO v_backup_lessons_count FROM public.backup_lessons_pre_dedup;

  -- 1. Validação da Salvaguarda Física
  IF v_backup_students_count <> 360 THEN
    RAISE EXCEPTION 'FALHA DE SALVAGUARDA: backup_students_pre_dedup possui % registros (esperado: 360). Abortando.', v_backup_students_count;
  END IF;

  IF v_backup_lessons_count <> 9668 THEN
    RAISE EXCEPTION 'FALHA DE SALVAGUARDA: backup_lessons_pre_dedup possui % registros (esperado: 9668). Abortando.', v_backup_lessons_count;
  END IF;

  -- 2. Validação da Base Canônica
  IF v_students_count <> 180 THEN
    RAISE EXCEPTION 'FALHA DE INTEGRIDADE: students possui % registros (esperado: 180). Abortando.', v_students_count;
  END IF;

  IF v_lessons_count <> 4834 THEN
    RAISE EXCEPTION 'FALHA DE INTEGRIDADE: lessons possui % registros (esperado: 4834). Abortando.', v_lessons_count;
  END IF;

  -- 3. Validação do Estado dos Gatilhos
  SELECT count(*) INTO v_active_triggers
  FROM pg_trigger
  WHERE tgrelid = 'public.lessons'::regclass
    AND tgname IN ('trg_check_closed_month_lessons', 'trg_set_hourly_rate_snapshot')
    AND tgenabled = 'O';

  IF v_active_triggers <> 2 THEN
    RAISE EXCEPTION 'FALHA DE SEGURANÇA: Gatilhos de integridade não foram reativados com sucesso. Abortando.';
  END IF;

  RAISE NOTICE 'AUDITORIA APROVADA: Salvaguarda (360/9668), Canônico (180/4834), Gatilhos Ativos.';
END $$;

COMMIT;
