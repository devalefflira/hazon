// Arquivo: src/pages/ConfCega/services/conferenciasService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface ConferenciaItemRegistro {
  id: string;
  conferencia_mestre_id: string;
  produto_id: string;
  quantidade_contada: number;
  quantidade_conferida?: number;
  unidade_medida?: string;
  observacao?: string;
  created_at?: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra: string;
    unidade: string;
    departamento: string;
  };
}

export const confCegaService = {
  // 1. Listar conferências com Fornecedor e Usuário vinculados
  async listarConferencias(): Promise<any[]> {
    const { data, error } = await supabase
      .from('conferencias_mestre')
      .select(`
        *,
        fornecedores (
          id,
          razao_social,
          nome_fantasia,
          cnpj
        ),
        usuarios (
          id,
          nome
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 2. Criar conferência
  async criarConferencia(payload: { 
    usuario_id?: string; 
    observacao?: string; 
    pedido_mestre_id?: string | null;
    fornecedor_id?: string | null;
    numero_nota_fiscal?: string | null;
    data_emissao_nota?: string | null;
    [key: string]: any;
  }): Promise<any> {
    const codigoCustom = `CONF-${Math.floor(1000 + Math.random() * 9000)}`;

    const objetoInsert: Record<string, any> = {
      codigo_customizado: codigoCustom,
      status: 'Em Andamento'
    };

    if (payload.usuario_id) objetoInsert.usuario_id = payload.usuario_id;
    if (payload.pedido_mestre_id) objetoInsert.pedido_mestre_id = payload.pedido_mestre_id;
    if (payload.fornecedor_id) objetoInsert.fornecedor_id = payload.fornecedor_id;
    if (payload.numero_nota_fiscal) objetoInsert.numero_nota_fiscal = payload.numero_nota_fiscal;
    if (payload.data_emissao_nota) objetoInsert.data_emissao_nota = payload.data_emissao_nota;
    if (payload.observacao) objetoInsert.observacao = payload.observacao;

    const { data, error } = await supabase
      .from('conferencias_mestre')
      .insert([objetoInsert])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 3. Atualizar Status do Lote
  async atualizarStatusConferencia(id: string, novoStatus: 'Concluida' | 'Pausada' | 'Cancelada' | 'Em Andamento'): Promise<void> {
    const { error } = await supabase
      .from('conferencias_mestre')
      .update({ 
        status: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // 4. Buscar itens conferidos
  async listarItensConferidos(conferenciaMestreId: string): Promise<ConferenciaItemRegistro[]> {
    const { data, error } = await supabase
      .from('conferencia_itens')
      .select(`
        id,
        conferencia_mestre_id,
        produto_id,
        quantidade_contada,
        unidade_medida,
        observacao,
        created_at,
        produtos (
          id,
          codprod,
          descricao,
          codbarra,
          unidade,
          departamento
        )
      `)
      .eq('conferencia_mestre_id', conferenciaMestreId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const itensMapeados = (data || []).map((item: any) => ({
      ...item,
      quantidade_conferida: item.quantidade_contada
    }));

    return itensMapeados as ConferenciaItemRegistro[];
  },

  // 5. Buscar produtos
  async buscarProdutoPorTermo(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 6. Registrar item bipado
  async registrarItemConferido(payload: {
    conferencia_mestre_id: string;
    produto_id: string;
    quantidade_conferida: number;
    unidade_medida?: string;
    observacao?: string;
  }): Promise<void> {
    const objetoInsert: Record<string, any> = {
      conferencia_mestre_id: payload.conferencia_mestre_id,
      produto_id: payload.produto_id,
      quantidade_contada: payload.quantidade_conferida,
      unidade_medida: payload.unidade_medida || 'UN'
    };

    if (payload.observacao) {
      objetoInsert.observacao = payload.observacao;
    }

    const { error } = await supabase
      .from('conferencia_itens')
      .insert([objetoInsert]);

    if (error) throw error;
  }
};

export const conferenciasService = confCegaService;