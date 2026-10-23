// src/pages/AuditoriaPrecificacao/services/auditoriaService.ts
import { supabase } from '../../../lib/supabaseClient';
import { CLASSIFICACOES_FORA_DA_FAIXA } from '../types/auditoria.types';
import type { AtualizacaoMargem } from '../utils/reprocessamento';
import type {
  AuditoriaItemRegistro,
  AuditoriaRegistro,
  ClassificacaoMargem,
  ConfigMargem,
  ParametroMargem,
  ResumoSituacoes,
  SituacaoItem,
  StatusCorrecao
} from '../types/auditoria.types';

const TABELA_AUDITORIAS = 'auditorias_precificacao';
const TABELA_ITENS = 'auditoria_precificacao_itens';
const TABELA_PARAMETROS = 'auditoria_margem_parametros';
const TABELA_CONFIG = 'auditoria_margem_config';
const TAMANHO_LOTE = 200;
const LIMITE_LEITURA = 5000;

export interface NovoItemAuditoria {
  auditoria_id: string;
  produto_id: string;
  codprod: string;
  descricao: string;
  codbarra: string | null;
  departamento: string | null;
  secao_produto: string | null;
  categoria: string | null;
  custo_sistema: number;
  preco_sistema: number;
  situacao: SituacaoItem;
  preco_encontrado: number | null;
  secao_local: string;
  data_auditoria: string;
  etiqueta_pendente: boolean;
  usuario_id: string;
  preco_margem: number | null;
  margem_real_pct: number | null;
  margem_meta_pct: number | null;
  margem_classificacao: ClassificacaoMargem | null;
  correcao_status: StatusCorrecao | null;
}

/** Combinação de departamento / seção / categoria existente no cadastro de produtos. */
export interface HierarquiaProduto {
  departamento: string;
  secao: string;
  categoria: string;
}

/** Data local no formato YYYY-MM-DD. */
export const hojeIso = (): string => new Date().toLocaleDateString('sv-SE');

const blocos = <T,>(lista: T[], tamanho: number): T[][] => {
  const resultado: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) resultado.push(lista.slice(i, i + tamanho));
  return resultado;
};

/** Busca o nome de quem registrou cada linha, sem depender de relacionamento no banco. */
async function anexarResponsaveis<T extends { usuario_id: string; usuarios?: { nome: string | null } | null }>(lista: T[]): Promise<T[]> {
  const ids = Array.from(new Set(lista.map((i) => i.usuario_id).filter(Boolean)));
  if (ids.length === 0) return lista;

  const nomes = new Map<string, string | null>();
  for (const bloco of blocos(ids, TAMANHO_LOTE)) {
    const { data, error } = await supabase.from('usuarios').select('id, nome').in('id', bloco);
    if (error) throw error;
    (data || []).forEach((u: { id: string; nome: string | null }) => nomes.set(u.id, u.nome));
  }
  return lista.map((i) => ({ ...i, usuarios: { nome: nomes.get(i.usuario_id) ?? null } }) as T);
}

const normalizarParametro = (p: ParametroMargem): ParametroMargem => ({
  departamento: p.departamento.trim(),
  secao: p.secao.trim(),
  categoria: p.categoria.trim(),
  margem_alvo_pct: Number(p.margem_alvo_pct)
});

