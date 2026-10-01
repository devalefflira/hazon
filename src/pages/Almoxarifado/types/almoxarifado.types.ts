export interface AlmoxarifadoItem {
  id: string;
  codigo_item: string;
  descricao: string;
  estoque_atual: number;
  unidade_medida: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlmoxarifadoControle {
  id: string;
  codigo_customizado: string;
  item_id: string;
  estoque_disponivel_momento: number;
  quantidade_retirada: number;
  apenas_saida: boolean;
  encarregado_id: string;
  colaborador_retirou: string;
  status: 'Em Andamento' | 'Finalizado';
  data_registro: string;
  hora_registro: string;
  data_retorno?: string | null;
  hora_retorno?: string | null;
  responsavel_recebimento_id?: string | null;
  created_at: string;
  item?: AlmoxarifadoItem;
  encarregado?: {
    id: string;
    nome: string;
    setor: string;
  };
  responsavel_recebimento?: {
    id: string;
    nome: string;
  };
}