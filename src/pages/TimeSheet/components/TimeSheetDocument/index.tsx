import { forwardRef, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { IStudent } from '../../../../hooks/useStudents';
import type { IStudentMonthlyDetail } from '../../../../hooks/useClosing';
import type { IPaymentInfo } from '../../../../hooks/usePaymentInfo';
import { formatCurrencyBRL } from '../../../../lib/currencyUtils';
import { formatDateBR } from '../../../../lib/formatters';
import { getMonthYearLabel } from '../../../../lib/dateUtils';
import { Badge, type BadgeVariant } from '../../../../components/ui/Badge';
import styles from './styles.module.css';

export interface ITimeSheetDocumentProps {
  student: IStudent;
  lessons: IStudentMonthlyDetail[];
  year: number;
  month: number;
  paymentInfo?: IPaymentInfo | null;
  emissionDate?: string;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Padrão (1h)', extended: 'Estendida', absence: 'Falta', cancelled: 'Cancelada', courtesy: 'Cortesia',
};

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone Celular', random: 'Chave Aleatória',
};

function getDefaultEmissionDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

export const TimeSheetDocument = forwardRef<HTMLDivElement, ITimeSheetDocumentProps>(
  ({ student, lessons, year, month, paymentInfo, emissionDate = getDefaultEmissionDate(), className }, ref) => {
    const hasNotes = useMemo(() => lessons.some((l) => Boolean(l.content_notes?.trim())), [lessons]);

    const { billableCount, totalHours, totalValue } = useMemo(() => {
      let billable = 0, hours = 0, val = 0;
      for (const l of lessons) {
        const v = Number(l.lesson_value || 0);
        if (v > 0) billable += 1;
        hours += Number(l.multiplier || 0);
        val += v;
      }
      return { billableCount: billable, totalHours: hours, totalValue: val };
    }, [lessons]);

    const handleCopyPix = async () => {
      if (!paymentInfo?.pix_key) return;
      try {
        await navigator.clipboard.writeText(paymentInfo.pix_key);
        toast.success('Chave PIX copiada para a área de transferência!');
      } catch {
        toast.error('Erro ao copiar a chave PIX');
      }
    };

    const paperClasses = [styles.sheetPaper, className].filter(Boolean).join(' ');

    return (
      <div className={styles.sheetWrapper}>
        <div ref={ref} className={paperClasses}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <span className={styles.brandName}>Maite Aulas Particulares</span>
              <span className={styles.competenceBadge}>Competência: {getMonthYearLabel(year, month)}</span>
            </div>
            <h1 className={styles.documentTitle}>DEMONSTRATIVO DE AULAS MINISTRADAS</h1>
            <p className={styles.documentSubtitle}>Time Sheet Mensal Individual</p>
          </header>

          <section className={styles.metaGrid} aria-label="Metadados do Aluno">
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Aluno</span>
              <span className={styles.metaValue}>{student.name}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Hora-Aula Contratual</span>
              <span className={styles.metaValue}>{formatCurrencyBRL(student.hourly_rate)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Data de Emissão</span>
              <span className={styles.metaValue}>{emissionDate}</span>
            </div>
          </section>

          <section className={styles.tableSection}>
            <table className={styles.table} aria-label="Extrato Contábil de Aulas">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '15%' }}>Data</th>
                  <th scope="col" style={{ width: hasNotes ? '18%' : '25%' }}>Categoria</th>
                  {hasNotes && <th scope="col" style={{ width: '37%' }}>Conteúdo / Anotações</th>}
                  <th scope="col" className={styles.thNumeric} style={{ width: hasNotes ? '15%' : '30%' }}>Duração</th>
                  <th scope="col" className={styles.thNumeric} style={{ width: hasNotes ? '15%' : '30%' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={hasNotes ? 5 : 4} className={styles.emptyCell}>
                      Nenhuma aula ministrada registrada nesta competência.
                    </td>
                  </tr>
                ) : (
                  lessons.map((lesson, idx) => (
                    <tr key={`${lesson.lesson_date}-${idx}`} className={styles.tableRow}>
                      <td>{formatDateBR(lesson.lesson_date)}</td>
                      <td>
                        <Badge variant={lesson.category as BadgeVariant} size="sm">
                          {CATEGORY_LABELS[lesson.category] || lesson.category}
                        </Badge>
                      </td>
                      {hasNotes && <td className={styles.notesCell}>{lesson.content_notes?.trim() || '—'}</td>}
                      <td className={styles.numericCell}>{lesson.multiplier}h</td>
                      <td className={styles.numericCell}>{formatCurrencyBRL(lesson.lesson_value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <footer className={styles.summaryContainer}>
            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span>Aulas Faturáveis:</span>
                <strong>{billableCount} de {lessons.length}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Carga Horária Total:</span>
                <strong>{totalHours}h</strong>
              </div>
              <div className={styles.summaryRowTotal}>
                <span className={styles.totalLabel}>Total Geral:</span>
                <span className={styles.totalValue}>{formatCurrencyBRL(totalValue)}</span>
              </div>
            </div>
          </footer>

          {paymentInfo && (
            <div className={styles.paymentStamp}>
              <div className={styles.paymentHeader}>
                <h3 className={styles.paymentTitle}>Dados para Pagamento via PIX</h3>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`${styles.copyPixButton} ${styles.hideOnPrint}`}
                  aria-label="Copiar Chave PIX"
                >
                  <Copy size={13} aria-hidden="true" />
                  <span>Copiar Chave PIX</span>
                </button>
              </div>
              <div className={styles.paymentDetailsGrid}>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Titular da Conta</span>
                  <span className={styles.paymentValue}>{paymentInfo.account_holder}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Instituição Bancária</span>
                  <span className={styles.paymentValue}>{paymentInfo.bank_name}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Tipo de Chave</span>
                  <span className={styles.paymentValue}>{(paymentInfo.pix_type && PIX_TYPE_LABELS[paymentInfo.pix_type]) || paymentInfo.pix_type || '-'}</span>
                </div>
                <div className={styles.paymentItem}>
                  <span className={styles.paymentLabel}>Chave PIX</span>
                  <span className={styles.paymentValue}>{paymentInfo.pix_key}</span>
                </div>
              </div>
              <p className={styles.paymentInstructions}>
                Após realizar a transferência, favor encaminhar o comprovante de pagamento.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);

TimeSheetDocument.displayName = 'TimeSheetDocument';
