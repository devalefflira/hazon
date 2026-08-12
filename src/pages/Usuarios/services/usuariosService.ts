// Arquivo: src/pages/Usuarios/services/usuariosService.ts
import { supabase } from '../../../lib/supabaseClient';
import { permissoesService } from '../../Permissoes/services/permissoesService';

export const usuariosService = {
  // Listar usuários com o nome do perfil
  async listarUsuarios(): Promise<any[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        perfis ( id, nome )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Listar perfis cadastrados (Administrador, Gestor, Operador)
  async listarPerfis(): Promise<any[]> {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Criar Usuário e atribuir suas permissões aos módulos
  async criarUsuario(payload: {
    nome: string;
    email: string;
    senha_hash: string;
    setor: string;
    perfil_id: string;
    modulosPermitidos?: string[];
  }): Promise<any> {
    const { modulosPermitidos = [], ...dadosUsuario } = payload;

    const { data, error } = await supabase
      .from('usuarios')
      .insert([dadosUsuario])
      .select()
      .single();

    if (error) throw error;

    // Persiste as permissões individuais do novo usuário
    if (data?.id && modulosPermitidos.length > 0) {
      await permissoesService.salvarPermissoesUsuario(data.id, modulosPermitidos);
    }

    return data;
  },

  // Atualizar Usuário e suas permissões
  async atualizarUsuario(id: string, payload: {
    nome: string;
    email: string;
    senha_hash?: string;
    setor: string;
    perfil_id: string;
    modulosPermitidos?: string[];
  }): Promise<void> {
    const { modulosPermitidos, ...dadosUsuario } = payload;

    const objetoUpdate: Record<string, any> = {
      nome: dadosUsuario.nome,
      email: dadosUsuario.email,
      setor: dadosUsuario.setor,
      perfil_id: dadosUsuario.perfil_id,
      updated_at: new Date().toISOString()
    };

    if (dadosUsuario.senha_hash && dadosUsuario.senha_hash.trim() !== '') {
      objetoUpdate.senha_hash = dadosUsuario.senha_hash;
    }

    const { error } = await supabase
      .from('usuarios')
      .update(objetoUpdate)
      .eq('id', id);

    if (error) throw error;

    // Atualiza permissões dos módulos
    if (modulosPermitidos) {
      await permissoesService.salvarPermissoesUsuario(id, modulosPermitidos);
    }
  },

  // Excluir Usuário e limpar suas permissões
  async excluirUsuario(id: string): Promise<void> {
    // Remove permissões vinculadas
    await supabase
      .from('usuario_permissoes')
      .delete()
      .eq('usuario_id', id);

    // Remove o usuário
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};