import { useState, useId, type FC, type FormEvent, type ChangeEvent } from 'react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber } from '../../../lib/formatters';
import { useCreateStudent, useUpdateStudent, type IStudent } from '../../../hooks/useStudents';
import styles from './styles.module.css';

export interface IStudentFormContentProps {
  studentToEdit?: IStudent | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StudentFormContent: FC<IStudentFormContentProps> = ({
  studentToEdit,
  onClose,
  onSuccess,
}) => {
  const invoiceId = useId();
  const notesId = useId();

  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const isPending = createStudentMutation.isPending || updateStudentMutation.isPending;

  const [name, setName] = useState(() => studentToEdit?.name || '');
  const [hourlyRateDisplay, setHourlyRateDisplay] = useState(() =>
    studentToEdit ? formatCurrency(studentToEdit.hourly_rate) : ''
  );
  const [requiresInvoice, setRequiresInvoice] = useState(() =>
    Boolean(studentToEdit?.requires_invoice)
  );
  const [firstLessonDate, setFirstLessonDate] = useState(() =>
    studentToEdit?.first_lesson_date?.split('T')[0] || ''
  );
  const [notes, setNotes] = useState(() => studentToEdit?.notes || '');
  const [errors, setErrors] = useState<{ name?: string; hourlyRate?: string }>({});

  const handleHourlyRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCurrencyInput(rawValue);
    setHourlyRateDisplay(formatted);
    if (errors.hourlyRate) {
      setErrors((prev) => ({ ...prev, hourlyRate: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const rateValue = parseCurrencyToNumber(hourlyRateDisplay);
    const newErrors: { name?: string; hourlyRate?: string } = {};

    if (!trimmedName) {
      newErrors.name = 'O nome completo é obrigatório.';
    }
    if (rateValue <= 0) {
      newErrors.hourlyRate = 'Informe um valor de hora válido maior que zero.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (studentToEdit) {
        await updateStudentMutation.mutateAsync({
          id: studentToEdit.id,
          name: trimmedName,
          hourly_rate: rateValue,
          requires_invoice: requiresInvoice,
          first_lesson_date: firstLessonDate || null,
          notes: notes.trim() || null,
        });
      } else {
        await createStudentMutation.mutateAsync({
          name: trimmedName,
          hourly_rate: rateValue,
          requires_invoice: requiresInvoice,
          first_lesson_date: firstLessonDate || null,
          notes: notes.trim() || null,
          status: 'active',
        });
      }
      onClose();
      onSuccess?.();
    } catch {
      // toast tratado pelo hook
    }
  };

  const isEditing = Boolean(studentToEdit);

  return (
    <form id="student-form" onSubmit={handleSubmit} className={styles.form} noValidate>
      <Input
        label="Nome Completo *"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
        }}
        error={errors.name}
        placeholder="Ex: João da Silva"
        required
      />

      <div className={styles.row}>
        <Input
          label="Valor da Hora/Aula *"
          value={hourlyRateDisplay}
          onChange={handleHourlyRateChange}
          error={errors.hourlyRate}
          placeholder="R$ 0,00"
          inputMode="numeric"
          required
        />

        <Input
          type="date"
          label="Primeira Aula"
          value={firstLessonDate}
          onChange={(e) => setFirstLessonDate(e.target.value)}
          helperText="Data literal da aula inaugural (opcional)"
        />
      </div>

      <label htmlFor={invoiceId} className={styles.checkboxContainer}>
        <input
          id={invoiceId}
          type="checkbox"
          checked={requiresInvoice}
          onChange={(e) => setRequiresInvoice(e.target.checked)}
          className={styles.checkbox}
        />
        <span className={styles.checkboxLabel}>
          Requer emissão de Nota Fiscal (NF)
        </span>
      </label>

      <div className={styles.textareaField}>
        <label htmlFor={notesId} className={styles.label}>
          Observações
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={styles.textarea}
          rows={3}
          placeholder="Anotações pedagógicas, contatos ou particularidades..."
        />
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          isPending={isPending}
        >
          {isEditing ? 'Salvar Alterações' : 'Cadastrar Aluno'}
        </Button>
      </div>
    </form>
  );
};
