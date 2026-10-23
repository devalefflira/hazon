// src/pages/AuditoriaPrecificacao/utils/margem.ts
import { CLASSIFICACOES_FORA_DA_FAIXA } from '../types/auditoria.types';
import type { ClassificacaoMargem, ConfigMargem, ParametroMargem, SituacaoItem, StatusCorrecao } from '../types/auditoria.types';

export const CONFIG_MARGEM_PADRAO: ConfigMargem = {
  faixa_ideal_pp: 2,
  faixa_tolerancia_pp: 5,
  faixa_muito_pp: 10
};

export const CLASSE_CLASSIFICACAO_MARGEM: Record<ClassificacaoMargem, string> = {
  IDEAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TOLERAVEL: 'bg-teal-50 text-[#09797a] border-teal-200',
  ABAIXO: 'bg-amber-50 text-amber-800 border-amber-200',
  MUITO_ABAIXO: 'bg-rose-50 text-rose-700 border-rose-200',
  MUITO_ACIMA: 'bg-rose-50 text-rose-700 border-rose-200',
  SEM_PARAMETRO: 'bg-slate-100 text-slate-600 border-slate-200'
};

export interface ChaveProduto {
  departamento: string | null;
  secao: string | null;
  categoria: string | null;
}

export interface EntradaMargem {
  situacao: SituacaoItem;
  precoSistema: number;
  precoEncontrado: number | null;
  custo: number;
  produto: ChaveProduto;
  parametros: ParametroMargem[];
  config: ConfigMargem;
}

export interface ResultadoMargem {
  preco_margem: number | null;
  margem_real_pct: number | null;
  margem_meta_pct: number | null;
  margem_classificacao: ClassificacaoMargem | null;
  correcao_status: StatusCorrecao | null;
}

const normalizar = (texto: string | null | undefined): string => (texto ?? '').trim().toLowerCase();

/** Margem percentual sobre o preço de venda: (preço - custo) / preço. */
export function margemPct(preco: number, custo: number): number | null {
  if (!Number.isFinite(preco) || preco <= 0) return null;
  return ((preco - custo) / preco) * 100;
}

/** Preço que atinge a meta de margem: custo / (1 - meta). */
export function precoParaMeta(custo: number, metaPct: number | null): number | null {
  if (metaPct === null || !Number.isFinite(metaPct) || metaPct >= 100) return null;
  return custo / (1 - metaPct / 100);
}

/** Preço que vale para a margem: o da gôndola quando incorreto, senão o do sistema. Sem preço => null. */
export function precoParaMargem(situacao: SituacaoItem, precoSistema: number, precoEncontrado: number | null): number | null {
  if (situacao === 'SEM_PRECO') return null;
  if (situacao === 'INCORRETO' && precoEncontrado !== null) return precoEncontrado;
  return precoSistema;
}

/**
 * Parâmetro mais específico que combina com o produto.
 * Campo vazio no parâmetro significa "qualquer valor". Comparação sem diferença de maiúsculas.
 */
export function buscarParametroMargem(parametros: ParametroMargem[], produto: ChaveProduto): ParametroMargem | null {
  const valores = [normalizar(produto.departamento), normalizar(produto.secao), normalizar(produto.categoria)];
  let melhor: ParametroMargem | null = null;
  let melhorNivel = -1;

  for (const p of parametros) {
    const campos = [normalizar(p.departamento), normalizar(p.secao), normalizar(p.categoria)];
    const combina = campos.every((campo, i) => campo === '' || campo === valores[i]);
    if (!combina) continue;
    const nivel = campos.filter((campo) => campo !== '').length;
    if (nivel > melhorNivel) {
      melhor = p;
      melhorNivel = nivel;
    }
  }
  return melhor;
}

/**
 * Faixas, em relação à meta (pontos percentuais):
 * abaixo de -muito => Muito abaixo; até -ideal => Abaixo; até +ideal => Ideal;
 * até +tolerância => Tolerável; acima disso => Muito acima.
 */
export function classificarMargem(real: number, meta: number, cfg: ConfigMargem): ClassificacaoMargem {
  const diferenca = real - meta;
  if (diferenca < -cfg.faixa_muito_pp) return 'MUITO_ABAIXO';
  if (diferenca < -cfg.faixa_ideal_pp) return 'ABAIXO';
  if (diferenca <= cfg.faixa_ideal_pp) return 'IDEAL';
  if (diferenca <= cfg.faixa_tolerancia_pp) return 'TOLERAVEL';
  return 'MUITO_ACIMA';
}

/** Calcula margem real, meta, classificação e se o item precisa de correção de preço. */
export function avaliarMargem(entrada: EntradaMargem): ResultadoMargem {
  const preco = precoParaMargem(entrada.situacao, entrada.precoSistema, entrada.precoEncontrado);
  const real = preco === null ? null : margemPct(preco, entrada.custo);
  const parametro = buscarParametroMargem(entrada.parametros, entrada.produto);
  const meta = parametro ? Number(parametro.margem_alvo_pct) : null;

  if (real === null) {
    return { preco_margem: preco, margem_real_pct: null, margem_meta_pct: meta, margem_classificacao: null, correcao_status: null };
  }
  if (meta === null) {
    return { preco_margem: preco, margem_real_pct: real, margem_meta_pct: null, margem_classificacao: 'SEM_PARAMETRO', correcao_status: null };
  }

  const classificacao = classificarMargem(real, meta, entrada.config);
  return {
    preco_margem: preco,
    margem_real_pct: real,
    margem_meta_pct: meta,
    margem_classificacao: classificacao,
    correcao_status: CLASSIFICACOES_FORA_DA_FAIXA.includes(classificacao) ? 'Pendente' : null
  };
}
