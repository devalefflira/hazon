// Arquivo: src/pages/Avarias/types/avarias.types.ts

export interface AvariaRecord {
  id: string;
  codigo_customizado: string;
  usuario_id?: string;
  produto_id: string;
  motivo_avaria_id: string;
  quantidade: number;
  preco_custo_na_perda: number;
  destinacao: string;
  observacao?: string;
  data_registro: string;
  hora_registro: string;
  created_at: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra?: string;
    unidade?: string;
    custoreal?: number;
  };
  motivos_avaria?: {
    id: string;
    descricao: string;
  };
  usuarios?: {
    id: string;
    nome: string;
  };
}

export interface FiltrosAvariaPayload {
  motivo_id?: string;
  destinacao?: string;
}

export interface NovaAvariaPayload {
  usuario_id?: string;
  produto_id: string;
  motivo_avaria_id: string;
  quantidade: number;
  preco_custo_na_perda: number;
  destinacao: string;
  observacao?: string;
}