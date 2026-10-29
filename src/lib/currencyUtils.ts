/**
 * Utilitários puros e desacoplados para formatação monetária em padrão BRL.
 * Otimizado para renderização no Time Sheet, exportação de PDF e impressão vetorial.
 * Em conformidade com STARTMEDIA Standard (< 200 linhas).
 */

const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL_NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte valor numérico em moeda BRL (ex: 150 -> "R$ 150,00"; nulo/indefinido/NaN -> "R$ 0,00").
 * Substitui o caractere de espaço não-quebrável (NBSP) por espaço simples para compatibilidade
 * com bibliotecas de renderização gráfica e exportação de PDF (ex: html2pdf.js).
 */
export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return 'R$ 0,00';
  }
  return BRL_CURRENCY_FORMATTER.format(value).replace(/\u00a0/g, ' ');
}

/**
 * Converte string formatada em moeda BRL em número de ponto flutuante puro.
 * Ex: "R$ 1.250,50" -> 1250.5; "R$ 0,00" -> 0; inválido -> 0
 */
export function parseCurrencyBRL(value: string | null | undefined): number {
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
 * Formata um número no padrão decimal pt-BR (ex: 1250.5 -> "1.250,50").
 */
export function formatNumberBRL(
  value: number | null | undefined,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '0,00';
  }

  if (minimumFractionDigits === 2 && maximumFractionDigits === 2) {
    return BRL_NUMBER_FORMATTER.format(value);
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}
