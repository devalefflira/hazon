export interface ProdutoBusca {
  id: string;
  codprod: string;
  codbarra?: string;
  descricao: string;
  departamento?: string;
  custoreal?: number;
  unidade?: string;
}

export interface ItemConsumoForm {
  produto_id: string;
  codprod: string;
  descricao: string;
  quantidade: number;
  unidade_medida: string;
  local: string;
  departamento: string;
  custo_unitario: number;
  valor_total_item: number;
  observacao?: string;
}

export interface ConsumoLojaItemView {
  id: string;
  descricao_produto: string;
  local: string;
  departamento: string;
  valor_total_item: number;
  quantidade: number;
  data_registro: string;
}