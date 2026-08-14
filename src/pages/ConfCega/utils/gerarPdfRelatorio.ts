// Arquivo: src/pages/ConfCega/utils/gerarPdfRelatorio.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConferenciaMestre, ConferenciaItem } from '../types/conferencias.types';

export function gerarPdfRelatorio(conferencia: ConferenciaMestre, itens: ConferenciaItem[]) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(9, 121, 122); // #09797a
  doc.text('RELATÓRIO DE CONFERÊNCIA CEGA', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Lote: ${conferencia.codigo_customizado}`, 14, 22);
  doc.text(`Responsável: ${conferencia.usuarios?.nome || 'SISTEMA'}`, 14, 27);
  doc.text(`Data: ${conferencia.data_conferencia} às ${conferencia.hora_conferencia}`, 14, 32);
  doc.text(`NF: ${conferencia.numero_nota_fiscal || 'S/N'}`, 14, 37);

  const tableRows = itens.map((item) => {
    const prod = item.produtos || ({} as any);
    const dataValFmt = item.data_validade
      ? new Date(item.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'N/I';

    return [
      prod.codprod || 'N/A',
      (prod.descricao || 'PRODUTO').toUpperCase(),
      `${item.quantidade_contada} ${item.unidade_medida || 'UN'}`,
      item.lote || 'N/I',
      dataValFmt,
      item.observacao || '-'
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['CÓDIGO', 'PRODUTO', 'QTD CONTADA', 'LOTE', 'VALIDADE', 'OBSERVAÇÃO']],
    body: tableRows,
    headStyles: { fillColor: [9, 121, 122] },
    styles: { fontSize: 8 }
  });

  doc.save(`Conferencia_${conferencia.codigo_customizado}.pdf`);
}