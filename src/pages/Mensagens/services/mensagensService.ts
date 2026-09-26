import { supabase } from '../../../lib/supabaseClient';
import type { EnviarMensagemPayload, MensagemView } from '../types/mensagens.types';

export const mensagensService = {
  async listarUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, setor, email')
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async enviarMensagem(payload: EnviarMensagemPayload) {
    const codigo = `MSG-${Date.now().toString().slice(-4)}`;
    const { error } = await supabase.from('mensagens_internas').insert([{
      codigo_customizado: codigo,
      remetente_id: payload.remetente_id,
      destinatario_id: payload.destinatario_id,
      tipo_mensagem: payload.tipo_mensagem,
      subtipo_solicitacao: payload.subtipo_solicitacao || null,
      conteudo: payload.conteudo,
      anexos: payload.anexos,
      status: 'Pendente'
    }]);
    if (error) throw error;
  },

  async listarMensagens(status: 'Pendente' | 'Resolvido', usuarioId: string): Promise<MensagemView[]> {
    const { data, error } = await supabase
      .from('mensagens_internas')
      .select(`
        *,
        remetente:usuarios!mensagens_remetente_fkey(nome),
        destinatario:usuarios!mensagens_destinatario_fkey(nome)
      `)
      .or(`remetente_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      codigo_customizado: row.codigo_customizado,
      remetente_id: row.remetente_id,
      remetente_nome: Array.isArray(row.remetente) ? row.remetente[0]?.nome : row.remetente?.nome,
      destinatario_id: row.destinatario_id,
      destinatario_nome: Array.isArray(row.destinatario) ? row.destinatario[0]?.nome : row.destinatario?.nome,
      tipo_mensagem: row.tipo_mensagem,
      subtipo_solicitacao: row.subtipo_solicitacao,
      conteudo: row.conteudo,
      status: row.status,
      resposta_conteudo: row.resposta_conteudo,
      respondido_em: row.respondido_em,
      anexos: row.anexos || [],
      created_at: row.created_at
    }));
  },

  // Finaliza a mensagem, grava a resposta e APAGA os arquivos (anexos = [])
  async responderEFinalizar(mensagemId: string, resposta: string) {
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from('mensagens_internas')
      .update({
        status: 'Resolvido',
        resposta_conteudo: resposta,
        respondido_em: agora,
        anexos: [], // Apaga os anexos do banco para economizar espaço
        updated_at: agora
      })
      .eq('id', mensagemId);

    if (error) throw error;
  }
};