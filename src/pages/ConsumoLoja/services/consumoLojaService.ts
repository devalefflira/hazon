// src/pages/ConsumoLoja/services/consumoLojaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ItemConsumoForm } from '../types/consumoLoja.types';

export const consumoLojaService = {
  async buscarProdutos(termo: string) {
    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase.from('produtos').select('id, codprod, codbarra, descricao, departamento, custoreal, unidade');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else if (palavras.length > 1) {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  },

  async buscarItensConsumo(dataInicio?: string, dataFim?: string, departamento?: string, local?: string) {
    let query = supabase
      .from('consumo_loja_itens')
      .select(`
        id,
        local,
        departamento,
        valor_total_item,
        quantidade,
        produtos ( descricao ),
        consumo_loja_mestre!inner ( data_registro )
      `);

    if (dataInicio) query = query.gte('consumo_loja_mestre.data_registro', dataInicio);
    if (dataFim) query = query.lte('consumo_loja_mestre.data_registro', dataFim);
    if (departamento) query = query.ilike('departamento', `%${departamento}%`);
    if (local && local !== 'Todos') query = query.eq('local', local);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      descricao_produto: item.produtos?.descricao || 'Produto não identificado',
      local: item.local,
      departamento: item.departamento || '-',
      valor_total_item: Number(item.valor_total_item || 0),
      quantidade: Number(item.quantidade || 0),
      data_registro: item.consumo_loja_mestre?.data_registro
    }));
  },

  async salvarRegistroConsumo(usuarioId: string, itens: ItemConsumoForm[], observacao?: string) {
    const valorTotal = itens.reduce((acc, curr) => acc + curr.valor_total_item, 0);
    const codigoCustomizado = `CSM-${Date.now()}`;

    const { data: mestre, error: errorMestre } = await supabase
      .from('consumo_loja_mestre')
      .insert([{
        codigo_customizado: codigoCustomizado,
        usuario_id: usuarioId,
        valor_total: valorTotal,
        observacao
      }])
      .select('id')
      .single();

    if (errorMestre) throw errorMestre;

    const payloadItens = itens.map(item => ({
      consumo_mestre_id: mestre.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      unidade_medida: item.unidade_medida,
      local: item.local,
      departamento: item.departamento,
      custo_unitario: item.custo_unitario,
      valor_total_item: item.valor_total_item,
      observacao: item.observacao
    }));

    const { error: errorItens } = await supabase
      .from('consumo_loja_itens')
      .insert(payloadItens);

    if (errorItens) throw errorItens;
    return true;
  }
};