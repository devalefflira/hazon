// src/pages/AuditoriaPrecificacao/services/auditoriaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AuditoriaItemRegistro, AuditoriaRegistro, ResumoSituacoes, SituacaoItem } from '../types/auditoria.types';

const TABELA_AUDITORIAS = 'auditorias_precificacao';
const TABELA_ITENS = 'auditoria_precificacao_itens';
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
}

/** Data local no formato YYYY-MM-DD. */
export const hojeIso = (): string => new Date().toLocaleDateString('sv-SE');

const blocos = <T,>(lista: T[], tamanho: number): T[][] => {
  const resultado: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) resultado.push(lista.slice(i, i + tamanho));
  return resultado;
};

export const auditoriaService = {
  async criarAuditoria(payload: { usuario_id: string; secao: string; secao_outro_descricao: string | null }): Promise<AuditoriaRegistro> {
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
    return (data || []) as AuditoriaRegistro[];
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
        [{ ...item, observacao: null, etiqueta_impressa_em: null, auditado_em: new Date().toISOString() }],
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

  async listarEtiquetasPendentes(): Promise<AuditoriaItemRegistro[]> {
    const { data, error } = await supabase
      .from(TABELA_ITENS)
      .select('*')
      .eq('etiqueta_pendente', true)
      .order('auditado_em', { ascending: false })
      .limit(LIMITE_LEITURA);
    if (error) throw error;
    return (data || []) as AuditoriaItemRegistro[];
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
  }
};
