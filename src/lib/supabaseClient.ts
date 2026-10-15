import { createClient } from '@supabase/supabase-js';

// Configuração vem do arquivo .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
// Projeto Supabase na nuvem: login via Supabase Auth e acesso aos dados via PostgREST com RLS.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas no arquivo .env.');
}

// Base da API, mantida exportada por compatibilidade com módulos que a importam
export const apiBaseUrl = supabaseUrl.replace(/\/+$/, '');

// Sem sessão, as requisições seguem com a chave anon (papel anon).
// Com sessão do Supabase Auth, o supabase-js envia o JWT do usuário (papel authenticated) automaticamente.
export const supabase = createClient(apiBaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
