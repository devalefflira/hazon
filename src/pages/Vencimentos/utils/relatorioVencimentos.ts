// src/pages/Vencimentos/utils/relatorioVencimentos.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RowInput } from 'jspdf-autotable';
import type { CicloVencimento, VencimentoItem } from '../services/vencimentosService';
import {
  ROTULO_ACAO,
  descontoSobreVenda,
  detalheAcao,
  formatarDataBR,
  formatarDataHoraBR,
  moeda,
  numeroBR,
  percentual,
  quantidadePorTipo,
  sequenciaAcoes
} from './vencimentosUtils';

export type DestaqueKpi = 'perigo' | 'alerta' | 'ok' | 'neutro';

export interface KpiRelatorio {
  rotulo: string;
  valor: string;
  destaque?: DestaqueKpi;
}

export interface SecaoRelatorio {
  titulo: string;
  colunas: string[];
  linhas: string[][];
  colunasDireita?: number[];
  vazio?: string;
}

export interface DadosRelatorio {
  titulo: string;
  subtitulo: string;
  filtrosTexto: string;
  kpis: KpiRelatorio[];
  secoes: SecaoRelatorio[];
  nomeArquivo: string;
}

declare global {
  interface Window {
    __hazonVencimentosExportarPdf?: () => void;
  }
}

const VERDE: [number, number, number] = [9, 121, 122];
const CINZA: [number, number, number] = [90, 90, 90];

// ---------- Montagem: Gestão de Ações (Ciclos) ----------

