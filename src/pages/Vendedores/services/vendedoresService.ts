import { supabase } from '../../../lib/supabaseClient';

export const vendedoresService = {
  async listarVendedores() {
    const { data, error } = await supabase
      .from('vendedores')
      .select(`
        id, 
        nome, 
        telefone, 
        fornecedor_id,
        fornecedores(nome_fantasia),
        vendedor_setores(
          categorias_setores(nome),
          categorias_subsetores(nome)
        )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;

    return (data || []).map((v: any) => ({
      id: v.id,
      nome: v.nome,
      telefone: v.telefone,
      fornecedor_nome: v.fornecedores?.nome_fantasia || 'Independente',
      setores: v.vendedor_setores?.map((vs: any) => ({
        setor: vs.categorias_setores?.nome || 'Geral',
        subsetor: vs.categorias_subsetores?.nome || 'Geral'
      })) || []
    }));
  },

  async listarFornecedores() {
    const { data, error } = await supabase.from('fornecedores').select('id, nome_fantasia').order('nome_fantasia');
    if (error) throw error;
    return data || [];
  },

  async listarSetores() {
    const { data, error } = await supabase.from('categorias_setores').select('id, nome').order('nome');
    if (error) throw error;
    return data || [];
  },

  async listarSubsetores(setorId: string) {
    const { data, error } = await supabase.from('categorias_subsetores').select('id, nome').eq('setor_id', setorId).order('nome');
    if (error) throw error;
    return data || [];
  },

  async salvarVendedor(dados: { nome: string; telefone: string; fornecedorId: string; setorId: string; subsetorId: string }) {
    const { data: vendedor, error: errVendedor } = await supabase
      .from('vendedores')
      .insert([{
        nome: dados.nome.trim(),
        telefone: dados.telefone.replace(/\D/g, ''),
        fornecedor_id: dados.fornecedorId
      }])
      .select()
      .single();
    
    if (errVendedor) throw errVendedor;

    const { error: errRelacao } = await supabase
      .from('vendedor_setores')
      .insert([{
        vendedor_id: vendedor.id,
        categoria_id: dados.setorId,
        subcategoria_id: dados.subsetorId
      }]);

    if (errRelacao) throw errRelacao;
    return vendedor;
  }
};