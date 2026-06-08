import { supabase } from '../../../lib/supabaseClient';

export const produtosService = {
  // Busca paginada com filtros
 async listarProdutos(page: number = 0, pageSize: number = 50, filtro: { termo?: string; setorId?: string } = {}) {
    let query = supabase
      .from('produtos')
      .select(`
        id, codigo_barras, descricao, 
        categorias_setores(nome), 
        unidades_medida(sigla)
      `)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('descricao', { ascending: true });

    if (filtro.termo) {
      query = query.or(`codigo_barras.ilike.%${filtro.termo}%,descricao.ilike.%${filtro.termo}%`);
    }
    
    // O filtro de setor aqui é o que fará a mágica da performance
    if (filtro.setorId) {
      query = query.eq('setor_id', filtro.setorId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map((p: any) => ({
        id: p.id,
        ean: p.codigo_barras,
        descricao: p.descricao,
        setor: p.categorias_setores?.nome || 'N/A',
        unidade: p.unidades_medida?.sigla || 'UN'
      }))
    };
},

  async salvarProduto(produto: { codigo_barras: string; descricao: string; unidade_medida_id: string; setor_id: string; subsetor_id: string }) {
    const { data, error } = await supabase
      .from('produtos')
      .insert([produto])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};