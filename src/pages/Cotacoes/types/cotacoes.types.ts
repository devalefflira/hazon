// Enums / Union Types literais para garantir consistência e auto-complete
export type CotacaoStatus = 'Aberta' | 'Em Análise' | 'Concluída' | 'Cancelada';
export type StatusNotaFalta = 'Pendente' | 'Em Cotação' | 'Cotada' | 'Ignorada';

// ---------------------------------------------------------
// 1. Entidades Principais (Espelho do Schema do Banco)
// ---------------------------------------------------------

export interface CotacaoMestre {
  id: string;
  comprador_id: string;
  status: CotacaoStatus;
  cenario_escolhido?: string | null;
  justificativa_escolha?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CotacaoFornecedorVinculado {
  id: string;
  cotacao_mestre_id: string;
  fornecedor_id: string;
  vendedor_id?: string | null;
  token_acesso: string;
  token_validade: string;
  valor_minimo_pedido: number;
  prazo_entrega_dias?: number | null;
  condicoes_pagamento?: string | null;
  respondido_em?: string | null;
  created_at: string;
}

export interface CotacaoRespostaItem {
  id: string;
  cotacao_fornecedor_id: string;
  produto_id: string;
  preco_ofertado: number;
  ganhou_item: boolean;
  created_at: string;
}

// ---------------------------------------------------------
// 2. DTOs (Data Transfer Objects) - Visões Combinadas para a UI
// ---------------------------------------------------------

export interface ItemFaltaCotacaoDTO {
  id: string; // ID da nota_falta
  codigo_customizado: string;
  produto_id: string;
  produto_descricao: string;
  produto_codigo_barras: string;
  setor_id: string;
  setor_nome: string;
  subsetor_id: string;
  subsetor_nome: string;
  motivo_falta_descricao: string;
  status_cotacao: StatusNotaFalta;
  data_registro: string;
}

export interface FornecedorSugeridoDTO {
  fornecedor_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  vendedor_id?: string;
  vendedor_nome?: string;
  vendedor_telefone?: string;
}

export interface RespostaFornecedorDTO {
  produto_id: string;
  preco_ofertado: number;
}

export interface CotacaoMestreRegistro {
  id: string;
  status: CotacaoStatus;
  created_at: string;
  usuarios: { nome: string };
  itens_vinculados_count: number;
}

// ---------------------------------------------------------
// 3. Payloads de Mutação (Input para os Services)
// ---------------------------------------------------------

export interface CriarCotacaoPayload {
  comprador_id: string;
  nota_falta_ids: string[];
  fornecedores: {
    fornecedor_id: string;
    vendedor_id?: string;
  }[];
}

export interface SubmeterRespostaFornecedorPayload {
  token_acesso: string;
  prazo_entrega_dias: number;
  condicoes_pagamento: string;
  respostas: RespostaFornecedorDTO[];
}

export interface ConcluirCotacaoPayload {
  cotacao_mestre_id: string;
  cenario_escolhido: string;
  justificativa_escolha: string;
  itens_ganhadores: { resposta_item_id: string }[];
}