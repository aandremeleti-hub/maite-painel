import { useState, useCallback } from 'react';
import type { HTMLAttributes } from 'react';
import { CalendarX, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { ILesson } from '../../../../hooks/useLessons';
import type { IStudentClosingSummary } from '../../utils/closingAggregator';
import { Button } from '../../../../components/ui/Button';
import { ClosingStudentRow } from '../ClosingStudentRow';
import styles from './styles.module.css';

export interface IClosingTableProps extends HTMLAttributes<HTMLDivElement> {
  summaries: IStudentClosingSummary[];
  isLoading?: boolean;
  isMonthClosed?: boolean;
  onEditLesson?: (lesson: ILesson) => void;
  onDeleteLesson?: (lesson: ILesson) => void;
  onAddLesson?: (studentId?: string) => void;
  onViewTimeSheet?: (studentId: string) => void;
}

export function ClosingTable({
  summaries,
  isLoading = false,
  isMonthClosed = false,
  onEditLesson,
  onDeleteLesson,
  onAddLesson,
  onViewTimeSheet,
  className,
  ...restProps
}: IClosingTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(summaries.map((s) => s.studentId)));
  }, [summaries]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const handleToggle = useCallback((studentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  const containerClasses = [styles.tableContainer, className || ''].filter(Boolean).join(' ');

  if (isLoading) {
    return (
      <div className={containerClasses} aria-busy="true" aria-label="Carregando tabela" {...restProps}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonList}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={styles.skeletonRow} />
          ))}
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className={containerClasses} {...restProps}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrapper}>
            <CalendarX size={40} className={styles.emptyIcon} aria-hidden="true" />
          </div>
          <h3 className={styles.emptyTitle}>Nenhuma aula registrada nesta competência</h3>
          <p className={styles.emptyDescription}>
            Lance a primeira aula do mês para apurar o faturamento e gerar os demonstrativos individuais.
          </p>
          <Button
            variant="primary"
            onClick={() => onAddLesson?.()}
            disabled={isMonthClosed}
            leftIcon={<Plus size={16} aria-hidden="true" />}
            title={isMonthClosed ? 'Competência fechada para lançamentos' : 'Registrar primeira aula'}
          >
            Registrar Primeira Aula
          </Button>
        </div>
      </div>
    );
  }

  const allExpanded = summaries.length > 0 && summaries.every((s) => expandedIds.has(s.studentId));

  return (
    <div className={containerClasses} {...restProps}>
      <div className={styles.toolbar}>
        <span className={styles.counterText}>
          <strong>{summaries.length}</strong> {summaries.length === 1 ? 'aluno com aulas' : 'alunos com aulas'}
        </span>

        <div className={styles.batchActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
            leftIcon={
              allExpanded ? (
                <ChevronUp size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )
            }
          >
            {allExpanded ? 'Recolher Todos' : 'Expandir Todos'}
          </Button>
        </div>
      </div>

      <div className={styles.rowsList} role="list">
        {summaries.map((summary) => (
          <ClosingStudentRow
            key={summary.studentId}
            summary={summary}
            isExpanded={expandedIds.has(summary.studentId)}
            onToggle={() => handleToggle(summary.studentId)}
            isMonthClosed={isMonthClosed}
            onEditLesson={onEditLesson}
            onDeleteLesson={onDeleteLesson}
            onAddLesson={onAddLesson}
            onViewTimeSheet={onViewTimeSheet}
          />
        ))}
      </div>
    </div>
  );
}

export default ClosingTable;
