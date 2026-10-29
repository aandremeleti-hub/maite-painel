/**
 * Runner Automatizado de Execução Autenticada e Validação Pós-Saneamento
 * Referência: Plano As-Planned Fase 1 (Subetapa 1.3.1) e ADR 0007
 * 
 * Modos de execução:
 *   node scripts/run_deduplication.cjs --dry-run
 *   node scripts/run_deduplication.cjs --live
 *   node scripts/run_deduplication.cjs (executa dry-run seguido de live execution)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CONNECTION_STRING = process.env.DATABASE_URL ||
  'postgresql://postgres:maite-iapi-$@db.rvjfovxsxsbudirwqgtt.supabase.co:5432/postgres';

async function getClient() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function runDryRun(client) {
  console.log('\n========================================');
  console.log('🔄 INICIANDO MODO: DRY-RUN (TESTE SEGURO)');
  console.log('========================================');

  try {
    await client.query('BEGIN;');

    // 1. Contagens iniciais
    const initialStudents = await client.query('SELECT count(*) FROM public.students;');
    const initialLessons = await client.query('SELECT count(*) FROM public.lessons;');

    console.log(`[Dry-Run] Contagem inicial - Students: ${initialStudents.rows[0].count}, Lessons: ${initialLessons.rows[0].count}`);

    // 2. Simulação de desativação de gatilhos
    await client.query('ALTER TABLE public.lessons DISABLE TRIGGER trg_check_closed_month_lessons;');
    await client.query('ALTER TABLE public.lessons DISABLE TRIGGER trg_set_hourly_rate_snapshot;');

    // 3. Simulação da exclusão do lote preliminar
    const delLessons = await client.query(`
      DELETE FROM public.lessons
      WHERE created_at >= '2026-10-07 17:00:00+00'
        AND created_at < '2026-10-07 18:30:00+00';
    `);

    const delStudents = await client.query(`
      DELETE FROM public.students
      WHERE created_at >= '2026-10-07 17:00:00+00'
        AND created_at < '2026-10-07 18:30:00+00';
    `);

    console.log(`[Dry-Run] Linhas afetadas - Lessons removidas: ${delLessons.rowCount}, Students removidos: ${delStudents.rowCount}`);

    // 4. Verificação de contagens pós-exclusão na transação
    const simStudents = await client.query('SELECT count(*) FROM public.students;');
    const simLessons = await client.query('SELECT count(*) FROM public.lessons;');

    console.log(`[Dry-Run] Contagem pós-purga - Students: ${simStudents.rows[0].count}, Lessons: ${simLessons.rows[0].count}`);

    const expectedStudents = 180;
    const expectedLessons = 4834;

    const studentsMatch = parseInt(simStudents.rows[0].count, 10) === expectedStudents;
    const lessonsMatch = parseInt(simLessons.rows[0].count, 10) === expectedLessons;
    const delStudentsMatch = delStudents.rowCount === 180;
    const delLessonsMatch = delLessons.rowCount === 4834;

    if (!studentsMatch || !lessonsMatch || !delStudentsMatch || !delLessonsMatch) {
      throw new Error(`[Dry-Run] Discrepância de contagem! Esperado: 180 alunos e 4834 aulas restantes.`);
    }

    // Reativa gatilhos na sessão
    await client.query('ALTER TABLE public.lessons ENABLE TRIGGER trg_check_closed_month_lessons;');
    await client.query('ALTER TABLE public.lessons ENABLE TRIGGER trg_set_hourly_rate_snapshot;');

    // ROLLBACK MANDATÓRIO DO DRY-RUN
    await client.query('ROLLBACK;');
    console.log('✅ DRY-RUN CONCLUÍDO COM SUCESSO! (ROLLBACK EXECUTADO - BANCO INALTERADO)');
    return true;
  } catch (error) {
    await client.query('ROLLBACK;');
    console.error('❌ ERRO NO DRY-RUN:', error.message);
    throw error;
  }
}

async function runLiveExecution(client) {
  console.log('\n========================================');
  console.log('🚀 INICIANDO MODO: LIVE EXECUTION (PRODUÇÃO)');
  console.log('========================================');

  const sqlFilePath = path.join(__dirname, 'saneamento_deduplicacao_historica.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  try {
    // Execução do script SQL de saneamento
    console.log('[Live] Executando script SQL transacional...');
    await client.query(sql);

    // Auditoria pós-execução
    console.log('[Live] Validando estado físico pós-saneamento no banco...');

    const backupStudents = await client.query('SELECT count(*) FROM public.backup_students_pre_dedup;');
    const backupLessons = await client.query('SELECT count(*) FROM public.backup_lessons_pre_dedup;');
    const finalStudents = await client.query('SELECT count(*) FROM public.students;');
    const finalLessons = await client.query('SELECT count(*) FROM public.lessons;');

    const triggers = await client.query(`
      SELECT tgname, tgenabled
      FROM pg_trigger
      WHERE tgrelid = 'public.lessons'::regclass
        AND tgname IN ('trg_check_closed_month_lessons', 'trg_set_hourly_rate_snapshot');
    `);

    const report = {
      backupStudentsCount: parseInt(backupStudents.rows[0].count, 10),
      backupLessonsCount: parseInt(backupLessons.rows[0].count, 10),
      finalStudentsCount: parseInt(finalStudents.rows[0].count, 10),
      finalLessonsCount: parseInt(finalLessons.rows[0].count, 10),
      triggers: triggers.rows.map(t => ({ name: t.tgname, status: t.tgenabled === 'O' ? 'ACTIVE' : 'INACTIVE' }))
    };

    console.log('\n📊 RELATÓRIO DE AUDITORIA PÓS-SANEAMENTO:');
    console.log(`- Backup de Alunos (backup_students_pre_dedup): ${report.backupStudentsCount} (Esperado: 360)`);
    console.log(`- Backup de Aulas (backup_lessons_pre_dedup):   ${report.backupLessonsCount} (Esperado: 9668)`);
    console.log(`- Alunos Canônicos (students):                 ${report.finalStudentsCount} (Esperado: 180)`);
    console.log(`- Aulas Canônicas (lessons):                   ${report.finalLessonsCount} (Esperado: 4834)`);
    console.log('- Gatilhos de Integridade:');
    report.triggers.forEach(t => console.log(`  * ${t.name}: ${t.status}`));

    if (
      report.backupStudentsCount !== 360 ||
      report.backupLessonsCount !== 9668 ||
      report.finalStudentsCount !== 180 ||
      report.finalLessonsCount !== 4834 ||
      report.triggers.some(t => t.status !== 'ACTIVE')
    ) {
      throw new Error('Falha na verificação de integridade pós-execução!');
    }

    console.log('\n🎉 SANEAMENTO DE PRODUÇÃO EXECUTADO COM 100% DE SUCESSO E SALVAGUARDA ÍNTEGRA!');
    return report;
  } catch (error) {
    console.error('❌ ERRO NA EXECUÇÃO LIVE:', error.message);
    throw error;
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
      await runLiveExecution(client);
    } else {
      // Padrão: primeiro dry-run para segurança absoluta, depois live execution
      console.log('Executando verificação em dois tempos (Dry-run -> Live Execution)...');
      await runDryRun(client);
      await runLiveExecution(client);
    }
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Execução abortada:', err);
  process.exit(1);
});
