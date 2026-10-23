// src/pages/AuditoriaPrecificacao/utils/correcaoPrecosPdf.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ROTULO_CLASSIFICACAO } from '../types/auditoria.types';
import type { AuditoriaItemRegistro } from '../types/auditoria.types';
import { precoParaMeta } from './margem';

const VERDE_INSTITUCIONAL: [number, number, number] = [9, 121, 122];
const CINZA_TEXTO: [number, number, number] = [80, 80, 80];

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const percentual = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : `${Number(valor).toFixed(1).replace('.', ',')}%`;

const campoAssinatura = (doc: jsPDF, rotulo: string, x: number, y: number, largura: number): void => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CINZA_TEXTO);
  doc.text(rotulo, x, y);
  doc.setDrawColor(120, 120, 120);
  doc.line(x, y + 9, x + largura, y + 9);
};

/**
 * Gera o PDF de itens para correção de preço, para impressão. Cada item tem um campo em branco
 * para o gestor escrever o preço sugerido, e o relatório termina com o bloco de assinaturas.
 * Retorna false quando o navegador bloqueia a janela (pop-up).
 */
export function gerarPdfCorrecaoPrecos(itens: AuditoriaItemRegistro[], geradoPor: string): boolean {
  const agora = new Date();
  const geradoEm = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...VERDE_INSTITUCIONAL);
  doc.text('Correção de preços: itens fora da faixa de margem', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA_TEXTO);
  doc.text(`Gerado em: ${geradoEm}   •   Gerado por: ${geradoPor || '-'}   •   Itens: ${itens.length}`, 14, 22);

  autoTable(doc, {
    startY: 27,
    margin: { top: 16, left: 14, right: 14, bottom: 14 },
    head: [['Código', 'Descrição', 'Departamento › Seção › Categoria', 'Custo', 'Preço atual', 'Margem real', 'Meta', 'Preço p/ meta', 'Classificação', 'Preço sugerido']],
    body: itens.map((i) => {
      const meta = i.margem_meta_pct !== null ? Number(i.margem_meta_pct) : null;
      const precoMeta = precoParaMeta(Number(i.custo_sistema), meta);
      return [
        i.codprod,
        i.descricao,
        [i.departamento, i.secao_produto, i.categoria].filter(Boolean).join(' › ') || '-',
        moeda(Number(i.custo_sistema)),
        moeda(Number(i.preco_margem ?? i.preco_sistema)),
        percentual(i.margem_real_pct !== null ? Number(i.margem_real_pct) : null),
        percentual(meta),
        moeda(precoMeta),
        i.margem_classificacao ? ROTULO_CLASSIFICACAO[i.margem_classificacao] : '-',
        ''
      ];
    }),
    headStyles: { fillColor: VERDE_INSTITUCIONAL, textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle', overflow: 'linebreak', minCellHeight: 11 },
    columnStyles: {
      1: { cellWidth: 55 },
      2: { cellWidth: 50 },
      9: { cellWidth: 35, fillColor: [255, 255, 255] }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...VERDE_INSTITUCIONAL);
        doc.text('Correção de preços: itens fora da faixa de margem', 14, 10);
      }
    }
  });

  // Bloco de assinaturas ao final do relatório (quebra de página se não couber)
  const fimTabela = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = fimTabela + 12;
  if (y + 44 > alturaPagina - 12) {
    doc.addPage();
    y = 25;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...VERDE_INSTITUCIONAL);
  doc.text('Registro de alteração de preços', 14, y);

  campoAssinatura(doc, 'Gestor da precificação (nome e assinatura)', 14, y + 10, 150);
  campoAssinatura(doc, 'Data', 175, y + 10, 80);
  campoAssinatura(doc, 'Responsável pela alteração no sistema (nome e assinatura)', 14, y + 28, 150);
  campoAssinatura(doc, 'Data', 175, y + 28, 80);

  const url = URL.createObjectURL(doc.output('blob'));
  const janela = window.open(url, '_blank');
  if (!janela) {
    URL.revokeObjectURL(url);
    return false;
  }
  return true;
}
