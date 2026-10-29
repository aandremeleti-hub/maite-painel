/**
 * Utilitários de formatação pt-BR para o Painel Maite.
 * Em estrita conformidade com ADR 0001 (sem new Date para YYYY-MM-DD) e STARTMEDIA Standard (< 200 linhas).
 */

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte valor numérico em moeda BRL (ex: 150 -> "R$ 150,00"; nulo/indefinido -> "R$ 0,00").
 */
export function formatCurrency(value: number | null | undefined): string {
  const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return BRL_FORMATTER.format(num).replace(/\u00a0/g, ' ');
}

/**
 * Converte string com prefixos e separadores em float puro ("R$ 1.250,50" -> 1250.5).
 */
export function parseCurrencyToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const clean = String(value).trim();
  if (!clean) return 0;

  if (clean.includes(',')) {
    const sanitized = clean
      .replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const parsed = parseFloat(sanitized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const sanitized = clean.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(sanitized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Máscara progressiva para digitação de centavos no input sem corromper o estado numérico final.
 * Ex: "1" -> "R$ 0,01", "150" -> "R$ 1,50", "15000" -> "R$ 150,00", "" -> ""
 */
export function formatCurrencyInput(value: string | null | undefined): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return formatCurrency(amount);
}

/**
 * Converte literal 'YYYY-MM-DD' em 'DD/MM/YYYY' via split por hífen sem construtor new Date() (ADR 0001).
 * Evita retrocessos involuntários de 1 dia decorrentes de conversão de fuso horário.
 */
export function formatDateBR(isoDateString: string | null | undefined): string {
  if (!isoDateString) return '';
  const dateOnly = String(isoDateString).split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return String(isoDateString);
  const [year, month, day] = parts;
  if (!year || !month || !day) return String(isoDateString);
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Máscara de exibição telefônica no padrão nacional pt-BR.
 * Trata celular (11 dígitos) e fixo (10 dígitos).
 */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return String(phone);
}
