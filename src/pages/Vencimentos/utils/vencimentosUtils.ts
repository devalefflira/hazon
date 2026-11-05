// src/pages/Vencimentos/utils/vencimentosUtils.ts
import type {
  AcaoVencimento,
  ProdutoVencimento,
  TipoAcaoVencimento
} from '../services/vencimentosService';

export const TIPOS_ACAO: TipoAcaoVencimento[] = ['Oferta', 'Troca', 'Descarte', 'Negociação'];

export const ROTULO_ACAO: Record<TipoAcaoVencimento, string> = {
  Oferta: 'Oferta Interna',
  Troca: 'Troca com Fornecedor',
  Descarte: 'Descarte do Item',
  'Negociação': 'Negociação/Rebaixa com Fornecedor'
};

export const ESTILO_ACAO: Record<TipoAcaoVencimento, { chip: string; ponto: string; texto: string }> = {
  Oferta: { chip: 'bg-teal-50 text-teal-800 border-teal-200', ponto: 'bg-teal-600', texto: 'text-teal-700' },
  Troca: { chip: 'bg-sky-50 text-sky-800 border-sky-200', ponto: 'bg-sky-600', texto: 'text-sky-700' },
  Descarte: { chip: 'bg-red-50 text-red-700 border-red-200', ponto: 'bg-red-600', texto: 'text-red-700' },
  'Negociação': { chip: 'bg-violet-50 text-violet-800 border-violet-200', ponto: 'bg-violet-600', texto: 'text-violet-700' }
};

export const MODALIDADES_NEGOCIACAO = [
  'Rebaixa de Custo',
  'Bonificação em Mercadoria',
  'Verba / Crédito Financeiro'
] as const;

export const MOTIVOS_DESCARTE = [
  'Produto vencido',
  'Impróprio para consumo',
  'Embalagem danificada',
  'Fornecedor recusou a troca',
  'Oferta sem giro'
] as const;

// ---------- Formatação ----------

export const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined || isNaN(valor)
    ? '-'
    : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const percentual = (valor: number | null | undefined): string =>
  valor === null || valor === undefined || isNaN(valor) ? '-' : `${valor.toFixed(2).replace('.', ',')}%`;

export const numeroBR = (valor: number | null | undefined): string =>
  valor === null || valor === undefined || isNaN(valor) ? '-' : valor.toLocaleString('pt-BR');

/** Data local no formato YYYY-MM-DD (evita o deslocamento de fuso do toISOString). */
export function hojeISO(): string {
  return new Date().toLocaleDateString('sv-SE');
}

export function dataLocalISO(timestamp?: string | null): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sv-SE');
}

export function formatarDataBR(dataISO?: string | null): string {
  if (!dataISO) return '-';
  const p = dataISO.slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataISO;
}

export function formatarDataHoraBR(timestamp?: string | null): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return timestamp;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function diasAte(dataISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataISO + 'T00:00:00');
  return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function textoDias(dias: number): string {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'Vence hoje!';
  return `Vence em ${dias} dia${dias === 1 ? '' : 's'}`;
}

export function corDias(dias: number): string {
  if (dias <= 30) return 'text-red-600';
  if (dias <= 45) return 'text-amber-600';
  return 'text-emerald-600';
}

// ---------- Precificação (margem sobre o preço de venda / markdown) ----------

/** Margem sobre a venda: (venda - custo) / venda. Ex.: custo 5,00 e venda 6,67 → 25%. */
export function margemSobreVenda(custo: number, venda: number): number | null {
  if (!venda || venda <= 0) return null;
  return ((venda - custo) / venda) * 100;
}

/** Preço que entrega a margem desejada: custo / (1 - margem). Ex.: 5,00 / 0,75 = 6,67. */
export function precoPorMargem(custo: number, margemPct: number): number | null {
  if (!custo || custo <= 0 || margemPct >= 100) return null;
  return Math.round((custo / (1 - margemPct / 100)) * 100) / 100;
}

export function descontoSobreVenda(venda: number, oferta: number): number | null {
  if (!venda || venda <= 0) return null;
  return ((venda - oferta) / venda) * 100;
}

// ---------- Histórico ----------

export function chaveItem(origem: string, id: string): string {
  return `${origem}|${id}`;
}

