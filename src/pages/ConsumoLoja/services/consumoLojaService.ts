// src/pages/ConsumoLoja/services/consumoLojaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ItemConsumoForm, ConsumoLojaItemView } from '../types/consumoLoja.types';

export const consumoLojaService = {
  async buscarProdutos(termo: string) {
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

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  },

  // Busca unificada: Itens normais de Consumo Loja + Avarias com destino Consumo Interno
  async buscarItensConsumo(
    dataInicio?: string,
    dataFim?: string,
    departamento?: string,
    local?: string
  ): Promise<ConsumoLojaItemView[]> {
    // 1. Query na tabela consumo_loja_itens
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
      `);

    if (dataInicio) queryConsumo = queryConsumo.gte('consumo_loja_mestre.data_registro', dataInicio);
    if (dataFim) queryConsumo = queryConsumo.lte('consumo_loja_mestre.data_registro', dataFim);
    if (departamento) queryConsumo = queryConsumo.ilike('departamento', `%${departamento}%`);
    if (local && local !== 'Todos') queryConsumo = queryConsumo.eq('local', local);

    // 2. Query na tabela avarias buscando registros com destino Consumo Interno
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

    const [resConsumo, resAvarias] = await Promise.all([queryConsumo, queryAvarias]);

    if (resConsumo.error) throw resConsumo.error;
    if (resAvarias.error) throw resAvarias.error;

    // Formata itens normais de Consumo Loja
    const itensConsumoFormatados: ConsumoLojaItemView[] = (resConsumo.data || []).map((item: any) => ({
      id: item.id,
      codprod: item.produtos?.codprod,
      descricao_produto: item.produtos?.descricao || 'Produto não identificado',
      local: item.local,
      departamento: item.departamento || '-',
      valor_total_item: Number(item.valor_total_item || 0),
      quantidade: Number(item.quantidade || 0),
      unidade_medida: item.unidade_medida || 'UN',
      observacao: item.observacao,
      data_registro: item.consumo_loja_mestre?.data_registro,
      hora_registro: item.consumo_loja_mestre?.hora_registro || '00:00:00',
      usuario_nome: item.consumo_loja_mestre?.usuarios?.nome || 'Sistema'
    }));

    // Formata itens de Avaria com destino Consumo Interno
    const itensAvariasFormatados: ConsumoLojaItemView[] = (resAvarias.data || [])
      .filter((av: any) => {
        if (local && local !== 'Todos' && local !== 'Consumo Interno (Avaria)') return false;
        if (departamento && !av.produtos?.departamento?.toLowerCase().includes(departamento.toLowerCase())) return false;
        return true;
      })
      .map((av: any) => {
        const qtd = Number(av.quantidade || 0);
        const custo = Number(av.preco_custo_na_perda || 0);
        return {
          id: `av-${av.id}`,
          codprod: av.produtos?.codprod,
          descricao_produto: av.produtos?.descricao || 'Produto não identificado',
          local: 'Consumo Interno (Avaria)',
          departamento: av.produtos?.departamento || '-',
          valor_total_item: qtd * custo,
          quantidade: qtd,
          unidade_medida: av.produtos?.unidade || 'UN',
          observacao: av.observacao ? `[${av.codigo_customizado || 'AV'}] ${av.observacao}` : `Origem Avaria ${av.codigo_customizado || ''}`,
          data_registro: av.data_registro,
          hora_registro: av.hora_registro || '00:00:00',
          usuario_nome: av.usuarios?.nome || 'Sistema'
        };
      });

    // Unifica e ordena cronologicamente
    const unificados = [...itensConsumoFormatados, ...itensAvariasFormatados];
    unificados.sort((a, b) => {
      const dataHoraA = `${a.data_registro}T${a.hora_registro}`;
      const dataHoraB = `${b.data_registro}T${b.hora_registro}`;
      return dataHoraB.localeCompare(dataHoraA);
    });

    return unificados;
  },

  async atualizarItemConsumo(itemId: string, quantidade: number, local: string, custoUnitario: number) {
    // Se for item originário da tabela de avarias
    if (itemId.startsWith('av-')) {
      const avariaId = itemId.replace('av-', '');
      const { error } = await supabase
        .from('avarias')
        .update({
          quantidade
        })
        .eq('id', avariaId);

      if (error) throw error;
      return true;
    }

    const valorTotalItem = quantidade * custoUnitario;
    const { error } = await supabase
      .from('consumo_loja_itens')
      .update({
        quantidade,
        local,
        valor_total_item: valorTotalItem
      })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  },

  async salvarRegistroConsumo(usuarioId: string, itens: ItemConsumoForm[], observacao?: string) {
    const valorTotal = itens.reduce((acc, curr) => acc + curr.valor_total_item, 0);
    const codigoCustomizado = `CSM-${Date.now()}`;
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
          data_registro: dataAtual,
          hora_registro: horaAtual,
          observacao
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
      local: item.local,
      departamento: item.departamento,
      custo_unitario: item.custo_unitario,
      valor_total_item: item.valor_total_item,
      observacao: item.observacao
    }));

    const { error: errorItens } = await supabase
      .from('consumo_loja_itens')
      .insert(payloadItens);

    if (errorItens) throw errorItens;
    return true;
  }
};