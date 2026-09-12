// src/pages/ConsumoLoja/services/consumoLojaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { 
  ItemConsumoForm, 
  ConsumoLojaItemView, 
  FinalidadeConsumo, 
  LimiteConsumoView, 
  LimiteHistoricoView 
} from '../types/consumoLoja.types';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export const consumoLojaService = {
  // 1. Autocomplete de produtos
  async buscarProdutos(termo: string) {
    if (!termo.trim()) return [];
    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, codbarra, descricao, departamento, custoreal, unidade');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else if (palavras.length > 1) {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(25);
    if (error) throw error;
    return data || [];
  },

  // 2. Busca itens filtrados por Finalidade (Consumo vs Matéria-Prima)
  async buscarItensConsumo(
    dataInicio?: string,
    dataFim?: string,
    departamento?: string,
    local?: string,
    finalidadeAlvo: FinalidadeConsumo = 'Consumo/Despesa'
  ): Promise<ConsumoLojaItemView[]> {
    let queryConsumo = supabase
      .from('consumo_loja_itens')
      .select(`
        id,
        local,
        departamento,
        valor_total_item,
        quantidade,
        unidade_medida,
        observacao,
        finalidade,
        produto_produzido,
        produtos (
          codprod,
          descricao
        ),
        consumo_loja_mestre!inner (
          data_registro,
          hora_registro,
          usuarios (
            nome
          )
        )
      `)
      .eq('finalidade', finalidadeAlvo);

    if (dataInicio) queryConsumo = queryConsumo.gte('consumo_loja_mestre.data_registro', dataInicio);
    if (dataFim) queryConsumo = queryConsumo.lte('consumo_loja_mestre.data_registro', dataFim);
    if (departamento) queryConsumo = queryConsumo.ilike('departamento', `%${departamento}%`);
    if (local && local !== 'Todos') queryConsumo = queryConsumo.eq('local', local);

    // Se for consumo operacional, mescla com avarias apontadas para Consumo Interno
    let resAvariasData: any[] = [];
    if (finalidadeAlvo === 'Consumo/Despesa') {
      let queryAvarias = supabase
        .from('avarias')
        .select(`
          id,
          codigo_customizado,
          quantidade,
          preco_custo_na_perda,
          destinacao,
          observacao,
          data_registro,
          hora_registro,
          produtos (
            codprod,
            descricao,
            unidade,
            departamento
          ),
          usuarios (
            nome
          )
        `)
        .ilike('destinacao', '%Consumo%');

      if (dataInicio) queryAvarias = queryAvarias.gte('data_registro', dataInicio);
      if (dataFim) queryAvarias = queryAvarias.lte('data_registro', dataFim);

      const resAv = await queryAvarias;
      if (!resAv.error && resAv.data) {
        resAvariasData = resAv.data;
      }
    }

    const { data: itensConsumoData, error: errConsumo } = await queryConsumo;
    if (errConsumo) throw errConsumo;

    const itensConsumoFormatados: ConsumoLojaItemView[] = (itensConsumoData || []).map((item: any) => {
      const prod = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
      const mestre = item.consumo_loja_mestre;
      const user = Array.isArray(mestre?.usuarios) ? mestre.usuarios[0] : mestre?.usuarios;

      return {
        id: item.id,
        codprod: prod?.codprod,
        descricao_produto: prod?.descricao || 'Produto não identificado',
        local: item.local,
        departamento: item.departamento || '-',
        valor_total_item: Number(item.valor_total_item || 0),
        quantidade: Number(item.quantidade || 0),
        unidade_medida: item.unidade_medida || 'UN',
        observacao: item.observacao,
        data_registro: mestre?.data_registro,
        hora_registro: mestre?.hora_registro || '00:00:00',
        usuario_nome: user?.nome || 'Sistema',
        finalidade: item.finalidade || 'Consumo/Despesa',
        produto_produzido: item.produto_produzido
      };
    });

    const itensAvariasFormatados: ConsumoLojaItemView[] = resAvariasData
      .filter((av: any) => {
        if (local && local !== 'Todos' && local !== 'Consumo Interno (Avaria)') return false;
        const prod = Array.isArray(av.produtos) ? av.produtos[0] : av.produtos;
        if (departamento && !prod?.departamento?.toLowerCase().includes(departamento.toLowerCase())) return false;
        return true;
      })
      .map((av: any) => {
        const prod = Array.isArray(av.produtos) ? av.produtos[0] : av.produtos;
        const user = Array.isArray(av.usuarios) ? av.usuarios[0] : av.usuarios;
        const qtd = Number(av.quantidade || 0);
        const custo = Number(av.preco_custo_na_perda || 0);

        return {
          id: `av-${av.id}`,
          codprod: prod?.codprod,
          descricao_produto: prod?.descricao || 'Produto não identificado',
          local: 'Consumo Interno (Avaria)',
          departamento: prod?.departamento || '-',
          valor_total_item: qtd * custo,
          quantidade: qtd,
          unidade_medida: prod?.unidade || 'UN',
          observacao: av.observacao ? `[${av.codigo_customizado || 'AV'}] ${av.observacao}` : `Origem Avaria ${av.codigo_customizado || ''}`,
          data_registro: av.data_registro,
          hora_registro: av.hora_registro || '00:00:00',
          usuario_nome: user?.nome || 'Sistema',
          finalidade: 'Consumo/Despesa',
          produto_produzido: undefined
        };
      });

    const unificados = [...itensConsumoFormatados, ...itensAvariasFormatados];
    unificados.sort((a, b) => {
      const dataHoraA = `${a.data_registro}T${a.hora_registro}`;
      const dataHoraB = `${b.data_registro}T${b.hora_registro}`;
      return dataHoraB.localeCompare(dataHoraA);
    });

    return unificados;
  },

  // 3. Salvar Lançamento de Itens (com Notificação no Telegram)
  async salvarRegistroConsumo(
    usuarioId: string, 
    local: string, 
    finalidade: FinalidadeConsumo, 
    itens: ItemConsumoForm[], 
    observacaoGeral?: string
  ) {
    if (!itens || itens.length === 0) throw new Error('Adicione ao menos um item.');

    const valorTotal = itens.reduce((acc, curr) => acc + curr.valor_total_item, 0);
    const prefixo = finalidade === 'Uso na Produção/Transformação' ? 'PRD' : 'CSM';
    const codigoCustomizado = `${prefixo}-${Date.now().toString().slice(-6)}`;
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const { data: mestre, error: errorMestre } = await supabase
      .from('consumo_loja_mestre')
      .insert([
        {
          codigo_customizado: codigoCustomizado,
          usuario_id: usuarioId,
          valor_total: valorTotal,
          finalidade,
          data_registro: dataAtual,
          hora_registro: horaAtual,
          observacao: observacaoGeral || null
        }
      ])
      .select('id')
      .single();

    if (errorMestre) throw errorMestre;

    const payloadItens = itens.map((item) => ({
      consumo_mestre_id: mestre.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      unidade_medida: item.unidade_medida,
      local,
      departamento: item.departamento || 'Geral',
      custo_unitario: item.custo_unitario,
      valor_total_item: item.valor_total_item,
      observacao: item.observacao || null,
      finalidade,
      produto_produzido: item.produto_produzido || null
    }));

    const { error: errorItens } = await supabase
      .from('consumo_loja_itens')
      .insert(payloadItens);

    if (errorItens) throw errorItens;

    // Disparo Telegram
    try {
      const { data: userData } = usuarioId
        ? await supabase.from('usuarios').select('nome').eq('id', usuarioId).single()
        : { data: null };
      const nomeUsuario = userData?.nome || 'Operador';

      const linhas = itens.slice(0, 8).map((it) => {
        const extra = it.produto_produzido ? ` ➔ Produz: <i>${it.produto_produzido}</i>` : '';
        return `• <b>${it.descricao || 'Item'}</b>: ${it.quantidade} ${it.unidade_medida} (R$ ${it.valor_total_item.toFixed(2).replace('.', ',')})${extra}`;
      }).join('\n');

      const excesso = itens.length > 8 ? `\n<i>... e mais ${itens.length - 8} item(ns)</i>` : '';
      const iconeTitulo = finalidade === 'Uso na Produção/Transformação' ? '🥖' : '🛒';
      const labelTipo = finalidade === 'Uso na Produção/Transformação' ? 'MATÉRIA-PRIMA / TRANSFORMAÇÃO' : 'CONSUMO / DESPESA OPERACIONAL';

      const msg =
        `${iconeTitulo} <b>LANÇAMENTO: ${labelTipo}</b>\n\n` +
        `<b>Código:</b> <code>#${codigoCustomizado}</code>\n` +
        `<b>Local / Setor:</b> ${local.toUpperCase()}\n` +
        `<b>Total de Itens:</b> ${itens.length}\n` +
        `<b>Custo Total:</b> <code>R$ ${valorTotal.toFixed(2).replace('.', ',')}</code>\n` +
        `<b>Responsável:</b> ${nomeUsuario}\n` +
        `<b>Data:</b> ${dataAtual.split('-').reverse().join('/')} às ${horaAtual.slice(0, 5)}\n\n` +
        `<b>Itens:</b>\n${linhas}${excesso}\n`;

      dispararNotificacaoTelegram({
        mensagemHtml: msg,
        textoBotao: '🛒 Ver Módulo Consumo Loja',
        urlBotao: '/?tela=consumo-loja'
      }).catch((e) => console.error('Erro silencioso telegram consumo:', e));
    } catch (errNotif) {
      console.error('Erro ao notificar no telegram:', errNotif);
    }

    return true;
  },

  // 4. Gestão de Limites Mensais por Local
  async obterLimitesDoMes(anoMes: string): Promise<LimiteConsumoView[]> {
    const { data, error } = await supabase
      .from('consumo_loja_limites')
      .select(`
        id,
        local,
        ano_mes,
        valor_limite,
        created_at,
        updated_at,
        usuarios ( nome )
      `)
      .eq('ano_mes', anoMes);

    if (error) throw error;

    return (data || []).map((item: any) => {
      const user = Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios;
      const dataRef = new Date(item.updated_at || item.created_at);

      return {
        id: item.id,
        local: item.local,
        ano_mes: item.ano_mes,
        valor_limite: Number(item.valor_limite || 0),
        usuario_nome: user?.nome || 'Gestor',
        data_ajuste: dataRef.toLocaleDateString('pt-BR'),
        hora_ajuste: dataRef.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        updated_at: item.updated_at
      };
    });
  },

  // 5. Salvar / Alterar Limite com Histórico Completo
  async definirOuAlterarLimite(
    local: string, 
    anoMes: string, 
    novoValor: number, 
    usuarioId: string
  ): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Verifica se já existe limite para este local e mês
    const { data: existente } = await supabase
      .from('consumo_loja_limites')
      .select('id, valor_limite')
      .eq('local', local)
      .eq('ano_mes', anoMes)
      .maybeSingle();

    if (existente) {
      const valorAnterior = Number(existente.valor_limite || 0);

      // Atualiza o limite atual
      const { error: errUp } = await supabase
        .from('consumo_loja_limites')
        .update({
          valor_limite: novoValor,
          usuario_id: usuarioId,
          updated_at: agora.toISOString()
        })
        .eq('id', existente.id);

      if (errUp) throw errUp;

      // Registra a auditoria no histórico
      await supabase.from('consumo_loja_limites_historico').insert([{
        limite_id: existente.id,
        local,
        ano_mes: anoMes,
        valor_anterior: valorAnterior,
        valor_novo: novoValor,
        usuario_id: usuarioId,
        data_alteracao: dataAtual,
        hora_alteracao: horaAtual
      }]);
    } else {
      // Cria o registro pela primeira vez no mês
      const { data: criado, error: errIn } = await supabase
        .from('consumo_loja_limites')
        .insert([{
          local,
          ano_mes: anoMes,
          valor_limite: novoValor,
          usuario_id: usuarioId,
          updated_at: agora.toISOString()
        }])
        .select('id')
        .single();

      if (errIn) throw errIn;

      await supabase.from('consumo_loja_limites_historico').insert([{
        limite_id: criado.id,
        local,
        ano_mes: anoMes,
        valor_anterior: 0,
        valor_novo: novoValor,
        usuario_id: usuarioId,
        data_alteracao: dataAtual,
        hora_alteracao: horaAtual
      }]);
    }
  },

  // 6. Listar Histórico de Alterações de Limites
  async listarHistoricoLimites(anoMes?: string): Promise<LimiteHistoricoView[]> {
    let query = supabase
      .from('consumo_loja_limites_historico')
      .select(`
        id,
        local,
        ano_mes,
        valor_anterior,
        valor_novo,
        data_alteracao,
        hora_alteracao,
        usuarios ( nome )
      `)
      .order('created_at', { ascending: false });

    if (anoMes) query = query.eq('ano_mes', anoMes);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((h: any) => {
      const user = Array.isArray(h.usuarios) ? h.usuarios[0] : h.usuarios;
      return {
        id: h.id,
        local: h.local,
        ano_mes: h.ano_mes,
        valor_anterior: Number(h.valor_anterior || 0),
        valor_novo: Number(h.valor_novo || 0),
        usuario_nome: user?.nome || 'Gestor',
        data_alteracao: h.data_alteracao.split('-').reverse().join('/'),
        hora_alteracao: String(h.hora_alteracao).slice(0, 5)
      };
    });
  },

  // Atualizar Finalidade e Produto Produzido de um item já registrado
  async atualizarFinalidadeItem(
    itemId: string,
    novaFinalidade: FinalidadeConsumo,
    produtoProduzido?: string
  ): Promise<boolean> {
    // Se for originário de avaria, apenas atualiza observação e não quebra vínculo
    if (itemId.startsWith('av-')) {
      const avariaId = itemId.replace('av-', '');
      const { error } = await supabase
        .from('avarias')
        .update({
          observacao: produtoProduzido ? `[Produção: ${produtoProduzido}]` : 'Consumo Interno'
        })
        .eq('id', avariaId);

      if (error) throw error;
      return true;
    }

    const payloadUpdate: Record<string, any> = {
      finalidade: novaFinalidade,
      produto_produzido: novaFinalidade === 'Uso na Produção/Transformação' ? (produtoProduzido || null) : null
    };

    const { error } = await supabase
      .from('consumo_loja_itens')
      .update(payloadUpdate)
      .eq('id', itemId);

    if (error) {
      console.error('Erro ao atualizar finalidade do item:', error);
      throw error;
    }

    return true;
  }
};