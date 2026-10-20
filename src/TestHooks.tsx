import { useStudents } from './hooks/useStudents';
import { useClosings } from './hooks/useClosings';
import { usePaymentInfo } from './hooks/usePaymentInfo';
import {
  useCalculateMonthlyTotals,
  useStudentMonthlyDetail,
  useStudentMonthlyRevenue,
  useMonthStatus,
  useCloseMonth,
  useReopenMonth,
} from './hooks/useClosing';
import { useAuth } from './hooks/useAuth';
import { getMonthYearLabel } from './lib/dateUtils';

export default function TestHooks() {
  const { user } = useAuth();
  
  // 1. Hooks das Tabelas Base
  const { data: students, isLoading: isLoadingStudents } = useStudents();
  const { data: closings, isLoading: isLoadingClosings } = useClosings();
  const { data: paymentInfo, isLoading: isLoadingPayment } = usePaymentInfo();

  // ==========================================================
  // 2. NOVOS HOOKS DA ETAPA 4 (Testando a Inteligência do Banco)
  // ==========================================================
  
  // Vamos simular que queremos ver o fechamento de Outubro de 2026
  const anoTeste = 2026;
  const mesTeste = 10;
  
  // RPC 1: Calcula o TOTAL DO MÊS de todos os alunos
  const { data: totais, isLoading: isLoadingTotais } = useCalculateMonthlyTotals(anoTeste, mesTeste);
  
  // Pegamos o ID do primeiro aluno da lista apenas para poder simular o extrato dele
  const primeiroAlunoId = students?.[0]?.id;
  const primeiroAlunoNome = students?.[0]?.name ?? 'Nenhum aluno cadastrado';
  
  // RPC 2: Puxa o EXTRATO DE AULAS de um aluno específico para gerar o PDF
  const { data: extratoAluno, isLoading: isLoadingExtrato } = useStudentMonthlyDetail(primeiroAlunoId, anoTeste, mesTeste);

  // RPC 3: Calcula a RECEITA MENSAL de um aluno específico
  const { data: receitaAluno, isLoading: isLoadingReceita } = useStudentMonthlyRevenue(primeiroAlunoId, anoTeste, mesTeste);

  // Status da competência na tabela monthly_closings
  const { data: statusMes, isLoading: isLoadingStatus } = useMonthStatus(anoTeste, mesTeste);

  // RPC 4 & 5: Mutações de Fechamento e Reabertura
  const { mutate: fecharMes, isPending: isClosing } = useCloseMonth();
  const { mutate: reabrirMes, isPending: isReopening } = useReopenMonth();

  const isLoading = isLoadingStudents || isLoadingClosings || isLoadingPayment || isLoadingTotais || isLoadingExtrato || isLoadingReceita || isLoadingStatus;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Teste da Etapa 4 (Lógica Financeira e Fechamento)</h1>
      <p style={{ color: '#666' }}>Competência de Teste: <strong>{getMonthYearLabel(anoTeste, mesTeste)}</strong></p>
      
      {!user && (
        <p style={{ color: 'orange', fontWeight: 'bold' }}>
          Você está deslogado. O bloqueio de segurança RLS está ativo e os dados estão invisíveis.
        </p>
      )}
      
      {isLoading && <p>Fazendo cálculos no banco de dados...</p>}
      
      {user && (
        <>
          <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            <button
              onClick={() => fecharMes({ year: anoTeste, month: mesTeste })}
              disabled={isClosing || statusMes === 'closed'}
              style={{
                padding: '8px 16px',
                background: statusMes === 'closed' ? '#aaa' : '#1f6965',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: statusMes === 'closed' ? 'not-allowed' : 'pointer'
              }}
            >
              {isClosing ? 'Fechando...' : `Fechar Mês ${mesTeste}/${anoTeste}`}
            </button>
            <button
              onClick={() => reabrirMes({ year: anoTeste, month: mesTeste })}
              disabled={isReopening || statusMes === 'open'}
              style={{
                padding: '8px 16px',
                background: statusMes === 'open' ? '#aaa' : '#6e5673',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: statusMes === 'open' ? 'not-allowed' : 'pointer'
              }}
            >
              {isReopening ? 'Reabrindo...' : `Reabrir Mês ${mesTeste}/${anoTeste}`}
            </button>
          </div>

          <h3 style={{ color: statusMes === 'closed' ? 'red' : 'green' }}>
            🔒 Status do Mês ({mesTeste}/${anoTeste}): {statusMes?.toUpperCase()}
          </h3>

          <h3 style={{ color: 'green' }}>✅ RPC 1: Totais Calculados pelo Banco ({mesTeste}/{anoTeste})</h3>
          <p><em>(Hook: useCalculateMonthlyTotals -&gt; RPC: fn_calculate_monthly_totals)</em></p>
          <pre style={{ background: '#f4f4f4', padding: 10, borderRadius: 4 }}>{JSON.stringify(totais, null, 2)}</pre>

          <h3 style={{ color: 'blue' }}>✅ RPC 2: Extrato do 1º Aluno [{primeiroAlunoNome}] ({mesTeste}/{anoTeste})</h3>
          <p><em>(Hook: useStudentMonthlyDetail -&gt; RPC: fn_get_student_monthly_detail)</em></p>
          <pre style={{ background: '#f4f4f4', padding: 10, borderRadius: 4 }}>{JSON.stringify(extratoAluno, null, 2)}</pre>

          <h3 style={{ color: 'purple' }}>✅ RPC 3: Receita Individual do 1º Aluno [{primeiroAlunoNome}] ({mesTeste}/{anoTeste})</h3>
          <p><em>(Hook: useStudentMonthlyRevenue -&gt; RPC: fn_calculate_student_monthly_revenue)</em></p>
          <pre style={{ background: '#f4f4f4', padding: 10, borderRadius: 4 }}>
            {JSON.stringify({ aluno: primeiroAlunoNome, receita_total: receitaAluno }, null, 2)}
          </pre>

          <hr style={{ margin: '20px 0' }}/>
          
          <h3>Dados Bancários PIX</h3>
          <pre style={{ background: '#f4f4f4', padding: 10, borderRadius: 4 }}>{JSON.stringify(paymentInfo, null, 2)}</pre>
          
          <h3>Histórico de Fechamentos (Tabela)</h3>
          <pre style={{ background: '#f4f4f4', padding: 10, borderRadius: 4 }}>{JSON.stringify(closings, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
