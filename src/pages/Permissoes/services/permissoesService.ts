import { supabase } from '../../../lib/supabaseClient';

export const permissoesService = {
  // Busca os perfis (Administrador, Gerencial, etc.) para o dropdown superior
  async listarPerfis() {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Busca os acessos liberados para um perfil específico
  async buscarPermissoesPorPerfil(perfilId: string) {
    const { data, error } = await supabase
      .from('perfis_permissoes')
      .select('modulo, incluido')
      .eq('perfil_id', perfilId);

    if (error) throw error;
    return data;
  },

  // Atualiza as permissões salvando o estado de cada chave liga/desliga
  async salvarPermissoes(perfilId: string, permissoes: { modulo: string; incluido: boolean }[]) {
    // Para garantir a consistência, removemos os registros antigos do perfil e reinserimos o bloco atualizado
    const { error: deleteError } = await supabase
      .from('perfis_permissoes')
      .delete()
      .eq('perfil_id', perfilId);

    if (deleteError) throw deleteError;

    if (permissoes.length === 0) return;

    // Prepara o lote de inserção
    const rows = permissoes.map(p => ({
      perfil_id: perfilId,
      modulo: p.modulo,
      incluido: p.incluido
    }));

    const { error: insertError } = await supabase
      .from('perfis_permissoes')
      .insert(rows);

    if (insertError) throw insertError;
  }
};