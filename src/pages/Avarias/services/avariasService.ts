// Arquivo: src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface AvariaRegistro {
  id: string;
  codigo_customizado: string;
  quantidade: number;
  preco_custo_na_perda: number;
  destinacao: string;
  observacao?: string;
  data_registro: string;
  hora_registro: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra: string;
    unidade: string;
    departamento: string;
    secao: string;
  };
  motivos_avaria?: {
    id: string;
    descricao: string;
  };
}

export const avariasService = {
  // 1. Listagem de avarias adaptada para a nova tabela de produtos
  async listarAvarias(filtros?: { periodo?: string; motivoId?: string; destinacao?: string }): Promise<AvariaRegistro[]> {
    let query = supabase
      .from('avarias')
      .select(`
        id,
        codigo_customizado,
        quantidade,
        preco_custo_na_perda,
        destinacao,
        observacao,
        data_registro,
        hora_registro,
        produtos (
          id,
          codprod,
          descricao,
          codbarra,
          unidade,
          departamento,
          secao
        ),
        motivos_avaria (
          id,
          descricao
        )
      `);

    if (filtros?.motivoId && filtros.motivoId !== 'TODOS') {
      query = query.eq('motivo_avaria_id', filtros.motivoId);
    }

    if (filtros?.destinacao && filtros.destinacao !== 'TODAS') {
      query = query.eq('destinacao', filtros.destinacao);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar avarias no Supabase:', error);
      throw error;
    }

    return (data || []) as unknown as AvariaRegistro[];
  },

  // 2. Busca dinâmica de produtos para registrar avaria
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 3. Lista os motivos de avaria cadastrados
  async listarMotivosAvaria(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('id, descricao')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Alias de compatibilidade para chamadas antigas
  async listarMotivos(): Promise<any[]> {
    return this.listarMotivosAvaria();
  },

  // 4. Gravação da avaria
  async cadastrarAvaria(payload: {
    usuario_id?: string | null;
    produto_id: string;
    motivo_avaria_id: string;
    quantidade: number;
    preco_custo_na_perda: number;
    destinacao: string;
    observacao?: string;
  }): Promise<void> {
    const codigoCustom = `AV${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase
      .from('avarias')
      .insert([{
        codigo_customizado: codigoCustom,
        usuario_id: payload.usuario_id,
        produto_id: payload.produto_id,
        motivo_avaria_id: payload.motivo_avaria_id,
        quantidade: payload.quantidade,
        preco_custo_na_perda: payload.preco_custo_na_perda,
        destinacao: payload.destinacao,
        observacao: payload.observacao || null
      }]);

    if (error) throw error;
  }
};