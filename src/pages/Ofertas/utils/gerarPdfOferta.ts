// src/pages/Ofertas/utils/gerarPdfOferta.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarPdfOferta(
  oferta: any,
  itens: any[],
  tipoRelatorio: 'COMPLETO' | 'ENCARTE' | 'FASE_ATIVA' = 'COMPLETO'
) {
  const doc = new jsPDF();

  const formatarData = (dt?: string) => {
    if (!dt) return 'N/I';
    const partes = dt.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dt;
  };

  const statusAtual = oferta.status || 'Lista Sugerida';
  const dataInicioFmt = formatarData(oferta.data_inicio);
  const dataFimFmt = formatarData(oferta.data_fim);

  const tipoExibicao =
    oferta.tipo_oferta === 'Data Comemorativa' && oferta.tipo_oferta_customizado
      ? `${oferta.tipo_oferta} (${oferta.tipo_oferta_customizado})`
      : oferta.tipo_oferta || 'Definição Pendente';

  // Definição do Título com base na Fase
  let tituloRelatorio = 'RELATÓRIO DE OFERTAS';
  if (tipoRelatorio === 'ENCARTE') {
    tituloRelatorio = 'RELATÓRIO DE OFERTAS - ENCARTE (SIMPLIFICADO)';
  } else if (statusAtual === 'Lista Sugerida' || statusAtual === 'Em Andamento') {
    tituloRelatorio = 'FOLHA DE CONFERÊNCIA - LISTA SUGERIDA DE OFERTAS';
  } else if (statusAtual === 'Revisar/Aprovar' || statusAtual === 'Criada Finalizada') {
    tituloRelatorio = 'FOLHA DE APROVAÇÃO / REVISÃO DE OFERTAS';
  } else if (statusAtual === 'Precificar') {
    tituloRelatorio = 'PLANILHA DE PRECIFICAÇÃO DE OFERTAS';
  } else {
    tituloRelatorio = 'RELATÓRIO DE OFERTA CONCLUÍDA (COMPLETO)';
  }

  // Cabeçalho Visual
  doc.setFontSize(14);
  doc.setTextColor(9, 121, 122); // #09797a
  doc.text(tituloRelatorio, 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text(`Código: ${oferta.codigo_customizado || 'OFT-S/C'}`, 14, 22);
  doc.text(`Responsável: ${oferta.usuarios?.nome || 'SISTEMA'}`, 14, 27);
  doc.text(`Fase Atual: ${statusAtual.toUpperCase()}`, 14, 32);

  if (oferta.data_inicio && oferta.data_fim) {
    doc.text(`Tipo / Período: ${tipoExibicao} (de ${dataInicioFmt} até ${dataFimFmt})`, 14, 37);
  } else {
    doc.text(`Tipo de Campanha: ${tipoExibicao}`, 14, 37);
  }

  let headTable: string[][] = [];
  let tableRows: any[][] = [];

  const itensValidos: any[] = (itens && itens.length > 0) ? itens : (oferta.oferta_itens || []);

  if (tipoRelatorio === 'ENCARTE') {
    // Modo Encarte Simplificado
    headTable = [['CODPROD', 'DESCRIÇÃO DO PRODUTO', 'PREÇO OFERTA']];
    tableRows = itensValidos.map((item: any) => {
      const prod = item.produtos || {};
      const pOferta = Number(item.preco_oferta || 0);

      return [
        prod.codprod || item.codprod || 'N/A',
        (prod.descricao || item.descricao || 'PRODUTO').toUpperCase(),
        pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ];
    });
  } else if (statusAtual === 'Lista Sugerida' || statusAtual === 'Revisar/Aprovar') {
    // Fase de Sugestão / Revisão: Traz Custo, Venda e Campo para Anotação
    headTable = [['CODPROD', 'DESCRIÇÃO', 'CUSTO REAL', 'PVENDA TABELA', 'SUGESTÃO OFERTA']];
    tableRows = itensValidos.map((item: any) => {
      const prod = item.produtos || {};
      const cReal = Number(item.preco_custo_real || prod.custoreal || 0);
      const pTabela = Number(item.preco_venda_tabela || prod.pvenda || 0);
      const pOferta = Number(item.preco_oferta || 0);

      return [
        prod.codprod || item.codprod || 'N/A',
        (prod.descricao || item.descricao || 'PRODUTO').toUpperCase(),
        cReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pOferta > 0
          ? pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : '[  R$ _________  ]'
      ];
    });
  } else {
    // Modo Completo Padrão
    headTable = [['CODPROD', 'DESCRIÇÃO', 'CUSTO REAL', 'PREÇO TABELA', 'PREÇO OFERTA']];
    tableRows = itensValidos.map((item: any) => {
      const prod = item.produtos || {};
      const cReal = Number(item.preco_custo_real || prod.custoreal || 0);
      const pTabela = Number(item.preco_venda_tabela || prod.pvenda || 0);
      const pOferta = Number(item.preco_oferta || 0);

      return [
        prod.codprod || item.codprod || 'N/A',
        (prod.descricao || item.descricao || 'PRODUTO').toUpperCase(),
        cReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pOferta > 0
          ? pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          : 'Pendente'
      ];
    });
  }

  autoTable(doc, {
    startY: 42,
    head: headTable,
    body: tableRows,
    headStyles: { fillColor: [9, 121, 122], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  doc.save(`Oferta_${oferta.codigo_customizado || 'Relatorio'}.pdf`);
}