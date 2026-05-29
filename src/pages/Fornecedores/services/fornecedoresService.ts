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

  // Busca os vendedores vinculados a este fornecedor específico
  // Nota: Deixamos a chamada pronta consumindo a futura tabela de vendedores
  async buscarVendedoresAtrelados(fornecedorId: string) {
    const { data, error } = await supabase
      .from('vendedores')
      .select('id, nome, telefone, email')
      .eq('fornecedor_id', fornecedorId)
      .order('nome', { ascending: true });

    // Tratamento sênior: Se a tabela 'vendedores' ainda não existir no banco,
    // interceptamos o erro 404 e retornamos uma lista vazia temporária para não quebrar o app
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found')) {
        return [];
      }
      throw error;
    }
    return data;
  }
};