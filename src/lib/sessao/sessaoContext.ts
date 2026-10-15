// src/lib/sessao/sessaoContext.ts
import { createContext } from 'react';

export interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
  setor?: string;
}

export interface SessaoContextValue {
  usuario: UsuarioLogado | null;
  permissoes: string[];
  // true enquanto a sessão salva no Supabase Auth ainda está sendo verificada (evita piscar a tela de login)
  carregando: boolean;
  entrar: (usuario: UsuarioLogado) => Promise<void>;
  sair: () => Promise<void>;
}

export const SessaoContext = createContext<SessaoContextValue | null>(null);
