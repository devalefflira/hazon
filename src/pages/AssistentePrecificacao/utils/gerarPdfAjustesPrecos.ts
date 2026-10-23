// src/pages/AssistentePrecificacao/utils/gerarPdfAjustesPrecos.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AjusteAplicado } from '../types/precificacao.types';

interface OpcoesPdfAjustes {
  codigoLote: string;
  periodoInicio: string;
  periodoFim: string;
  margemMetaPct: number;
}

const formatarDataBr = (iso: string): string => iso.split('-').reverse().join('/');
const moeda = (v: number): string => `R$ ${v.toFixed(2).replace('.', ',')}`;
const percentual = (v: number | null): string => (v === null ? '-' : `${v.toFixed(1).replace('.', ',')}%`);

/** Gera o PDF com os ajustes de preço aplicados ou selecionados para aplicação. */
export function gerarPdfAjustesPrecos(ajustes: AjusteAplicado[], opcoes: OpcoesPdfAjustes): void {
  // Formato paisagem, igual ao relatório de Pesquisa de Preços
  const doc = new jsPDF('l', 'mm', 'a4');
  const agora = new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFillColor(9, 121, 122);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('HAZON ERP - AJUSTES DE PRECIFICAÇÃO', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Lote: ${opcoes.codigoLote} | Período: ${formatarDataBr(opcoes.periodoInicio)} a ${formatarDataBr(opcoes.periodoFim)} | Margem meta: ${percentual(opcoes.margemMetaPct)} | Itens: ${ajustes.length} | Emissão: ${dataEmissao} ${horaEmissao}`,
    14,
    17
  );

  const colunas = [
    'CÓD',
    'DESCRIÇÃO',
    'CUSTO ATUAL',
    'PREÇO ANTERIOR',
    'PREÇO NOVO',
    'MARGEM ANTERIOR',
    'MARGEM NOVA',
    'MOTIVO'
  ];

  const linhas = ajustes.map((aj) => [
    aj.codprod,
    aj.descricao.toUpperCase(),
    moeda(aj.custo_considerado),
    moeda(aj.preco_anterior),
    moeda(aj.preco_novo),
    percentual(aj.margem_anterior_pct),
    percentual(aj.margem_nova_pct),
    aj.motivo
  ]);

  const somaAnterior = ajustes.reduce((s, a) => s + a.preco_anterior, 0);
  const somaNovo = ajustes.reduce((s, a) => s + a.preco_novo, 0);

  autoTable(doc, {
    startY: 28,
    head: [colunas],
    body: linhas,
    foot: [['', 'TOTAL DOS PREÇOS', '', moeda(somaAnterior), moeda(somaNovo), '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [9, 121, 122], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
    footStyles: { fillColor: [240, 253, 250], textColor: [9, 121, 122], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 56 }
    }
  });

  doc.save(`Ajustes_Precos_${opcoes.codigoLote}.pdf`);
}
