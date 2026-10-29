import type { FC } from 'react';
import type { ILesson } from '../../../../hooks/useLessons';
import { formatDateBR, formatCurrency } from '../../../../lib/formatters';
import { Badge, type BadgeVariant } from '../../../../components/ui/Badge';
import styles from './styles.module.css';

export interface IStudentLessonHistoryTableProps {
  lessons: ILesson[];
  isLoading?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Padrão',
  extended: 'Estendida',
  absence: 'Falta',
  cancelled: 'Cancelada',
  courtesy: 'Cortesia',
};

export const StudentLessonHistoryTable: FC<IStudentLessonHistoryTableProps> = ({
  lessons,
  isLoading = false,
}) => {
  const calculateLessonValue = (lesson: ILesson): number => {
    if (lesson.category === 'absence' && lesson.charge_absence === false) {
      return 0;
    }
    return (lesson.hourly_rate_snapshot || 0) * (lesson.multiplier || 0);
  };

  if (isLoading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyBox}>
          <p className={styles.emptyText}>Carregando histórico de aulas...</p>
        </div>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyBox}>
          <p className={styles.emptyText}>Nenhuma aula registrada para este aluno até o momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table} aria-label="Histórico contábil de aulas">
        <thead>
          <tr>
            <th scope="col" className={styles.th}>Data</th>
            <th scope="col" className={styles.th}>Categoria</th>
            <th scope="col" className={`${styles.th} ${styles.numeric}`}>Duração / Mult.</th>
            <th scope="col" className={`${styles.th} ${styles.numeric}`}>Tarifa Snapshot</th>
            <th scope="col" className={`${styles.th} ${styles.numeric}`}>Valor Calculado</th>
            <th scope="col" className={styles.th}>Notas de Conteúdo</th>
          </tr>
        </thead>
        <tbody>
          {lessons.map((lesson) => {
            const categoryLabel = CATEGORY_LABELS[lesson.category] || lesson.category;
            const categoryVariant = (lesson.category as BadgeVariant) || 'standard';
            const lessonValue = calculateLessonValue(lesson);

            return (
              <tr key={lesson.id} className={styles.row}>
                <td className={`${styles.td} ${styles.dateCell}`}>
                  {formatDateBR(lesson.lesson_date)}
                </td>
                <td className={styles.td}>
                  <Badge variant={categoryVariant} size="sm">
                    {categoryLabel}
                  </Badge>
                </td>
                <td className={`${styles.td} ${styles.numeric}`}>
                  {lesson.multiplier}x
                </td>
                <td className={`${styles.td} ${styles.numeric}`}>
                  {formatCurrency(lesson.hourly_rate_snapshot)}
                </td>
                <td className={`${styles.td} ${styles.numeric} ${styles.valueCell}`}>
                  {formatCurrency(lessonValue)}
                </td>
                <td className={`${styles.td} ${styles.notesCell}`} title={lesson.content_notes || undefined}>
                  {lesson.content_notes?.trim() ? lesson.content_notes : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StudentLessonHistoryTable;
