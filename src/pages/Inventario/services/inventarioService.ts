import { supabase } from '../../../lib/supabaseClient';

export const inventarioService = {
  async buscarProdutoPorEan(ean: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, descricao, unidade_medida_id')
      .eq('codigo_barras', ean)
      .single();
    if (error) return null;
    return data;
  },

  async salvarItemInventario(dados: {
    inventario_id: string;
    produto_id: string;
    quantidade: number;
    multiplicador: number;
    local_captura_id: string;
    lote: string;
    validade: string;
  }) {
    const total = dados.quantidade * dados.multiplicador;
    const { data, error } = await supabase
      .from('inventario_itens')
      .insert({
        inventario_id: dados.inventario_id,
        produto_id: dados.produto_id,
        quantidade_contabilizada: total,
        local_captura_id: dados.local_captura_id,
        lote: dados.lote,
        data_validade: dados.validade
      });
    if (error) throw error;
    return data;
  },

  async listarLocais() {
    const { data, error } = await supabase.from('locais_captura').select('id, nome');
    if (error) throw error;
    return data || [];
  },

  async listarInventarios() {
  const { data, error } = await supabase
    .from('inventarios')
    .select('id, codigo_customizado, data_registro, hora_registro, usuarios(nome), status')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data || [];
},

  async criarNovoInventario(codigo: string, usuarioId: string) {
    const { data, error } = await supabase
      .from('inventarios')
      .insert({
        codigo_customizado: codigo,
        usuario_id: usuarioId
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async buscarProduto(termo: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, descricao, unidade_medida_id')
      .or(`codigo_barras.eq.${termo},descricao.ilike.%${termo}%`)
      .limit(1)
      .single();

    if (error) return null;
    return data;
  },

  async listarItensDoInventario(inventarioId: string) {
    const { data, error } = await supabase
      .from('inventario_itens')
      .select('id, quantidade_contabilizada, lote, data_validade, produtos(descricao)')
      .eq('inventario_id', inventarioId);
    if (error) throw error;
    return data || [];
  },

  async atualizarStatusInventario(id: string, status: string) {
    const { data, error } = await supabase.from('inventarios').update({ status }).eq('id', id);
    if (error) throw error;
    return data;
  },

  async deletarItem(id: string) {
    const { error } = await supabase.from('inventario_itens').delete().eq('id', id);
    if (error) throw error;
  }

};