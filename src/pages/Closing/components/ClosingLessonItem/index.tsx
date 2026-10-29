import type { HTMLAttributes } from 'react';
import { Pencil, Trash2, FileText } from 'lucide-react';
import type { ILesson } from '../../../../hooks/useLessons';
import { calculateLessonValue } from '../../utils/closingAggregator';
import { formatDateBR, formatCurrency } from '../../../../lib/formatters';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import styles from './styles.module.css';

export interface IClosingLessonItemProps extends HTMLAttributes<HTMLDivElement> {
  lesson: ILesson;
  isMonthClosed?: boolean;
  onEdit?: (lesson: ILesson) => void;
  onDelete?: (lesson: ILesson) => void;
}

function renderCategoryBadge(lesson: ILesson) {
  switch (lesson.category) {
    case 'standard':
      return <Badge variant="standard" size="sm">Padrão ({lesson.multiplier}h)</Badge>;
    case 'extended':
      return <Badge variant="extended" size="sm">Estendida ({lesson.multiplier}h)</Badge>;
    case 'absence':
      return (
        <Badge variant="absence" size="sm">
          {lesson.charge_absence === false ? 'Falta Abonada' : 'Falta Cobrada'}
        </Badge>
      );
    case 'cancelled':
      return <Badge variant="cancelled" size="sm">Cancelada</Badge>;
    case 'courtesy':
      return <Badge variant="courtesy" size="sm">Cortesia</Badge>;
    default:
      return <Badge variant="inactive" size="sm">{lesson.category}</Badge>;
  }
}

export function ClosingLessonItem({
  lesson,
  isMonthClosed = false,
  onEdit,
  onDelete,
  className,
  ...restProps
}: IClosingLessonItemProps) {
  const finalValue = calculateLessonValue(lesson);
  const containerClasses = [styles.itemContainer, className || ''].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <div className={styles.dateCol}>
        <span className={styles.dateText}>{formatDateBR(lesson.lesson_date)}</span>
      </div>

      <div className={styles.categoryCol}>
        {renderCategoryBadge(lesson)}
      </div>

      <div className={styles.snapshotCol}>
        <span className={styles.labelMuted}>Base:</span>
        <span className={styles.snapshotValue}>{formatCurrency(lesson.hourly_rate_snapshot)}</span>
      </div>

      <div className={styles.valueCol}>
        <span className={styles.finalValue}>{formatCurrency(finalValue)}</span>
      </div>

      <div className={styles.notesCol}>
        {lesson.content_notes ? (
          <div
            className={styles.notesWrapper}
            title={lesson.content_notes}
            tabIndex={0}
            role="note"
            aria-label={`Anotações: ${lesson.content_notes}`}
          >
            <FileText size={14} className={styles.noteIcon} aria-hidden="true" />
            <span className={styles.notesText}>{lesson.content_notes}</span>
          </div>
        ) : (
          <span className={styles.noNotes}>—</span>
        )}
      </div>

      <div className={styles.actionsCol}>
        <Button
          variant="outline"
          size="sm"
          className={styles.actionButton}
          onClick={() => onEdit?.(lesson)}
          disabled={isMonthClosed}
          aria-label={`Editar aula de ${formatDateBR(lesson.lesson_date)}`}
          title={isMonthClosed ? 'Competência fechada' : 'Editar aula'}
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={() => onDelete?.(lesson)}
          disabled={isMonthClosed}
          aria-label={`Excluir aula de ${formatDateBR(lesson.lesson_date)}`}
          title={isMonthClosed ? 'Competência fechada' : 'Excluir aula'}
        >
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export default ClosingLessonItem;
