// Arquivo: src/pages/Ofertas/utils/gerarPdfOferta.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarPdfOferta(oferta: any, itens: any[]) {
  // Instancia a classe usando 'new'
  const doc = new jsPDF();

  const dataInicioFmt = oferta.data_inicio
    ? new Date(oferta.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'N/I';
  const dataFimFmt = oferta.data_fim
    ? new Date(oferta.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'N/I';
  const tipoExibicao =
    oferta.tipo_oferta === 'Data Comemorativa' && oferta.tipo_oferta_customizado
      ? `${oferta.tipo_oferta} (${oferta.tipo_oferta_customizado})`
      : oferta.tipo_oferta || 'N/I';

  // Cabeçalho
  doc.setFontSize(16);
  doc.setTextColor(9, 121, 122); // #09797a
  doc.text('RELATÓRIO DE OFERTA CONCLUÍDA', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Código: ${oferta.codigo_customizado}`, 14, 22);
  doc.text(`Responsável: ${oferta.usuarios?.nome || 'SISTEMA'}`, 14, 27);
  doc.text(`Tipo de Oferta: ${tipoExibicao}`, 14, 32);
  doc.text(`Período da Oferta: ${dataInicioFmt} até ${dataFimFmt}`, 14, 37);

  const tableRows = itens.map((item) => {
    const prod = item.produtos || {};
    const cReal = Number(item.preco_custo_real || prod.custoreal || 0);
    const pTabela = Number(item.preco_venda_tabela || prod.pvenda || 0);
    const pOferta = Number(item.preco_oferta || 0);

    return [
      prod.codprod || 'N/A',
      prod.descricao || 'PRODUTO',
      cReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pTabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pOferta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ];
  });

  autoTable(doc, {
    startY: 42,
    head: [['CODPROD', 'DESCRIÇÃO', 'CUSTO REAL', 'PREÇO TABELA', 'PREÇO OFERTA']],
    body: tableRows,
    headStyles: { fillColor: [9, 121, 122] },
    styles: { fontSize: 8 }
  });

  doc.save(`Oferta_${oferta.codigo_customizado}.pdf`);
}