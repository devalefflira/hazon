// Arquivo: src/pages/Usuarios/services/usuariosService.ts
import { supabase } from '../../../lib/supabaseClient';
import { permissoesService } from '../../Permissoes/services/permissoesService';

// Colunas expostas ao front-end. senha_hash nunca é lido pelo navegador (S3).
const COLUNAS_USUARIO = 'id, nome, email, setor, perfil_id, updated_at';

// Operações de acesso (Supabase Auth) passam pela Edge Function "criar-usuario",
// que usa a service role no servidor. A senha nunca é gravada na tabela usuarios.
async function chamarFuncaoUsuarios(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('criar-usuario', { body });

  if (error) {
    let mensagem = error.message;
    try {
      const contexto = (error as any).context;
      if (contexto && typeof contexto.json === 'function') {
        const corpo = await contexto.json();
        if (corpo?.error) mensagem = corpo.error;
      }
    } catch {
      // mantém a mensagem padrão do erro
    }
    throw new Error(mensagem);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}

export const usuariosService = {
  // Listar usuários com o nome do perfil
  async listarUsuarios(): Promise<any[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        ${COLUNAS_USUARIO},
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

  // Criar Usuário (conta no Auth + cadastro em usuarios) e atribuir permissões aos módulos
  async criarUsuario(payload: {
    nome: string;
    email: string;
    senha: string;
    setor: string;
    perfil_id: string;
    modulosPermitidos?: string[];
  }): Promise<any> {
    const { modulosPermitidos = [], ...dadosUsuario } = payload;

    const resposta = await chamarFuncaoUsuarios({ acao: 'criar', ...dadosUsuario });
    const novo = resposta?.usuario;

    // Persiste as permissões individuais do novo usuário
    if (novo?.id && modulosPermitidos.length > 0) {
      await permissoesService.salvarPermissoesUsuario(novo.id, modulosPermitidos);
    }

    return novo;
  },

  // Atualizar Usuário, seu acesso (e-mail/senha, se informados) e suas permissões
  async atualizarUsuario(id: string, payload: {
    nome: string;
    email: string;
    senha?: string;
    setor: string;
    perfil_id: string;
    modulosPermitidos?: string[];
  }): Promise<void> {
    const { modulosPermitidos, senha, ...dadosUsuario } = payload;

    // Primeiro sincroniza o acesso no Auth; se falhar, o cadastro não é alterado
    await chamarFuncaoUsuarios({
      acao: 'atualizar_acesso',
      usuario_id: id,
      email: dadosUsuario.email,
      senha: senha && senha.trim() !== '' ? senha : undefined,
    });

    const objetoUpdate: Record<string, any> = {
      nome: dadosUsuario.nome,
      email: dadosUsuario.email,
      setor: dadosUsuario.setor,
      perfil_id: dadosUsuario.perfil_id,
      updated_at: new Date().toISOString()
    };

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
