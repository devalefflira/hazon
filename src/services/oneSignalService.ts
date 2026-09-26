// src/services/oneSignalService.ts
import OneSignal from 'react-onesignal';

// Substitua pelo seu OneSignal App ID obtido no painel
const ONESIGNAL_APP_ID = 'b16b50f0-fe65-4fe1-920f-8bfe48800e0b';

export const oneSignalService = {
  iniciado: false,

  async inicializar() {
    if (this.iniciado || typeof window === 'undefined') return;

    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });

      this.iniciado = true;
    } catch (error) {
      console.error('Erro ao inicializar OneSignal:', error);
    }
  },

  async loginUsuario(usuarioId: string) {
    try {
      if (!this.iniciado) await this.inicializar();
      await OneSignal.login(usuarioId);
    } catch (error) {
      console.error('Erro ao registrar usuário no OneSignal:', error);
    }
  },

  async solicitarPermissao(): Promise<boolean> {
    try {
      if (!this.iniciado) await this.inicializar();
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
      console.error('Erro no logout do OneSignal:', error);
    }
  }
};