/** Linha de detalhe de uma ação para o histórico (tela e relatório). */
export function detalheAcao(acao: AcaoVencimento, unidade = 'UN'): string {
  const partes: string[] = [];
  switch (acao.tipo) {
    case 'Oferta':
      partes.push(`Oferta ${moeda(acao.preco_oferta)} (venda ${moeda(acao.preco_venda)}, custo ${moeda(acao.preco_custo)})`);
      if (acao.margem_oferta_pct !== null) partes.push(`margem ${percentual(acao.margem_oferta_pct)}`);
      if (acao.validade_oferta) partes.push(`válida até ${formatarDataBR(acao.validade_oferta)}`);
      break;
    case 'Troca':
      partes.push(`Fornecedor: ${acao.fornecedorNome || '-'}`);
      if (acao.quantidade !== null) partes.push(`${numeroBR(acao.quantidade)} ${unidade}`);
      break;
    case 'Descarte':
      if (acao.quantidade !== null) partes.push(`${numeroBR(acao.quantidade)} ${unidade}`);
      partes.push(`Justificativa: ${acao.justificativa || '-'}`);
      break;
    case 'Negociação':
      partes.push(`Fornecedor: ${acao.fornecedorNome || '-'}`);
      if (acao.modalidade_negociacao) partes.push(acao.modalidade_negociacao);
      if (acao.novo_custo !== null) partes.push(`novo custo ${moeda(acao.novo_custo)}`);
      if (acao.valor_negociado !== null) partes.push(`valor ${moeda(acao.valor_negociado)}`);
      if (acao.quantidade !== null) partes.push(`${numeroBR(acao.quantidade)} ${unidade}`);
      break;
  }
  if (acao.observacao) partes.push(`Obs.: ${acao.observacao}`);
  return partes.join(' • ');
}

/** Sequência das ações do ciclo, agrupando repetições seguidas. Ex.: "Oferta (2x) → Descarte". */
export function sequenciaAcoes(acoes: AcaoVencimento[]): string {
  if (acoes.length === 0) return 'Sem ações';
  const grupos: { tipo: TipoAcaoVencimento; qtd: number }[] = [];
  acoes.forEach((a) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.tipo === a.tipo) ultimo.qtd += 1;
    else grupos.push({ tipo: a.tipo, qtd: 1 });
  });
  return grupos.map((g) => (g.qtd > 1 ? `${g.tipo} (${g.qtd}x)` : g.tipo)).join(' → ');
}

export function quantidadePorTipo(acoes: AcaoVencimento[], tipo: TipoAcaoVencimento): number {
  return acoes.filter((a) => a.tipo === tipo).reduce((acc, a) => acc + Number(a.quantidade || 0), 0);
}

// ---------- Filtros ----------

export type StatusAcaoFiltro = 'TODOS' | 'COM_ACAO' | 'SEM_ACAO';

export interface FiltrosVencimentos {
  dataInicio: string;
  dataFim: string;
  departamento: string;
  secao: string;
  categoria: string;
  statusAcao: StatusAcaoFiltro;
  tipoAcao: TipoAcaoVencimento | 'TODOS';
}

export const FILTROS_PADRAO: FiltrosVencimentos = {
  dataInicio: '',
  dataFim: '',
  departamento: '',
  secao: '',
  categoria: '',
  statusAcao: 'TODOS',
  tipoAcao: 'TODOS'
};

export function contarFiltrosAtivos(f: FiltrosVencimentos): number {
  return [
    f.dataInicio,
    f.dataFim,
    f.departamento,
    f.secao,
    f.categoria,
    f.statusAcao !== 'TODOS' ? 'x' : '',
    f.tipoAcao !== 'TODOS' ? 'x' : ''
  ].filter(Boolean).length;
}

export function dentroDoPeriodo(dataISO: string, inicio: string, fim: string): boolean {
  if (!dataISO) return !inicio && !fim;
  const d = dataISO.slice(0, 10);
  if (inicio && d < inicio) return false;
  if (fim && d > fim) return false;
  return true;
}

export function produtoAtendeHierarquia(prod: ProdutoVencimento | undefined, f: FiltrosVencimentos): boolean {
  if (f.departamento && (prod?.departamento || '') !== f.departamento) return false;
  if (f.secao && (prod?.secao || '') !== f.secao) return false;
  if (f.categoria && (prod?.categoria || '') !== f.categoria) return false;
  return true;
}

export interface OpcoesHierarquia {
  departamentos: string[];
  secoes: string[];
  categorias: string[];
}

/** Opções em cascata (Departamento → Setor → Categoria) a partir dos produtos carregados. */
export function montarOpcoesHierarquia(
  produtos: (ProdutoVencimento | undefined)[],
  departamento: string,
  secao: string
): OpcoesHierarquia {
  const deps = new Set<string>();
  const secs = new Set<string>();
  const cats = new Set<string>();

  produtos.forEach((p) => {
    if (!p) return;
    if (p.departamento) deps.add(p.departamento);
    if (departamento && p.departamento !== departamento) return;
    if (p.secao) secs.add(p.secao);
    if (secao && p.secao !== secao) return;
    if (p.categoria) cats.add(p.categoria);
  });

  const ordenar = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return { departamentos: ordenar(deps), secoes: ordenar(secs), categorias: ordenar(cats) };
}
