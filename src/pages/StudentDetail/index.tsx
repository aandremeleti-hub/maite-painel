import { useState, useMemo, type FC } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  Edit2,
  UserX,
  AlertCircle,
} from 'lucide-react';
import { useStudent } from '../../hooks/useStudents';
import { useLessons } from '../../hooks/useLessons';
import { formatDateBR, formatCurrency } from '../../lib/formatters';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StudentFormModal } from '../../components/students/StudentFormModal';
import { StudentDeleteModal } from '../../components/students/StudentDeleteModal';
import { StudentLessonHistoryTable } from './components/StudentLessonHistoryTable';
import styles from './styles.module.css';

export const StudentDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: student, isLoading: isLoadingStudent, isError } = useStudent(id);
  const { data: lessons = [], isLoading: isLoadingLessons } = useLessons(id);

  const totalRevenue = useMemo(() => {
    return lessons.reduce((acc, l) => {
      if (l.category === 'absence' && l.charge_absence === false) return acc;
      return acc + (l.hourly_rate_snapshot || 0) * (l.multiplier || 0);
    }, 0);
  }, [lessons]);

  const metrics = useMemo(() => {
    if (!student) return [];
    return [
      { label: 'Valor / Hora', icon: DollarSign, val: formatCurrency(student.hourly_rate) },
      {
        label: 'Primeira Aula',
        icon: Calendar,
        val: student.first_lesson_date ? formatDateBR(student.first_lesson_date) : 'Não iniciada',
      },
      { label: 'Total de Aulas', icon: Clock, val: String(lessons.length) },
      { label: 'Faturamento Bruto', icon: TrendingUp, val: formatCurrency(totalRevenue) },
    ];
  }, [student, lessons.length, totalRevenue]);

  if (isLoadingStudent) {
    return (
      <div className={styles.container}>
        <div className={styles.topBar}>
          <button type="button" onClick={() => navigate('/alunos')} className={styles.backButton}>
            <ArrowLeft size={16} /> Voltar para Alunos
          </button>
        </div>
        <div className={styles.skeletonHeader} aria-label="Carregando perfil do aluno..." />
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className={styles.container}>
        <div className={styles.notFoundBox}>
          <AlertCircle size={32} color="var(--color-status-error)" />
          <h2 className={styles.notFoundTitle}>Aluno não encontrado</h2>
          <p className={styles.notFoundDesc}>
            O identificador solicitado não existe ou não está acessível no sistema.
          </p>
          <Button variant="secondary" onClick={() => navigate('/alunos')}>
            Voltar para lista de alunos
          </Button>
        </div>
      </div>
    );
  }

  const isInactive = student.status === 'inactive';

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button type="button" onClick={() => navigate('/alunos')} className={styles.backButton}>
          <ArrowLeft size={16} /> Voltar para Alunos
        </button>
        <span className={styles.breadcrumb}>Alunos / {student.name}</span>
      </div>

      <header className={styles.headerCard}>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.studentName}>{student.name}</h1>
            {student.requires_invoice && (
              <Badge variant="NF" size="sm" title="Requer emissão de Nota Fiscal">NF</Badge>
            )}
            <Badge variant={isInactive ? 'inactive' : 'active'} size="sm" withDot={!isInactive}>
              {isInactive ? 'Inativo' : 'Ativo'}
            </Badge>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            leftIcon={<Edit2 size={14} />}
          >
            Editar Cadastro
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            leftIcon={<UserX size={14} />}
          >
            Inativar Aluno
          </Button>
          <Link to={`/timesheet?studentId=${student.id}`}>
            <Button variant="primary" size="sm" leftIcon={<Calendar size={14} />}>
              Ir para Time Sheet
            </Button>
          </Link>
        </div>
      </header>

      <section className={styles.metricsGrid} aria-label="Métricas do aluno">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricLabel}>{m.label}</span>
                <Icon size={16} className={styles.metricIcon} />
              </div>
              <span className={styles.metricValue}>{m.val}</span>
            </div>
          );
        })}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Observações Contratuais</h2>
        <div className={styles.notesCard}>
          {student.notes?.trim() ? (
            <p className={styles.notesText}>{student.notes}</p>
          ) : (
            <p className={styles.notesEmpty}>Nenhuma observação contratual ou pedagógica registrada.</p>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico Contábil de Aulas</h2>
        <StudentLessonHistoryTable lessons={lessons} isLoading={isLoadingLessons} />
      </section>

      <StudentFormModal
        isOpen={isEditOpen}
        studentToEdit={student}
        onClose={() => setIsEditOpen(false)}
      />

      <StudentDeleteModal
        isOpen={isDeleteOpen}
        student={student}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => navigate('/alunos')}
      />
    </div>
  );
};

export default StudentDetailPage;
