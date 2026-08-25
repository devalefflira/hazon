// src/pages/Ofertas/services/ofertasService.ts
import { supabase } from '../../../lib/supabaseClient';

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
      const codCustom = `OFT-${Date.now().toString().slice(-6)}`;
      const { data: novaOferta, error: errInsert } = await supabase
        .from('ofertas_mestre')
        .insert({
          codigo_customizado: codCustom,
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

  // Buscar itens perdedores de Pesquisas de Preço para a Lista Sugerida
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

    // Filtra apenas onde nosso preço de venda é maior que o do concorrente (perdedores)
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