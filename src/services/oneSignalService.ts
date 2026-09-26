// src/services/oneSignalService.ts
import OneSignal from 'react-onesignal';

// Substitua pelo seu OneSignal App ID real
const ONESIGNAL_APP_ID = 'b16b50f0-fe65-4fe1-920f-8bfe48800e0b';

export const oneSignalService = {
  iniciado: false,
  promessaInicializacao: null as Promise<void> | null,

  async inicializar(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.iniciado) return;

    if (this.promessaInicializacao) {
      return this.promessaInicializacao;
    }

    this.promessaInicializacao = (async () => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
        });
        this.iniciado = true;
      } catch (error: any) {
        // Se o OneSignal já tiver sido inicializado pelo navegador, marca como ativo e não quebra
        if (error?.message?.includes('already initialized')) {
          this.iniciado = true;
        } else {
          console.error('Erro ao inicializar OneSignal:', error);
        }
      } finally {
        this.promessaInicializacao = null;
      }
    })();

    return this.promessaInicializacao;
  },

  async loginUsuario(usuarioId: string) {
    if (!usuarioId) return;
    try {
      if (!this.iniciado) {
        await this.inicializar();
      }
      // Garante que o SDK processou a inicialização antes de chamar o login
      await OneSignal.login(usuarioId);
    } catch (error) {
      console.warn('OneSignal ainda em carregamento ou erro ao associar usuário:', error);
    }
  },

  async solicitarPermissao(): Promise<boolean> {
    try {
      if (!this.iniciado) {
        await this.inicializar();
      }
      await OneSignal.Notifications.requestPermission();
      return Boolean(OneSignal.Notifications.permission);
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificações:', error);
      return false;
    }
  },

  async logoutUsuario() {
    try {
      if (this.iniciado) {
        await OneSignal.logout();
      }
    } catch (error) {
      console.warn('Aviso no logout do OneSignal:', error);
    }
  }
};