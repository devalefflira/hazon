// src/pages/ConsumoLoja/types/consumoLoja.types.ts

export type FinalidadeConsumo = 'Consumo/Despesa' | 'Uso na Produção/Transformação';

export const LOCAIS_CONSUMO = [
  'Frente de Loja',
  'Crediário',
  'Limpeza',
  'Escritório',
  'Depósito',
  'Açougue',
  'Padaria',
  'Hortifruti'
] as const;

export type LocalConsumo = typeof LOCAIS_CONSUMO[number];

export interface ItemConsumoForm {
  produto_id: string;
  codprod?: string;
  descricao?: string;
  quantidade: number;
  unidade_medida: string;
  local: string;
  departamento?: string;
  custo_unitario: number;
  valor_total_item: number;
  observacao?: string;
  finalidade: FinalidadeConsumo;
  produto_produzido?: string;
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
  finalidade: FinalidadeConsumo;
  produto_produzido?: string;
}

export interface LimiteConsumoView {
  id: string;
  local: string;
  ano_mes: string;
  valor_limite: number;
  usuario_nome: string;
  data_ajuste: string;
  hora_ajuste: string;
  updated_at: string;
}

export interface LimiteHistoricoView {
  id: string;
  local: string;
  ano_mes: string;
  valor_anterior: number;
  valor_novo: number;
  usuario_nome: string;
  data_alteracao: string;
  hora_alteracao: string;
}