import { supabase } from '../../../lib/supabaseClient';
import type { AlmoxarifadoItem, AlmoxarifadoControle } from '../types/almoxarifado.types';

export const almoxarifadoService = {
  // --- ITENS ---
  async listarItens(): Promise<AlmoxarifadoItem[]> {
    const { data, error } = await supabase
      .from('almoxarifado_itens')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async gerarProximoCodigoItem(): Promise<string> {
    const { data, error } = await supabase
      .from('almoxarifado_itens')
      .select('codigo_item')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return 'ALM-0001';

    const ultimoCodigo = data[0].codigo_item;
    const match = ultimoCodigo.match(/\d+/);
    if (!match) return 'ALM-0001';

    const numero = parseInt(match[0], 10) + 1;
    return `ALM-${numero.toString().padStart(4, '0')}`;
  },

  async cadastrarItem(payload: { descricao: string; estoque_atual: number; unidade_medida?: string }): Promise<AlmoxarifadoItem> {
    const codigo_item = await this.gerarProximoCodigoItem();

    const { data, error } = await supabase
      .from('almoxarifado_itens')
      .insert({
        codigo_item,
        descricao: payload.descricao.trim(),
        estoque_atual: payload.estoque_atual,
        unidade_medida: payload.unidade_medida || 'UN',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizarEstoqueContagem(itemId: string, novoEstoque: number): Promise<void> {
    const { error } = await supabase
      .from('almoxarifado_itens')
      .update({
        estoque_atual: novoEstoque,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;
  },

  // --- CONTROLES ---
  async listarControles(status: 'Em Andamento' | 'Finalizado'): Promise<AlmoxarifadoControle[]> {
    const { data, error } = await supabase
      .from('almoxarifado_controles')
      .select(`
        *,
        item:almoxarifado_itens(*),
        encarregado:usuarios!almoxarifado_controles_encarregado_fkey(id, nome, setor),
        responsavel_recebimento:usuarios!almoxarifado_controles_recebimento_fkey(id, nome)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async gerarProximoCodigoControle(): Promise<string> {
    const hoje = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CTRL-${hoje}-${rand}`;
  },

  async criarControle(dados: {
    item_id: string;
    estoque_disponivel_momento: number;
    quantidade_retirada: number;
    apenas_saida: boolean;
    encarregado_id: string;
    colaborador_retirou: string;
  }): Promise<void> {
    const codigo_customizado = await this.gerarProximoCodigoControle();
    const status = dados.apenas_saida ? 'Finalizado' : 'Em Andamento';

    const { error } = await supabase
      .from('almoxarifado_controles')
      .insert({
        codigo_customizado,
        item_id: dados.item_id,
        estoque_disponivel_momento: dados.estoque_disponivel_momento,
        quantidade_retirada: dados.quantidade_retirada,
        apenas_saida: dados.apenas_saida,
        encarregado_id: dados.encarregado_id,
        colaborador_retirou: dados.colaborador_retirou.trim(),
        status
      });

    if (error) throw error;
  },

  async registrarRetornoItem(controleId: string, itemId: string, quantidadeDevolvida: number, responsavelId: string): Promise<void> {
    const agora = new Date();
    const data_retorno = agora.toISOString().slice(0, 10);
    const hora_retorno = agora.toTimeString().slice(0, 8);

    const { error: erroControle } = await supabase
      .from('almoxarifado_controles')
      .update({
        status: 'Finalizado',
        data_retorno,
        hora_retorno,
        responsavel_recebimento_id: responsavelId,
        updated_at: agora.toISOString()
      })
      .eq('id', controleId);

    if (erroControle) throw erroControle;

    const { data: item } = await supabase
      .from('almoxarifado_itens')
      .select('estoque_atual')
      .eq('id', itemId)
      .single();

    if (item) {
      await supabase
        .from('almoxarifado_itens')
        .update({
          estoque_atual: Number(item.estoque_atual) + Number(quantidadeDevolvida),
          updated_at: agora.toISOString()
        })
        .eq('id', itemId);
    }
  }
};