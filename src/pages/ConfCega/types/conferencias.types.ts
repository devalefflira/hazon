// Arquivo: src/pages/ConfCega/types/conferencias.types.ts

export interface ConferenciaItem {
  id?: string;
  conferencia_mestre_id?: string;
  produto_id: string;
  quantidade_contada: number;
  unidade_medida?: string;
  observacao?: string;
  lote?: string;
  data_validade?: string;
  created_at?: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra?: string;
    unidade?: string;
  };
}

export interface ConferenciaMestre {
  id: string;
  codigo_customizado: string;
  pedido_mestre_id?: string;
  usuario_id: string;
  status: 'Em Andamento' | 'Finalizado' | 'Cancelado';
  data_conferencia: string;
  hora_conferencia: string;
  numero_nota_fiscal?: string;
  data_emissao_nota?: string;
  fornecedor_id?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  usuarios?: {
    id: string;
    nome: string;
  };
  fornecedores?: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
  };
  conferencia_itens?: ConferenciaItem[];
}