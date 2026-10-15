// src/lib/sessao/SessaoProvider.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { nativePushService } from '../../services/nativePushService';
import { SessaoContext } from './sessaoContext';
import type { SessaoContextValue, UsuarioLogado } from './sessaoContext';
import { carregarSessaoDoUsuario } from './carregarSessao';

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [permissoes, setPermissoes] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir o app: se existir sessão válida no Supabase Auth, recarrega usuário e permissões
  useEffect(() => {
    let ativo = true;

    const aplicarUsuario = async (userId: string | null) => {
      if (!userId) {
        if (ativo) {
          setUsuario(null);
          setPermissoes([]);
        }
        return;
      }

      try {
        const sessao = await carregarSessaoDoUsuario(userId);
        if (!ativo) return;
        setUsuario(sessao?.usuario ?? null);
        setPermissoes(sessao?.permissoes ?? []);
      } catch (err) {
        console.error('Erro ao carregar sessão do usuário:', err);
        if (ativo) {
          setUsuario(null);
          setPermissoes([]);
        }
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => aplicarUsuario(data.session?.user.id ?? null))
      .catch((err) => console.error('Erro ao ler sessão:', err))
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    // Sessão encerrada ou expirada (ex.: falha ao renovar o token): limpa o estado local
    const { data: escuta } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'SIGNED_OUT' || !sessao) {
        setUsuario(null);
        setPermissoes([]);
      }
    });

    return () => {
      ativo = false;
      escuta.subscription.unsubscribe();
    };
  }, []);

  // Inicialização do Service Worker nativo para Push
  useEffect(() => {
    const registrarPush = async () => {
      if (usuario?.id) {
        await nativePushService.registrarServiceWorker();
      }
    };

    registrarPush();
  }, [usuario?.id]);

  // Só expõe o usuário depois de carregar as permissões, para a tela inicial já nascer completa
  const entrar = useCallback(async (novoUsuario: UsuarioLogado) => {
    try {
      await nativePushService.solicitarPermissaoESalvar(novoUsuario.id);
    } catch (e) {
      console.warn('Aviso push:', e);
    }

    let liberados: string[] = [];
    try {
      const { data } = await supabase
        .from('usuario_permissoes')
        .select('modulo_nome')
        .eq('usuario_id', novoUsuario.id)
        .eq('permitido', true);

      liberados = (data || []).map((p: { modulo_nome: string }) => p.modulo_nome);
    } catch (err) {
      console.error('Erro ao buscar permissões do usuário:', err);
      liberados = [];
    }

    setPermissoes(liberados);
    setUsuario(novoUsuario);
  }, []);

  const sair = useCallback(async () => {
    if (usuario?.id) {
      await nativePushService.desinscrever(usuario.id);
    }

    await supabase.auth.signOut();

    setUsuario(null);
    setPermissoes([]);
    localStorage.removeItem('hazon_tela_ativa');
  }, [usuario]);

  const valor: SessaoContextValue = useMemo(
    () => ({ usuario, permissoes, carregando, entrar, sair }),
    [usuario, permissoes, carregando, entrar, sair]
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}
