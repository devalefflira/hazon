interface EnviarPushParams {
  titulo: string;
  mensagem: string;
  destinatariosIds?: string[]; // IDs específicos (ex: destinatário de mensagem). Se vazio, envia a todos.
  urlRedirecionamento?: string; // Ex: tela de mensagens ou rota específica
}

const ONESIGNAL_APP_ID = 'b16b50f0-fe65-4fe1-920f-8bfe48800e0b';
const ONESIGNAL_REST_API_KEY = 'SUA_REST_API_KEY_AQUI';

export const pushNotificationService = {
  async enviarNotificacao({
    titulo,
    mensagem,
    destinatariosIds,
    urlRedirecionamento
  }: EnviarPushParams): Promise<void> {
    try {
      const payload: Record<string, any> = {
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        headings: { pt: titulo, en: titulo },
        contents: { pt: mensagem, en: mensagem },
      };

      if (urlRedirecionamento) {
        payload.url = urlRedirecionamento;
      }

      // Se informados utilizadores específicos, envia apenas para eles
      if (destinatariosIds && destinatariosIds.length > 0) {
        payload.include_aliases = {
          external_id: destinatariosIds
        };
      } else {
        // Envia para toda a equipa
        payload.included_segments = ['Total Subscriptions'];
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Falha no envio de push OneSignal:', errorData);
      }
    } catch (err) {
      console.error('Erro de rede ao enviar notificação push:', err);
    }
  }
};