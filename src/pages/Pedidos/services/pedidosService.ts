import { supabase } from '../../../lib/supabaseClient';
import type { PedidoMestreDTO, PedidoItemDTO, EnviarPedidoVendedorPayload } from '../types/pedidos.types';

// Retorno da função pública pedido_publico_obter (acesso só por token)
export interface PedidoPublico {
  id: string;
  codigo_customizado: string;
  status: string;
  fornecedor_nome: string;
  itens: {
    id: string;
    produto_descricao: string;
    produto_unidade_medida: string;
    preco_unitario: number;
    quantidade_solicitada: number;
  }[];
}

export const pedidosService = {
  // Lista todos os pedidos com contagem de itens acoplada por junção lateral
  async listarPedidos(): Promise<PedidoMestreDTO[]> {
    const { data, error } = await supabase
      .from('pedidos_mestre')
      .select(`
        id, codigo_customizado, cotacao_mestre_id, fornecedor_id, vendedor_id, comprador_id, status, token_acesso, formalizado_em, created_at,
        fornecedores:fornecedor_id ( nome_fantasia ),
        vendedores:vendedor_id ( nome ),
        usuarios:comprador_id ( nome ),
        pedido_itens ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p: any) => ({
      id: p.id,
      codigo_customizado: p.codigo_customizado,
      cotacao_mestre_id: p.cotacao_mestre_id,
      fornecedor_id: p.fornecedor_id,
      fornecedor_nome_fantasia: p.fornecedores?.nome_fantasia || 'Fornecedor',
      vendedor_id: p.vendedor_id,
      vendedor_nome: p.vendedores?.nome || 'Direto com a Fábrica',
      comprador_id: p.comprador_id,
      comprador_nome: p.usuarios?.nome || 'Comprador',
      status: p.status,
      token_acesso: p.token_acesso,
      formalizado_em: p.formalizado_em,
      created_at: p.created_at,
      itens_count: p.pedido_itens?.[0]?.count || 0
    }));
  },

  // Obtém o caderno de itens vinculados a uma Ordem de Compra
  async obterDetalhesPedido(pedidoId: string): Promise<PedidoItemDTO[]> {
    const { data, error } = await supabase
      .from('pedido_itens')
      .select(`
        id, pedido_mestre_id, produto_id, preco_unitario, quantidade_solicitada,
        produtos:produto_id (
          descricao, codigo_barras,
          unidades_medida:unidade_medida_id ( sigla )
        )
      `)
      .eq('pedido_mestre_id', pedidoId);

    if (error) throw error;

    return (data || []).map((i: any) => {
      const prod = i.produtos;
      
      // Tratamento defensivo caso unidades_medida venha como objeto ou array de 1 posição
      let siglaUnidade = 'UN';
      if (prod?.unidades_medida) {
        if (Array.isArray(prod.unidades_medida)) {
          siglaUnidade = prod.unidades_medida[0]?.sigla || 'UN';
        } else {
          siglaUnidade = prod.unidades_medida.sigla || 'UN';
        }
      }

      return {
        id: String(i.id),
        pedido_mestre_id: String(i.pedido_mestre_id),
        produto_id: String(i.produto_id),
        produto_descricao: String(prod?.descricao || 'Produto não identificado'),
        produto_codigo_barras: prod?.codigo_barras ? String(prod.codigo_barras) : null,
        produto_unidade_medida: siglaUnidade,
        preco_unitario: Number(i.preco_unitario || 0),
        quantidade_solicitada: Number(i.quantidade_solicitada || 0)
      };
    });
  },

  // Etapa 1 -> Etapa 2: Comprador define quantidades e gera o link externo do vendedor
  async enviarPedidoParaVendedor(payload: EnviarPedidoVendedorPayload): Promise<void> {
    // 1. Atualiza em lote as quantidades de cada item do pedido
    for (const item of payload.itens) {
      const { error: errItem } = await supabase
        .from('pedido_itens')
        .update({ quantidade_solicitada: item.quantidade_solicitada })
        .eq('id', item.item_id);
      
      if (errItem) throw errItem;
    }

    // 2. Transiciona o status do cabeçalho mestre
    const { error: errMestre } = await supabase
      .from('pedidos_mestre')
      .update({ 
        status: 'Pendente Confirmação Vendedor',
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.pedido_id);

    if (errMestre) throw errMestre;
  },

  // Link público do pedido: dados obtidos pela função segura, só pelo token
  async obterPedidoPublicoPorToken(token: string): Promise<PedidoPublico> {
    if (!token) throw new Error('Link de pedido inválido ou inexistente.');

    const { data, error } = await supabase.rpc('pedido_publico_obter', { p_token: token });
    if (error) throw new Error(error.message);

    return data as unknown as PedidoPublico;
  },

  // Etapa 2 -> Etapa 3: Vendedor valida externamente e encerra o ciclo de vida (validação no banco)
  async formalizarPedidoViaToken(token: string): Promise<void> {
    const { error } = await supabase.rpc('pedido_publico_formalizar', { p_token: token });
    if (error) throw new Error(error.message);
  }
};
