import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { useStudents } from '../../../../hooks/useStudents';
import { useAddLesson, useUpdateLesson } from '../../../../hooks/useLessons';
import { useDateFilter } from '../../../../hooks/useDateFilter';
import { LESSON_CATEGORY_OPTIONS } from './types';
import type { ILessonFormModalProps, LessonCategory } from './types';
import styles from './styles.module.css';

const getMonthDays = (y: number, m: number) => new Date(y, m, 0).getDate();

interface IContentProps extends Omit<ILessonFormModalProps, 'isOpen'> {
  targetYear: number;
  targetMonth: number;
  strMonth: string;
}

function LessonFormContent({
  onClose, lessonToEdit, defaultStudentId, isMonthClosed, targetYear, targetMonth, strMonth,
}: IContentProps) {
  const { data: students = [] } = useStudents();
  const addLesson = useAddLesson();
  const updateLesson = useUpdateLesson();

  const [studentId, setStudentId] = useState(() => lessonToEdit?.student_id ?? defaultStudentId ?? '');
  const [lessonDate, setLessonDate] = useState(() => lessonToEdit?.lesson_date ?? `${targetYear}-${strMonth}-01`);
  const [category, setCategory] = useState<LessonCategory>(() => lessonToEdit?.category ?? 'standard');
  const [multiplier, setMultiplier] = useState(() => lessonToEdit?.multiplier ?? 1.0);
  const [chargeAbsence, setChargeAbsence] = useState(() => lessonToEdit?.charge_absence ?? true);
  const [contentNotes, setContentNotes] = useState(() => lessonToEdit?.content_notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedStudent = useMemo(() => students.find((s) => s.id === studentId), [students, studentId]);
  const isSelectedInactive = selectedStudent?.status === 'inactive';

  const studentOptions = useMemo(() => [
    { value: '', label: 'Selecione um aluno...', disabled: true },
    ...[...students]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((s) => ({
        value: s.id,
        label: s.status === 'inactive' ? `${s.name} — (Inativo)` : s.name,
      })),
  ], [students]);

  const minDate = `${targetYear}-${strMonth}-01`;
  const maxDate = `${targetYear}-${strMonth}-${String(getMonthDays(targetYear, targetMonth)).padStart(2, '0')}`;
  const isPending = addLesson.isPending || updateLesson.isPending;

  const handleCategoryChange = (val: string) => {
    const newCat = val as LessonCategory;
    setCategory(newCat);
    const opt = LESSON_CATEGORY_OPTIONS.find((o) => o.value === newCat);
    if (opt) setMultiplier(opt.defaultMultiplier);
    if (newCat === 'absence') setChargeAbsence(true);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!studentId) nextErrors.studentId = 'Selecione um aluno';
    if (!lessonDate) nextErrors.lessonDate = 'Informe a data da aula';
    else {
      const [y, m] = lessonDate.split('-').map(Number);
      if (y !== targetYear || m !== targetMonth) nextErrors.lessonDate = `Data fora da competência ${strMonth}/${targetYear}`;
    }
    if (multiplier < 0) nextErrors.multiplier = 'Multiplicador inválido';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isMonthClosed || !validate()) return;
    const payload = {
      student_id: studentId,
      lesson_date: lessonDate,
      category,
      multiplier: Number(multiplier),
      charge_absence: category === 'absence' ? chargeAbsence : null,
      content_notes: contentNotes.trim() || null,
    };
    try {
      if (lessonToEdit) await updateLesson.mutateAsync({ id: lessonToEdit.id, ...payload });
      else await addLesson.mutateAsync(payload);
      onClose();
    } catch { /* Toast gerenciado no hook */ }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {isMonthClosed && (
        <div className={styles.lockBanner} role="alert">
          <Lock className={styles.lockIcon} size={18} aria-hidden="true" />
          <div className={styles.lockContent}>
            <span className={styles.lockTitle}>Competência Bloqueada</span>
            <span className={styles.lockMessage}>Cadeado contábil ativado. Submissão desabilitada.</span>
          </div>
        </div>
      )}
      <div className={styles.studentSelectGroup}>
        <Select
          id="lesson-student-select" label="Aluno *" value={studentId}
          onChange={(e) => setStudentId(e.target.value)} error={errors.studentId}
          disabled={isMonthClosed || isPending} options={studentOptions}
          aria-describedby={isSelectedInactive ? 'inactive-student-notice' : undefined}
        />
        {isSelectedInactive && (
          <div id="inactive-student-notice" className={styles.inactiveBanner} role="status" aria-live="polite">
            <Sparkles className={styles.inactiveBannerIcon} size={16} aria-hidden="true" />
            <span className={styles.inactiveBannerText}>
              Este aluno está inativo há mais de 90 dias e será reativado automaticamente ao confirmar este lançamento.
            </span>
          </div>
        )}
      </div>
      <div className={styles.formRow}>
        <Input
          type="date" label="Data da Aula *" min={minDate} max={maxDate}
          value={lessonDate} onChange={(e) => setLessonDate(e.target.value)}
          error={errors.lessonDate} disabled={isMonthClosed || isPending}
        />
        <Select
          label="Categoria *" value={category} onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={isMonthClosed || isPending}
          options={LESSON_CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>
      <div className={styles.formRow}>
        <Input
          type="number" label="Multiplicador / Duração" step="0.25" min="0" max="10"
          value={multiplier} onChange={(e) => setMultiplier(parseFloat(e.target.value) || 0)}
          error={errors.multiplier} disabled={isMonthClosed || isPending || category !== 'extended'}
          helperText={category !== 'extended' ? 'Fixo pela categoria' : 'Editável para reposição/estendida'}
        />
        {category === 'absence' && (
          <div className={styles.checkboxContainer}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox" className={styles.checkboxInput} checked={chargeAbsence}
                onChange={(e) => setChargeAbsence(e.target.checked)} disabled={isMonthClosed || isPending}
              />
              Cobrar falta do aluno?
            </label>
            <span className={styles.checkboxHint}>Quando marcado, fatura a hora contratada normal.</span>
          </div>
        )}
      </div>
      <div className={styles.textareaContainer}>
        <div className={styles.textareaHeader}>
          <label htmlFor="content-notes" className={styles.textareaLabel}>Notas Pedagógicas</label>
          <span className={styles.charCounter}>{contentNotes.length}/500</span>
        </div>
        <textarea
          id="content-notes" className={styles.textarea} maxLength={500} rows={3}
          placeholder="Anotações sobre o conteúdo ministrado..." value={contentNotes}
          onChange={(e) => setContentNotes(e.target.value)} disabled={isMonthClosed || isPending}
        />
      </div>
      <div className={styles.footerActions}>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" variant="primary" isPending={isPending} disabled={isMonthClosed || isPending}>
          {lessonToEdit ? 'Salvar Alterações' : 'Registrar Aula'}
        </Button>
      </div>
    </form>
  );
}

export function LessonFormModal(props: ILessonFormModalProps) {
  const { selectedYear, selectedMonth } = useDateFilter();
  if (!props.isOpen) return null;
  const targetYear = props.activeYear ?? selectedYear;
  const targetMonth = props.activeMonth ?? selectedMonth;

  return (
    <Modal
      isOpen={props.isOpen} onClose={props.onClose} size="md"
      title={props.lessonToEdit ? 'Editar Aula' : 'Nova Aula'}
      description="Preencha as informações do atendimento pedagógico"
    >
      <LessonFormContent
        key={`${props.lessonToEdit?.id ?? 'new'}-${targetYear}-${targetMonth}`}
        {...props} targetYear={targetYear} targetMonth={targetMonth}
        strMonth={String(targetMonth).padStart(2, '0')}
      />
    </Modal>
  );
}
