// src/pages/NotaFalta/services/notaFaltaService.ts
import { supabase } from '../../../lib/supabaseClient';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export interface ItemNotaFaltaPayload {
  produto_id: string;
  tipo_motivo: 'Estoque Baixo' | 'Estoque Zero';
  quantidade_restante: number;
  unidade_restante: string;
}

export interface SalvarNotaFaltaPayload {
  codigo_customizado?: string;
  usuario_id: string;
  area: string;
  local: string;
  status: 'Em Andamento' | 'Salva' | 'Finalizada';
  itens: ItemNotaFaltaPayload[];
}

export const notaFaltaService = {
  // 1. Listar todas as linhas brutas de Notas de Falta
  async listarNotasFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        *,
        produtos (
          id,
          codprod,
          descricao,
          codbarra,
          custoreal,
          pvenda,
          departamento,
          unidade
        ),
        motivos_falta (
          id,
          descricao
        ),
        usuarios (
          id,
          nome
        )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (error) {
      console.error('Erro ao listar notas de falta:', error);
      throw error;
    }

    return data || [];
  },

  // 2. Listar notas de falta já agrupadas por código customizado
  async listarNotasFaltaAgrupadas(): Promise<any[]> {
    const linhas = await this.listarNotasFalta();
    const mapa = new Map<string, any>();

    linhas.forEach((linha: any) => {
      const codigo = linha.codigo_customizado || `NF-${linha.id.slice(0, 6)}`;

      if (!mapa.has(codigo)) {
        mapa.set(codigo, {
          codigo_customizado: codigo,
          data_registro: linha.data_registro,
          hora_registro: linha.hora_registro,
          area: linha.area || 'Frente e Piso de Loja',
          local: linha.local || 'Geral',
          status_geral: linha.status_cotacao || 'Salva',
          usuarios: linha.usuarios,
          itens: []
        });
      }

      mapa.get(codigo).itens.push(linha);
    });

    return Array.from(mapa.values());
  },

  // 3. Buscar produtos por código, EAN ou descrição (com %)
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, custoreal, pvenda, departamento, unidade');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data || [];
  },

  // 4. Listar motivos de falta cadastrados
  async listarMotivosFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_falta')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 5. Salvar / Criar / Atualizar itens da Nota de Falta + Alerta Telegram
  async salvarItensNotaFalta(payload: SalvarNotaFaltaPayload): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let codigoCustomizado = payload.codigo_customizado;

    // Busca o motivo padrão caso não venha com id
    const motivos = await this.listarMotivosFalta();
    const motivoDefaultId = motivos[0]?.id;

    if (codigoCustomizado) {
      await supabase
        .from('notas_falta')
        .delete()
        .eq('codigo_customizado', codigoCustomizado);
    } else {
      codigoCustomizado = `NF-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const linhasInsert = payload.itens.map((it) => {
      const motEncontrado = motivos.find((m) =>
        m.descricao.toLowerCase().includes(it.tipo_motivo.toLowerCase())
      );

      return {
        codigo_customizado: codigoCustomizado,
        usuario_id: payload.usuario_id,
        produto_id: it.produto_id,
        motivo_falta_id: motEncontrado?.id || motivoDefaultId,
        area: payload.area,
        local: payload.local,
        status_cotacao: payload.status,
        quantidade_restante: it.quantidade_restante,
        unidade_restante: it.unidade_restante || 'UN',
        data_registro: dataAtual,
        hora_registro: horaAtual
      };
    });

    const { error: errorInsert } = await supabase
      .from('notas_falta')
      .insert(linhasInsert);

    if (errorInsert) {
      console.error('Erro ao salvar itens da nota de falta:', errorInsert);
      throw errorInsert;
    }

    // Disparo Telegram: Notificação de Ruptura (Nota de Falta)
    try {
      const prodIds = payload.itens.map((i) => i.produto_id);
      const [prodsRes, userRes] = await Promise.all([
        supabase.from('produtos').select('id, codprod, descricao, unidade').in('id', prodIds),
        payload.usuario_id ? supabase.from('usuarios').select('nome').eq('id', payload.usuario_id).single() : Promise.resolve({ data: null })
      ]);

      const produtosMap = new Map<string, any>();
      (prodsRes.data || []).forEach((p) => produtosMap.set(p.id, p));

      const nomeOperador = userRes.data?.nome || 'Operador';

      const linhasProdutos = payload.itens.slice(0, 8).map((it) => {
        const prod = produtosMap.get(it.produto_id);
        const desc = (prod?.descricao || 'Produto')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .toUpperCase();
        const iconeMotivo = it.tipo_motivo === 'Estoque Zero' ? '🔴' : '🟡';
        return `• ${iconeMotivo} <b>${desc}</b>: Restante: <code>${it.quantidade_restante} ${it.unidade_restante || prod?.unidade || 'UN'}</code> (${it.tipo_motivo})`;
      }).join('\n');

      const excesso = payload.itens.length > 8 ? `\n<i>... e mais ${payload.itens.length - 8} produto(s)</i>` : '';

      const mensagem =
        `⚠️ <b>RUPTURA DE ESTOQUE (NOTA DE FALTA)</b>\n\n` +
        `<b>Código:</b> <code>#${codigoCustomizado}</code>\n` +
        `<b>Área:</b> ${payload.area.toUpperCase()} | <b>Local:</b> ${payload.local.toUpperCase()}\n` +
        `<b>Total de Itens Apontados:</b> ${payload.itens.length}\n` +
        `<b>Apontado por:</b> ${nomeOperador}\n` +
        `<b>Data:</b> ${dataAtual.split('-').reverse().join('/')} às ${horaAtual.slice(0, 5)}\n\n` +
        `<b>Itens Registrados:</b>\n${linhasProdutos}${excesso}\n`;

      dispararNotificacaoTelegram({
        mensagemHtml: mensagem,
        textoBotao: '📝 Abrir Notas de Falta',
        urlBotao: '/?tela=nota-falta'
      }).catch((e) => console.error('Erro silencioso telegram nota falta:', e));
    } catch (errNotif) {
      console.error('Erro ao notificar nota de falta:', errNotif);
    }
  },

  // 6. Finalizar Ciclo da Nota (marca status como Finalizada)
  async finalizarCicloNota(codigoCustomizado: string): Promise<void> {
    const { error } = await supabase
      .from('notas_falta')
      .update({ status_cotacao: 'Finalizada' })
      .eq('codigo_customizado', codigoCustomizado);

    if (error) {
      console.error('Erro ao finalizar ciclo da nota de falta:', error);
      throw error;
    }
  },

  // 7. Alias para compatibilidade
  async finalizarNotaFalta(codigoCustomizado: string): Promise<void> {
    return this.finalizarCicloNota(codigoCustomizado);
  }
};