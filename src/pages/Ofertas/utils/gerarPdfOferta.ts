// Arquivo: src/pages/Ofertas/utils/gerarPdfOferta.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarPdfOferta(
  oferta: any,
  itens: any[],
  tipoRelatorio: 'COMPLETO' | 'ENCARTE' = 'COMPLETO'
) {
  const doc = new jsPDF();

  const formatarData = (dt: string) => {
    if (!dt) return 'N/I';
    const partes = dt.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dt;
  };

  const dataInicioFmt = formatarData(oferta.data_inicio);
  const dataFimFmt = formatarData(oferta.data_fim);

  const tipoExibicao =
    oferta.tipo_oferta === 'Data Comemorativa' && oferta.tipo_oferta_customizado
      ? `${oferta.tipo_oferta} (${oferta.tipo_oferta_customizado})`
      : oferta.tipo_oferta || 'N/I';

  const tituloRelatorio =
    tipoRelatorio === 'ENCARTE'
      ? 'RELATÓRIO DE OFERTAS - ENCARTE (SIMPLIFICADO)'
      : 'RELATÓRIO DE OFERTA CONCLUÍDA (COMPLETO)';

  // Cabeçalho
  doc.setFontSize(15);
  doc.setTextColor(9, 121, 122); // #09797a
  doc.text(tituloRelatorio, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Código: ${oferta.codigo_customizado}`, 14, 22);
  doc.text(`Responsável: ${oferta.usuarios?.nome || 'SISTEMA'}`, 14, 27);
  doc.text(`Tipo de Oferta: ${tipoExibicao}`, 14, 32);
  doc.text(`Período da Oferta: de ${dataInicioFmt} até ${dataFimFmt}`, 14, 37);

  let headTable: string[][] = [];
  let tableRows: any[][] = [];

  if (tipoRelatorio === 'ENCARTE') {
    // Modo Encarte: Apenas Código, Descrição e Oferta
    headTable = [['CODPROD', 'DESCRIÇÃO DO PRODUTO', 'PREÇO OFERTA']];
    tableRows = itens.map((item) => {
      const prod = item.produtos || {};
      const pOferta = Number(item.preco_oferta || 0);

      return [
        prod.codprod || 'N/A',
        (prod.descricao || 'PRODUTO').toUpperCase(),
        pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ];
    });
  } else {
    // Modo Completo: Código, Descrição, Custo Real, Preço Tabela e Oferta
    headTable = [['CODPROD', 'DESCRIÇÃO', 'CUSTO REAL', 'PREÇO TABELA', 'PREÇO OFERTA']];
    tableRows = itens.map((item) => {
      const prod = item.produtos || {};
      const cReal = Number(item.preco_custo_real || prod.custoreal || 0);
      const pTabela = Number(item.preco_venda_tabela || prod.pvenda || 0);
      const pOferta = Number(item.preco_oferta || 0);

      return [
        prod.codprod || 'N/A',
        (prod.descricao || 'PRODUTO').toUpperCase(),
        cReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ];
    });
  }

  autoTable(doc, {
    startY: 42,
    head: headTable,
    body: tableRows,
    headStyles: { fillColor: [9, 121, 122] },
    styles: { fontSize: 8 }
  });

  const sufixoNome = tipoRelatorio === 'ENCARTE' ? 'Encarte' : 'Completo';
  doc.save(`Oferta_${oferta.codigo_customizado}_${sufixoNome}.pdf`);
}