// src/lib/sessao/carregarSessao.ts
import { supabase } from '../supabaseClient';
import type { UsuarioLogado } from './sessaoContext';

export interface SessaoCarregada {
  usuario: UsuarioLogado;
  permissoes: string[];
}

// Monta usuário e permissões a partir do id do Supabase Auth (é o mesmo id de public.usuarios).
// Retorna null quando a conta existe no Auth mas não tem cadastro na tabela usuarios.
export async function carregarSessaoDoUsuario(userId: string): Promise<SessaoCarregada | null> {
  const { data: linha, error } = await supabase
    .from('usuarios')
    .select('id, nome, setor, perfis ( nome )')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!linha) return null;

  const perfisBruto = linha.perfis as unknown as { nome: string } | { nome: string }[] | null;
  const perfilNome = Array.isArray(perfisBruto) ? perfisBruto[0]?.nome : perfisBruto?.nome;

  const { data: permissoesDados, error: erroPermissoes } = await supabase
    .from('usuario_permissoes')
    .select('modulo_nome')
    .eq('usuario_id', userId)
    .eq('permitido', true);

  if (erroPermissoes) throw erroPermissoes;

  const permissoes = (permissoesDados ?? []).map((p: { modulo_nome: string }) => p.modulo_nome);

  return {
    usuario: {
      id: linha.id,
      nome: linha.nome,
      perfil: perfilNome || 'Operacional',
      setor: linha.setor ?? undefined,
    },
    permissoes,
  };
}
