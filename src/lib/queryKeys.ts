export const queryKeys = {
  students: {
    all: ['students'] as const,
    list: (status?: string) => [...queryKeys.students.all, { status }] as const,
    detail: (id: string) => [...queryKeys.students.all, id] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    byMonth: (year: number, month: number, studentId?: string) =>
      [...queryKeys.lessons.all, { year, month, studentId }] as const,
    list: (studentId?: string, month?: number, year?: number) =>
      ['lessons', studentId, month, year] as const,
  },
  closings: {
    all: ['closings'] as const,
    byYear: (year?: number) => [...queryKeys.closings.all, { year }] as const,
    totals: (year: number, month: number) => ['monthly_totals', year, month] as const,
    status: (year: number, month: number) => ['month_status', year, month] as const,
    studentDetail: (studentId: string | undefined, year: number, month: number) =>
      ['student_monthly_detail', studentId, year, month] as const,
    studentRevenue: (studentId: string | undefined, year: number, month: number) =>
      ['student_monthly_revenue', studentId, year, month] as const,
  },
  paymentInfo: {
    all: ['payment_info'] as const,
  },
};
