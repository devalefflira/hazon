// src/pages/Vencimentos/services/vencimentosService.ts
import { supabase } from '../../../lib/supabaseClient';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export interface VencimentoItem {
  id: string;
  codigo_customizado?: string;
  produto_id: string;
  lote: string;
  data_validade: string;
  quantidade: number;
  origem: 'Vencimentos' | 'Inventário' | 'Conf. Cega';
  diasParaVencer: number;
  statusLeitura?: 'Visto' | 'Pendente';
  visualizadoPor?: string;
  visualizadoEm?: string;
  usuarioNome?: string;
  dataHoraRegistro?: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra?: string;
    unidade?: string;
    custoreal?: number;
    pvenda?: number;
  };
  usuarios?: {
    id: string;
    nome: string;
  };
}

function formatarDataHora(dataIsoOrDateString?: string): string {
  if (!dataIsoOrDateString) return 'Data não informada';
  const data = new Date(dataIsoOrDateString);
  if (isNaN(data.getTime())) return dataIsoOrDateString;

  const dataFmt = data.toLocaleDateString('pt-BR');
  const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${dataFmt}, às ${horaFmt}`;
}

export const vencimentosService = {
  // 1. Buscar produtos para autocomplete
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const pattern = termo.trim().replace(/\s+/g, '%').replace(/%+/g, '%');

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, pvenda')
      .or(`codbarra.ilike.%${pattern}%,codprod.ilike.%${pattern}%,descricao.ilike.%${pattern}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Salvar Novo Registro Manual de Vencimento + Notificação Telegram
 async salvarControle(payload: {
    produto_id: string;
    lote?: string;
    data_validade: string;
    quantidade?: number;
    usuario_id?: string;
  }): Promise<void> {
    const codigoCustom = `VEN-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: itemInserido, error } = await supabase
      .from('vencimentos_controle')
      .insert([{
        codigo_customizado: codigoCustom,
        produto_id: payload.produto_id,
        lote: payload.lote || 'NÃO INFORMADO',
        data_validade: payload.data_validade,
        quantidade: payload.quantidade || 1,
        origem: 'Vencimentos',
        usuario_id: payload.usuario_id || null
      }])
      .select('*, produtos(*), usuarios(*)')
      .single();

    if (error) {
      console.error('Erro ao salvar vencimento no banco:', error);
      throw error;
    }

    // Disparo Telegram
    try {
      const prod = itemInserido?.produtos || {};
      const operador = itemInserido?.usuarios?.nome || 'Operador';

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataVal = new Date(payload.data_validade + 'T00:00:00');
      const diffDias = Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      const formatarData = (dt: string) => {
        const p = dt.split('-');
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dt;
      };

      let nivelRisco = '🟡 Atenção (Monitoramento)';
      if (diffDias <= 0) {
        nivelRisco = '🚨 PRODUTO VENCIDO (Recolher Imediatamente)';
      } else if (diffDias <= 3) {
        nivelRisco = `🔴 CRÍTICO (${diffDias} dia(s) restante(s))`;
      } else {
        nivelRisco = `🟡 Atenção (${diffDias} dias restantes)`;
      }

      const descProd = (prod?.descricao || 'PRODUTO')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .toUpperCase();

      const mensagem =
        `⏰ <b>ALERTA DE VALIDADE REGISTRADA</b>\n\n` +
        `<b>Status:</b> ${nivelRisco}\n` +
        `<b>Código:</b> <code>#${codigoCustom}</code>\n` +
        `<b>Produto:</b> ${descProd}\n` +
        `<b>Cód. Sistema:</b> ${prod?.codprod || '-'} | <b>Depto:</b> ${prod?.departamento || 'GERAL'}\n` +
        `<b>Lote:</b> ${payload.lote || 'NÃO INFORMADO'}\n` +
        `<b>Quantidade Auditada:</b> ${payload.quantidade || 1} ${prod?.unidade || 'UN'}\n` +
        `<b>Data de Vencimento:</b> <code>${formatarData(payload.data_validade)}</code>\n` +
        `<b>Auditado por:</b> ${operador}\n`;

      console.log('Enviando mensagem ao Telegram:', mensagem);

      const enviado = await dispararNotificacaoTelegram({
        mensagemHtml: mensagem,
        textoBotao: '🛡️ Abrir Controle de Vencimentos',
        urlBotao: '/?tela=vencimentos'
      });

      console.log('Resposta do disparo Telegram:', enviado);
    } catch (errNotif) {
      console.error('Erro ao processar notificação de vencimento:', errNotif);
    }
  },
  // 3. Marcar notificação como VISTO pelo usuário
  async marcarComoVisto(itemId: string, usuarioId: string): Promise<void> {
    if (!itemId || !usuarioId) return;

    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    await supabase
      .from('notificacoes_leituras')
      .upsert({
        item_id: String(itemId),
        usuario_id: usuarioId,
        data_visualizacao: dataAtual,
        hora_visualizacao: horaAtual,
        visto_em: agora.toISOString()
      }, { onConflict: 'item_id,usuario_id' });
  },

  // 4. Listar e Agregar Registros (Vencimentos + Inventário + Conf. Cega)
  async listarTodosVencimentos(usuarioId?: string): Promise<VencimentoItem[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 4.1. Busca leituras registradas
    const { data: leituras } = await supabase
      .from('notificacoes_leituras')
      .select('item_id, usuario_id, data_visualizacao, hora_visualizacao, usuarios ( nome )');

    const mapaLeituras: Record<string, any> = {};
    (leituras || []).forEach((l: any) => {
      mapaLeituras[`${l.item_id}_${l.usuario_id}`] = l;
      mapaLeituras[l.item_id] = l;
    });

    // 4.2. Busca da tabela manual
    const { data: dadosManuais } = await supabase
      .from('vencimentos_controle')
      .select(`
        id, codigo_customizado, produto_id, lote, data_validade, quantidade, origem, created_at,
        produtos ( id, codprod, descricao, codbarra, unidade, custoreal, pvenda ),
        usuarios ( id, nome )
      `);

    // 4.3. Busca do módulo de Inventário
    const { data: dadosInventario } = await supabase
      .from('inventario_itens')
      .select(`
        id, produto_id, lote, data_validade, quantidade_contabilizada,
        inventarios ( id, created_at, data_registro, hora_registro, usuarios ( id, nome ) ),
        produtos ( id, codprod, descricao, codbarra, unidade, custoreal, pvenda )
      `)
      .not('data_validade', 'is', null);

    // 4.4. Busca do módulo de Conferência Cega
    const { data: dadosConfCega } = await supabase
      .from('conferencia_itens')
      .select(`
        id, produto_id, lote, data_validade, quantidade_contada, created_at,
        conferencias_mestre ( id, created_at, data_conferencia, hora_conferencia, usuarios ( id, nome ) ),
        produtos ( id, codprod, descricao, codbarra, unidade, custoreal, pvenda )
      `)
      .not('data_validade', 'is', null);

    const listaUnificada: VencimentoItem[] = [];

    // Processa Manuais
    (dadosManuais || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dataVal = new Date(item.data_validade + 'T00:00:00');
      const difTempo = dataVal.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 60 * 60 * 24));

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: item.codigo_customizado,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade || 1),
        origem: 'Vencimentos',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: item.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(item.created_at),
        produtos: item.produtos,
        usuarios: item.usuarios
      });
    });

    // Processa Inventário
    (dadosInventario || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dataVal = new Date(item.data_validade + 'T00:00:00');
      const difTempo = dataVal.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 60 * 60 * 24));

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      const inv = item.inventarios || {};
      const dataHoraRef = inv.created_at || (inv.data_registro ? `${inv.data_registro}T${inv.hora_registro || '00:00:00'}` : undefined);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: `INV-${String(item.id).slice(0, 4).toUpperCase()}`,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade_contabilizada || 1),
        origem: 'Inventário',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: inv.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(dataHoraRef),
        produtos: item.produtos
      });
    });

    // Processa Conferência Cega
    (dadosConfCega || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dataVal = new Date(item.data_validade + 'T00:00:00');
      const difTempo = dataVal.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 60 * 60 * 24));

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      const conf = item.conferencias_mestre || {};
      const dataHoraRef = item.created_at || conf.created_at || (conf.data_conferencia ? `${conf.data_conferencia}T${conf.hora_conferencia || '00:00:00'}` : undefined);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: `CEG-${String(item.id).slice(0, 4).toUpperCase()}`,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade_contada || 1),
        origem: 'Conf. Cega',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: conf.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(dataHoraRef),
        produtos: item.produtos
      });
    });

    return listaUnificada.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  },

  // 5. Enviar Itens Selecionados para a fase "Revisar/Aprovar" do Módulo Ofertas + Notificação Telegram
  async enviarItensParaOferta(itensVencimento: any[], usuarioId?: string) {
    const codCustom = `OFT-${Date.now().toString().slice(-6)}`;

    // 5.1. Cria a oferta mestre na fase 'Revisar/Aprovar'
    const { data: ofertaCriada, error: errMestre } = await supabase
      .from('ofertas_mestre')
      .insert({
        codigo_customizado: codCustom,
        usuario_id: usuarioId || null,
        status: 'Revisar/Aprovar',
        tipo_oferta: 'Queima de Estoque',
        tipo_oferta_customizado: 'Controle de Validades (≤ 30 Dias)'
      })
      .select()
      .single();

    if (errMestre) throw errMestre;

    // 5.2. Insere os itens vinculados na tabela oferta_itens
    const inserts = itensVencimento.map((item) => {
      const prod = item.produtos || {};
      return {
        oferta_mestre_id: ofertaCriada.id,
        produto_id: item.produto_id,
        preco_custo_real: Number(prod.custoreal || 0),
        preco_venda_tabela: Number(prod.pvenda || 0),
        preco_oferta: Number(prod.pvenda || 0)
      };
    });

    if (inserts.length > 0) {
      const { error: errItens } = await supabase.from('oferta_itens').insert(inserts);
      if (errItens) throw errItens;
    }

    // Disparo Telegram: Itens enviados para Revisão de Oferta
    try {
      const { data: userData } = usuarioId
        ? await supabase.from('usuarios').select('nome').eq('id', usuarioId).single()
        : { data: null };
      const nomeOperador = userData?.nome || 'Operador';

      const linhas = itensVencimento.slice(0, 6).map((it) => {
        const prod = it.produtos || {};
        return `• <b>${prod.descricao || 'Produto'}</b>: ${it.quantidade} UN (Vence em ${it.diasParaVencer}d)`;
      }).join('\n');

      const excesso = itensVencimento.length > 6 ? `\n<i>... e mais ${itensVencimento.length - 6} item(ns)</i>` : '';

      const msg =
        `🔥 <b>QUEIMA DE ESTOQUE ENVIADA PARA OFERTAS</b>\n\n` +
        `<b>Campanha:</b> <code>#${codCustom}</code>\n` +
        `<b>Origem:</b> Controle de Validades (≤ 30 Dias)\n` +
        `<b>Total de Itens:</b> ${itensVencimento.length} produtos\n` +
        `<b>Fase Atual:</b> REVISAR / APROVAR\n` +
        `<b>Enviado por:</b> ${nomeOperador}\n\n` +
        `<b>Produtos:</b>\n${linhas}${excesso}\n`;

      dispararNotificacaoTelegram({
        mensagemHtml: msg,
        textoBotao: '🏷️ Abrir Módulo de Ofertas',
        urlBotao: '/?tela=ofertas'
      }).catch((e) => console.error('Erro silencioso telegram oferta vencimento:', e));
    } catch (errNotif) {
      console.error('Erro ao notificar oferta de vencimento:', errNotif);
    }

    return ofertaCriada;
  }
};