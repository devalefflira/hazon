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

    // Busca fornecedores ativos
    async listarFornecedores() {
        const { data, error } = await supabase
            .from('fornecedores')
            .select('id, nome_fantasia')
            .order('nome_fantasia', { ascending: true });

        if (error) { console.error("Erro Fornecedores:", error); throw error; }
        return data || [];
    },

    // Busca setores (Tabela correta: categorias_setores)
    async listarSetores() {
        const { data, error } = await supabase
            .from('categorias_setores')
            .select('id, nome')
            .order('nome', { ascending: true });

        if (error) { console.error("Erro Setores:", error); throw error; }
        return data || [];
    },

    // Busca subsetores (Tabela correta: categorias_subsetores)
    async listarSubsetores(setorId: string) {
        const { data, error } = await supabase
            .from('categorias_subsetores')
            .select('id, nome')
            .eq('setor_id', setorId) // A FK na tabela categorias_subsetores chama-se setor_id
            .order('nome', { ascending: true });

        if (error) { console.error("Erro Subsetores:", error); throw error; }
        return data || [];
    },

};