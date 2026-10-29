import { useId } from 'react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { ChevronDown, Plus, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ILesson } from '../../../../hooks/useLessons';
import type { IStudentClosingSummary } from '../../utils/closingAggregator';
import { formatCurrency } from '../../../../lib/formatters';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { ClosingLessonItem } from '../ClosingLessonItem';
import styles from './styles.module.css';

export interface IClosingStudentRowProps extends HTMLAttributes<HTMLDivElement> {
  summary: IStudentClosingSummary;
  isExpanded: boolean;
  onToggle: () => void;
  isMonthClosed?: boolean;
  onEditLesson?: (lesson: ILesson) => void;
  onDeleteLesson?: (lesson: ILesson) => void;
  onAddLesson?: (studentId: string) => void;
  onViewTimeSheet?: (studentId: string) => void;
}

export function ClosingStudentRow({
  summary,
  isExpanded,
  onToggle,
  isMonthClosed = false,
  onEditLesson,
  onDeleteLesson,
  onAddLesson,
  onViewTimeSheet,
  className,
  ...restProps
}: IClosingStudentRowProps) {
  const generatedId = useId();
  const triggerId = `${generatedId}-trigger`;
  const contentId = `${generatedId}-content`;
  const navigate = useNavigate();

  const handleTimeSheetClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onViewTimeSheet) {
      onViewTimeSheet(summary.studentId);
    } else {
      navigate(`/timesheet?studentId=${summary.studentId}`);
    }
  };

  const handleAddLessonClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onAddLesson?.(summary.studentId);
  };

  const lessonCountText = summary.rawLessonsCount === 1 ? '1 aula' : `${summary.rawLessonsCount} aulas`;
  const hoursFormatted = summary.totalHours.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const rowClasses = [
    styles.rowCard,
    isExpanded ? styles.expanded : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClasses} {...restProps}>
      <div
        role="button"
        tabIndex={0}
        id={triggerId}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={styles.headerTrigger}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className={styles.headerLeft}>
          <ChevronDown
            className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
            size={18}
            aria-hidden="true"
          />
          <div className={styles.studentMeta}>
            <span className={styles.studentName}>{summary.studentName}</span>
            {summary.requiresInvoice && (
              <Badge variant="NF" size="sm" title="Emite Nota Fiscal">
                NF
              </Badge>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.lessonsSummary}>
            {lessonCountText} ({hoursFormatted}h)
          </span>

          <span className={styles.totalRevenue}>
            {formatCurrency(summary.totalRevenue)}
          </span>

          <div className={styles.headerActions}>
            <Button
              variant="outline"
              size="sm"
              className={styles.actionBtn}
              onClick={handleTimeSheetClick}
              title="Abrir Time Sheet deste aluno"
              aria-label={`Abrir Time Sheet de ${summary.studentName}`}
              leftIcon={<FileSpreadsheet size={14} aria-hidden="true" />}
            >
              Time Sheet
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={styles.actionBtn}
              onClick={handleAddLessonClick}
              disabled={isMonthClosed}
              title={isMonthClosed ? 'Competência fechada' : 'Adicionar aula para este aluno'}
              aria-label={`Adicionar aula para ${summary.studentName}`}
              leftIcon={<Plus size={14} aria-hidden="true" />}
            >
              + Aula
            </Button>
          </div>
        </div>
      </div>

      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isExpanded}
        className={styles.contentRegion}
      >
        {isExpanded && (
          <div className={styles.lessonsContainer}>
            <div className={styles.tableHeader}>
              <span>Data</span>
              <span>Categoria</span>
              <span className={styles.alignRight}>Tarifa Snapshot</span>
              <span className={styles.alignRight}>Valor Total</span>
              <span>Anotações Pedagógicas</span>
              <span className={styles.alignCenter}>Ações</span>
            </div>

            {summary.lessons.length === 0 ? (
              <div className={styles.emptyLessons}>
                Nenhuma aula registrada para este aluno nesta competência.
              </div>
            ) : (
              summary.lessons.map((lesson) => (
                <ClosingLessonItem
                  key={lesson.id}
                  lesson={lesson}
                  isMonthClosed={isMonthClosed}
                  onEdit={onEditLesson}
                  onDelete={onDeleteLesson}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClosingStudentRow;
