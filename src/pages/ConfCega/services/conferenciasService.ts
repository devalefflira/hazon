// Arquivo: src/pages/ConfCega/services/conferenciasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ConferenciaMestre, ConferenciaItem } from '../types/conferencias.types';

export const conferenciasService = {
  // 1. Buscar produtos por termo
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Listar Fornecedores para o Select
  async listarFornecedores(): Promise<any[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, nome_fantasia, razao_social')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Listar conferências
  async listarConferencias(status?: string): Promise<ConferenciaMestre[]> {
    let query = supabase
      .from('conferencias_mestre')
      .select(`
        *,
        usuarios ( id, nome ),
        fornecedores ( id, nome_fantasia, razao_social ),
        conferencia_itens (
          *,
          produtos ( id, codprod, descricao, codbarra, unidade )
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ConferenciaMestre[];
  },

  // 4. Obter conferência por ID
  async obterConferenciaPorId(id: string): Promise<ConferenciaMestre | null> {
    const { data, error } = await supabase
      .from('conferencias_mestre')
      .select(`
        *,
        usuarios ( id, nome ),
        fornecedores ( id, nome_fantasia, razao_social ),
        conferencia_itens (
          *,
          produtos ( id, codprod, descricao, codbarra, unidade )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ConferenciaMestre;
  },

  // 5. Listar Itens de uma Conferência
  async listarItensConferidos(conferenciaId: string): Promise<ConferenciaItem[]> {
    const { data, error } = await supabase
      .from('conferencia_itens')
      .select(`
        *,
        produtos ( id, codprod, descricao, codbarra, unidade )
      `)
      .eq('conferencia_mestre_id', conferenciaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as ConferenciaItem[];
  },

  // 6. Iniciar Nova Conferência (Com fornecedor)
  async criarConferencia(payload: {
    usuario_id: string;
    fornecedor_id?: string;
    numero_nota_fiscal?: string;
    data_emissao_nota?: string;
    pedido_mestre_id?: string;
    observacao?: string;
  }): Promise<ConferenciaMestre> {
    const codigoCustom = `CONF-${Math.floor(1000 + Math.random() * 9000)}`;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    const { data, error } = await supabase
      .from('conferencias_mestre')
      .insert([{
        codigo_customizado: codigoCustom,
        usuario_id: payload.usuario_id,
        fornecedor_id: payload.fornecedor_id || null,
        numero_nota_fiscal: payload.numero_nota_fiscal || null,
        data_emissao_nota: payload.data_emissao_nota || null,
        pedido_mestre_id: payload.pedido_mestre_id || null,
        observacao: payload.observacao || null,
        status: 'Em Andamento',
        data_conferencia: dataAtual,
        hora_conferencia: horaAtual
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ConferenciaMestre;
  },

  // 7. Adicionar item conferido (Tratando data_validade e lote nulos)
  async adicionarItemConferencia(payload: {
    conferencia_mestre_id: string;
    produto_id: string;
    quantidade_contada: number;
    unidade_medida?: string;
    observacao?: string;
    lote?: string;
    data_validade?: string;
  }): Promise<void> {
    const dataValidadeTratada = payload.data_validade && payload.data_validade.trim() !== '' 
      ? payload.data_validade.trim() 
      : null;

    const loteTratado = payload.lote && payload.lote.trim() !== '' 
      ? payload.lote.trim() 
      : null;

    const { error } = await supabase
      .from('conferencia_itens')
      .insert([{
        conferencia_mestre_id: payload.conferencia_mestre_id,
        produto_id: payload.produto_id,
        quantidade_contada: payload.quantidade_contada,
        unidade_medida: payload.unidade_medida || 'UN',
        observacao: payload.observacao?.trim() || null,
        lote: loteTratado,
        data_validade: dataValidadeTratada
      }]);

    if (error) {
      console.error('Erro retornado pelo Supabase:', error);
      throw error;
    }
  },

  // 8. Remover item conferido
  async removerItemConferencia(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('conferencia_itens')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  // 9. Atualizar status da conferência
  async atualizarStatusConferencia(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('conferencias_mestre')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
};