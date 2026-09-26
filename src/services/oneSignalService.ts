// src/services/oneSignalService.ts
import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = 'b16b50f0-fe65-4fe1-920f-8bfe48880e0b';

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
          // Força o SDK a procurar os workers na raiz pública do domínio
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: 'OneSignalSDKUpdaterWorker.js',
        });
        this.iniciado = true;
      } catch (error: any) {
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
      if (OneSignal.Notifications?.permission) {
        await OneSignal.login(usuarioId);
      }
    } catch (error) {
      console.warn('OneSignal aguardando subscrição para login:', error);
    }
  },

  async solicitarPermissao(usuarioId?: string): Promise<boolean> {
    try {
      if (!this.iniciado) {
        await this.inicializar();
      }

      await OneSignal.Notifications.requestPermission();
      const permitido = Boolean(OneSignal.Notifications.permission);

      if (permitido && usuarioId) {
        await OneSignal.login(usuarioId);
      }

      return permitido;
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