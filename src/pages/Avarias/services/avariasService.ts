// Arquivo: src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRecord, FiltrosAvariaPayload, NovaAvariaPayload } from '../types/avarias.types';

export const avariasService = {
  // 1. Listar registros de Avarias
  async listarAvarias(filtros?: FiltrosAvariaPayload): Promise<AvariaRecord[]> {
    let query = supabase
      .from('avarias')
      .select(`
        *,
        produtos ( id, codprod, descricao, codbarra, unidade, custoreal ),
        motivos_avaria ( id, descricao ),
        usuarios ( id, nome )
      `)
      .order('created_at', { ascending: false });

    if (filtros?.motivo_id) {
      query = query.eq('motivo_avaria_id', filtros.motivo_id);
    }

    if (filtros?.destinacao) {
      query = query.eq('destinacao', filtros.destinacao);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar avarias:', error);
      throw error;
    }

    return (data || []) as AvariaRecord[];
  },

  // 2. Listar Motivos de Avaria
  async listarMotivosAvaria(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Buscar produtos por autocomplete
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 4. Registrar Nova Avaria
  async registrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    const codigoCustom = `AV${Math.floor(1000 + Math.random() * 9000)}`;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

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
        observacao: payload.observacao || null,
        data_registro: dataAtual,
        hora_registro: horaAtual
      }]);

    if (error) {
      console.error('Erro ao registrar avaria:', error);
      throw error;
    }
  },

  // Alias para manter compatibilidade
  async cadastrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    return this.registrarAvaria(payload);
  }
};