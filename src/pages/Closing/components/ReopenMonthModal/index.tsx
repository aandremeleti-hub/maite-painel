import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertOctagon, Unlock } from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { useReopenMonth } from '../../../../hooks/useClosing';
import { getMonthYearLabel } from '../../../../lib/dateUtils';
import styles from './styles.module.css';

export interface IReopenMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

export function ReopenMonthModal({
  isOpen,
  onClose,
  year,
  month,
}: IReopenMonthModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const reopenMonthMutation = useReopenMonth();

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) {
      return;
    }

    try {
      await reopenMonthMutation.mutateAsync({ year, month });
      handleClose();
    } catch {
      // Erro tratado via toast pelo hook useReopenMonth
    }
  };

  const periodLabel = getMonthYearLabel(year, month);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className={styles.modalTitle}>
          <Unlock size={20} className={styles.titleIcon} aria-hidden="true" />
          Reabrir Competência — {periodLabel}
        </span>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.alertBanner} role="alert">
          <AlertOctagon size={24} className={styles.alertIcon} aria-hidden="true" />
          <div className={styles.alertContent}>
            <strong className={styles.alertHeading}>Aviso Severo de Auditoria Contábil</strong>
            <p className={styles.alertText}>
              A reabertura de <strong>{periodLabel}</strong> invalida a trava de fechamento no banco de dados
              e destrava os lançamentos de aulas para inserção, alteração e exclusão retroativa.
            </p>
          </div>
        </div>

        <div className={styles.checkboxContainer}>
          <label className={styles.checkboxLabel} htmlFor="reopen-month-confirm-checkbox">
            <input
              id="reopen-month-confirm-checkbox"
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              disabled={reopenMonthMutation.isPending}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxText}>
              Estou ciente do impacto contábil e confirmo que desejo destravar os lançamentos desta competência.
            </span>
          </label>
        </div>

        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={reopenMonthMutation.isPending}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="danger"
            disabled={!isConfirmed || reopenMonthMutation.isPending}
            isPending={reopenMonthMutation.isPending}
            leftIcon={<Unlock size={16} aria-hidden="true" />}
          >
            Destravar e Reabrir Mês
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReopenMonthModal;
