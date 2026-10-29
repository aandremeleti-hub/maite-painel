import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC, RefObject } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, Printer, AlertTriangle } from 'lucide-react';
import type { IStudent } from '../../../../hooks/useStudents';
import { useDateFilter } from '../../../../hooks/useDateFilter';
import { generateTimeSheetPDF } from '../../../../services/pdfGenerator';
import { Button } from '../../../../components/ui/Button';
import { Select, type ISelectOption } from '../../../../components/ui/Select';
import { Badge } from '../../../../components/ui/Badge';
import styles from './styles.module.css';

export interface ITimeSheetToolbarProps {
  students: IStudent[];
  selectedStudentId?: string;
  onSelectStudent?: (studentId: string) => void;
  onDownloadPdf?: () => Promise<void> | void;
  onPrint?: () => void;
  isGeneratingPdf?: boolean;
  hasLessons?: boolean;
  hasPaymentInfo?: boolean;
  documentRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export const TimeSheetToolbar: FC<ITimeSheetToolbarProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onDownloadPdf,
  onPrint,
  isGeneratingPdf: externalIsGenerating,
  hasLessons = false,
  hasPaymentInfo = true,
  documentRef,
  className,
}) => {
  const [internalIsGenerating, setInternalIsGenerating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedYear, selectedMonth, formattedPeriod } = useDateFilter();

  const isGenerating = externalIsGenerating ?? internalIsGenerating;
  const urlStudentId = searchParams.get('studentId') || '';
  const currentStudentId = selectedStudentId ?? urlStudentId;

  useEffect(() => {
    if (urlStudentId && onSelectStudent && urlStudentId !== selectedStudentId) {
      onSelectStudent(urlStudentId);
    }
  }, [urlStudentId, selectedStudentId, onSelectStudent]);

  const handleStudentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = e.target.value;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextId) {
            next.set('studentId', nextId);
          } else {
            next.delete('studentId');
          }
          return next;
        },
        { replace: false }
      );
      onSelectStudent?.(nextId);
    },
    [setSearchParams, onSelectStudent]
  );

  const studentOptions: ISelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'Selecione um aluno...' },
      ...students.map((s) => ({
        value: s.id,
        label: s.status === 'inactive' ? `${s.name} (Inativo)` : s.name,
      })),
    ];
  }, [students]);

  const canExport = Boolean(currentStudentId && hasLessons);

  const handleDownload = async () => {
    if (onDownloadPdf) {
      await onDownloadPdf();
      return;
    }
    if (!documentRef?.current) return;
    try {
      setInternalIsGenerating(true);
      const student = students.find((s) => s.id === currentStudentId);
      const rawName = student?.name || 'Aluno';
      const cleanName = rawName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const paddedMonth = String(selectedMonth).padStart(2, '0');
      const filename = `TimeSheet_${cleanName}_${paddedMonth}_${selectedYear}.pdf`;
      await generateTimeSheetPDF(documentRef.current, filename);
    } finally {
      setInternalIsGenerating(false);
    }
  };

  const handlePrintAction = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const containerClasses = [styles.toolbarCard, className].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div className={styles.controlsRow}>
        <div className={styles.studentSelectorGroup}>
          <div className={styles.selectWrapper}>
            <Select
              label="Aluno Selecionado"
              value={currentStudentId}
              onChange={handleStudentChange}
              options={studentOptions}
            />
          </div>
          <div className={styles.competenceWrapper}>
            <Badge variant="open" size="md">
              Competência: {formattedPeriod}
            </Badge>
          </div>
        </div>

        <div className={styles.actionsGroup}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download size={16} aria-hidden="true" />}
            onClick={handleDownload}
            isPending={isGenerating}
            disabled={!canExport || isGenerating}
          >
            Baixar PDF Oficial
          </Button>

          <Button
            variant="outline"
            size="md"
            leftIcon={<Printer size={16} aria-hidden="true" />}
            onClick={handlePrintAction}
            disabled={!canExport || isGenerating}
          >
            Imprimir / PDF Vetorial
          </Button>
        </div>
      </div>

      {hasPaymentInfo === false && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle className={styles.warningIcon} size={18} aria-hidden="true" />
          <span className={styles.warningText}>
            Nenhuma chave PIX cadastrada para recebimento.
            <Link to="/configuracoes" className={styles.warningLink}>
              Cadastrar chave PIX agora
            </Link>
          </span>
        </div>
      )}
    </div>
  );
};
