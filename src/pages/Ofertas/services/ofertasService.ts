// src/pages/Ofertas/services/ofertasService.ts
import { supabase } from '../../../lib/supabaseClient';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export interface SalvarOfertaPayload {
  codigo_customizado?: string | null;
  usuario_id?: string;
  status: 'Lista Sugerida' | 'Revisar/Aprovar' | 'Precificar' | 'Concluida' | 'Em Andamento' | 'Criada Finalizada';
  tipo_oferta?: string;
  tipo_oferta_customizado?: string;
  data_inicio?: string;
  data_fim?: string;
  itens: Array<{
    produto_id: string;
    preco_custo_real?: number;
    preco_venda_tabela?: number;
    preco_oferta?: number;
  }>;
}

export const ofertasService = {
  async listarOfertas() {
    const { data, error } = await supabase
      .from('ofertas_mestre')
      .select(`
        *,
        usuarios:usuarios(nome),
        oferta_itens(*, produtos:produtos(*))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async salvarOferta(payload: SalvarOfertaPayload) {
    let ofertaId: string;
    let codCustomizadoFinal = payload.codigo_customizado;

    if (payload.codigo_customizado) {
      const { data: existente, error: errBusca } = await supabase
        .from('ofertas_mestre')
        .select('id')
        .eq('codigo_customizado', payload.codigo_customizado)
        .single();

      if (errBusca) throw errBusca;
      ofertaId = existente.id;

      const updateData: Record<string, any> = {
        status: payload.status,
        updated_at: new Date().toISOString()
      };

      if (payload.tipo_oferta) updateData.tipo_oferta = payload.tipo_oferta;
      if (payload.tipo_oferta_customizado !== undefined) updateData.tipo_oferta_customizado = payload.tipo_oferta_customizado;
      if (payload.data_inicio) updateData.data_inicio = payload.data_inicio;
      if (payload.data_fim) updateData.data_fim = payload.data_fim;

      const { error: errUpdate } = await supabase
        .from('ofertas_mestre')
        .update(updateData)
        .eq('id', ofertaId);

      if (errUpdate) throw errUpdate;

      await supabase.from('oferta_itens').delete().eq('oferta_mestre_id', ofertaId);
    } else {
      codCustomizadoFinal = `OFT-${Date.now().toString().slice(-6)}`;
      const { data: novaOferta, error: errInsert } = await supabase
        .from('ofertas_mestre')
        .insert({
          codigo_customizado: codCustomizadoFinal,
          usuario_id: payload.usuario_id,
          status: payload.status,
          tipo_oferta: payload.tipo_oferta || 'Oferta da Semana',
          tipo_oferta_customizado: payload.tipo_oferta_customizado || '',
          data_inicio: payload.data_inicio || null,
          data_fim: payload.data_fim || null
        })
        .select()
        .single();

      if (errInsert) throw errInsert;
      ofertaId = novaOferta.id;
    }

    if (payload.itens && payload.itens.length > 0) {
      const inserts = payload.itens.map((item) => ({
        oferta_mestre_id: ofertaId,
        produto_id: item.produto_id,
        preco_custo_real: Number(item.preco_custo_real || 0),
        preco_venda_tabela: Number(item.preco_venda_tabela || 0),
        preco_oferta: Number(item.preco_oferta || 0)
      }));

      const { error: errItens } = await supabase.from('oferta_itens').insert(inserts);
      if (errItens) throw errItens;
    }

    // DISPARO DAS NOTIFICAÇÕES TELEGRAM NOS 3 MOMENTOS
    try {
      const statusAtual = payload.status;
      const codExibicao = codCustomizadoFinal || 'OFT-S/C';

      const formatarData = (dt?: string) => {
        if (!dt) return 'N/I';
        const p = dt.split('-');
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dt;
      };

      const { data: userResp } = payload.usuario_id
        ? await supabase.from('usuarios').select('nome').eq('id', payload.usuario_id).single()
        : { data: null };
      const nomeOperador = userResp?.nome || 'Operador';

      // MOMENTO 1: Oferta criada e enviada para Revisão
      if (statusAtual === 'Revisar/Aprovar') {
        const prodIds = (payload.itens || []).map((it) => it.produto_id);
        const { data: prodsData } = await supabase
          .from('produtos')
          .select('id, descricao, unidade')
          .in('id', prodIds);

        const mapProds = new Map<string, any>();
        (prodsData || []).forEach((p) => mapProds.set(p.id, p));

        const linhasItens = (payload.itens || []).slice(0, 6).map((it) => {
          const p = mapProds.get(it.produto_id);
          const desc = (p?.descricao || 'Produto')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .toUpperCase();
          return `• <b>${desc}</b>`;
        }).join('\n');

        const excesso = (payload.itens || []).length > 6 ? `\n<i>... e mais ${(payload.itens || []).length - 6} produto(s) sugerido(s)</i>` : '';

        const msg =
          `📥 <b>NOVA OFERTA ENVIADA PARA REVISÃO</b>\n\n` +
          `<b>Código:</b> <code>#${codExibicao}</code>\n` +
          `<b>Total de Itens Sugeridos:</b> ${(payload.itens || []).length} produtos\n` +
          `<b>Cadastrado por:</b> ${nomeOperador}\n` +
          `<b>Fase:</b> 🟡 AGUARDANDO REVISÃO / APROVAÇÃO\n\n` +
          `<b>Produtos na Lista:</b>\n${linhasItens}${excesso}\n`;

        dispararNotificacaoTelegram({
          mensagemHtml: msg,
          textoBotao: '🔎 Revisar Oferta no ERP',
          urlBotao: '/?tela=ofertas'
        }).catch((e) => console.error('Erro silencioso telegram momento 1:', e));
      }

      // MOMENTO 2: Oferta revisada e enviada para Precificação
      else if (statusAtual === 'Precificar') {
        const msg =
          `💲 <b>OFERTA REVISADA - AGUARDANDO PRECIFICAÇÃO</b>\n\n` +
          `<b>Código:</b> <code>#${codExibicao}</code>\n` +
          `<b>Total de Itens Aprovados:</b> ${(payload.itens || []).length} produtos\n` +
          `<b>Aprovado por:</b> ${nomeOperador}\n` +
          `<b>Status:</b> Pronto para definição das datas de vigência e preços de oferta promocionais.\n`;

        dispararNotificacaoTelegram({
          mensagemHtml: msg,
          textoBotao: '📊 Precificar Oferta',
          urlBotao: '/?tela=ofertas'
        }).catch((e) => console.error('Erro silencioso telegram momento 2:', e));
      }

      // MOMENTO 3: Oferta precificada e ativada/concluída
      else if (statusAtual === 'Concluida') {
        const tipoCampanha = payload.tipo_oferta === 'Data Comemorativa' && payload.tipo_oferta_customizado
          ? `${payload.tipo_oferta} (${payload.tipo_oferta_customizado})`
          : payload.tipo_oferta || 'Campanha';

        const prodIds = (payload.itens || []).map((it) => it.produto_id);
        const { data: prodsData } = await supabase
          .from('produtos')
          .select('id, descricao, unidade')
          .in('id', prodIds);

        const mapProds = new Map<string, any>();
        (prodsData || []).forEach((p) => mapProds.set(p.id, p));

        const destaquesPreco = (payload.itens || []).slice(0, 6).map((it) => {
          const p = mapProds.get(it.produto_id);
          const desc = (p?.descricao || 'Produto')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .toUpperCase();
          const precoTab = Number(it.preco_venda_tabela || 0).toFixed(2).replace('.', ',');
          const precoOf = Number(it.preco_oferta || 0).toFixed(2).replace('.', ',');
          return `• <b>${desc}</b>: De R$ ${precoTab} por <b>R$ ${precoOf}</b>`;
        }).join('\n');

        const excesso = (payload.itens || []).length > 6 ? `\n<i>... e mais ${(payload.itens || []).length - 6} produto(s) precificado(s)</i>` : '';

        const msg =
          `🏷️ <b>OFERTA CONCLUÍDA & ATIVADA</b>\n\n` +
          `<b>Campanha:</b> ${tipoCampanha.toUpperCase()}\n` +
          `<b>Código:</b> <code>#${codExibicao}</code>\n` +
          `<b>Período:</b> de ${formatarData(payload.data_inicio)} até ${formatarData(payload.data_fim)}\n` +
          `<b>Total de Produtos:</b> ${(payload.itens || []).length} itens\n` +
          `<b>Precificado por:</b> ${nomeOperador}\n\n` +
          `<b>Destaques de Oferta:</b>\n${destaquesPreco}${excesso}\n`;

        dispararNotificacaoTelegram({
          mensagemHtml: msg,
          textoBotao: '🎨 Gerar Encartes & Placas',
          urlBotao: '/?tela=ofertas'
        }).catch((e) => console.error('Erro silencioso telegram momento 3:', e));
      }
    } catch (errNotif) {
      console.error('Erro ao processar notificações de ofertas no Telegram:', errNotif);
    }

    return { id: ofertaId };
  },

  async buscarProdutos(termo: string) {
    if (!termo.trim()) return [];

    const pattern = termo
      .trim()
      .replace(/\s+/g, '%')
      .replace(/%+/g, '%');

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`descricao.ilike.%${pattern}%,codprod.ilike.%${pattern}%,codbarra.ilike.%${pattern}%`)
      .limit(15);

    if (error) throw error;
    return data || [];
  },

  async buscarSugestoesPesquisaPreco(): Promise<any[]> {
    const { data, error } = await supabase
      .from('pesquisa_precos_itens')
      .select(`
        id,
        produto_id,
        preco_custo,
        preco_venda,
        preco_concorrente,
        pesquisa_precos_mestre!inner (
          id,
          codigo_customizado,
          data_registro,
          enviado_para_ofertas,
          pesquisa_precos_concorrentes (
            nome_fantasia
          )
        ),
        produtos (
          id,
          codprod,
          descricao,
          unidade,
          custoreal,
          pvenda
        )
      `)
      .filter('preco_concorrente', 'gt', 0);

    if (error) {
      console.error('Erro ao buscar sugestões de pesquisa:', error);
      return [];
    }

    return (data || [])
      .filter((item: any) => Number(item.preco_venda) > Number(item.preco_concorrente))
      .map((item: any) => ({
        id: item.id,
        produto_id: item.produto_id,
        codprod: item.produtos?.codprod,
        descricao: item.produtos?.descricao,
        unidade: item.produtos?.unidade || 'UN',
        preco_custo: Number(item.preco_custo || item.produtos?.custoreal || 0),
        preco_venda_atual: Number(item.preco_venda || item.produtos?.pvenda || 0),
        preco_concorrente: Number(item.preco_concorrente || 0),
        preco_sugerido_oferta: Number(item.preco_concorrente || 0),
        origem: 'Pesquisa de Preços',
        concorrente_nome: item.pesquisa_precos_mestre?.pesquisa_precos_concorrentes?.nome_fantasia || 'Concorrente',
        codigo_pesquisa: item.pesquisa_precos_mestre?.codigo_customizado
      }));
  }
};