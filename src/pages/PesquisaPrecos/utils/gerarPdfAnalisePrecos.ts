// src/pages/PesquisaPrecos/utils/gerarPdfAnalisePrecos.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarPdfAnalisePrecos(pesquisa: any) {
  // Formato Paisagem (Landscape)
  const doc = new jsPDF('l', 'mm', 'a4');
  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const concorrenteNome = pesquisa.pesquisa_precos_concorrentes?.nome_fantasia || pesquisa.pesquisa_precos_concorrentes?.razao_social || 'Concorrente';
  const dataFormatada = pesquisa.data_registro?.split('-').reverse().join('/') || dataEmissao;

  // Cabeçalho Principal
  doc.setFillColor(9, 121, 122);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('HAZON ERP - RELATÓRIO ESTRATÉGICO DE PESQUISA DE PREÇOS', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Pesquisa: ${pesquisa.codigo_customizado} | Concorrente: ${concorrenteNome.toUpperCase()} | Categoria: ${pesquisa.categoria_pesquisa} | Data Pesquisa: ${dataFormatada} | Emissão: ${dataEmissao} ${horaEmissao}`,
    14,
    17
  );

  const colunas = [
    'CÓD',
    'DESCRIÇÃO DO PRODUTO',
    'CUSTO',
    'NOSSO PREÇO',
    'CONCORRENTE',
    'VENCEDOR',
    'DIFERENÇA (R$)',
    'DIFERENÇA (%)',
    'MARGEM ATUAL',
    'MARGEM AJUSTADA (COMBATE)'
  ];

  const linhas = (pesquisa.pesquisa_precos_itens || []).map((item: any) => {
    const custo = Number(item.preco_custo || 0);
    const venda = Number(item.preco_venda || 0);
    const conc = Number(item.preco_concorrente || 0);

    const nossoVenceu = venda <= conc;
    const diferencaCentavos = Math.abs(venda - conc);
    const diferencaPerc = conc > 0 ? (Math.abs(venda - conc) / conc) * 100 : 0;

    // Margem Atual (Markdown: (Venda - Custo) / Venda)
    const margemAtual = venda > 0 ? ((venda - custo) / venda) * 100 : 0;

    // Margem Ajustada de Combate (Preço do concorrente - R$ 0,05)
    const precoAlvoCombate = conc > 0.05 ? conc - 0.05 : conc;
    const margemCombate = precoAlvoCombate > 0 ? ((precoAlvoCombate - custo) / precoAlvoCombate) * 100 : 0;

    return [
      item.produtos?.codprod || '-',
      (item.produtos?.descricao || 'Produto').toUpperCase(),
      `R$ ${custo.toFixed(2)}`,
      `R$ ${venda.toFixed(2)}`,
      `R$ ${conc.toFixed(2)}`,
      nossoVenceu ? 'NOSSO PREÇO' : 'CONCORRENTE',
      `R$ ${diferencaCentavos.toFixed(2)}`,
      `${diferencaPerc.toFixed(1)}%`,
      `${margemAtual.toFixed(1)}%`,
      nossoVenceu 
        ? `${margemAtual.toFixed(1)}% (Líder)` 
        : `R$ ${precoAlvoCombate.toFixed(2)} (${margemCombate.toFixed(1)}%)`
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [colunas],
    body: linhas,
    theme: 'grid',
    headStyles: {
      fillColor: [9, 121, 122],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40]
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
      9: { cellWidth: 34, halign: 'right' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'NOSSO PREÇO') {
          data.cell.styles.fillColor = [220, 252, 231]; // Verde claro
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.fillColor = [254, 226, 226]; // Vermelho claro
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  doc.save(`Analise_Precos_${pesquisa.codigo_customizado}_${concorrenteNome.replace(/\s+/g, '_')}.pdf`);
}