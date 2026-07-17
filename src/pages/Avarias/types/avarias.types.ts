export type DestinacaoAvaria = 'Descarte' | 'Devolução Fornecedor' | 'Troca Comercial' | 'Uso Interno';

export interface AvariaRegistroDTO {
  id: string;
  codigo_customizado: string;
  usuario_id: string;
  usuario_nome: string;
  produto_id: string;
  produto_descricao: string;
  produto_codigo_barras: string;
  produto_unidade_medida: string;
  motivo_avaria_id: string;          // Nome unificado oficial
  motivo_avaria_descricao: string;   // Nome unificado oficial
  quantidade: number;
  destinacao: DestinacaoAvaria;
  observacao: string | null;
  data_registro: string;
  hora_registro: string;
  created_at: string;
}

export interface MotivoAvariaDTO {
  id: string;
  descricao: string;
}

export interface RegistrarAvariaPayload {
  usuario_id: string;
  produto_id: string;
  motivo_avaria_id: string;
  quantidade: number;
  destinacao: DestinacaoAvaria;
  observacao?: string;
}