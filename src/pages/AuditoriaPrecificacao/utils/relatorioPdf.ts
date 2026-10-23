// src/pages/AuditoriaPrecificacao/utils/relatorioPdf.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ROTULO_CLASSIFICACAO, ROTULO_SITUACAO } from '../types/auditoria.types';
import type { AuditoriaItemRegistro } from '../types/auditoria.types';

const VERDE_INSTITUCIONAL: [number, number, number] = [9, 121, 122];
const CINZA_TEXTO: [number, number, number] = [80, 80, 80];
const TEXTO_PONTOS: [number, number, number] = [40, 40, 40];

/** A4 paisagem: 297 mm de largura menos 14 mm de margem em cada lado. */
const LARGURA_UTIL_MM = 269;

export interface FiltrosPdfRelatorio {
  periodo: string;
  secao: string;
  departamento: string;
  categoria: string;
  situacao: string;
}

interface EntradaPdfRelatorio {
  itens: AuditoriaItemRegistro[];
  pontos: string[];
  filtros: FiltrosPdfRelatorio;
}

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const percentual = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : `${Number(valor).toFixed(1).replace('.', ',')}%`;

/**
 * Gera o PDF do relatório (pontos principais + detalhamento filtrado) e abre em nova aba.
 * Retorna false quando o navegador bloqueia a janela (pop-up).
 */
export function gerarPdfRelatorio({ itens, pontos, filtros }: EntradaPdfRelatorio): boolean {
  const agora = new Date();
  const geradoEm = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...VERDE_INSTITUCIONAL);
  doc.text('Relatório de Auditoria de Precificação', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA_TEXTO);
  doc.text(`Gerado em: ${geradoEm}`, 14, 22);

  let y = 27;
  const linhasFiltros = doc.splitTextToSize(
    `Período: ${filtros.periodo}   •   Seção: ${filtros.secao}   •   Departamento: ${filtros.departamento}   •   Categoria: ${filtros.categoria}   •   Situação: ${filtros.situacao}`,
    LARGURA_UTIL_MM
  ) as string[];
  doc.text(linhasFiltros, 14, y);
  y += linhasFiltros.length * 4.5 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...VERDE_INSTITUCIONAL);
  doc.text('Pontos principais', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXTO_PONTOS);
  pontos.forEach((ponto) => {
    const linhas = doc.splitTextToSize(`• ${ponto}`, LARGURA_UTIL_MM) as string[];
    doc.text(linhas, 14, y);
    y += linhas.length * 4.8;
  });
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { top: 16, left: 14, right: 14, bottom: 12 },
    head: [['Código', 'Descrição', 'Departamento', 'Categoria', 'Seção', 'Situação', 'Custo', 'Sistema', 'Gôndola', 'Margem', 'Classificação', 'Data']],
    body: itens.map((i) => [
      i.codprod,
      i.descricao,
      i.departamento ?? '-',
      i.categoria ?? '-',
      i.secao_local,
      ROTULO_SITUACAO[i.situacao],
      moeda(Number(i.custo_sistema)),
      moeda(Number(i.preco_sistema)),
      i.preco_encontrado !== null ? moeda(Number(i.preco_encontrado)) : '-',
      percentual(i.margem_real_pct !== null ? Number(i.margem_real_pct) : null),
      i.margem_classificacao ? ROTULO_CLASSIFICACAO[i.margem_classificacao] : '-',
      i.data_auditoria.split('-').reverse().join('/')
    ]),
    headStyles: { fillColor: VERDE_INSTITUCIONAL, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
    columnStyles: { 1: { cellWidth: 60 } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...VERDE_INSTITUCIONAL);
        doc.text('Relatório de Auditoria de Precificação', 14, 10);
      }
    }
  });

  const url = URL.createObjectURL(doc.output('blob'));
  const janela = window.open(url, '_blank');
  if (!janela) {
    URL.revokeObjectURL(url);
    return false;
  }
  return true;
}
