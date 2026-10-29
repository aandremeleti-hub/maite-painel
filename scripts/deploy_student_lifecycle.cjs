/**
 * ==============================================================================
 * Runner: deploy_student_lifecycle.cjs
 * Descrição: Deploy e Validação da RPC de Ciclo de Vida e Trigger Atômica de Reativação
 * Referência: ADR 0006, Fase 3 (Subetapas 3.1.1 e 3.2.1) do plano escopo-atualizacoes-29out_plan.md
 * 
 * Modos de execução:
 *   node scripts/deploy_student_lifecycle.cjs --dry-run
 *   node scripts/deploy_student_lifecycle.cjs --live
 *   node scripts/deploy_student_lifecycle.cjs (executa dry-run seguido de live execution)
 * ==============================================================================
 */

const { Client } = require('pg');

const OWNER_ID = '701bc0b3-cf1a-4b84-ab01-f77cedae2eea';
const CONNECTION_STRING = process.env.DATABASE_URL ||
  'postgresql://postgres:maite-iapi-$@db.rvjfovxsxsbudirwqgtt.supabase.co:5432/postgres';

const SQL_RPC_SYNC_INACTIVE = `
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
  -- Validação de segurança: previne IDOR exigindo compatibilidade com auth.uid()
  -- Permite execução direta por superuser/service_role em rotinas de manutenção
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
`;

const SQL_TRIGGER_REACTIVATE = `
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
`;

async function getClient() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function runDryRun(client) {
  console.log('\n================================================================');
  console.log('🔄 INICIANDO MODO: DRY-RUN (SIMULAÇÃO SEGURA COM ROLLBACK)');
  console.log('================================================================');

  try {
    await client.query('BEGIN;');

    // 1. Auditoria prévia do estado dos alunos
    const preCount = await client.query(`
      SELECT status, count(*)::int as total
      FROM public.students
      WHERE owner_id = $1
      GROUP BY status
      ORDER BY status;
    `, [OWNER_ID]);
    console.log('[Dry-Run] Distribuição de alunos ANTES da sincronização:');
    console.table(preCount.rows);

    // 2. Aplicar DDLs da RPC e Trigger na transação isolada
    await client.query(SQL_RPC_SYNC_INACTIVE);
    console.log('✔ [Dry-Run] RPC public.fn_sync_inactive_students compilada.');

    await client.query(SQL_TRIGGER_REACTIVATE);
    console.log('✔ [Dry-Run] Trigger public.trg_reactivate_student_on_lesson compilada.');

    // 3. Executar chamada da RPC para inativação dos 90 dias
    const rpcRes = await client.query(
      `SELECT public.fn_sync_inactive_students($1) AS inativados;`,
      [OWNER_ID]
    );
    const inativados = rpcRes.rows[0].inativados;
    console.log(`\n✔ [Dry-Run] RPC fn_sync_inactive_students executada: ${inativados} alunos inativados.`);

    // 4. Distribuição pós-sincronização
    const postCount = await client.query(`
      SELECT status, count(*)::int as total
      FROM public.students
      WHERE owner_id = $1
      GROUP BY status
      ORDER BY status;
    `, [OWNER_ID]);
    console.log('\n[Dry-Run] Distribuição de alunos APÓS a sincronização:');
    console.table(postCount.rows);

    // 5. Teste da Trigger de Reativação Atômica
    // Localizar um aluno que agora está inativo
    const inactiveStudentRes = await client.query(`
      SELECT id, name, hourly_rate
      FROM public.students
      WHERE owner_id = $1 AND status = 'inactive'
      LIMIT 1;
    `, [OWNER_ID]);

    if (inactiveStudentRes.rows.length === 0) {
      throw new Error('Nenhum aluno inativo disponível para testar a trigger de reativação.');
    }

    const testStudent = inactiveStudentRes.rows[0];
    console.log(`\n[Dry-Run] Testando trigger com aluno inativo: "${testStudent.name}" (${testStudent.id})`);

    // Inserir aula teste em competência aberta (Outubro/2026)
    const testLessonDate = '2026-10-15';
    const insertLessonRes = await client.query(`
      INSERT INTO public.lessons (
        student_id, owner_id, lesson_date, category, multiplier, charge_absence, content_notes, hourly_rate_snapshot
      ) VALUES (
        $1, $2, $3, 'standard', 1.0, true, '[TESTE DRY RUN TRIGGER REATIVACAO]', $4
      ) RETURNING id;
    `, [testStudent.id, OWNER_ID, testLessonDate, testStudent.hourly_rate]);

    const testLessonId = insertLessonRes.rows[0].id;
    console.log(`✔ [Dry-Run] Aula teste inserida com sucesso (ID: ${testLessonId}).`);

    // Checar se o aluno foi imediatamente reativado para 'active'
    const checkStudentRes = await client.query(`
      SELECT id, name, status, updated_at
      FROM public.students
      WHERE id = $1;
    `, [testStudent.id]);

    const updatedStudent = checkStudentRes.rows[0];
    console.log(`✔ [Dry-Run] Status do aluno pós-inserção de aula: status='${updatedStudent.status}'`);

    if (updatedStudent.status !== 'active') {
      throw new Error(`Falha na trigger: status do aluno esperado 'active', mas encontrado '${updatedStudent.status}'`);
    }

    console.log('✔ [Dry-Run] Prova de atomicidade confirmada com sucesso: Trigger reativou o aluno perfeitamente!');

    await client.query('ROLLBACK;');
    console.log('\n================================================================');
    console.log('✅ DRY-RUN CONCLUÍDO COM SUCESSO! ROLLBACK EXECUTADO (BANCO INTACTO).');
    console.log('================================================================\n');
    return { success: true, inativadosPrevistos: inativados };
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('❌ ERRO NO DRY-RUN:', err.message);
    throw err;
  }
}

