// src/pages/AuditoriaPrecificacao/utils/etiquetasPdf.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditoriaItemRegistro } from '../types/auditoria.types';

const VERDE_INSTITUCIONAL: [number, number, number] = [9, 121, 122];
const CINZA_TEXTO: [number, number, number] = [80, 80, 80];

/**
 * Gera o PDF de etiquetas pendentes e abre a prévia em uma nova aba.
 * Retorna false quando o navegador bloqueia a janela (pop-up).
 */
export function gerarPdfEtiquetas(itens: AuditoriaItemRegistro[], responsavel: string): boolean {
  const agora = new Date();
  const dataHora = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  autoTable(doc, {
    head: [['Código', 'Descrição']],
    body: itens.map((i) => [i.codprod, i.descricao]),
    startY: 42,
    margin: { top: 42, left: 14, right: 14, bottom: 14 },
    headStyles: { fillColor: VERDE_INSTITUCIONAL, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', font: 'courier' },
      1: { cellWidth: 'auto' }
    },
    didDrawPage: () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...VERDE_INSTITUCIONAL);
      doc.text('Etiquetas de preço pendentes', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...CINZA_TEXTO);
      doc.text(`Data e hora: ${dataHora}`, 14, 24);
      doc.text(`Responsável: ${responsavel || '-'}`, 14, 30);
      doc.text(`Total de etiquetas: ${itens.length}`, 14, 36);
    }
  });

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, '_blank');
  if (!janela) {
    URL.revokeObjectURL(url);
    return false;
  }
  return true;
}
