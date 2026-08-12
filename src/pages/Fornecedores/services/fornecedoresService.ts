// Arquivo: src/pages/Fornecedores/services/fornecedoresService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface FornecedorDTO {
  id?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  created_at?: string;
}

export const fornecedoresService = {
  // 1. Listagem completa
  async listarFornecedores(): Promise<FornecedorDTO[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Busca de detalhes por ID
  async obterPorId(id: string): Promise<any> {
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
  },

  // 3. Salvamento/Atualização individual de fornecedor
  async salvarFornecedor(payload: FornecedorDTO): Promise<void> {
    const dadosFormatados = {
      razao_social: String(payload.razao_social).trim().toUpperCase(),
      nome_fantasia: String(payload.nome_fantasia || payload.razao_social).trim().toUpperCase(),
      cnpj: String(payload.cnpj).trim()
    };

    if (payload.id) {
      const { error } = await supabase
        .from('fornecedores')
        .update(dadosFormatados)
        .eq('id', payload.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('fornecedores')
        .insert([dadosFormatados]);

      if (error) throw error;
    }
  },

  // 4. Carga em massa via CSV/Excel
  async importarMassaFornecedores(fornecedores: FornecedorDTO[]): Promise<void> {
    const payloadFormatado = fornecedores.map(f => ({
      razao_social: String(f.razao_social).trim().toUpperCase(),
      nome_fantasia: String(f.nome_fantasia || f.razao_social).trim().toUpperCase(),
      cnpj: String(f.cnpj).trim()
    }));

    const { error } = await supabase
      .from('fornecedores')
      .upsert(payloadFormatado, { onConflict: 'cnpj' });

    if (error) throw error;
  }
};