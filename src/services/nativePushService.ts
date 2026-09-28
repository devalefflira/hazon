// src/services/nativePushService.ts
import { supabase } from '../lib/supabaseClient';

// Substitua pela sua VAPID Public Key gerada no Passo 2
const VAPID_PUBLIC_KEY = 'BKa9RyWsImQSklphTacLPfQteVWC6lbGetiZakdJ6PP7m4_yBt-qAX-CFRsrv_KXD1HXSQ5ml3RbgyosHAyMe-E';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const nativePushService = {
  async registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push Notifications não são suportadas neste navegador.');
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.error('Erro ao registrar Service Worker nativo:', err);
      return null;
    }
  },

  async solicitarPermissaoESalvar(usuarioId: string): Promise<boolean> {
    if (!usuarioId) return false;

    const reg = await this.registrarServiceWorker();
    if (!reg) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permissão de notificações negada.');
        return false;
      }

      // Obtém ou cria assinatura de Push nativo
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        return false;
      }

      // Salva ou atualiza a assinatura diretamente na tabela do Supabase
      const { error } = await supabase
        .from('web_push_subscriptions')
        .upsert(
          {
            usuario_id: usuarioId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'endpoint' }
        );

      if (error) {
        console.error('Erro ao salvar token de push no Supabase:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Falha ao registrar assinatura push nativa:', err);
      return false;
    }
  },

 async desinscrever(usuarioId: string): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const endpoint = sub.endpoint;
          await sub.unsubscribe();
          await supabase
            .from('web_push_subscriptions')
            .delete()
            .match({ endpoint, usuario_id: usuarioId });
        }
      }
    } catch (err) {
      console.error('Erro ao remover subscrição:', err);
    }
  }
};