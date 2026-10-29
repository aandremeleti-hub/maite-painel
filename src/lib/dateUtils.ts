export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const MONTH_OPTIONS = MONTH_NAMES.map((name, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: name,
}));

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function getMonthYearLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}
