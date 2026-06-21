export type StatusConferencia = 'Em Andamento' | 'Concluída';

export interface ConferenciaMestreDTO {
  id: string;
  codigo_customizado: string;
  pedido_mestre_id: string;
  pedido_codigo_customizado: string;
  fornecedor_nome_fantasia: string;
  usuario_id: string;
  usuario_nome: string;
  status: StatusConferencia;
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
  quantidade_contada: number;
}

export interface CriarConferenciaPayload {
  pedido_mestre_id: string;
  usuario_id: string;
}

export interface RegistrarItemConferenciaPayload {
  conferencia_mestre_id: string;
  produto_id: string;
  quantidade_contada: number;
}