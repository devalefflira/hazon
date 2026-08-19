// src/pages/ConsumoLoja/types/consumoLoja.types.ts

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
  codprod?: string;
  descricao_produto: string;
  local: string;
  departamento: string;
  valor_total_item: number;
  quantidade: number;
  unidade_medida: string;
  observacao?: string;
  data_registro: string;
  hora_registro: string;
  usuario_nome: string;
}