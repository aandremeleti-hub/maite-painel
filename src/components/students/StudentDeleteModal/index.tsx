import { useState, type FC } from 'react';
import { AlertTriangle, AlertCircle, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { formatCurrency } from '../../../lib/formatters';
import { useInactivateStudent, useDeleteStudent, type IStudent } from '../../../hooks/useStudents';
import styles from './styles.module.css';

export interface IStudentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: IStudent | null;
  onSuccess?: () => void;
}

interface IDeleteContentProps {
  student: IStudent;
  onClose: () => void;
  onSuccess?: () => void;
}

const StudentDeleteContent: FC<IDeleteContentProps> = ({
  student,
  onClose,
  onSuccess,
}) => {
  const inactivateMutation = useInactivateStudent();
  const deleteMutation = useDeleteStudent();

  const isPending = inactivateMutation.isPending || deleteMutation.isPending;
  const [inlineError, setInlineError] = useState<string | null>(null);

  const handleInactivate = async () => {
    setInlineError(null);
    try {
      await inactivateMutation.mutateAsync({
        id: student.id,
        status: 'inactive',
      });
      onClose();
      onSuccess?.();
    } catch {
      // Notificado via Sonner toast no hook
    }
  };

  const handleDeletePermanent = async () => {
    setInlineError(null);
    try {
      await deleteMutation.mutateAsync(student.id);
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const isFkRestriction =
        errorObj?.code === '23503' ||
        errorObj?.message?.includes('23503') ||
        errorObj?.message?.includes('foreign key');

      if (isFkRestriction) {
        setInlineError(
          'Este aluno possui aulas históricas e não pode ser excluído fisicamente (Regra Contábil ADR 0002). Utilize o botão "Inativar Aluno" para arquivá-lo com segurança.'
        );
      } else {
        setInlineError('Ocorreu um erro ao tentar excluir o registro.');
      }
    }
  };

  const isAlreadyInactive = student.status === 'inactive';

  return (
    <div className={styles.content}>
      <div className={styles.studentCard}>
        <span className={styles.studentName}>{student.name}</span>
        <span className={styles.rate}>
          Tarifa: {formatCurrency(student.hourly_rate)}/h
        </span>
      </div>

      <div className={styles.warningBox} role="region" aria-label="Alerta contábil">
        <AlertTriangle size={20} className={styles.warningIcon} aria-hidden="true" />
        <div className={styles.warningBody}>
          <h4 className={styles.warningTitle}>Preservação do Faturamento Histórico</h4>
          <p className={styles.warningText}>
            A <strong>Inativação Lógica</strong> oculta o aluno das listas ativas de aula,
            mas preserva integralmente os demonstrativos de Time Sheet, fechamentos e cálculos
            de faturamento passados.
          </p>
          <p className={styles.warningText}>
            A <strong>Exclusão Física</strong> é restrita pelo banco de dados (ADR 0002) e só é
            aceita caso o aluno tenha sido cadastrado por engano e não possua nenhuma aula
            registrada.
          </p>
        </div>
      </div>

      {inlineError && (
        <div className={styles.errorBox} role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{inlineError}</span>
        </div>
      )}

      <div className={styles.footer}>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDeletePermanent}
          isPending={deleteMutation.isPending}
          disabled={isPending}
          leftIcon={<Trash2 size={14} aria-hidden="true" />}
          title="Exclusão física permitida apenas se o aluno nunca teve aulas registradas"
        >
          Excluir Registro
        </Button>

        <div className={styles.rightActions}>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleInactivate}
            isPending={inactivateMutation.isPending}
            disabled={isPending || isAlreadyInactive}
            leftIcon={<ShieldCheck size={16} aria-hidden="true" />}
          >
            {isAlreadyInactive ? 'Aluno Já Inativo' : 'Inativar Aluno (Recomendado)'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const StudentDeleteModal: FC<IStudentDeleteModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  if (!isOpen || !student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inativação e Exclusão Segura"
      description="Salvaguarda contábil em conformidade com ADR 0002"
      size="md"
    >
      <StudentDeleteContent
        key={student.id}
        student={student}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
};
