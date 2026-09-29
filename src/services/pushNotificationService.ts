// src/services/pushNotificationService.ts
import { supabase } from '../lib/supabaseClient';

export interface EnviarPushParams {
  titulo: string;
  mensagem: string;
  destinatariosIds?: string[]; // Se não informado ou vazio, envia a todos os utilizadores
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

      // Se destinatários estiver vazio, envia para todos os utilizadores registados
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
  },

  // 1. Recebimentos
  async notificarNovoFluxoRecebimento(fornecedor: string, doc: string) {
    await this.enviarNotificacao({
      titulo: '🚚 Nova Carga Rececionada',
      mensagem: `${fornecedor} - Doc/Carga: ${doc} deu entrada na doca.`,
      urlRedirecionamento: '/recebimentos'
    });
  },

  async notificarMudancaFaseRecebimento(faseNome: string, doc: string) {
    await this.enviarNotificacao({
      titulo: '🔄 Esteira de Recebimento',
      mensagem: `Doc/Carga ${doc} avançou para: ${faseNome}.`,
      urlRedirecionamento: '/recebimentos'
    });
  },

  // 2. Avarias
  async notificarNovaAvaria(produto: string, quantidade: number, motivo: string) {
    await this.enviarNotificacao({
      titulo: '⚠️ Nova Avaria Registada',
      mensagem: `${quantidade}x ${produto} - Motivo: ${motivo}.`,
      urlRedirecionamento: '/avarias'
    });
  },

  // 3. Consumo da Loja
  async notificarConsumoLoja(setor: string, valorTotal: number) {
    await this.enviarNotificacao({
      titulo: '🛒 Consumo de Loja Registado',
      mensagem: `Novo lançamento para o setor ${setor} (Total: R$ ${valorTotal.toFixed(2)}).`,
      urlRedirecionamento: '/consumo-loja'
    });
  },

  // 4. Notas de Falta
  async notificarNotaFalta(produto: string, setor: string) {
    await this.enviarNotificacao({
      titulo: '🚨 Alerta de Rutura / Falta',
      mensagem: `${produto} em falta no setor ${setor}. Enviado para cotação.`,
      urlRedirecionamento: '/nota-falta'
    });
  },

  // 5. Ofertas
  async notificarNovaCampanhaOfertas(tituloCampanha: string) {
    await this.enviarNotificacao({
      titulo: '🏷️ Novas Ofertas Publicadas',
      mensagem: `A campanha "${tituloCampanha}" foi ativada na loja!`,
      urlRedirecionamento: '/ofertas'
    });
  },

  // 6. Vencimentos Críticos
  async notificarVencimentoProximo(produto: string, diasRestantes: number) {
    await this.enviarNotificacao({
      titulo: '⏳ Risco Iminente de Vencimento',
      mensagem: `${produto} vence em ${diasRestantes} dias! Ação preventiva necessária.`,
      urlRedirecionamento: '/vencimentos'
    });
  }
};