import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Edit2, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDateBR } from '../../../lib/formatters';
import type { IStudent } from '../../../hooks/useStudents';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import styles from './styles.module.css';

export interface IStudentCardProps {
  student: IStudent;
  onEdit: (student: IStudent) => void;
  onDelete?: (student: IStudent) => void;
}

export const StudentCard: FC<IStudentCardProps> = ({
  student,
  onEdit,
}) => {
  const titleId = `student-name-${student.id}`;
  const isInactive = student.status === 'inactive';
  const formattedRate = formatCurrency(student.hourly_rate);
  const firstLessonText = student.first_lesson_date
    ? formatDateBR(student.first_lesson_date)
    : 'Não iniciada';

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h3 id={titleId} className={styles.name} title={student.name}>
            {student.name}
          </h3>
        </div>

        <div className={styles.badges}>
          {student.requires_invoice && (
            <Badge variant="NF" size="sm" title="Requer emissão de Nota Fiscal">
              NF
            </Badge>
          )}
          <Badge
            variant={isInactive ? 'inactive' : 'active'}
            size="sm"
            withDot={!isInactive}
          >
            {isInactive ? 'Inativo' : 'Ativo'}
          </Badge>
        </div>
      </header>

      <div className={styles.metaRow}>
        <div className={styles.rateBlock}>
          <span className={styles.rateLabel}>Valor / Hora</span>
          <span className={styles.rateValue}>{formattedRate}</span>
        </div>

        <div className={styles.firstLessonBlock}>
          <span className={styles.firstLessonLabel}>Primeira aula</span>
          <span className={styles.firstLessonDate}>{firstLessonText}</span>
        </div>
      </div>

      <p
        className={styles.notes}
        title={student.notes || undefined}
        aria-label={student.notes ? `Observações: ${student.notes}` : 'Sem observações'}
      >
        {student.notes?.trim() ? student.notes : 'Sem observações cadastradas.'}
      </p>

      <footer className={styles.actions}>
        <div className={styles.primaryActions}>
          <Link
            to={`/alunos/${student.id}`}
            className={styles.detailLink}
            aria-label={`Ver detalhes completos de ${student.name}`}
          >
            <span>Ver Detalhes</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>

          <Link
            to={`/timesheet?studentId=${student.id}`}
            className={styles.timesheetLink}
            title="Abrir Time Sheet deste aluno"
            aria-label={`Abrir Time Sheet de ${student.name}`}
          >
            <Calendar size={16} aria-hidden="true" />
          </Link>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onEdit(student)}
          leftIcon={<Edit2 size={13} aria-hidden="true" />}
          aria-label={`Editar cadastro de ${student.name}`}
        >
          Editar
        </Button>
      </footer>
    </article>
  );
};
