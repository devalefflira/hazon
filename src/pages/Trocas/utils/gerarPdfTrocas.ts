// src/pages/Trocas/utils/gerarPdfTrocas.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarPdfRelatorioTroca(fornecedorNome: string, itens: any[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Cabeçalho
  doc.setFillColor(9, 121, 122);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('HAZON ERP - RELATÓRIO DE TROCAS / DEVOLUÇÕES', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fornecedor: ${fornecedorNome.toUpperCase()} | Emitido em: ${dataEmissao} às ${horaEmissao}`, 14, 18);

  // Tabela
  const colunas = ['CÓD.', 'DESCRIÇÃO DO PRODUTO', 'UN', 'QTD TOTAL', 'CUSTO UN', 'TOTAL (R$)'];
  const linhas = itens.map((it) => {
    const valorTotal = (Number(it.quantidade) * Number(it.custoreal || 0)).toFixed(2);
    return [
      it.codprod || '-',
      it.descricao_produto.toUpperCase(),
      it.unidade || 'UN',
      it.quantidade,
      `R$ ${Number(it.custoreal || 0).toFixed(2)}`,
      `R$ ${valorTotal}`
    ];
  });

  const totalGeral = itens.reduce((acc, curr) => acc + (Number(curr.quantidade) * Number(curr.custoreal || 0)), 0);

  autoTable(doc, {
    startY: 30,
    head: [colunas],
    body: linhas,
    theme: 'striped',
    headStyles: {
      fillColor: [9, 121, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50]
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(9, 121, 122);
  doc.text(`TOTAL GERAL ESTIMADO: R$ ${totalGeral.toFixed(2).replace('.', ',')}`, 14, finalY);

  doc.save(`Trocas_${fornecedorNome.replace(/\s+/g, '_')}_${dataEmissao.replace(/\//g, '-')}.pdf`);
}