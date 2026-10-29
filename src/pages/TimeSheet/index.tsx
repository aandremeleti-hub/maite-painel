import { useMemo, useRef } from 'react';
import type { HTMLAttributes } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, CalendarX, Loader2 } from 'lucide-react';
import { useDateFilter } from '../../hooks/useDateFilter';
import { useStudents } from '../../hooks/useStudents';
import { useStudentMonthlyDetail } from '../../hooks/useClosing';
import { usePaymentInfo } from '../../hooks/usePaymentInfo';
import { TimeSheetToolbar } from './components/TimeSheetToolbar';
import { TimeSheetDocument } from './components/TimeSheetDocument';
import styles from './styles.module.css';

export interface ITimeSheetPageProps extends HTMLAttributes<HTMLDivElement> {}

export function TimeSheetPage({ className, ...restProps }: ITimeSheetPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const { selectedYear, selectedMonth } = useDateFilter();
  const { data: students = [], isLoading: isLoadingStudents } = useStudents();
  const { data: paymentInfoList = [] } = usePaymentInfo();

  const studentId = searchParams.get('studentId') || '';
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId]
  );

  const { data: lessons = [], isLoading: isLoadingLessons } = useStudentMonthlyDetail(
    studentId || undefined,
    selectedYear,
    selectedMonth
  );

  const defaultPayment = useMemo(
    () => paymentInfoList.find((p) => p.is_default) || paymentInfoList[0] || null,
    [paymentInfoList]
  );
  const hasPaymentInfo = Boolean(defaultPayment?.pix_key);

  const handleSelectStudent = (nextId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextId) {
          next.set('studentId', nextId);
        } else {
          next.delete('studentId');
        }
        return next;
      },
      { replace: false }
    );
  };

  const containerClasses = [styles.container, className || ''].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <header className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Time Sheet</h1>
        <p className={styles.pageDescription}>
          Geração de demonstrativos mensais e exportação de faturas em PDF para os responsáveis.
        </p>
      </header>

      <TimeSheetToolbar
        className={styles.toolbar}
        students={students}
        selectedStudentId={studentId}
        onSelectStudent={handleSelectStudent}
        documentRef={printAreaRef}
        hasLessons={lessons.length > 0}
        hasPaymentInfo={hasPaymentInfo}
      />

      <section className={styles.previewViewport} aria-label="Mesa de visualização do documento">
        {isLoadingStudents || (studentId && isLoadingLessons) ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={32} aria-hidden="true" />
            <p className={styles.loadingText}>Carregando dados do demonstrativo...</p>
          </div>
        ) : !studentId ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Users size={32} aria-hidden="true" />
            </div>
            <h2 className={styles.emptyTitle}>Nenhum aluno selecionado</h2>
            <p className={styles.emptyText}>
              Selecione um aluno acima para visualizar o demonstrativo mensal e emitir o documento de cobrança.
            </p>
          </div>
        ) : lessons.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <CalendarX size={32} aria-hidden="true" />
            </div>
            <h2 className={styles.emptyTitle}>Nenhuma aula nesta competência</h2>
            <p className={styles.emptyText}>
              Não foram encontradas aulas ministradas para {selectedStudent?.name || 'este aluno'} no período selecionado.
            </p>
          </div>
        ) : selectedStudent ? (
          <TimeSheetDocument
            ref={printAreaRef}
            student={selectedStudent}
            lessons={lessons}
            year={selectedYear}
            month={selectedMonth}
            paymentInfo={defaultPayment}
          />
        ) : null}
      </section>
    </div>
  );
}

export default TimeSheetPage;
