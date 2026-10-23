// src/pages/AssistentePrecificacao/utils/motorAnalise.ts
import type {
  AlertaAnalise,
  ParametrosAnalise,
  ProdutoCadastro,
  ResultadoAnaliseItem,
  SeveridadeAlerta,
  StatusAnalise
} from '../types/precificacao.types';

export const PARAMETROS_PADRAO: ParametrosAnalise = {
  margemMetaPct: 25,
  limiarAtencaoPct: 15,
  limiarCriticoPct: 40
};

export interface PeriodoAnalise {
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
}

/** Dados do item que o motor precisa para analisar (já em camelCase). */
export interface EntradaAnalise {
  codbarra: string;
  dataAlteracao: string | null;
  dataUltimaEntrada: string | null;
  custoAtual: number;
  custoPenultimo: number;
  custoAntepenultimo: number;
  precoVenda: number;
  margemCadastroPct: number | null;
}

const truncar2 = (valor: number): number => Math.floor(valor * 100 + 1e-9) / 100;

const variacaoPct = (atual: number, base: number): number | null =>
  base > 0 ? ((atual - base) / base) * 100 : null;

const diasEntre = (inicio: string, fim: string): number =>
  (Date.parse(fim) - Date.parse(inicio)) / 86400000;

const fmtPct = (valor: number): string => `${valor.toFixed(1).replace('.', ',')}%`;
const fmtBr = (valor: number): string => valor.toFixed(2).replace('.', ',');

/**
 * Preço de venda pela regra de markdown: custo / (1 - margem).
 * Ex.: custo 5,00 com margem de 25% -> 5 / 0,75 = 6,66 (truncado em centavos).
 */
export function precoSugeridoPorMargem(custo: number, margemPct: number): number {
  if (custo <= 0 || margemPct >= 100) return 0;
  return truncar2(custo / (1 - margemPct / 100));
}

/** Margem real (markdown) sobre o preço de venda: (venda - custo) / venda. */
export function margemRealPct(custo: number, precoVenda: number): number | null {
  if (precoVenda <= 0 || custo <= 0) return null;
  return ((precoVenda - custo) / precoVenda) * 100;
}

