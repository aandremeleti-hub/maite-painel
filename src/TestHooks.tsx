import { useState, useRef } from 'react';
import { toast } from 'sonner';
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
import { generateTimeSheetPDF } from './services/pdfGenerator';

export default function TestHooks() {
  const { user, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error('Informe o e-mail e a senha');
      return;
    }
    setIsLoggingIn(true);
    try {
      await signIn(cleanEmail, password);
      toast.success('Login realizado com sucesso!');
      setPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao autenticar';
      toast.error(`Erro ao fazer login: ${message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.info('Sessão encerrada com sucesso.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao sair';
      toast.error(`Erro ao deslogar: ${message}`);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) {
      toast.error('Elemento para geração de PDF não encontrado');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateTimeSheetPDF(pdfRef.current, 'teste-fase4.pdf');
      toast.success('PDF gerado e download iniciado!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao gerar PDF';
      toast.error(`Erro ao gerar PDF: ${message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>Bancada de Testes - Fase 4 (Lógica Financeira, Fechamento e PDF)</h1>
      <p style={{ color: '#666' }}>Competência de Teste: <strong>{getMonthYearLabel(anoTeste, mesTeste)}</strong></p>
      
      {/* Seção de Autenticação */}
      <section style={{ marginBottom: 24, padding: 16, border: '1px solid #e0e0e0', borderRadius: 8, background: '#fdfdfd' }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Autenticação</h2>
        {!user ? (
          <div>
            <p style={{ color: 'orange', fontWeight: 'bold' }}>
              Você está deslogado. O bloqueio de segurança RLS está ativo e os dados estão invisíveis.
            </p>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 'bold' }}>E-mail:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemplo.com"
                  autoComplete="email"
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 4, fontWeight: 'bold' }}>Senha:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  autoComplete="current-password"
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  padding: '8px 16px',
                  background: '#1f6965',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, color: '#1f6965', fontWeight: 'bold' }}>
              👤 Usuário autenticado: <span style={{ color: '#333' }}>{user.email}</span>
            </p>
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              style={{
                padding: '6px 14px',
                background: isLoggingOut ? '#999' : '#c62828',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        )}
      </section>

      {/* Seção de Teste de PDF */}
      <section style={{ marginBottom: 24, padding: 16, border: '1px solid #c8e6c9', borderRadius: 8, background: '#f1f8e9' }}>
        <h2 style={{ fontSize: 18, marginTop: 0, color: '#2e7d32' }}>Exportação de PDF (html2pdf.js)</h2>
        <p style={{ fontSize: 14, color: '#444' }}>
          Elemento de teste conectado via <code>pdfRef</code>. Clique no botão para disparar <code>generateTimeSheetPDF(pdfRef.current, 'teste-fase4.pdf')</code>.
        </p>

        <div
          ref={pdfRef}
          style={{
            padding: 20,
            background: '#ffffff',
            border: '2px dashed #81c784',
            borderRadius: 6,
            marginBottom: 12,
            color: '#1a1a1a',
          }}
        >
          <div style={{ borderBottom: '2px solid #1f6965', paddingBottom: 10, marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: '#1f6965' }}>Demonstrativo Mensal de Horas e Aulas</h3>
            <span style={{ fontSize: 13, color: '#666' }}>Sistema de Gestão Maite - Relatório de Fechamento</span>
          </div>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginBottom: 12 }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold', width: '35%' }}>Competência:</td>
                <td>{getMonthYearLabel(anoTeste, mesTeste)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Aluno:</td>
                <td>{primeiroAlunoNome}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Status da Competência:</td>
                <td>{statusMes ? statusMes.toUpperCase() : 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Receita Calculada:</td>
                <td>R$ {receitaAluno !== undefined ? Number(receitaAluno).toFixed(2) : '0.00'}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
            * Documento de teste renderizado e capturado via HTML2PDF para validação da Etapa 5 da Fase 4.
          </p>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
          style={{
            padding: '8px 18px',
            background: '#2e7d32',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF de Teste'}
        </button>
      </section>
      
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
