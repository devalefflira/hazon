// Arquivo: src/pages/ConfCega/services/conferenciasService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface ConferenciaItemRegistro {
  id: string;
  conferencia_mestre_id: string;
  produto_id: string;
  quantidade_conferida: number;
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
  // 1. Listar os lotes/mestres de conferências ativas ou finalizadas
  async listarConferencias(): Promise<any[]> {
    const { data, error } = await supabase
      .from('conferencias_mestre') // 👈 Corrigido de conferencia_mestre para conferencias_mestre
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar lotes de conferência:', error);
      throw error;
    }

    return data || [];
  },

  // 2. Criar um novo lote de conferência cega
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

    // Constrói o objeto apenas com os dados essenciais para evitar erros de schema
    const objetoInsert: Record<string, any> = {
      codigo_customizado: codigoCustom,
      status: 'EM_ANDAMENTO'
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

    if (error) {
      console.error('Erro ao criar conferência:', error);
      throw error;
    }

    return data;
  },

  // 3. Buscar itens conferidos de um determinado lote
  async listarItensConferidos(conferenciaMestreId: string): Promise<ConferenciaItemRegistro[]> {
    const { data, error } = await supabase
      .from('conferencia_itens')
      .select(`
        id,
        conferencia_mestre_id,
        produto_id,
        quantidade_conferida,
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

    if (error) {
      console.error('Erro ao buscar itens conferidos:', error);
      throw error;
    }

    return (data || []) as unknown as ConferenciaItemRegistro[];
  },

  // 4. Buscar produto por EAN, CODPROD ou Descrição para o autocomplete/bipe
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

  // 5. Registrar item bipado na conferência
  async registrarItemConferido(payload: {
    conferencia_mestre_id: string;
    produto_id: string;
    quantidade_conferida: number;
    observacao?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('conferencia_itens')
      .insert([{
        conferencia_mestre_id: payload.conferencia_mestre_id,
        produto_id: payload.produto_id,
        quantidade_conferida: payload.quantidade_conferida,
        observacao: payload.observacao || null
      }]);

    if (error) throw error;
  }
};

// Exporta o alias para compatibilidade com index.tsx
export const conferenciasService = confCegaService;