export function montarRelatorioCiclos(
  ciclos: CicloVencimento[],
  filtrosTexto: string,
  incluirHistorico: boolean
): DadosRelatorio {
  const custoAcao = (c: CicloVencimento, preco: number | null) => (preco !== null && preco > 0 ? preco : c.custo_unitario);

  let valorRisco = 0;
  let perdaDescarte = 0;
  let recuperadoTroca = 0;
  let negociado = 0;
  let valorExposto = 0;
  let totalOfertas = 0;
  const descontos: number[] = [];

  type Agreg = { ciclos: number; risco: number; descarte: number; troca: number; negociado: number };
  const porDepto: Record<string, Agreg> = {};
  const porDesfecho: Record<string, { ciclos: number; risco: number }> = {};

  ciclos.forEach((c) => {
    const risco = c.quantidade * c.custo_unitario;
    let descarte = 0;
    let troca = 0;
    let neg = 0;

    c.acoes.forEach((a) => {
      if (a.tipo === 'Descarte') descarte += Number(a.quantidade || 0) * custoAcao(c, a.preco_custo);
      if (a.tipo === 'Troca') troca += Number(a.quantidade || 0) * custoAcao(c, a.preco_custo);
      if (a.tipo === 'Negociação') neg += Number(a.valor_negociado || 0);
      if (a.tipo === 'Oferta') {
        totalOfertas += 1;
        const d = a.preco_venda !== null && a.preco_oferta !== null ? descontoSobreVenda(a.preco_venda, a.preco_oferta) : null;
        if (d !== null) descontos.push(d);
      }
    });

    const qtdDestinada = quantidadePorTipo(c.acoes, 'Troca') + quantidadePorTipo(c.acoes, 'Descarte');
    valorExposto += Math.max(0, c.quantidade - qtdDestinada) * c.custo_unitario;

    valorRisco += risco;
    perdaDescarte += descarte;
    recuperadoTroca += troca;
    negociado += neg;

    const depto = c.produtos?.departamento || 'SEM DEPARTAMENTO';
    porDepto[depto] = porDepto[depto] || { ciclos: 0, risco: 0, descarte: 0, troca: 0, negociado: 0 };
    porDepto[depto].ciclos += 1;
    porDepto[depto].risco += risco;
    porDepto[depto].descarte += descarte;
    porDepto[depto].troca += troca;
    porDepto[depto].negociado += neg;

    const desfecho = c.status === 'Finalizado' ? c.desfecho || sequenciaAcoes(c.acoes) : `${sequenciaAcoes(c.acoes)} (em curso)`;
    porDesfecho[desfecho] = porDesfecho[desfecho] || { ciclos: 0, risco: 0 };
    porDesfecho[desfecho].ciclos += 1;
    porDesfecho[desfecho].risco += risco;
  });

  const emCurso = ciclos.filter((c) => c.status === 'Em Curso').length;
  const descontoMedio = descontos.length ? descontos.reduce((a, b) => a + b, 0) / descontos.length : null;

  const kpis: KpiRelatorio[] = [
    { rotulo: 'Ciclos', valor: numeroBR(ciclos.length) },
    { rotulo: 'Em Curso / Finalizados', valor: `${emCurso} / ${ciclos.length - emCurso}` },
    { rotulo: 'Valor em Risco (custo)', valor: moeda(valorRisco), destaque: 'alerta' },
    { rotulo: 'Ainda sem destino (custo)', valor: moeda(valorExposto), destaque: 'alerta' },
    { rotulo: 'Ofertas Lançadas', valor: numeroBR(totalOfertas) },
    { rotulo: 'Desconto Médio Ofertas', valor: percentual(descontoMedio) },
    { rotulo: 'Perda por Descarte', valor: moeda(perdaDescarte), destaque: 'perigo' },
    { rotulo: 'Recuperado (Troca + Negoc.)', valor: moeda(recuperadoTroca + negociado), destaque: 'ok' }
  ];

  const secoes: SecaoRelatorio[] = [
    {
      titulo: 'Resumo por Departamento',
      colunas: ['Departamento', 'Ciclos', 'Valor em Risco', 'Perda Descarte', 'Recuperado Troca', 'Negociado'],
      colunasDireita: [1, 2, 3, 4, 5],
      linhas: Object.entries(porDepto)
        .sort((a, b) => b[1].risco - a[1].risco)
        .map(([d, v]) => [d, numeroBR(v.ciclos), moeda(v.risco), moeda(v.descarte), moeda(v.troca), moeda(v.negociado)])
    },
    {
      titulo: 'Resumo por Desfecho (sequência de ações)',
      colunas: ['Desfecho', 'Ciclos', 'Valor em Risco'],
      colunasDireita: [1, 2],
      linhas: Object.entries(porDesfecho)
        .sort((a, b) => b[1].ciclos - a[1].ciclos)
        .map(([d, v]) => [d, numeroBR(v.ciclos), moeda(v.risco)])
    },
    {
      titulo: 'Ciclos de Ação',
      colunas: ['Ciclo', 'Produto', 'Depto / Setor', 'Lote', 'Vencimento', 'Qtd', 'Valor Custo', 'Ações', 'Status', 'Início', 'Finalização'],
      colunasDireita: [5, 6],
      linhas: ciclos.map((c) => [
        c.codigo_customizado,
        `${c.produtos?.codprod || '-'} - ${c.produtos?.descricao || '-'}`,
        `${c.produtos?.departamento || '-'} / ${c.produtos?.secao || '-'}`,
        c.lote,
        formatarDataBR(c.data_validade),
        `${numeroBR(c.quantidade)} ${c.produtos?.unidade || 'UN'}`,
        moeda(c.quantidade * c.custo_unitario),
        sequenciaAcoes(c.acoes),
        c.status,
        `${formatarDataHoraBR(c.iniciado_em)} (${c.iniciadoPorNome})`,
        c.finalizado_em ? `${formatarDataHoraBR(c.finalizado_em)} (${c.finalizadoPorNome || '-'})` : '-'
      ])
    }
  ];

  if (incluirHistorico) {
    const linhasHist: string[][] = [];
    ciclos.forEach((c) => {
      const prodTxt = `${c.produtos?.codprod || '-'} - ${c.produtos?.descricao || '-'}`;
      linhasHist.push([c.codigo_customizado, prodTxt, formatarDataHoraBR(c.iniciado_em), 'Ciclo iniciado', `Origem: ${c.origem}`, c.iniciadoPorNome]);
      c.acoes.forEach((a) => {
        linhasHist.push([c.codigo_customizado, prodTxt, formatarDataHoraBR(a.created_at), ROTULO_ACAO[a.tipo], detalheAcao(a, c.produtos?.unidade || 'UN'), a.usuarioNome]);
      });
      if (c.finalizado_em) {
        linhasHist.push([
          c.codigo_customizado,
          prodTxt,
          formatarDataHoraBR(c.finalizado_em),
          'Ciclo finalizado',
          c.observacao_final ? `Obs.: ${c.observacao_final}` : `Desfecho: ${c.desfecho || '-'}`,
          c.finalizadoPorNome || '-'
        ]);
      }
    });
    secoes.push({
      titulo: 'Histórico Detalhado',
      colunas: ['Ciclo', 'Produto', 'Data / Hora', 'Ação', 'Detalhe', 'Usuário'],
      linhas: linhasHist
    });
  }

  return {
    titulo: 'Relatório de Gestão de Vencimentos – Ações',
    subtitulo: 'Ofertas, trocas, descartes e negociações aplicadas aos itens a vencer',
    filtrosTexto,
    kpis,
    secoes,
    nomeArquivo: `vencimentos-acoes-${new Date().toLocaleDateString('sv-SE')}.pdf`
  };
}

