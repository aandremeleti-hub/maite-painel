/**
 * ==============================================================================
 * Runner: run_batch_closing.cjs
 * Descrição: Executor Autenticado de Fechamento Contábil em Lote (Jan/2020 a Ago/2026)
 * Referência: ADR 0003, docs_config/database.md e plans/escopo-atualizacoes-29out_plan.md (Fase 2)
 * 
 * Modos de execução:
 *   node scripts/run_batch_closing.cjs --dry-run
 *   node scripts/run_batch_closing.cjs --live
 *   node scripts/run_batch_closing.cjs (executa dry-run seguido de live execution)
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const OWNER_ID = '701bc0b3-cf1a-4b84-ab01-f77cedae2eea';
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

/**
 * Executa o cálculo e fechamento dentro de uma transação temporária revertida por ROLLBACK
 */
async function runDryRun(client) {
  console.log('\n================================================================');
  console.log('🔄 INICIANDO MODO: DRY-RUN (SIMULAÇÃO SEGURA COM ROLLBACK)');
  console.log('================================================================');

  try {
    await client.query('BEGIN;');

    // 1. Verificar estado antes da simulação
    const initialClosings = await client.query(
      `SELECT count(*) FROM public.monthly_closings WHERE owner_id = $1 AND status = 'closed';`,
      [OWNER_ID]
    );
    console.log(`[Dry-Run] Competências fechadas antes da rotina: ${initialClosings.rows[0].count}`);

    // 2. Executar o cálculo e inserção na transação simulada
    const sqlPath = path.join(__dirname, 'fechamento_lote_historico.sql');
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Substituir BEGIN/COMMIT por bloco neutro para controlar no runner
    sqlContent = sqlContent.replace(/\bBEGIN;\b/gi, '-- BEGIN;').replace(/\bCOMMIT;\b/gi, '-- COMMIT;');

    await client.query(sqlContent);

    // 3. Validação das competências geradas
    const resSummary = await client.query(`
      SELECT 
        year,
        count(*) as total_months,
        sum(total_lessons_count) as year_lessons,
        sum(total_revenue) as year_revenue
      FROM public.monthly_closings
      WHERE owner_id = $1 AND status = 'closed'
      GROUP BY year
      ORDER BY year;
    `, [OWNER_ID]);

    console.log('\n[Dry-Run] Matriz de Competências Simuladas por Ano:');
    console.table(resSummary.rows.map(r => ({
      Ano: r.year,
      'Meses Fechados': r.total_months,
      'Total Aulas': Number(r.year_lessons).toFixed(1),
      'Receita (R$)': Number(r.year_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    })));

    const totalClosed = await client.query(`
      SELECT count(*) as total
      FROM public.monthly_closings
      WHERE owner_id = $1 
        AND status = 'closed'
        AND ((year BETWEEN 2020 AND 2025) OR (year = 2026 AND month <= 8));
    `, [OWNER_ID]);

    const illegalCheck = await client.query(`
      SELECT count(*) as total
      FROM public.monthly_closings
      WHERE owner_id = $1 
        AND status = 'closed'
        AND ((year = 2026 AND month >= 9) OR (year > 2026));
    `, [OWNER_ID]);

    const countClosed = parseInt(totalClosed.rows[0].total, 10);
    const countIllegal = parseInt(illegalCheck.rows[0].total, 10);

    console.log(`[Dry-Run] Total de meses históricos fechados: ${countClosed} (Esperado: 80)`);
    console.log(`[Dry-Run] Total de meses fechados >= 2026-09: ${countIllegal} (Esperado: 0)`);

    if (countClosed !== 80 || countIllegal !== 0) {
      throw new Error(`[Dry-Run] Falha nas asserções! Fechados: ${countClosed}, Ilegais: ${countIllegal}`);
    }

    // Reverte a simulação
    await client.query('ROLLBACK;');
    console.log('✅ DRY-RUN CONCLUÍDO COM SUCESSO! (ROLLBACK EFETUADO COM SEGURANÇA)');
    return true;
  } catch (error) {
    await client.query('ROLLBACK;');
    console.error('❌ ERRO NO DRY-RUN:', error.message);
    throw error;
  }
}

/**
 * Executa o script definitivo contra o banco de dados e confirma com COMMIT
 */
async function runLiveExecution(client) {
  console.log('\n================================================================');
  console.log('🚀 INICIANDO MODO: LIVE EXECUTION (PERSISTÊNCIA EM PRODUÇÃO)');
  console.log('================================================================');

  const sqlPath = path.join(__dirname, 'fechamento_lote_historico.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('[Live] Aplicando fechamento_lote_historico.sql...');
  await client.query(sqlContent);
  console.log('✅ Script executado com COMMIT persistido no banco de dados!');

  // Realizar auditoria pós-execução
  await auditAndReport(client);
}

/**
 * Auditoria analítica completa e teste de rejeição do gatilho contábil
 */
async function auditAndReport(client) {
  console.log('\n================================================================');
  console.log('📊 AUDITORIA ANALÍTICA DE PÓS-FECHAMENTO');
  console.log('================================================================');

  // 1. Resumo por ano
  const resYearly = await client.query(`
    SELECT 
      year,
      count(*) as months_count,
      sum(total_lessons_count) as total_lessons,
      sum(total_revenue) as total_revenue
    FROM public.monthly_closings
    WHERE owner_id = $1 AND status = 'closed'
    GROUP BY year
    ORDER BY year;
  `, [OWNER_ID]);

  console.log('\nMatriz de Competências Fechadas por Ano:');
  console.table(resYearly.rows.map(r => ({
    Ano: r.year,
    'Meses Fechados': r.months_count,
    'Total Aulas': Number(r.total_lessons).toFixed(1),
    'Receita Bruta (R$)': Number(r.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  })));

  // 2. Total geral histórico
  const resTotals = await client.query(`
    SELECT 
      count(*) as total_months,
      sum(total_lessons_count) as total_lessons,
      sum(total_revenue) as total_revenue
    FROM public.monthly_closings
    WHERE owner_id = $1 
      AND status = 'closed'
      AND ((year BETWEEN 2020 AND 2025) OR (year = 2026 AND month <= 8));
  `, [OWNER_ID]);

  console.log(`\nConsolidação Geral do Período Histórico (Jan/2020 a Ago/2026):`);
  console.log(`- Total de meses fechados: ${resTotals.rows[0].total_months}`);
  console.log(`- Total de aulas faturadas: ${Number(resTotals.rows[0].total_lessons).toFixed(1)}`);
  console.log(`- Faturamento bruto consolidado: R$ ${Number(resTotals.rows[0].total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // 3. Status das competências abertas (Set/2026 e Out/2026)
  const resOpen = await client.query(`
    SELECT year, month, status, total_lessons_count, total_revenue
    FROM public.monthly_closings
    WHERE owner_id = $1 AND ((year = 2026 AND month >= 9) OR year > 2026)
    ORDER BY year, month;
  `, [OWNER_ID]);

  console.log('\nStatus das Competências Atuais (2026-09 em diante):');
  if (resOpen.rows.length === 0) {
    console.log('-> Nenhuma linha encontrada em monthly_closings (Comportamento padrão: ABERTO)');
  } else {
    console.table(resOpen.rows);
  }

  // 4. Teste Empírico do Gatilho trg_check_closed_month_lessons (Cadeado Contábil)
  console.log('\n----------------------------------------------------------------');
  console.log('🔒 TESTE DE REJEIÇÃO DO GATILHO CONTÁBIL (trg_check_closed_month_lessons)');
  console.log('----------------------------------------------------------------');

  // Buscar uma aula histórica real para testar mutação
  const sampleLesson = await client.query(`
    SELECT id, student_id, lesson_date, category, multiplier, hourly_rate_snapshot
    FROM public.lessons
    WHERE owner_id = $1 AND lesson_date >= '2024-05-01' AND lesson_date <= '2024-05-31'
    LIMIT 1;
  `, [OWNER_ID]);

  if (sampleLesson.rows.length === 0) {
    throw new Error('Não foi possível encontrar aula de amostragem em 2024-05 para o teste do cadeado.');
  }

  const lesson = sampleLesson.rows[0];
  console.log(`[Teste Cadeado] Aula selecionada: ID ${lesson.id} em ${lesson.lesson_date.toISOString().split('T')[0]}`);

  // Teste de UPDATE bloqueado
  await client.query('BEGIN;');
  let updateBlocked = false;
  let updateErrorMessage = '';

  try {
    await client.query(`
      UPDATE public.lessons 
      SET content_notes = 'Tentativa não autorizada de alteração em mês fechado'
      WHERE id = $1;
    `, [lesson.id]);
  } catch (err) {
    updateBlocked = true;
    updateErrorMessage = err.message;
  } finally {
    await client.query('ROLLBACK;');
  }

  if (updateBlocked) {
    console.log(`✅ [UPDATE REJEITADO] Gatilho disparou com sucesso: "${updateErrorMessage}"`);
  } else {
    throw new Error('❌ FALHA CRÍTICA: O UPDATE em mês fechado NÃO foi bloqueado pelo gatilho!');
  }

  // Teste de INSERT bloqueado
  await client.query('BEGIN;');
  let insertBlocked = false;
  let insertErrorMessage = '';

  try {
    await client.query(`
      INSERT INTO public.lessons (
        student_id, owner_id, lesson_date, category, multiplier, hourly_rate_snapshot
      ) VALUES (
        $1, $2, '2024-05-15', 'standard', 1.0, 60.00
      );
    `, [lesson.student_id, OWNER_ID]);
  } catch (err) {
    insertBlocked = true;
    insertErrorMessage = err.message;
  } finally {
    await client.query('ROLLBACK;');
  }

  if (insertBlocked) {
    console.log(`✅ [INSERT REJEITADO] Gatilho disparou com sucesso: "${insertErrorMessage}"`);
  } else {
    throw new Error('❌ FALHA CRÍTICA: O INSERT em mês fechado NÃO foi bloqueado pelo gatilho!');
  }

  console.log('================================================================');
  console.log('🎉 AUDITORIA COMPLETA: CADEADO CONTÁBIL 100% OPERACIONAL!');
  console.log('================================================================\n');
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
      // Padrão: Dry-Run seguido de Live Execution
      await runDryRun(client);
      await runLiveExecution(client);
    }
  } catch (err) {
    console.error('ERRO FATAL NA EXECUÇÃO:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
