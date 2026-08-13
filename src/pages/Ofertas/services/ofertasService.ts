// Arquivo: src/pages/Ofertas/services/ofertasService.ts
import { supabase } from '../../../lib/supabaseClient';

export const ofertasService = {
  // 1. Buscar produtos por autocomplete
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, pvenda')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Salvar Lote / Criar Oferta (Pausada ou Finalizada)
  async salvarOferta(payload: {
    codigo_customizado?: string | null;
    usuario_id: string;
    status: 'Em Andamento' | 'Criada Finalizada' | 'Concluida';
    tipo_oferta?: string;
    tipo_oferta_customizado?: string;
    data_inicio?: string;
    data_fim?: string;
    itens: Array<{
      produto_id: string;
      preco_custo_real: number;
      preco_venda_tabela: number;
      preco_oferta?: number;
    }>;
  }): Promise<void> {
    const codigoCustom = payload.codigo_customizado || `OFE-${Math.floor(1000 + Math.random() * 9000)}`;
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let ofertaMestreId = '';

    if (payload.codigo_customizado) {
      const { data: mestreExistente } = await supabase
        .from('ofertas_mestre')
        .select('id')
        .eq('codigo_customizado', payload.codigo_customizado)
        .maybeSingle();

      if (mestreExistente) {
        ofertaMestreId = mestreExistente.id;

        await supabase
          .from('ofertas_mestre')
          .update({
            status: payload.status,
            tipo_oferta: payload.tipo_oferta || null,
            tipo_oferta_customizado: payload.tipo_oferta_customizado || null,
            data_inicio: payload.data_inicio || null,
            data_fim: payload.data_fim || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', ofertaMestreId);

        await supabase
          .from('oferta_itens')
          .delete()
          .eq('oferta_mestre_id', ofertaMestreId);
      }
    }

    if (!ofertaMestreId) {
      const { data: novoMestre, error: errorMestre } = await supabase
        .from('ofertas_mestre')
        .insert([{
          codigo_customizado: codigoCustom,
          usuario_id: payload.usuario_id,
          status: payload.status,
          tipo_oferta: payload.tipo_oferta || null,
          tipo_oferta_customizado: payload.tipo_oferta_customizado || null,
          data_inicio: payload.data_inicio || null,
          data_fim: payload.data_fim || null,
          data_registro: dataAtual,
          hora_registro: horaAtual
        }])
        .select()
        .single();

      if (errorMestre) throw errorMestre;
      ofertaMestreId = novoMestre.id;
    }

    const itensInsert = payload.itens.map((item) => ({
      oferta_mestre_id: ofertaMestreId,
      produto_id: item.produto_id,
      preco_custo_real: item.preco_custo_real,
      preco_venda_tabela: item.preco_venda_tabela,
      preco_oferta: item.preco_oferta || 0
    }));

    const { error: errorItens } = await supabase
      .from('oferta_itens')
      .insert(itensInsert);

    if (errorItens) throw errorItens;
  },

  // 3. Listar todas as Ofertas
  async listarOfertas(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ofertas_mestre')
      .select(`
        *,
        usuarios ( id, nome ),
        oferta_itens (
          *,
          produtos ( id, codprod, descricao, codbarra, unidade, custoreal, pvenda )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};