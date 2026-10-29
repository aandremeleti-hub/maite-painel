import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useCloseMonth } from '../../../../hooks/useClosing';
import { getMonthYearLabel } from '../../../../lib/dateUtils';
import { formatCurrency } from '../../../../lib/formatters';
import styles from './styles.module.css';

export interface ICloseMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  totalLessons?: number;
  totalRevenue?: number;
}

export function CloseMonthModal({
  isOpen,
  onClose,
  year,
  month,
  totalLessons = 0,
  totalRevenue = 0,
}: ICloseMonthModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const closeMonthMutation = useCloseMonth();

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'FECHAR') {
      return;
    }

    try {
      await closeMonthMutation.mutateAsync({ year, month });
      handleClose();
    } catch {
      // Erro tratado via toast pelo hook useCloseMonth
    }
  };

  const periodLabel = getMonthYearLabel(year, month);
  const isMatch = confirmText === 'FECHAR';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <span className={styles.modalTitle}>
          <Lock size={20} className={styles.titleIcon} aria-hidden="true" />
          Fechar Competência — {periodLabel}
        </span>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.formContainer}>
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={24} className={styles.warningIcon} aria-hidden="true" />
          <div className={styles.warningContent}>
            <strong className={styles.warningHeading}>Atenção Contábil Crítica (ADR 0003)</strong>
            <p className={styles.warningText}>
              Ao selar o fechamento de <strong>{periodLabel}</strong>, o Cadeado Contábil será ativado no PostgreSQL.
              Todos os registros de aulas serão travados contra adição, edição e exclusão involuntária.
            </p>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total de Aulas Apuradas:</span>
            <span className={styles.summaryValue}>{totalLessons}</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Faturamento a Congelar:</span>
            <span className={styles.summaryValueHighlight}>{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className={styles.inputSection}>
          <label htmlFor="close-month-confirm-input" className={styles.inputLabel}>
            Para confirmar o fechamento, digite exatamente a palavra{' '}
            <strong className={styles.keyword}>FECHAR</strong> no campo abaixo:
          </label>
          <Input
            id="close-month-confirm-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Digite FECHAR para confirmar"
            autoComplete="off"
            disabled={closeMonthMutation.isPending}
            autoFocus
          />
        </div>

        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={closeMonthMutation.isPending}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={!isMatch || closeMonthMutation.isPending}
            isPending={closeMonthMutation.isPending}
            leftIcon={<Lock size={16} aria-hidden="true" />}
          >
            Confirmar Fechamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CloseMonthModal;
