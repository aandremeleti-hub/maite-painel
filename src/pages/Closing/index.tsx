import { useState, useMemo, type HTMLAttributes } from 'react';
import { Lock } from 'lucide-react';
import { useDateFilter } from '../../hooks/useDateFilter';
import { useMonthStatus, useCalculateMonthlyTotals } from '../../hooks/useClosing';
import { useStudents } from '../../hooks/useStudents';
import { useLessons, useDeleteLesson, type ILesson } from '../../hooks/useLessons';
import { aggregateClosingData } from './utils/closingAggregator';
import { ClosingKpiGrid } from './components/ClosingKpiGrid';
import { ClosingToolbar } from './components/ClosingToolbar';
import { ClosingTable } from './components/ClosingTable';
import { LessonFormModal } from './components/LessonFormModal';
import { CloseMonthModal } from './components/CloseMonthModal';
import { ReopenMonthModal } from './components/ReopenMonthModal';
import { Badge } from '../../components/ui/Badge';
import styles from './styles.module.css';

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface IClosingPageProps extends HTMLAttributes<HTMLDivElement> {}

export function ClosingPage({ className, ...restProps }: IClosingPageProps) {
  const { selectedYear, selectedMonth, formattedPeriod } = useDateFilter();
  const { data: monthStatus = 'open' } = useMonthStatus(selectedYear, selectedMonth);
  const { data: students = [], isLoading: isStudentsLoading } = useStudents();
  const { data: lessons = [], isLoading: isLessonsLoading } = useLessons(undefined, selectedMonth, selectedYear);
  const { data: totalsData } = useCalculateMonthlyTotals(selectedYear, selectedMonth);
  const deleteLesson = useDeleteLesson();

  const [searchTerm, setSearchTerm] = useState('');
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [lessonToEdit, setLessonToEdit] = useState<ILesson | null>(null);
  const [defaultStudentId, setDefaultStudentId] = useState<string | undefined>(undefined);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  const isClosed = monthStatus === 'closed';
  const isDataLoading = isStudentsLoading || isLessonsLoading;

  const summaries = useMemo(() => aggregateClosingData(students, lessons), [students, lessons]);

  const filteredSummaries = useMemo(() => {
    const term = normalize(searchTerm.trim());
    if (!term) return summaries;
    return summaries.filter((s) => normalize(s.studentName).includes(term));
  }, [summaries, searchTerm]);

  const handleOpenLessonModal = (studentId?: string) => {
    if (isClosed) return;
    setLessonToEdit(null);
    setDefaultStudentId(studentId);
    setIsLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: ILesson) => {
    if (isClosed) return;
    setLessonToEdit(lesson);
    setDefaultStudentId(lesson.student_id);
    setIsLessonModalOpen(true);
  };

  const handleDeleteLesson = (lesson: ILesson) => {
    if (isClosed) return;
    if (window.confirm('Deseja realmente remover esta aula?')) {
      deleteLesson.mutate(lesson.id);
    }
  };

  const containerClasses = [styles.container, className || ''].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <header className={styles.headerSection}>
        <div className={styles.headerTextGroup}>
          <h1 className={styles.pageTitle}>Fechamento Mensal</h1>
          <p className={styles.pageDescription}>
            Apuração de aulas ministradas, cálculo consolidado de receitas e fechamento da competência.
          </p>
        </div>
        <div className={styles.periodHighlight}>
          <span className={styles.periodLabel}>Competência:</span>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
            {formattedPeriod}
          </span>
          <Badge
            variant={isClosed ? 'closed' : 'open'}
            size="sm"
            icon={isClosed ? <Lock size={12} aria-hidden="true" /> : undefined}
            withDot={!isClosed}
          >
            {isClosed ? 'Fechado' : 'Aberto'}
          </Badge>
        </div>
      </header>

      {isClosed && (
        <div className={styles.lockBanner} role="alert">
          <Lock size={20} className={styles.lockBannerIcon} aria-hidden="true" />
          <div className={styles.lockBannerContent}>
            <h2 className={styles.lockBannerTitle}>Competência Contábil Trancada</h2>
            <p className={styles.lockBannerText}>
              Este mês foi selado e está protegido pelo Cadeado Contábil (ADR 0003). Inclusões, edições e
              exclusões de aulas estão bloqueadas. Para alterações, utilize a opção de reabertura.
            </p>
          </div>
        </div>
      )}

      <ClosingKpiGrid year={selectedYear} month={selectedMonth} status={monthStatus} />

      <ClosingToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        monthStatus={monthStatus}
        onAddLesson={() => handleOpenLessonModal()}
        onCloseMonth={() => setIsCloseModalOpen(true)}
        onReopenMonth={() => setIsReopenModalOpen(true)}
      />

      <ClosingTable
        summaries={filteredSummaries}
        isLoading={isDataLoading}
        isMonthClosed={isClosed}
        onEditLesson={handleEditLesson}
        onDeleteLesson={handleDeleteLesson}
        onAddLesson={handleOpenLessonModal}
      />

      <LessonFormModal
        isOpen={isLessonModalOpen}
        onClose={() => {
          setIsLessonModalOpen(false);
          setLessonToEdit(null);
          setDefaultStudentId(undefined);
        }}
        lessonToEdit={lessonToEdit}
        defaultStudentId={defaultStudentId}
        isMonthClosed={isClosed}
        activeYear={selectedYear}
        activeMonth={selectedMonth}
      />

      <CloseMonthModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        year={selectedYear}
        month={selectedMonth}
        totalLessons={totalsData?.total_lessons}
        totalRevenue={totalsData?.total_revenue}
      />

      <ReopenMonthModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        year={selectedYear}
        month={selectedMonth}
      />
    </div>
  );
}

export default ClosingPage;
