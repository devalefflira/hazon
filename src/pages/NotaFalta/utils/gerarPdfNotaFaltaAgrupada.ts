// src/pages/NotaFalta/utils/gerarPdfNotaFaltaAgrupada.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ItemAgrupadoPDF {
  codprod: string;
  codbarra: string;
  descricao: string;
  custoreal: number;
  pvenda: number;
  area: string;
  local: string;
  responsavel: string;
  data_registro: string;
}

export function gerarPdfNotaFaltaAgrupada(
  notasSelecionadas: any[],
  responsavelEmissao: string
) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Modo Paisagem

  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cabeçalho Principal
  doc.setFillColor(9, 121, 122);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('NOTA DE FALTA AGRUPADA', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Emissão: ${dataEmissao}, às ${horaEmissao} | Responsável pela Emissão: ${responsavelEmissao || 'Usuário'} | Notas Selecionadas: ${notasSelecionadas.length}`,
    14,
    17
  );

  // 2. Unificação de Itens (Desduplicação por produto_id / codprod)
  const itensUnificadosMap = new Map<string, ItemAgrupadoPDF>();

  notasSelecionadas.forEach((nota) => {
    (nota.itens || []).forEach((item: any) => {
      const chaveUnica = item.produto_id || item.produtos?.codprod || item.codprod;
      
      if (!itensUnificadosMap.has(chaveUnica)) {
        const prod = item.produtos || item;
        itensUnificadosMap.set(chaveUnica, {
          codprod: prod.codprod || '-',
          codbarra: prod.codbarra || '-',
          descricao: prod.descricao || 'PRODUTO NÃO IDENTIFICADO',
          custoreal: Number(prod.custoreal || item.custoreal || 0),
          pvenda: Number(prod.pvenda || item.pvenda || 0),
          area: nota.area || 'Frente e Piso de Loja',
          local: nota.local || 'Geral',
          responsavel: nota.usuarios?.nome || 'Sistema',
          data_registro: nota.data_registro ? nota.data_registro.split('T')[0].split('-').reverse().join('/') : dataEmissao
        });
      }
    });
  });

  const listaItens = Array.from(itensUnificadosMap.values());

  // 3. Montagem das Linhas da Tabela
  const colunas = [
    'CÓD SISTEMA',
    'CÓD BARRAS',
    'DESCRIÇÃO DO PRODUTO',
    'PREÇO CUSTO',
    'PREÇO VENDA',
    'ÁREA',
    'LOCAL',
    'RESPONSÁVEL',
    'DATA'
  ];

  const linhas = listaItens.map((it) => [
    it.codprod,
    it.codbarra,
    it.descricao.toUpperCase(),
    `R$ ${it.custoreal.toFixed(2)}`,
    `R$ ${it.pvenda.toFixed(2)}`,
    it.area.toUpperCase(),
    it.local.toUpperCase(),
    it.responsavel.toUpperCase(),
    it.data_registro
  ]);

  autoTable(doc, {
    startY: 28,
    head: [colunas],
    body: linhas,
    theme: 'striped',
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
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 32 },
      6: { cellWidth: 24 },
      7: { cellWidth: 28 },
      8: { cellWidth: 20, halign: 'center' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(9, 121, 122);
  doc.text(`TOTAL DE PRODUTOS UNIFICADOS: ${listaItens.length}`, 14, finalY);

  doc.save(`Nota_Falta_Agrupada_${dataEmissao.replace(/\//g, '-')}.pdf`);
}