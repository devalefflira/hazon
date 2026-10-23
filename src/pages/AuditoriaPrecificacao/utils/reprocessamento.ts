// src/pages/AuditoriaPrecificacao/utils/reprocessamento.ts
import { CLASSIFICACOES_FORA_DA_FAIXA } from '../types/auditoria.types';
import type { AuditoriaItemRegistro, ConfigMargem, ParametroMargem, StatusCorrecao } from '../types/auditoria.types';
import { avaliarMargem } from './margem';

export interface DadosMargemItem {
  preco_margem: number | null;
  margem_real_pct: number | null;
  margem_meta_pct: number | null;
  margem_classificacao: AuditoriaItemRegistro['margem_classificacao'];
  correcao_status: StatusCorrecao | null;
  corrigido_em: string | null;
}

export interface AtualizacaoMargem {
  id: string;
  dados: DadosMargemItem;
}

export interface ResumoReprocessamento {
  analisados: number;
  alterados: number;
  foraDaFaixa: number;
  pendentes: number;
  semParametro: number;
}

const mesmoNumero = (a: number | null, b: number | null): boolean => {
  if (a === null || b === null) return a === b;
  return Math.abs(Number(a) - Number(b)) < 1e-9;
};

/**
 * Recalcula a margem de cada item bipado (CORRETO ou INCORRETO) com as metas atuais.
 * Usa só os dados gravados na linha, então funciona mesmo que o produto tenha sido bipado
 * antes de a meta existir.
 *
 * Regras de status de correção:
 * - fora da faixa e ainda não tratado => Pendente (vai para "Itens para corrigir");
 * - fora da faixa já marcado como Corrigido => mantém Corrigido;
 * - dentro da faixa ou sem meta => sem status de correção.
 * Itens "Sem preço" não têm margem e são ignorados.
 */
export function reprocessarMargens(
  itens: AuditoriaItemRegistro[],
  parametros: ParametroMargem[],
  config: ConfigMargem
): { atualizacoes: AtualizacaoMargem[]; resumo: ResumoReprocessamento } {
  const atualizacoes: AtualizacaoMargem[] = [];
  const resumo: ResumoReprocessamento = { analisados: 0, alterados: 0, foraDaFaixa: 0, pendentes: 0, semParametro: 0 };

  for (const item of itens) {
    if (item.situacao === 'SEM_PRECO') continue;
    resumo.analisados += 1;

    const avaliacao = avaliarMargem({
      situacao: item.situacao,
      precoSistema: Number(item.preco_sistema),
      precoEncontrado: item.preco_encontrado !== null ? Number(item.preco_encontrado) : null,
      custo: Number(item.custo_sistema),
      produto: { departamento: item.departamento, secao: item.secao_produto, categoria: item.categoria },
      parametros,
      config
    });

    let status: StatusCorrecao | null = avaliacao.correcao_status;
    if (status === 'Pendente' && item.correcao_status === 'Corrigido') status = 'Corrigido';
    const corrigidoEm = status === 'Corrigido' ? (item.corrigido_em ?? new Date().toISOString()) : null;

    if (avaliacao.margem_classificacao === 'SEM_PARAMETRO') resumo.semParametro += 1;
    if (avaliacao.margem_classificacao && CLASSIFICACOES_FORA_DA_FAIXA.includes(avaliacao.margem_classificacao)) resumo.foraDaFaixa += 1;
    if (status === 'Pendente') resumo.pendentes += 1;

    const mudou =
      !mesmoNumero(item.preco_margem !== null ? Number(item.preco_margem) : null, avaliacao.preco_margem) ||
      !mesmoNumero(item.margem_real_pct !== null ? Number(item.margem_real_pct) : null, avaliacao.margem_real_pct) ||
      !mesmoNumero(item.margem_meta_pct !== null ? Number(item.margem_meta_pct) : null, avaliacao.margem_meta_pct) ||
      item.margem_classificacao !== avaliacao.margem_classificacao ||
      item.correcao_status !== status;

    if (mudou) {
      resumo.alterados += 1;
      atualizacoes.push({
        id: item.id,
        dados: {
          preco_margem: avaliacao.preco_margem,
          margem_real_pct: avaliacao.margem_real_pct,
          margem_meta_pct: avaliacao.margem_meta_pct,
          margem_classificacao: avaliacao.margem_classificacao,
          correcao_status: status,
          corrigido_em: corrigidoEm
        }
      });
    }
  }

  return { atualizacoes, resumo };
}
