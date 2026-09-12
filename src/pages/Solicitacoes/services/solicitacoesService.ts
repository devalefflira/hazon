// src/pages/Solicitacoes/services/solicitacoesService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { 
  SolicitacaoView, 
  NovaSolicitacaoPayload, 
  ResponderSolicitacaoPayload,
  StatusSolicitacao 
} from '../types/solicitacoes.types';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export const solicitacoesService = {
  // 1. Listar usuários disponíveis para receber solicitações
  async listarDestinatarios(): Promise<Array<{ id: string; nome: string; setor: string }>> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, setor')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Busca de produtos para o autocomplete
  async buscarProdutos(termo: string) {
    if (!termo.trim()) return [];
    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, codbarra, descricao, departamento, unidade');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else if (palavras.length > 1) {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data || [];
  },

  // 3. Listar solicitações por status (Pendentes, Aprovadas, Negadas)
  async listarSolicitacoes(statusAba: 'Pendentes' | 'Aprovadas' | 'Negadas'): Promise<SolicitacaoView[]> {
    let query = supabase
      .from('solicitacoes_mestre')
      .select(`
        *,
        solicitante:usuarios!solicitacoes_mestre_solicitante_fkey(nome),
        destinatario:usuarios!solicitacoes_mestre_destinatario_fkey(nome),
        respondente:usuarios!solicitacoes_mestre_respondido_por_fkey(nome),
        solicitacao_itens(
          id,
          produto_id,
          quantidade_solicitada,
          quantidade_atendida,
          unidade_medida,
          observacao,
          produtos(
            codprod,
            descricao
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (statusAba === 'Pendentes') {
      query = query.eq('status', 'Pendente');
    } else if (statusAba === 'Aprovadas') {
      query = query.in('status', ['Aprovada Total', 'Aprovada Parcial']);
    } else if (statusAba === 'Negadas') {
      query = query.eq('status', 'Negada');
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => {
      const itensFormatados = (row.solicitacao_itens || []).map((it: any) => {
        const prod = Array.isArray(it.produtos) ? it.produtos[0] : it.produtos;
        return {
          id: it.id,
          produto_id: it.produto_id,
          codprod: prod?.codprod,
          descricao_produto: prod?.descricao || 'Produto não identificado',
          unidade_medida: it.unidade_medida || 'UN',
          quantidade_solicitada: Number(it.quantidade_solicitada || 0),
          quantidade_atendida: it.quantidade_atendida !== null ? Number(it.quantidade_atendida) : undefined,
          observacao: it.observacao
        };
      });

      const sol = Array.isArray(row.solicitante) ? row.solicitante[0] : row.solicitante;
      const dest = Array.isArray(row.destinatario) ? row.destinatario[0] : row.destinatario;
      const resp = Array.isArray(row.respondente) ? row.respondente[0] : row.respondente;

      return {
        id: row.id,
        codigo_customizado: row.codigo_customizado,
        tipo_solicitacao: row.tipo_solicitacao,
        finalidade: row.finalidade,
        descricao_geral: row.descricao_geral,
        status: row.status as StatusSolicitacao,
        tipo_atendimento: row.tipo_atendimento,
        prazo_limite: row.prazo_limite,
        justificativa_resposta: row.justificativa_resposta,
        data_registro: row.data_registro,
        hora_registro: row.hora_registro || '00:00',
        solicitante_id: row.solicitante_id,
        solicitante_nome: sol?.nome || 'Solicitante',
        destinatario_id: row.destinatario_id,
        destinatario_nome: dest?.nome || 'Destinatário',
        respondido_por_nome: resp?.nome,
        respondido_em: row.respondido_em,
        itens: itensFormatados
      };
    });
  },

  // 4. Salvar nova solicitação + Disparo no Telegram
  async criarSolicitacao(payload: NovaSolicitacaoPayload): Promise<string> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const codigoCustomizado = `SOL-${Date.now().toString().slice(-6)}`;

    const { data: mestre, error: errMestre } = await supabase
      .from('solicitacoes_mestre')
      .insert([{
        codigo_customizado: codigoCustomizado,
        solicitante_id: payload.solicitante_id,
        destinatario_id: payload.destinatario_id,
        tipo_solicitacao: payload.tipo_solicitacao,
        finalidade: payload.finalidade,
        descricao_geral: payload.descricao_geral || null,
        status: 'Pendente',
        data_registro: dataAtual,
        hora_registro: horaAtual
      }])
      .select('id')
      .single();

    if (errMestre) throw errMestre;

    // Se for do tipo Produto, insere os itens vinculados
    if (payload.tipo_solicitacao === 'Produto' && payload.itens && payload.itens.length > 0) {
      const inserts = payload.itens.map((it) => ({
        solicitacao_id: mestre.id,
        produto_id: it.produto_id,
        quantidade_solicitada: it.quantidade,
        unidade_medida: it.unidade_medida,
        observacao: it.observacao || null
      }));

      const { error: errItens } = await supabase
        .from('solicitacao_itens')
        .insert(inserts);

      if (errItens) throw errItens;
    }

    // Disparo Telegram: Notificação de Nova Solicitação
    try {
      const [solRes, destRes] = await Promise.all([
        supabase.from('usuarios').select('nome').eq('id', payload.solicitante_id).single(),
        supabase.from('usuarios').select('nome').eq('id', payload.destinatario_id).single()
      ]);

      const nomeSolicitante = solRes.data?.nome || 'Operador';
      const nomeDestinatario = destRes.data?.nome || 'Responsável';

      let resumoItens = '';
      if (payload.tipo_solicitacao === 'Produto' && payload.itens && payload.itens.length > 0) {
        const linhas = payload.itens.slice(0, 5).map((it) => 
          `• <b>${it.descricao || 'Item'}</b>: ${it.quantidade} ${it.unidade_medida}`
        ).join('\n');
        const excesso = payload.itens.length > 5 ? `\n<i>... e mais ${payload.itens.length - 5} item(ns)</i>` : '';
        resumoItens = `\n<b>Produtos Solicitados:</b>\n${linhas}${excesso}\n`;
      } else if (payload.descricao_geral) {
        resumoItens = `\n<b>Detalhes:</b> <i>"${payload.descricao_geral}"</i>\n`;
      }

      const msg = 
        `📬 <b>NOVA SOLICITAÇÃO INTERNA</b>\n\n` +
        `<b>Código:</b> <code>#${codigoCustomizado}</code>\n` +
        `<b>Tipo:</b> ${payload.tipo_solicitacao.toUpperCase()}\n` +
        `<b>De:</b> ${nomeSolicitante}\n` +
        `<b>Para:</b> <b>${nomeDestinatario}</b>\n` +
        `<b>Finalidade:</b> <i>"${payload.finalidade}"</i>\n` +
        resumoItens +
        `\n<b>Status:</b> 🟡 AGUARDANDO RESPOSTA\n`;

      dispararNotificacaoTelegram({
        mensagemHtml: msg,
        textoBotao: '📬 Abrir Solicitações',
        urlBotao: '/?tela=solicitacoes'
      }).catch((e) => console.error('Erro silencioso telegram solicitacao:', e));
    } catch (errNotif) {
      console.error('Erro ao notificar solicitacao no Telegram:', errNotif);
    }

    return mestre.id;
  },

  // 5. Responder Solicitação (Aprovar Total, Parcial ou Negar)
  async responderSolicitacao(payload: ResponderSolicitacaoPayload): Promise<void> {
    const updateData: Record<string, any> = {
      status: payload.status,
      respondido_por: payload.usuario_id,
      respondido_em: new Date().toISOString(),
      justificativa_resposta: payload.justificativa || null,
      tipo_atendimento: payload.tipo_atendimento || null,
      prazo_limite: payload.prazo_limite || null,
      updated_at: new Date().toISOString()
    };

    const { error: errUpdate } = await supabase
      .from('solicitacoes_mestre')
      .update(updateData)
      .eq('id', payload.solicitacao_id);

    if (errUpdate) throw errUpdate;

    // Atualiza quantidades atendidas nos itens caso informado
    if (payload.itens_atendidos && payload.itens_atendidos.length > 0) {
      for (const item of payload.itens_atendidos) {
        await supabase
          .from('solicitacao_itens')
          .update({ quantidade_atendida: item.quantidade_atendida })
          .eq('id', item.item_id);
      }
    }

    // Disparo Telegram: Notificação de Resposta da Solicitação
    try {
      const { data: solData } = await supabase
        .from('solicitacoes_mestre')
        .select(`
          codigo_customizado,
          tipo_solicitacao,
          solicitante:usuarios!solicitacoes_mestre_solicitante_fkey(nome),
          respondente:usuarios!solicitacoes_mestre_respondido_por_fkey(nome)
        `)
        .eq('id', payload.solicitacao_id)
        .single();

      if (solData) {
        const sol = Array.isArray(solData.solicitante) ? solData.solicitante[0] : solData.solicitante;
        const resp = Array.isArray(solData.respondente) ? solData.respondente[0] : solData.respondente;

        const iconeStatus = payload.status === 'Aprovada Total' 
          ? '✅' 
          : payload.status === 'Aprovada Parcial' 
          ? '⚠️' 
          : '❌';

        const prazoInfo = payload.tipo_atendimento === 'Com Prazo' && payload.prazo_limite
          ? `\n<b>Prazo para Atendimento:</b> <code>${payload.prazo_limite.split('-').reverse().join('/')}</code>`
          : payload.tipo_atendimento === 'Imediato'
          ? `\n<b>Atendimento:</b> Imediato`
          : '';

        const justificativaInfo = payload.justificativa
          ? `\n<b>Justificativa:</b> <i>"${payload.justificativa}"</i>`
          : '';

        const msg = 
          `${iconeStatus} <b>SOLICITAÇÃO ${payload.status.toUpperCase()}</b>\n\n` +
          `<b>Código:</b> <code>#${solData.codigo_customizado}</code>\n` +
          `<b>Tipo:</b> ${solData.tipo_solicitacao}\n` +
          `<b>Solicitante:</b> ${sol?.nome || 'Operador'}\n` +
          `<b>Respondido por:</b> ${resp?.nome || 'Responsável'}\n` +
          prazoInfo +
          justificativaInfo + '\n';

        dispararNotificacaoTelegram({
          mensagemHtml: msg,
          textoBotao: '📬 Ver Solicitação',
          urlBotao: '/?tela=solicitacoes'
        }).catch((e) => console.error('Erro silencioso telegram resposta:', e));
      }
    } catch (errNotif) {
      console.error('Erro ao notificar resposta no Telegram:', errNotif);
    }
  }
};