// ---------- Montagem: Posição de Vencimentos ----------

export function montarRelatorioPosicao(
  itens: VencimentoItem[],
  cicloPorChave: Record<string, CicloVencimento | undefined>,
  chave: (i: VencimentoItem) => string,
  filtrosTexto: string
): DadosRelatorio {
  const faixa = (d: number) => (d < 0 ? 'Vencidos' : d <= 30 ? 'Até 30 dias' : d <= 45 ? '31 a 45 dias' : '46 dias ou mais');
  const ordemFaixas = ['Vencidos', 'Até 30 dias', '31 a 45 dias', '46 dias ou mais'];

  const porFaixa: Record<string, { itens: number; qtd: number; valor: number; comAcao: number; semAcao: number }> = {};
  const porDepto: Record<string, { itens: number; valor: number; semAcao: number }> = {};
  let valorTotal = 0;
  let semAcao = 0;

  itens.forEach((i) => {
    const valor = i.quantidade * Number(i.produtos?.custoreal || 0);
    const temAcao = !!cicloPorChave[chave(i)];
    valorTotal += valor;
    if (!temAcao) semAcao += 1;

    const f = faixa(i.diasParaVencer);
    porFaixa[f] = porFaixa[f] || { itens: 0, qtd: 0, valor: 0, comAcao: 0, semAcao: 0 };
    porFaixa[f].itens += 1;
    porFaixa[f].qtd += i.quantidade;
    porFaixa[f].valor += valor;
    if (temAcao) porFaixa[f].comAcao += 1;
    else porFaixa[f].semAcao += 1;

    const d = i.produtos?.departamento || 'SEM DEPARTAMENTO';
    porDepto[d] = porDepto[d] || { itens: 0, valor: 0, semAcao: 0 };
    porDepto[d].itens += 1;
    porDepto[d].valor += valor;
    if (!temAcao) porDepto[d].semAcao += 1;
  });

  const kpis: KpiRelatorio[] = [
    { rotulo: 'Itens Monitorados', valor: numeroBR(itens.length) },
    { rotulo: 'Vencidos', valor: numeroBR(porFaixa['Vencidos']?.itens || 0), destaque: 'perigo' },
    { rotulo: 'Até 30 dias', valor: numeroBR(porFaixa['Até 30 dias']?.itens || 0), destaque: 'alerta' },
    { rotulo: 'Valor em Risco (custo)', valor: moeda(valorTotal), destaque: 'alerta' },
    { rotulo: 'Sem Ação', valor: numeroBR(semAcao), destaque: semAcao > 0 ? 'perigo' : 'ok' },
    { rotulo: 'Com Ação Iniciada', valor: numeroBR(itens.length - semAcao), destaque: 'ok' },
    { rotulo: '31 a 45 dias', valor: numeroBR(porFaixa['31 a 45 dias']?.itens || 0) },
    { rotulo: '46 dias ou mais', valor: numeroBR(porFaixa['46 dias ou mais']?.itens || 0) }
  ];

  const secoes: SecaoRelatorio[] = [
    {
      titulo: 'Resumo por Faixa de Vencimento',
      colunas: ['Faixa', 'Itens', 'Quantidade', 'Valor Custo', 'Com Ação', 'Sem Ação'],
      colunasDireita: [1, 2, 3, 4, 5],
      linhas: ordemFaixas
        .filter((f) => porFaixa[f])
        .map((f) => [f, numeroBR(porFaixa[f].itens), numeroBR(porFaixa[f].qtd), moeda(porFaixa[f].valor), numeroBR(porFaixa[f].comAcao), numeroBR(porFaixa[f].semAcao)])
    },
    {
      titulo: 'Resumo por Departamento',
      colunas: ['Departamento', 'Itens', 'Valor Custo', 'Sem Ação'],
      colunasDireita: [1, 2, 3],
      linhas: Object.entries(porDepto)
        .sort((a, b) => b[1].valor - a[1].valor)
        .map(([d, v]) => [d, numeroBR(v.itens), moeda(v.valor), numeroBR(v.semAcao)])
    },
    {
      titulo: 'Itens',
      colunas: ['Código', 'Produto', 'Depto / Setor', 'Lote', 'Vencimento', 'Dias', 'Qtd', 'Valor Custo', 'Origem', 'Situação'],
      colunasDireita: [5, 6, 7],
      linhas: itens.map((i) => {
        const ciclo = cicloPorChave[chave(i)];
        return [
          i.codigo_customizado || '-',
          `${i.produtos?.codprod || '-'} - ${i.produtos?.descricao || '-'}`,
          `${i.produtos?.departamento || '-'} / ${i.produtos?.secao || '-'}`,
          i.lote,
          formatarDataBR(i.data_validade),
          String(i.diasParaVencer),
          `${numeroBR(i.quantidade)} ${i.produtos?.unidade || 'UN'}`,
          moeda(i.quantidade * Number(i.produtos?.custoreal || 0)),
          i.origem,
          ciclo ? `Em ação: ${sequenciaAcoes(ciclo.acoes)}` : 'Sem ação'
        ];
      })
    }
  ];

  return {
    titulo: 'Relatório de Posição de Vencimentos',
    subtitulo: 'Itens a vencer e vencidos ainda não finalizados, por faixa e situação de ação',
    filtrosTexto,
    kpis,
    secoes,
    nomeArquivo: `vencimentos-posicao-${new Date().toLocaleDateString('sv-SE')}.pdf`
  };
}