export function analisarItem(
  entrada: EntradaAnalise,
  produto: ProdutoCadastro | null,
  params: ParametrosAnalise,
  periodo: PeriodoAnalise
): ResultadoAnaliseItem {
  const alertas: AlertaAnalise[] = [];
  const adicionar = (codigo: string, severidade: SeveridadeAlerta, mensagem: string): void => {
    alertas.push({ codigo, severidade, mensagem });
  };

  const dentroPeriodo =
    !entrada.dataAlteracao || (entrada.dataAlteracao >= periodo.inicio && entrada.dataAlteracao <= periodo.fim);

  if (!dentroPeriodo) {
    adicionar(
      'fora-periodo',
      'info',
      `Alteração de preço em ${entrada.dataAlteracao?.split('-').reverse().join('/')}, fora do período informado.`
    );
    return {
      status: 'Fora do período',
      variacaoUltimoPct: null,
      variacaoPenultimoPct: null,
      margemRealPct: null,
      precoSugerido: null,
      precisaAjuste: false,
      revisarCusto: false,
      alertas
    };
  }

  const custo = entrada.custoAtual;
  const penultimo = entrada.custoPenultimo;
  const antepenultimo = entrada.custoAntepenultimo;
  const pv = entrada.precoVenda;
  let revisarCusto = false;

  if (!produto) {
    adicionar(
      'sem-cadastro',
      'info',
      'Produto não encontrado no cadastro: a análise é feita, mas o ajuste não pode ser aplicado.'
    );
  }

  // --- Custo ---
  if (custo <= 0) {
    adicionar('custo-zerado', 'critico', 'Custo atual zerado ou ausente.');
    revisarCusto = true;
  }

  const varUltimo = variacaoPct(custo, penultimo);
  if (varUltimo !== null && custo > 0) {
    const absoluta = Math.abs(varUltimo);
    if (absoluta >= params.limiarCriticoPct) {
      adicionar(
        'entrada-errada',
        'critico',
        `Custo variou ${fmtPct(varUltimo)} em relação ao penúltimo: possível entrada errada.`
      );
      revisarCusto = true;
    } else if (absoluta >= params.limiarAtencaoPct) {
      adicionar('variacao-custo', 'atencao', `Custo variou ${fmtPct(varUltimo)} em relação ao penúltimo.`);
    }
  } else if (penultimo <= 0 && custo > 0) {
    adicionar('penultimo-zerado', 'atencao', 'Penúltimo custo zerado: histórico incompleto ou entrada errada.');
  }

  const varPenultimo = variacaoPct(penultimo, antepenultimo);
  if (varPenultimo !== null && penultimo > 0 && Math.abs(varPenultimo) >= params.limiarCriticoPct) {
    adicionar(
      'variacao-historica',
      'atencao',
      `Penúltimo custo variou ${fmtPct(varPenultimo)} em relação ao antepenúltimo.`
    );
  }

  if (
    custo > 0 &&
    penultimo > 0 &&
    antepenultimo > 0 &&
    Math.abs(custo - antepenultimo) < 0.005 &&
    Math.abs(custo - penultimo) >= 0.005 &&
    Math.abs(varUltimo ?? 0) >= params.limiarAtencaoPct
  ) {
    adicionar(
      'oscilacao',
      'info',
      'Custo atual voltou ao valor do antepenúltimo: o penúltimo pode ter sido digitado errado.'
    );
  }

  // --- Preço de venda e margem ---
  if (pv <= 0) adicionar('sem-preco-venda', 'critico', 'Preço de venda zerado ou ausente.');

  let margem: number | null = null;
  let precoSugerido: number | null = null;
  let precisaAjuste = false;

  if (pv > 0 && custo > 0) {
    margem = margemRealPct(custo, pv);
    precoSugerido = precoSugeridoPorMargem(custo, params.margemMetaPct);

    if (margem !== null) {
      if (pv < custo) {
        adicionar(
          'venda-abaixo-custo',
          'critico',
          `Preço de venda R$ ${fmtBr(pv)} abaixo do custo R$ ${fmtBr(custo)}.`
        );
        precisaAjuste = true;
      } else if (margem < params.margemMetaPct - 0.5) {
        adicionar(
          'margem-abaixo-meta',
          'atencao',
          `Margem de ${fmtPct(margem)} abaixo da meta de ${fmtPct(params.margemMetaPct)}.`
        );
        precisaAjuste = true;
      } else if (margem > params.margemMetaPct + 15) {
        adicionar(
          'margem-acima-meta',
          'info',
          `Margem de ${fmtPct(margem)} acima da meta: há espaço para competitividade.`
        );
      }

      if (entrada.margemCadastroPct !== null && Math.abs(entrada.margemCadastroPct - margem) > 2) {
        adicionar(
          'margem-divergente',
          'info',
          `Margem informada no arquivo (${fmtPct(entrada.margemCadastroPct)}) diverge da calculada (${fmtPct(margem)}).`
        );
      }
    }
  }

  // --- Conferência com o cadastro ---
  if (produto) {
    if (pv > 0 && Math.abs(produto.pvenda - pv) >= 0.005) {
      adicionar(
        'preco-divergente-cadastro',
        'info',
        `Preço do arquivo R$ ${fmtBr(pv)} difere do cadastro R$ ${fmtBr(produto.pvenda)}.`
      );
    }
    if (custo > 0 && Math.abs(produto.custoreal - custo) >= 0.005) {
      adicionar(
        'custo-divergente-cadastro',
        'info',
        `Custo do cadastro R$ ${fmtBr(produto.custoreal)} difere do custo atual R$ ${fmtBr(custo)}.`
      );
    }
  }

  // --- Dados complementares ---
  if (!entrada.codbarra) adicionar('sem-ean', 'info', 'Sem código de barras no arquivo.');
  if (!entrada.dataUltimaEntrada) {
    adicionar('sem-entrada', 'info', 'Sem data de última entrada.');
  } else if (diasEntre(entrada.dataUltimaEntrada, periodo.fim) > 90) {
    adicionar(
      'entrada-antiga',
      'info',
      `Última entrada há ${Math.floor(diasEntre(entrada.dataUltimaEntrada, periodo.fim))} dias.`
    );
  }

  const temCritico = alertas.some((a) => a.severidade === 'critico');
  const temAtencao = alertas.some((a) => a.severidade === 'atencao');
  let status: StatusAnalise = 'OK';
  if (temCritico) status = 'Crítico';
  else if (temAtencao) status = 'Atenção';
  else if (!produto) status = 'Sem cadastro';

  return {
    status,
    variacaoUltimoPct: varUltimo,
    variacaoPenultimoPct: varPenultimo,
    margemRealPct: margem,
    precoSugerido,
    precisaAjuste: precisaAjuste && !!produto,
    revisarCusto,
    alertas
  };
}
