export type StatusPedido = 'Falta Pedir' | 'Pendente Confirmação Vendedor' | 'Pedido Feito';

export interface PedidoMestreDTO {
  id: string;
  codigo_customizado: string;
  cotacao_mestre_id: string;
  fornecedor_id: string;
  fornecedor_nome_fantasia: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  comprador_id: string;
  comprador_nome: string;
  status: StatusPedido;
  token_acesso: string;
  formalizado_em: string | null;
  created_at: string;
  itens_count?: number;
}

export interface PedidoItemDTO {
  id: string;
  pedido_mestre_id: string;
  produto_id: string;
  produto_descricao: string;
  produto_codigo_barras: string | null;
  produto_unidade_medida: string;
  preco_unitario: number;
  quantidade_solicitada: number;
}

export interface EnviarPedidoVendedorPayload {
  pedido_id: string;
  itens: {
    item_id: string;
    quantidade_solicitada: number;
  }[];
}