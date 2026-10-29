import type { Html2PdfOptions } from 'html2pdf.js';

export async function generateTimeSheetPDF(element: HTMLElement, filename: string): Promise<void> {
  if (!element) {
    throw new Error('Elemento DOM não fornecido para geração do PDF');
  }

  const safeFilename = filename?.trim() || 'extrato.pdf';
  const html2pdf = (await import('html2pdf.js')).default;
  const opt: Html2PdfOptions = {
    margin: [0, 0, 0, 0],
    filename: safeFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.no-break'] },
  };
  await html2pdf().set(opt).from(element).save();
}
