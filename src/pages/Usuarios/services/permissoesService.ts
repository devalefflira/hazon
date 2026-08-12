import { supabase } from '../../../lib/supabaseClient';

export const LISTA_MODULOS_SISTEMA: string[] = [
  'Usuarios',
  'Fornecedores',
  'Vendedores',
  'Produtos',
  'Inventario',
  'Nota de Falta',
  'Dashboard',
  'Relatorios',
  'Cotacoes',
  'Orcamentos',
  'Avarias',
  'Pedidos',
  'Tarefas',
  'Conf. Cega',
  'Temperatura',
  'Categorias',
  'Permissoes'
];

export const permissoesService = {
  // 1. Listar todos os usuários cadastrados
  async listarUsuarios(): Promise<any[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, setor')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Buscar permissões por usuário
  async buscarPermissoesUsuario(usuarioId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('usuario_permissoes')
      .select('modulo_nome, permitido')
      .eq('usuario_id', usuarioId)
      .eq('permitido', true);

    if (error) {
      console.error('Erro ao buscar permissões do usuário:', error);
      return [];
    }

    return (data || []).map((p: any) => p.modulo_nome);
  },

  // 3. Salvar permissões do usuário
  async salvarPermissoesUsuario(usuarioId: string, modulosPermitidos: string[]): Promise<void> {
    await supabase
      .from('usuario_permissoes')
      .delete()
      .eq('usuario_id', usuarioId);

    if (modulosPermitidos.length > 0) {
      const registros = modulosPermitidos.map((modulo) => ({
        usuario_id: usuarioId,
        modulo_nome: modulo,
        permitido: true
      }));

      const { error } = await supabase
        .from('usuario_permissoes')
        .insert(registros);

      if (error) throw error;
    }
  }
};