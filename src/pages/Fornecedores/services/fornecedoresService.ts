import { supabase } from '../../../lib/supabaseClient';

export const fornecedoresService = {
  // Lista todos os fornecedores cadastrados
  async listarFornecedores() {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, razao_social, nome_fantasia, cnpj')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Grava um novo fornecedor (tríade essencial)
  async salvarFornecedor(fornecedor: { razao_social: string; nome_fantasia: string; cnpj: string }) {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert([
        {
          razao_social: fornecedor.razao_social.trim(),
          nome_fantasia: fornecedor.nome_fantasia.trim(),
          cnpj: fornecedor.cnpj.replace(/\D/g, '') // Remove pontos e traços antes de salvar no banco
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async obterPorId(id: string) {
    const { data, error } = await supabase
      .from('fornecedores')
      .select(`
        *,
        vendedores (
          id,
          nome,
          telefone
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};