async function runLive(client) {
  console.log('\n================================================================');
  console.log('🚀 INICIANDO MODO: LIVE EXECUTION (APLICAÇÃO PERMANENTE NO BANCO)');
  console.log('================================================================');

  try {
    await client.query('BEGIN;');

    // 1. Criar RPC e Trigger
    console.log('[Live] Compilando RPC public.fn_sync_inactive_students...');
    await client.query(SQL_RPC_SYNC_INACTIVE);

    console.log('[Live] Compilando Trigger public.trg_reactivate_student_on_lesson...');
    await client.query(SQL_TRIGGER_REACTIVATE);

    // 2. Executar sincronização oficial dos 90 dias
    console.log('[Live] Executando sincronização inicial dos 90 dias via RPC...');
    const rpcRes = await client.query(
      `SELECT public.fn_sync_inactive_students($1) AS inativados;`,
      [OWNER_ID]
    );
    const inativados = rpcRes.rows[0].inativados;
    console.log(`✔ [Live] Sincronização concluída: ${inativados} alunos inativados.`);

    // 3. Validação do novo panorama de alunos
    const countRes = await client.query(`
      SELECT status, count(*)::int as total
      FROM public.students
      WHERE owner_id = $1
      GROUP BY status
      ORDER BY status;
    `, [OWNER_ID]);
    console.log('\n[Live] Censo Cadastral Atualizado:');
    console.table(countRes.rows);

    // 4. Teste Atômico de Validação da Trigger em Produção (com reversão cirúrgica)
    const inactiveSample = await client.query(`
      SELECT id, name, hourly_rate
      FROM public.students
      WHERE owner_id = $1 AND status = 'inactive'
      LIMIT 1;
    `, [OWNER_ID]);

    if (inactiveSample.rows.length > 0) {
      const sample = inactiveSample.rows[0];
      console.log(`\n[Live QA] Testando trigger com aluno inativo: "${sample.name}"`);

      // Inserir aula teste
      const testLessonRes = await client.query(`
        INSERT INTO public.lessons (
          student_id, owner_id, lesson_date, category, multiplier, charge_absence, content_notes, hourly_rate_snapshot
        ) VALUES (
          $1, $2, '2026-10-20', 'standard', 1.0, true, '[QA PRODUCTION TEST - REVERTIBLE]', $3
        ) RETURNING id;
      `, [sample.id, OWNER_ID, sample.hourly_rate]);
      const qaLessonId = testLessonRes.rows[0].id;

      // Conferir reativação
      const checkReactivated = await client.query(`SELECT status FROM public.students WHERE id = $1;`, [sample.id]);
      console.log(`✔ [Live QA] Status pós-aula: '${checkReactivated.rows[0].status}' (reation triggered successfully).`);

      if (checkReactivated.rows[0].status !== 'active') {
        throw new Error('Falha no teste live da trigger de reativação.');
      }

      // Remover aula de teste e restaurar status do aluno para 'inactive'
      await client.query(`DELETE FROM public.lessons WHERE id = $1;`, [qaLessonId]);
      await client.query(`UPDATE public.students SET status = 'inactive' WHERE id = $1;`, [sample.id]);
      console.log('✔ [Live QA] Aula de teste removida e status do aluno restaurado com perfeição.');
    }

    // 5. Commit definitivo
    await client.query('COMMIT;');

    console.log('\n================================================================');
    console.log('🎉 DEPLOY CONCLUÍDO COM SUCESSO E COMITADO NO POSTGRESQL SUPABASE!');
    console.log('================================================================\n');
    return { success: true, inativados };
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('❌ ERRO NO LIVE DEPLOY:', err.message);
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRunOnly = args.includes('--dry-run');
  const isLiveOnly = args.includes('--live');

  const client = await getClient();

  try {
    if (isDryRunOnly) {
      await runDryRun(client);
    } else if (isLiveOnly) {
      await runLive(client);
    } else {
      // Padrão de Engenharia STARTMEDIA: Executa Dry-Run primeiro, se passar, executa Live
      console.log('Iniciando esteira completa: DRY-RUN seguido de LIVE EXECUTION...');
      await runDryRun(client);
      await runLive(client);
    }
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Processo abortado com falha:', err);
  process.exit(1);
});
