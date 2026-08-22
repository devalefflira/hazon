// src/pages/ConsumoLoja/services/consumoLojaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ItemConsumoForm, ConsumoLojaItemView } from '../types/consumoLoja.types';

export const consumoLojaService = {
  async buscarProdutos(termo: string) {
    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, codbarra, descricao, departamento, custoreal, unidade');

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

  async buscarItensConsumo(
    dataInicio?: string,
    dataFim?: string,
    departamento?: string,
    local?: string
  ): Promise<ConsumoLojaItemView[]> {
    let query = supabase
      .from('consumo_loja_itens')
      .select(`
        id,
        local,
        departamento,
        valor_total_item,
        quantidade,
        unidade_medida,
        observacao,
        produtos (
          codprod,
          descricao
        ),
        consumo_loja_mestre!inner (
          data_registro,
          hora_registro,
          usuarios (
            nome
          )
        )
      `);

    if (dataInicio) query = query.gte('consumo_loja_mestre.data_registro', dataInicio);
    if (dataFim) query = query.lte('consumo_loja_mestre.data_registro', dataFim);
    if (departamento) query = query.ilike('departamento', `%${departamento}%`);
    if (local && local !== 'Todos') query = query.eq('local', local);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      codprod: item.produtos?.codprod,
      descricao_produto: item.produtos?.descricao || 'Produto não identificado',
      local: item.local,
      departamento: item.departamento || '-',
      valor_total_item: Number(item.valor_total_item || 0),
      quantidade: Number(item.quantidade || 0),
      unidade_medida: item.unidade_medida || 'UN',
      observacao: item.observacao,
      data_registro: item.consumo_loja_mestre?.data_registro,
      hora_registro: item.consumo_loja_mestre?.hora_registro || '00:00:00',
      usuario_nome: item.consumo_loja_mestre?.usuarios?.nome || 'Sistema'
    }));
  },

  async salvarRegistroConsumo(usuarioId: string, itens: ItemConsumoForm[], observacao?: string) {
    const valorTotal = itens.reduce((acc, curr) => acc + curr.valor_total_item, 0);
    const codigoCustomizado = `CSM-${Date.now()}`;
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const { data: mestre, error: errorMestre } = await supabase
      .from('consumo_loja_mestre')
      .insert([
        {
          codigo_customizado: codigoCustomizado,
          usuario_id: usuarioId,
          valor_total: valorTotal,
          data_registro: dataAtual,
          hora_registro: horaAtual,
          observacao
        }
      ])
      .select('id')
      .single();

    if (errorMestre) throw errorMestre;

    const payloadItens = itens.map((item) => ({
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
  },
  // Adicione este método dentro de consumoLojaService em src/pages/ConsumoLoja/services/consumoLojaService.ts
  async atualizarItemConsumo(itemId: string, quantidade: number, local: string, custoUnitario: number) {
    const valorTotalItem = quantidade * custoUnitario;
    const { error } = await supabase
      .from('consumo_loja_itens')
      .update({
        quantidade,
        local,
        valor_total_item: valorTotalItem
      })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  },
};