// ---------- Exportação PDF (jsPDF + AutoTable) ----------

/** Helvetica padrão não tem setas nem ≤/≥: troca por equivalentes ASCII. */
const textoPdf = (s: string) => s.replace(/→/g, '>').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/•/g, '-');

export function exportarRelatorioPdf(dados: DadosRelatorio): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const larguraUtil = 269;
  const agora = new Date();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...VERDE);
  doc.text('HAZON ERP', 14, 13);
  doc.setFontSize(14);
  doc.text(textoPdf(dados.titulo), 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CINZA);
  doc.text(textoPdf(dados.subtitulo), 14, 25);
  doc.text(`Emitido em ${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 283, 13, { align: 'right' });

  const linhasFiltro = doc.splitTextToSize(textoPdf(`Filtros: ${dados.filtrosTexto}`), larguraUtil) as string[];
  doc.text(linhasFiltro, 14, 30);
  let y = 30 + linhasFiltro.length * 4 + 2;

  // KPIs em grade 4 x N
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, halign: 'center', lineColor: [226, 232, 240] },
    bodyStyles: { textColor: [30, 41, 59] },
    body: Array.from({ length: Math.ceil(dados.kpis.length / 4) }, (_, linha) =>
      dados.kpis.slice(linha * 4, linha * 4 + 4).map((k) => `${textoPdf(k.rotulo).toUpperCase()}\n${k.valor}`)
    ),
    didParseCell: (hook) => {
      hook.cell.styles.fontStyle = 'bold';
      hook.cell.styles.fillColor = [248, 250, 252];
    }
  });
  y = ((doc as any).lastAutoTable?.finalY || y) + 6;

  dados.secoes.forEach((secao) => {
    if (y > 185) {
      doc.addPage();
      y = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...VERDE);
    doc.text(textoPdf(secao.titulo), 14, y);

    const colunasDireita = secao.colunasDireita || [];
    const corpo: RowInput[] = secao.linhas.length
      ? secao.linhas.map((l) => l.map(textoPdf))
      : [[{ content: secao.vazio || 'Nenhum registro.', colSpan: secao.colunas.length, styles: { halign: 'center', textColor: CINZA } }]];
    autoTable(doc, {
      startY: y + 2,
      margin: { top: 14, left: 14, right: 14, bottom: 12 },
      head: [secao.colunas.map(textoPdf)],
      body: corpo,
      styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak', textColor: [30, 41, 59] },
      headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(colunasDireita.map((i) => [i, { halign: 'right' as const }]))
    });
    y = ((doc as any).lastAutoTable?.finalY || y) + 8;
  });

  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Hazon ERP - Gestão de Vencimentos', 14, 203);
    doc.text(`Página ${p} de ${totalPaginas}`, 283, 203, { align: 'right' });
  }

  doc.save(dados.nomeArquivo);
}

// ---------- Pré-visualização HTML em nova aba ----------

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const COR_DESTAQUE: Record<DestaqueKpi, string> = {
  perigo: '#dc2626',
  alerta: '#d97706',
  ok: '#059669',
  neutro: '#09797a'
};

export function gerarHtmlPreview(dados: DadosRelatorio): string {
  const kpis = dados.kpis
    .map(
      (k) => `<div class="kpi"><div class="kpi-l">${esc(k.rotulo)}</div><div class="kpi-v" style="color:${COR_DESTAQUE[k.destaque || 'neutro']}">${esc(k.valor)}</div></div>`
    )
    .join('');

  const secoes = dados.secoes
    .map((s) => {
      const dir = new Set(s.colunasDireita || []);
      const head = s.colunas.map((c, i) => `<th class="${dir.has(i) ? 'r' : ''}">${esc(c)}</th>`).join('');
      const body = s.linhas.length
        ? s.linhas.map((l) => `<tr>${l.map((c, i) => `<td class="${dir.has(i) ? 'r' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${s.colunas.length}" class="vazio">${esc(s.vazio || 'Nenhum registro.')}</td></tr>`;
      return `<section><h2>${esc(s.titulo)} <span>(${s.linhas.length})</span></h2><div class="tw"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
    })
    .join('');

  const emissao = new Date().toLocaleString('pt-BR');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(dados.titulo)} - Hazon ERP</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
  body { margin: 0; background: #f1f5f9; font-size: 11px; }
  .barra { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 10px 16px; background: #09797a; }
  .barra span { color: #fff; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .3px; }
  .barra div { display: flex; gap: 8px; }
  .barra button { border: 0; border-radius: 12px; padding: 9px 14px; font-weight: 800; font-size: 11px; text-transform: uppercase; cursor: pointer; }
  .b-pdf { background: #fff; color: #09797a; }
  .b-print { background: #075f60; color: #fff; }
  .folha { max-width: 1180px; margin: 16px auto; background: #fff; border-radius: 20px; padding: 22px; box-shadow: 0 4px 20px rgba(15,23,42,.08); }
  header { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #09797a; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .logo { font-size: 11px; font-weight: 900; color: #09797a; letter-spacing: 1px; }
  h1 { font-size: 17px; margin: 2px 0; color: #0f172a; }
  .sub { font-size: 10px; color: #64748b; }
  .meta { font-size: 10px; color: #475569; text-align: right; }
  .filtros { font-size: 10px; color: #475569; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; }
  .kpi-l { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .kpi-v { font-size: 15px; font-weight: 800; margin-top: 2px; }
  section { margin-bottom: 16px; }
  h2 { font-size: 12px; color: #09797a; text-transform: uppercase; margin: 0 0 6px; }
  h2 span { color: #94a3b8; font-weight: 600; }
  .tw { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #09797a; color: #fff; text-align: left; padding: 6px 7px; font-size: 9.5px; text-transform: uppercase; white-space: nowrap; }
  td { padding: 5px 7px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .r { text-align: right; white-space: nowrap; }
  .vazio { text-align: center; color: #94a3b8; padding: 14px; }
  footer { margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 6px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media (max-width: 700px) { .kpis { grid-template-columns: repeat(2, 1fr); } .folha { margin: 0; border-radius: 0; padding: 14px; } }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .barra { display: none; }
    .folha { box-shadow: none; margin: 0; padding: 0; max-width: none; border-radius: 0; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="barra">
    <span>Pré-visualização</span>
    <div>
      <button class="b-print" onclick="window.print()">Imprimir</button>
      <button class="b-pdf" onclick="exportarPdf()">Exportar PDF</button>
    </div>
  </div>
  <div class="folha">
    <header>
      <div>
        <div class="logo">HAZON ERP</div>
        <h1>${esc(dados.titulo)}</h1>
        <div class="sub">${esc(dados.subtitulo)}</div>
      </div>
      <div class="meta"><div><strong>Emissão:</strong> ${esc(emissao)}</div></div>
    </header>
    <div class="filtros"><strong>Filtros:</strong> ${esc(dados.filtrosTexto)}</div>
    <div class="kpis">${kpis}</div>
    ${secoes}
    <footer><span>Hazon ERP • Gestão de Vencimentos</span><span>Relatório Gerencial</span></footer>
  </div>
  <script>
    function exportarPdf() {
      try {
        if (window.opener && !window.opener.closed && window.opener.__hazonVencimentosExportarPdf) {
          window.opener.__hazonVencimentosExportarPdf();
          return;
        }
      } catch (e) {}
      alert('A tela de origem foi fechada. Use "Imprimir" e escolha "Salvar como PDF".');
      window.print();
    }
  </script>
</body>
</html>`;
}

/** Abre a pré-visualização em nova aba. Retorna false se o navegador bloquear o pop-up. */
export function abrirPreviewRelatorio(dados: DadosRelatorio): boolean {
  window.__hazonVencimentosExportarPdf = () => exportarRelatorioPdf(dados);

  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.open();
  janela.document.write(gerarHtmlPreview(dados));
  janela.document.close();
  return true;
}