export const auditoriaService = {
  async criarAuditoria(payload: {
    usuario_id: string;
    secao: string;
    secao_outro_descricao: string | null;
    classe: string;
  }): Promise<AuditoriaRegistro> {
    const codigo = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await supabase
      .from(TABELA_AUDITORIAS)
      .insert([{ codigo_customizado: codigo, status: 'Em andamento', data_inicio: hojeIso(), ...payload }])
      .select('*')
      .single();
    if (error) throw error;
    return data as AuditoriaRegistro;
  },

  async listarEmAndamento(): Promise<AuditoriaRegistro[]> {
    const { data, error } = await supabase
      .from(TABELA_AUDITORIAS)
      .select('*')
      .eq('status', 'Em andamento')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return anexarResponsaveis((data || []) as AuditoriaRegistro[]);
  },

  async listarItens(auditoriaId: string): Promise<AuditoriaItemRegistro[]> {
    const { data, error } = await supabase
      .from(TABELA_ITENS)
      .select('*')
      .eq('auditoria_id', auditoriaId)
      .order('auditado_em', { ascending: false })
      .limit(LIMITE_LEITURA);
    if (error) throw error;
    return (data || []) as AuditoriaItemRegistro[];
  },

  /** Grava na hora: se o produto já foi auditado nesta auditoria, a linha é atualizada (sem duplicar). */
  async registrarItem(item: NovoItemAuditoria): Promise<AuditoriaItemRegistro> {
    const { data, error } = await supabase
      .from(TABELA_ITENS)
      .upsert(
        [
          {
            ...item,
            observacao: null,
            etiqueta_impressa_em: null,
            corrigido_em: null,
            auditado_em: new Date().toISOString()
          }
        ],
        { onConflict: 'auditoria_id,produto_id' }
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as AuditoriaItemRegistro;
  },

  async removerItem(itemId: string): Promise<void> {
    const { error } = await supabase.from(TABELA_ITENS).delete().eq('id', itemId);
    if (error) throw error;
  },

  async atualizarResumo(auditoriaId: string, resumo: ResumoSituacoes): Promise<void> {
    const { error } = await supabase
      .from(TABELA_AUDITORIAS)
      .update({
        total_itens: resumo.total,
        total_corretos: resumo.corretos,
        total_incorretos: resumo.incorretos,
        total_sem_preco: resumo.semPreco,
        updated_at: new Date().toISOString()
      })
      .eq('id', auditoriaId);
    if (error) throw error;
  },

  async finalizarAuditoria(auditoriaId: string, resumo: ResumoSituacoes): Promise<void> {
    const { error } = await supabase
      .from(TABELA_AUDITORIAS)
      .update({
        status: 'Finalizada',
        data_fim: hojeIso(),
        total_itens: resumo.total,
        total_corretos: resumo.corretos,
        total_incorretos: resumo.incorretos,
        total_sem_preco: resumo.semPreco,
        updated_at: new Date().toISOString()
      })
      .eq('id', auditoriaId);
    if (error) throw error;
  },

  /** Etiquetas pendentes: itens sem preco na gôndola e itens incorretos que precisam de etiqueta nova. */
  async listarEtiquetasPendentes(): Promise<AuditoriaItemRegistro[]> {
    const { data, error } = await supabase
      .from(TABELA_ITENS)
      .select('*')
      .eq('etiqueta_pendente', true)
      .order('auditado_em', { ascending: false })
      .limit(LIMITE_LEITURA);
    if (error) throw error;
    return anexarResponsaveis((data || []) as AuditoriaItemRegistro[]);
  },

  async contarEtiquetasPendentes(): Promise<number> {
    const { count, error } = await supabase
      .from(TABELA_ITENS)
      .select('id', { count: 'exact', head: true })
      .eq('etiqueta_pendente', true);
    if (error) throw error;
    return count ?? 0;
  },

  async marcarEtiquetasImpressas(ids: string[]): Promise<void> {
    const agora = new Date().toISOString();
    for (const bloco of blocos(ids, TAMANHO_LOTE)) {
      const { error } = await supabase
        .from(TABELA_ITENS)
        .update({ etiqueta_pendente: false, etiqueta_impressa_em: agora })
        .in('id', bloco);
      if (error) throw error;
    }
  },

  /** Itens de auditorias já finalizadas, filtrados por seção e período. */
  async listarAnalises(filtros: { secao?: string; dataInicio?: string; dataFim?: string }): Promise<AuditoriaItemRegistro[]> {
    let consulta = supabase
      .from(TABELA_ITENS)
      .select('*, auditorias_precificacao!inner(status)')
      .eq('auditorias_precificacao.status', 'Finalizada');

    if (filtros.secao) consulta = consulta.eq('secao_local', filtros.secao);
    if (filtros.dataInicio) consulta = consulta.gte('data_auditoria', filtros.dataInicio);
    if (filtros.dataFim) consulta = consulta.lte('data_auditoria', filtros.dataFim);

    const { data, error } = await consulta.order('data_auditoria', { ascending: false }).limit(LIMITE_LEITURA);
    if (error) throw error;
    return (data || []) as AuditoriaItemRegistro[];
  },

  async listarParametrosMargem(): Promise<ParametroMargem[]> {
    const { data, error } = await supabase
      .from(TABELA_PARAMETROS)
      .select('*')
      .order('departamento', { ascending: true })
      .order('secao', { ascending: true })
      .order('categoria', { ascending: true })
      .limit(LIMITE_LEITURA);
    if (error) throw error;
    return (data || []) as ParametroMargem[];
  },

  /** Combinações distintas de departamento / seção / categoria do cadastro de produtos (lidas em páginas). */
  async listarHierarquiaProdutos(): Promise<HierarquiaProduto[]> {
    const TAMANHO_PAGINA = 1000;
    const vistos = new Map<string, HierarquiaProduto>();

    for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
      const { data, error } = await supabase
        .from('produtos')
        .select('departamento, secao, categoria')
        .order('codprod', { ascending: true })
        .range(inicio, inicio + TAMANHO_PAGINA - 1);
      if (error) throw error;

      const lote = (data || []) as Array<{ departamento: string | null; secao: string | null; categoria: string | null }>;
      lote.forEach((p) => {
        const departamento = (p.departamento ?? '').trim();
        const secao = (p.secao ?? '').trim();
        const categoria = (p.categoria ?? '').trim();
        if (!departamento && !secao && !categoria) return;
        vistos.set(`${departamento}|${secao}|${categoria}`, { departamento, secao, categoria });
      });

      if (lote.length < TAMANHO_PAGINA) break;
    }

    return Array.from(vistos.values());
  },

  async salvarParametroMargem(parametro: ParametroMargem): Promise<void> {
    const { error } = await supabase
      .from(TABELA_PARAMETROS)
      .upsert(
        [{ ...normalizarParametro(parametro), updated_at: new Date().toISOString() }],
        { onConflict: 'departamento,secao,categoria' }
      );
    if (error) throw error;
  },

  async removerParametroMargem(id: string): Promise<void> {
    const { error } = await supabase.from(TABELA_PARAMETROS).delete().eq('id', id);
    if (error) throw error;
  },

  async obterConfigMargem(): Promise<ConfigMargem> {
    const { data, error } = await supabase
      .from(TABELA_CONFIG)
      .select('faixa_ideal_pp, faixa_tolerancia_pp, faixa_muito_pp')
      .eq('id', 'global')
      .maybeSingle();
    if (error) throw error;
    return {
      faixa_ideal_pp: Number(data?.faixa_ideal_pp ?? 2),
      faixa_tolerancia_pp: Number(data?.faixa_tolerancia_pp ?? 5),
      faixa_muito_pp: Number(data?.faixa_muito_pp ?? 10)
    };
  },

  async salvarConfigMargem(config: ConfigMargem): Promise<void> {
    const { error } = await supabase
      .from(TABELA_CONFIG)
      .upsert(
        [{ id: 'global', ...config, updated_at: new Date().toISOString() }],
        { onConflict: 'id' }
      );
    if (error) throw error;
  },

  /** Todos os itens com situação Correto ou Incorreto (os "Sem preço" não têm margem), lidos em páginas. */
  async listarItensParaReprocessar(): Promise<AuditoriaItemRegistro[]> {
    const TAMANHO_PAGINA = 1000;
    const todos: AuditoriaItemRegistro[] = [];

    for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
      const { data, error } = await supabase
        .from(TABELA_ITENS)
        .select('*')
        .neq('situacao', 'SEM_PRECO')
        .order('id', { ascending: true })
        .range(inicio, inicio + TAMANHO_PAGINA - 1);
      if (error) throw error;

      const lote = (data || []) as AuditoriaItemRegistro[];
      todos.push(...lote);
      if (lote.length < TAMANHO_PAGINA) break;
    }

    return todos;
  },

  /** Grava a margem recalculada de cada item, em pequenos lotes paralelos. */
  async salvarMargensItens(atualizacoes: AtualizacaoMargem[]): Promise<void> {
    const TAMANHO_LOTE_ESCRITA = 10;
    for (const bloco of blocos(atualizacoes, TAMANHO_LOTE_ESCRITA)) {
      const resultados = await Promise.all(
        bloco.map((a) => supabase.from(TABELA_ITENS).update(a.dados).eq('id', a.id))
      );
      const falha = resultados.find((r) => r.error);
      if (falha?.error) throw falha.error;
    }
  },

  /** Itens com margem fora da faixa tolerável, de todas as auditorias. */
  async listarItensParaCorrigir(): Promise<AuditoriaItemRegistro[]> {
    const { data, error } = await supabase
      .from(TABELA_ITENS)
      .select('*')
      .in('margem_classificacao', CLASSIFICACOES_FORA_DA_FAIXA)
      .order('auditado_em', { ascending: false })
      .limit(LIMITE_LEITURA);
    if (error) throw error;
    return (data || []) as AuditoriaItemRegistro[];
  },

  async marcarCorrigido(itemId: string, corrigido: boolean): Promise<void> {
    const { error } = await supabase
      .from(TABELA_ITENS)
      .update({
        correcao_status: corrigido ? 'Corrigido' : 'Pendente',
        corrigido_em: corrigido ? new Date().toISOString() : null
      })
      .eq('id', itemId);
    if (error) throw error;
  }
};
