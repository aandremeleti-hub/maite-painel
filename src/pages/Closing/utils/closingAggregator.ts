import type { IStudent } from '../../../hooks/useStudents';
import type { ILesson } from '../../../hooks/useLessons';

/**
 * Resumo consolidado do fechamento mensal para um aluno específico.
 * Utilizado para alimentar as linhas do acordeão no Módulo Closing e conferência contábil.
 */
export interface IStudentClosingSummary {
  student: IStudent;
  studentId: string;
  studentName: string;
  requiresInvoice: boolean;
  lessons: ILesson[];
  /** Equivalente contábil a total_lessons da RPC fn_calculate_monthly_totals (soma de multiplicadores faturáveis) */
  totalLessonsCount: number;
  /** Faturamento total acumulado do aluno na competência (R$) */
  totalRevenue: number;
  /** Quantidade de aulas com cobrança financeira efetiva */
  billedLessonsCount: number;
  /** Quantidade total de registros de aula no mês (inclui cortesias e canceladas) */
  rawLessonsCount: number;
  /** Carga horária faturada correspondente (mesmo valor numérico de totalLessonsCount) */
  totalHours: number;
}

/**
 * Totais gerais consolidados da competência inteira.
 */
export interface IClosingOverallTotals {
  totalRevenue: number;
  totalLessons: number;
  totalStudents: number;
}

/**
 * Determina se uma aula é contábil/faturável de acordo com as regras canônicas do GLOSSARY.md:
 * - standard e extended: faturáveis
 * - absence: faturável apenas se charge_absence !== false
 * - cancelled e courtesy: não faturáveis (0h e R$ 0,00)
 */
export function isLessonBillable(
  lesson: Pick<ILesson, 'category' | 'charge_absence'>
): boolean {
  if (lesson.category === 'courtesy' || lesson.category === 'cancelled') {
    return false;
  }
  if (lesson.category === 'absence' && lesson.charge_absence === false) {
    return false;
  }
  return true;
}

/**
 * Calcula o valor financeiro individual de uma aula aplicando a tarifa snapshot e o multiplicador.
 * Retorna 0 para aulas de cortesia, canceladas ou faltas abonadas.
 */
export function calculateLessonValue(
  lesson: Pick<ILesson, 'category' | 'charge_absence' | 'multiplier' | 'hourly_rate_snapshot'>
): number {
  if (!isLessonBillable(lesson)) {
    return 0;
  }
  const rate = Number(lesson.hourly_rate_snapshot) || 0;
  const mult = Number(lesson.multiplier) || 0;
  return Math.round((rate * mult + Number.EPSILON) * 100) / 100;
}

/**
 * Agrega aulas por aluno em memória com complexidade linear O(N+M).
 * Mapeia por Map, aplica regras contábeis, filtra alunos com aulas e ordena alfabeticamente.
 */
export function aggregateClosingData(
  students: IStudent[],
  lessons: ILesson[]
): IStudentClosingSummary[] {
  if (!lessons || lessons.length === 0) {
    return [];
  }

  // 1. Mapeamento indexado de alunos por ID: O(N)
  const studentMap = new Map<string, IStudent>();
  for (let i = 0; i < students.length; i++) {
    studentMap.set(students[i].id, students[i]);
  }

  // 2. Agrupamento de aulas por student_id: O(M)
  const lessonsByStudent = new Map<string, ILesson[]>();
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const group = lessonsByStudent.get(lesson.student_id);
    if (group) {
      group.push(lesson);
    } else {
      lessonsByStudent.set(lesson.student_id, [lesson]);
    }
  }

  // 3. Agregação financeira e estatística de cada aluno com aulas: O(K), K <= N
  const summaries: IStudentClosingSummary[] = [];

  for (const [studentId, studentLessons] of lessonsByStudent.entries()) {
    const student = studentMap.get(studentId) ?? {
      id: studentId,
      owner_id: '',
      name: 'Aluno Desconhecido',
      hourly_rate: 0,
      requires_invoice: false,
      status: 'active',
      notes: null,
      first_lesson_date: null,
      created_at: null,
      updated_at: null,
    };

    // Ordenação cronológica estável das aulas do aluno por lesson_date ('YYYY-MM-DD')
    studentLessons.sort((a, b) => a.lesson_date.localeCompare(b.lesson_date));

    let totalLessonsCount = 0;
    let totalRevenue = 0;
    let billedLessonsCount = 0;

    for (let j = 0; j < studentLessons.length; j++) {
      const lesson = studentLessons[j];
      if (isLessonBillable(lesson)) {
        const mult = Number(lesson.multiplier) || 0;
        const value = calculateLessonValue(lesson);
        totalLessonsCount += mult;
        totalRevenue += value;
        billedLessonsCount += 1;
      }
    }

    const roundedRevenue = Math.round((totalRevenue + Number.EPSILON) * 100) / 100;
    const roundedLessonsCount = Math.round((totalLessonsCount + Number.EPSILON) * 10) / 10;

    summaries.push({
      student,
      studentId,
      studentName: student.name,
      requiresInvoice: Boolean(student.requires_invoice),
      lessons: studentLessons,
      totalLessonsCount: roundedLessonsCount,
      totalRevenue: roundedRevenue,
      billedLessonsCount,
      rawLessonsCount: studentLessons.length,
      totalHours: roundedLessonsCount,
    });
  }

  // 4. Ordenação alfabética por nome do aluno: O(K log K)
  summaries.sort((a, b) =>
    a.studentName.localeCompare(b.studentName, 'pt-BR', { sensitivity: 'base' })
  );

  return summaries;
}

/**
 * Calcula os totais acumulados de faturamento, aulas e alunos atendidos na competência.
 */
export function calculateClosingOverallTotals(
  summaries: IStudentClosingSummary[]
): IClosingOverallTotals {
  let revenue = 0;
  let lessons = 0;

  for (let i = 0; i < summaries.length; i++) {
    revenue += summaries[i].totalRevenue;
    lessons += summaries[i].totalLessonsCount;
  }

  return {
    totalRevenue: Math.round((revenue + Number.EPSILON) * 100) / 100,
    totalLessons: Math.round((lessons + Number.EPSILON) * 10) / 10,
    totalStudents: summaries.length,
  };
}
