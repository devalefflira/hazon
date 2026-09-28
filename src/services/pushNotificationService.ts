// src/services/pushNotificationService.ts
import { supabase } from '../lib/supabaseClient';

export interface EnviarPushParams {
  titulo: string;
  mensagem: string;
  destinatariosIds?: string[]; // IDs dos usuários. Se vazio, envia para todos os cadastrados.
  urlRedirecionamento?: string;
}

export const pushNotificationService = {
  async enviarNotificacao({
    titulo,
    mensagem,
    destinatariosIds,
    urlRedirecionamento = '/'
  }: EnviarPushParams): Promise<void> {
    try {
      // Se foram passados IDs específicos, dispara para cada um deles
      if (destinatariosIds && destinatariosIds.length > 0) {
        await Promise.all(
          destinatariosIds.map(async (usuarioId) => {
            await supabase.functions.invoke('enviar-push', {
              body: {
                destinatario_id: usuarioId,
                titulo,
                corpo: mensagem,
                url: urlRedirecionamento
              }
            });
          })
        );
        return;
      }

      // Se nenhum ID foi especificado, busca todos os usuários com subscrição ativa
      const { data: assinaturas } = await supabase
        .from('web_push_subscriptions')
        .select('usuario_id');

      if (!assinaturas || assinaturas.length === 0) return;

      const usuariosUnicos = Array.from(new Set(assinaturas.map((a: { usuario_id: string }) => a.usuario_id)));

      await Promise.all(
        usuariosUnicos.map(async (usuarioId) => {
          await supabase.functions.invoke('enviar-push', {
            body: {
              destinatario_id: usuarioId,
              titulo,
              corpo: mensagem,
              url: urlRedirecionamento
            }
          });
        })
      );
    } catch (err) {
      console.warn('Falha silenciosa ao disparar push nativo:', err);
    }
  }
};