// Arquivo: src/pages/ConfCega/types/conferencias.types.ts

export type StatusConferencia = 'Em Andamento' | 'Concluída';

export interface ConferenciaMestreDTO {
  id: string;
  codigo_customizado: string;
  pedido_mestre_id: string | null;
  pedido_codigo_customizado: string;
  fornecedor_id: string | null;
  fornecedor_nome_fantasia: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusConferencia;
  numero_nota_fiscal: string | null;
  data_emissao_nota: string | null;
  data_conferencia: string;
  hora_conferencia: string;
  created_at: string;
}

export interface ConferenciaItemDTO {
  id: string;
  conferencia_mestre_id: string;
  produto_id: string;
  produto_descricao: string;
  produto_codigo_barras: string;
  produto_unidade_medida: string;
  quantidade_contada: number; // Armazena o Total em UN processado
}

export interface CriarConferenciaPayload {
  pedido_mestre_id: string | null;
  fornecedor_id: string | null;
  numero_nota_fiscal: string;
  data_emissao_nota: string;
  usuario_id: string;
}

export interface RegistrarItemConferenciaPayload {
  conferencia_mestre_id: string;
  produto_id: string;
  quantidade_contada: number;
}