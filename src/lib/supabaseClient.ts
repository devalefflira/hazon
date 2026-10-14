import { createClient } from '@supabase/supabase-js';

// Configuração vem do arquivo .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).
// Hoje aponta para o Postgres/PostgREST local, exposto pelo Tailscale Funnel.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas no arquivo .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
