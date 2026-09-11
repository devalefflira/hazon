// src/pages/Trocas/services/trocasService.ts
import { supabase } from '../../../lib/supabaseClient';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export const trocasService = {
  // 1. Listar Fornecedores Cadastrados
  async listarFornecedores(): Promise<any[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, razao_social, nome_fantasia, cnpj')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Listar Itens de Avaria com Destinação "Troca" sincronizados com a tabela trocas
  async listarItensTroca(): Promise<any[]> {
    const { data: avarias, error: errAvarias } = await supabase
      .from('avarias')
      .select(`
        id,
        codigo_customizado,
        quantidade,
        data_registro,
        hora_registro,
        observacao,
        destinacao,
        produtos (
          id,
          codprod,
          descricao,
          unidade,
          custoreal
        )
      `)
      .ilike('destinacao', '%troca%')
      .order('data_registro', { ascending: false });

    if (errAvarias) throw errAvarias;

    const { data: trocas, error: errTrocas } = await supabase
      .from('trocas')
      .select(`
        *,
        fornecedores ( id, nome_fantasia, razao_social ),
        usuarios:recebido_por ( id, nome )
      `);

    if (errTrocas) throw errTrocas;

    const mapTrocas = new Map<string, any>();
    (trocas || []).forEach((t: any) => {
      mapTrocas.set(t.avaria_id, t);
    });

    return (avarias || []).map((av: any) => {
      const trocaVinculada = mapTrocas.get(av.id);
      const prod = Array.isArray(av.produtos) ? av.produtos[0] : av.produtos;

      return {
        avaria_id: av.id,
        troca_id: trocaVinculada?.id || null,
        codigo_customizado: av.codigo_customizado,
        produto_id: prod?.id,
        codprod: prod?.codprod,
        descricao_produto: prod?.descricao || 'PRODUTO NÃO IDENTIFICADO',
        quantidade: Number(av.quantidade || 0),
        unidade: prod?.unidade || 'UN',
        custoreal: Number(prod?.custoreal || 0),
        data_coleta: av.data_registro,
        hora_coleta: av.hora_registro,
        observacao: av.observacao,
        fornecedor_id: trocaVinculada?.fornecedor_id || null,
        fornecedor_nome: trocaVinculada?.fornecedores?.nome_fantasia || trocaVinculada?.fornecedores?.razao_social || 'Não Identificado',
        status: trocaVinculada?.status || 'Não iniciado',
        anotacoes: trocaVinculada?.anotacoes || '',
        troca_realizada: trocaVinculada?.troca_realizada || false,
        recebido_por_nome: trocaVinculada?.usuarios?.nome || null,
        recebido_data: trocaVinculada?.recebido_data || null,
        recebido_hora: trocaVinculada?.recebido_hora || null
      };
    });
  },

  // 3. Vincular ou Alterar Fornecedor da Avaria
  async atribuirFornecedor(avariaId: string, fornecedorId: string): Promise<void> {
    const { data: existente } = await supabase
      .from('trocas')
      .select('id')
      .eq('avaria_id', avariaId)
      .maybeSingle();

    if (existente) {
      const { error } = await supabase
        .from('trocas')
        .update({ fornecedor_id: fornecedorId || null })
        .eq('id', existente.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('trocas')
        .insert([{
          avaria_id: avariaId,
          fornecedor_id: fornecedorId || null,
          status: 'Não iniciado'
        }]);
      if (error) throw error;
    }
  },

  // 4. Enviar Grupo de Itens para Negociação + Alerta Telegram
  async enviarParaNegociar(avariaIds: string[]): Promise<void> {
    for (const id of avariaIds) {
      const { data: existente } = await supabase
        .from('trocas')
        .select('id')
        .eq('avaria_id', id)
        .maybeSingle();

      if (existente) {
        await supabase
          .from('trocas')
          .update({ status: 'Enviado' })
          .eq('id', existente.id);
      } else {
        await supabase
          .from('trocas')
          .insert([{
            avaria_id: id,
            status: 'Enviado'
          }]);
      }
    }

    try {
      const { data: itensNegociados } = await supabase
        .from('avarias')
        .select(`
          id, codigo_customizado, quantidade, preco_custo_na_perda,
          produtos ( codprod, descricao, unidade ),
          trocas ( fornecedores ( nome_fantasia, razao_social ) )
        `)
        .in('id', avariaIds);

      if (itensNegociados && itensNegociados.length > 0) {
        const totalValorRecuperar = itensNegociados.reduce(
          (acc, it: any) => acc + Number(it.quantidade || 0) * Number(it.preco_custo_na_perda || 0),
          0
        );

        const linhas = itensNegociados.slice(0, 6).map((it: any) => {
          const prod: any = Array.isArray(it.produtos) ? it.produtos[0] : it.produtos;
          return `• <b>${prod?.descricao || 'Item'}</b>: ${it.quantidade} ${prod?.unidade || 'UN'}`;
        }).join('\n');

        const excesso = itensNegociados.length > 6 ? `\n<i>... e mais ${itensNegociados.length - 6} produto(s)</i>` : '';

        const msg =
          `🔄 <b>LOTE ENVIADO PARA NEGOCIAÇÃO DE TROCA</b>\n\n` +
          `<b>Qtd de Produtos:</b> ${itensNegociados.length} itens\n` +
          `<b>Valor Estimado a Recuperar:</b> <code>R$ ${totalValorRecuperar.toFixed(2).replace('.', ',')}</code>\n` +
          `<b>Status:</b> AGUARDANDO RETORNO DO FORNECEDOR\n\n` +
          `<b>Itens no Lote:</b>\n${linhas}${excesso}\n`;

        dispararNotificacaoTelegram({
          mensagemHtml: msg,
          textoBotao: '📦 Acompanhar Módulo de Trocas',
          urlBotao: '/?tela=trocas'
        }).catch((e) => console.error('Erro silencioso telegram envio troca:', e));
      }
    } catch (errN) {
      console.error('Erro ao notificar envio para negociação de trocas:', errN);
    }
  },

  // 5. Atualizar Status da Negociação (E, A, N com anotação)
  async atualizarStatusNegociacao(avariaIds: string[], novoStatus: string, anotacao?: string): Promise<void> {
    for (const id of avariaIds) {
      const payload: Record<string, any> = { status: novoStatus };
      if (anotacao !== undefined) {
        payload.anotacoes = anotacao;
      }

      await supabase
        .from('trocas')
        .update(payload)
        .eq('avaria_id', id);
    }
  },

  // Cancelar negociação
  async cancelarNegociacao(avariaIds: string[]): Promise<void> {
    for (const id of avariaIds) {
      await supabase
        .from('trocas')
        .update({
          status: 'Não iniciado',
          anotacoes: null
        })
        .eq('avaria_id', id);
    }
  },

  // 6. Confirmar Recebimento / Finalizar Ciclo + Notificação Telegram
  async confirmarRecebimento(avariaIds: string[], usuarioId: string): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (const id of avariaIds) {
      await supabase
        .from('trocas')
        .update({
          troca_realizada: true,
          status: 'Concluída',
          recebido_por: usuarioId,
          recebido_data: dataAtual,
          recebido_hora: horaAtual
        })
        .eq('avaria_id', id);
    }

    try {
      const [itensRes, userRes] = await Promise.all([
        supabase
          .from('avarias')
          .select(`
            codigo_customizado, quantidade,
            produtos ( descricao, unidade ),
            trocas ( fornecedores ( nome_fantasia, razao_social ) )
          `)
          .in('id', avariaIds),
        supabase.from('usuarios').select('nome').eq('id', usuarioId).single()
      ]);

      const itens = itensRes.data || [];
      const operador = userRes.data?.nome || 'Operador';

      const linhas = itens.slice(0, 6).map((it: any) => {
        const prod: any = Array.isArray(it.produtos) ? it.produtos[0] : it.produtos;
        return `• <b>${prod?.descricao || 'Item'}</b>: ${it.quantidade} ${prod?.unidade || 'UN'}`;
      }).join('\n');

      const excesso = itens.length > 6 ? `\n<i>... e mais ${itens.length - 6} produto(s)</i>` : '';

      const msg =
        `✅ <b>TROCA RECEBIDA / MERCADORIA REPOSTA</b>\n\n` +
        `<b>Total de Produtos Repostos:</b> ${itens.length} itens\n` +
        `<b>Recebido por:</b> ${operador}\n` +
        `<b>Data da Baixa:</b> ${dataAtual.split('-').reverse().join('/')} às ${horaAtual.slice(0, 5)}\n\n` +
        `<b>Itens:</b>\n${linhas}${excesso}\n`;

      dispararNotificacaoTelegram({
        mensagemHtml: msg,
        textoBotao: '📦 Ver Trocas Concluídas',
        urlBotao: '/?tela=trocas'
      }).catch((e) => console.error('Erro silencioso telegram baixa troca:', e));
    } catch (errNotif) {
      console.error('Erro ao notificar conclusão de trocas:', errNotif);
    }
  }
};