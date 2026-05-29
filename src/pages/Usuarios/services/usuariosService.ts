import { supabase } from '../../../lib/supabaseClient';

export const usuariosService = {
  // Lista todos os usuários trazendo o nome do perfil associado via JOIN relacional
  async listarUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        setor,
        email,
        perfis (
          nome
        )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Busca os perfis cadastrados no banco para alimentar o select do formulário
  async listarPerfisDisponiveis() {
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Insere um novo usuário no banco de dados
  async salvarUsuario(usuario: { nome: string; setor: string; email: string; senhaHash: string; perfilId: string }) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          nome: usuario.nome,
          setor: usuario.setor,
          email: usuario.email.toLowerCase().trim(), // Blindagem de e-mail contra erros de login
          senha_hash: usuario.senhaHash, // Em produção usaremos criptografia hash
          perfil_id: usuario.perfilId
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};