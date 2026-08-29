// src/pages/Relatorios/utils/generators/gerarRelatorioConsumoLoja.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ConsumoItemRelatorio {
  codprod: string;
  descricao: string;
  unidade_medida: string;
  local: string;
  departamento: string;
  quantidade: number;
  custo_unitario: number;
  valor_total_item: number;
  data_registro: string;
  hora_registro: string;
  usuario_nome: string;
  observacao?: string;
}

export function gerarRelatorioConsumoLoja(
  itens: ConsumoItemRelatorio[],
  dataInicio: string,
  dataFim: string,
  responsavelEmissao: string = 'Usuário'
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const dtIniFmt = dataInicio ? dataInicio.split('-').reverse().join('/') : 'Início';
  const dtFimFmt = dataFim ? dataFim.split('-').reverse().join('/') : 'Hoje';

  // Cabeçalho
  doc.setFillColor(9, 121, 122);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('HAZON ERP - RELATÓRIO DE CONSUMO DA LOJA', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Período: ${dtIniFmt} até ${dtFimFmt} | Emitido por: ${responsavelEmissao} em ${dataEmissao} às ${horaEmissao}`,
    14,
    17
  );

  let valorTotalGeral = 0;
  let qtdTotalItens = 0;

  const colunas = [
    'DATA',
    'CÓD',
    'DESCRIÇÃO DO PRODUTO',
    'LOCAL / DESTINO',
    'QTD',
    'CUSTO UN',
    'TOTAL (R$)'
  ];

  const linhas = itens.map((it) => {
    const total = Number(it.valor_total_item || 0);
    const qtd = Number(it.quantidade || 0);
    valorTotalGeral += total;
    qtdTotalItens += qtd;

    const dataItem = it.data_registro ? it.data_registro.split('-').reverse().join('/') : '-';

    return [
      dataItem,
      it.codprod || '-',
      it.descricao.toUpperCase(),
      (it.local || 'Geral').toUpperCase(),
      `${qtd} ${it.unidade_medida || 'UN'}`,
      `R$ ${Number(it.custo_unitario || 0).toFixed(2)}`,
      `R$ ${total.toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [colunas],
    body: linhas,
    theme: 'striped',
    headStyles: {
      fillColor: [9, 121, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 16, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 38 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(9, 121, 122);
  doc.text(`TOTAL DE REGISTROS: ${itens.length}`, 14, finalY);
  doc.text(
    `VALOR TOTAL DO CONSUMO: R$ ${valorTotalGeral.toFixed(2).replace('.', ',')}`,
    130,
    finalY
  );

  doc.save(`Relatorio_Consumo_Loja_${dtIniFmt.replace(/\//g, '-')}_a_${dtFimFmt.replace(/\//g, '-')}.pdf`);
}