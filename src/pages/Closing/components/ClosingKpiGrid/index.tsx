import { useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import { DollarSign, GraduationCap, Users, Lock, LockOpen } from 'lucide-react';
import { useDateFilter } from '../../../../hooks/useDateFilter';
import { useCalculateMonthlyTotals, useMonthStatus } from '../../../../hooks/useClosing';
import { useLessons } from '../../../../hooks/useLessons';
import { formatCurrency } from '../../../../lib/formatters';
import { Badge } from '../../../../components/ui/Badge';
import { ClosingKpiCard } from '../ClosingKpiCard';
import styles from './styles.module.css';

export interface IClosingKpiGridProps extends HTMLAttributes<HTMLDivElement> {
  year?: number;
  month?: number;
  status?: 'open' | 'closed';
  attendedStudentsCount?: number;
}

function formatLessonsCount(total: number): string {
  if (total === 1) return '1 aula';
  const formatted = total % 1 === 0
    ? String(total)
    : total.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return `${formatted} aulas`;
}

function formatStudentsCount(count: number): string {
  return `${count} ${count === 1 ? 'aluno' : 'alunos'}`;
}

export function ClosingKpiGrid({
  year,
  month,
  status: propStatus,
  attendedStudentsCount,
  className,
  ...restProps
}: IClosingKpiGridProps) {
  const { selectedYear, selectedMonth } = useDateFilter();

  const effectiveYear = year ?? selectedYear;
  const effectiveMonth = month ?? selectedMonth;

  const { data: totalsData, isLoading: isTotalsLoading } = useCalculateMonthlyTotals(
    effectiveYear,
    effectiveMonth,
  );

  const { data: monthStatus, isLoading: isStatusLoading } = useMonthStatus(
    effectiveYear,
    effectiveMonth,
  );

  const { data: lessons = [], isLoading: isLessonsLoading } = useLessons(
    undefined,
    effectiveMonth,
    effectiveYear,
  );

  const resolvedAttendedCount = useMemo(() => {
    if (attendedStudentsCount !== undefined) return attendedStudentsCount;
    return new Set(lessons.map((lesson) => lesson.student_id)).size;
  }, [attendedStudentsCount, lessons]);

  const effectiveStatus = propStatus ?? monthStatus ?? 'open';
  const isClosed = effectiveStatus === 'closed';

  const isGlobalLoading =
    isTotalsLoading ||
    (propStatus === undefined && isStatusLoading) ||
    (attendedStudentsCount === undefined && isLessonsLoading);

  const gridClasses = [styles.grid, className || ''].filter(Boolean).join(' ');

  return (
    <div className={gridClasses} {...restProps}>
      {/* 1. Faturamento da Competência */}
      <ClosingKpiCard
        title="Faturamento da Competência"
        value={formatCurrency(totalsData?.total_revenue)}
        icon={<DollarSign size={20} />}
        variant="primary"
        description="Receita faturada da competência"
        isLoading={isGlobalLoading}
      />

      {/* 2. Total de Aulas Apuradas */}
      <ClosingKpiCard
        title="Total de Aulas Apuradas"
        value={formatLessonsCount(totalsData?.total_lessons ?? 0)}
        icon={<GraduationCap size={20} />}
        variant="secondary"
        description="Aulas e reposições contabilizadas"
        isLoading={isGlobalLoading}
      />

      {/* 3. Alunos Atendidos */}
      <ClosingKpiCard
        title="Alunos Atendidos"
        value={formatStudentsCount(resolvedAttendedCount)}
        icon={<Users size={20} />}
        variant="neutral"
        description="Estudantes com aulas no mês"
        isLoading={isGlobalLoading}
      />

      {/* 4. Status da Competência */}
      <ClosingKpiCard
        title="Status da Competência"
        value={isClosed ? 'Fechada' : 'Aberta'}
        badge={
          <Badge
            variant={isClosed ? 'closed' : 'open'}
            size="sm"
            withDot
            icon={isClosed ? <Lock size={12} /> : <LockOpen size={12} />}
          >
            {isClosed ? 'Trancada' : 'Aberta'}
          </Badge>
        }
        icon={isClosed ? <Lock size={20} /> : <LockOpen size={20} />}
        variant={isClosed ? 'warning' : 'success'}
        description={isClosed ? 'Cadeado contábil ativado' : 'Aberta para lançamentos'}
        isLoading={isGlobalLoading}
      />
    </div>
  );
}
