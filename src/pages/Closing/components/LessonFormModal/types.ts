import type { ILesson } from '../../../../hooks/useLessons';

/**
 * Categorias de aula estritamente alinhadas com GLOSSARY.md e schema do banco de dados.
 */
export type LessonCategory = 'standard' | 'extended' | 'absence' | 'cancelled' | 'courtesy';
export type ILessonCategory = LessonCategory;

/**
 * Metadados para exibição de categorias em seletores de formulário.
 */
export interface ILessonCategoryOption {
  value: LessonCategory;
  label: string;
  defaultMultiplier: number;
  description: string;
}

/**
 * Lista canônica de opções de categorias de aula para componentes de seleção.
 */
export const LESSON_CATEGORY_OPTIONS: readonly ILessonCategoryOption[] = [
  {
    value: 'standard',
    label: 'Aula Padrão (1h)',
    defaultMultiplier: 1.0,
    description: 'Aula regular com carga horária de 1 hora (1.0x)',
  },
  {
    value: 'extended',
    label: 'Aula Estendida (1,5h+)',
    defaultMultiplier: 1.5,
    description: 'Aula estendida ou reposição com carga horária de 1,5 horas ou mais (1.5x+)',
  },
  {
    value: 'absence',
    label: 'Falta do Aluno',
    defaultMultiplier: 1.0,
    description: 'Falta do aluno sujeita à cobrança ou abono',
  },
  {
    value: 'cancelled',
    label: 'Aula Cancelada',
    defaultMultiplier: 0.0,
    description: 'Aula cancelada pela professora (0.0x, R$ 0,00)',
  },
  {
    value: 'courtesy',
    label: 'Aula de Cortesia / Degustação',
    defaultMultiplier: 0.0,
    description: 'Aula experimental de degustação ou cortesia comercial (0.0x, R$ 0,00)',
  },
] as const;

/**
 * Contrato de dados manipulados pelo formulário de criação/edição de aula.
 */
export interface ILessonFormData {
  student_id: string;
  lesson_date: string; // Formato literal 'YYYY-MM-DD' (ADR 0001)
  category: LessonCategory;
  multiplier: number;
  charge_absence: boolean;
  content_notes?: string | null;
}

/**
 * Propriedades para o componente LessonFormModal.
 */
export interface ILessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonToEdit?: ILesson | null;
  defaultStudentId?: string;
  isMonthClosed?: boolean;
  activeYear?: number;
  activeMonth?: number;
}
