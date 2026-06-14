// Arquivo: src/pages/Cotacoes/types/cotacoes.types.ts

export interface ItemFaltaCotacaoDTO {
  id: string;
  codigo_customizado: string;
  produto_id: string;
  produto_descricao: string;
  produto_codigo_barras: string | null;
  setor_id: string;
  setor_nome: string;
  subsetor_id: string;
  subsetor_nome: string;
  motivo_falta_descricao: string;
  status_cotacao: string;
  data_registro: string;
}

export interface FornecedorSugeridoDTO {
  fornecedor_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  vendedor_id: string | null;
  vendedor_name?: string; // Compatibilidade com componentes locais
  vendedor_nome?: string;
  vendedor_telefone?: string;
}

export interface CriarCotacaoPayload {
  comprador_id: string;
  nota_falta_ids: string[];
  fornecedores: {
    fornecedor_id: string;
    vendedor_id: string | null;
  }[];
}

export interface SubmeterRespostaFornecedorPayload {
  token_acesso: string;
  prazo_entrega_dias: number;
  condicoes_pagamento: string;
  respostas: {
    produto_id: string;
    preco_ofertado: number;
  }[];
}

export interface ConcluirCotacaoPayload {
  cotacao_mestre_id: string;
  cenario_escolhido: string;
  justificativa_escolha: string;
  itens_ganhadores: {
    resposta_item_id: string;
  }[];
}

export interface CotacaoMestreRegistro {
  id: string;
  status: string;
  created_at: string;
  comprador_id: string;
  usuarios?: {
    nome: string;
  } | null;
  itens_vinculados_count: number;
}