// src/pages/Solicitacoes/types/solicitacoes.types.ts

export const TIPOS_SOLICITACAO = [
  'Produto',
  'Utensílios/Ferramentas',
  'Fardamento e EPI',
  'Manutenção/Reparo',
  'Outros'
] as const;

export type TipoSolicitacao = typeof TIPOS_SOLICITACAO[number];

export type StatusSolicitacao = 
  | 'Pendente' 
  | 'Aprovada Total' 
  | 'Aprovada Parcial' 
  | 'Negada';

export type TipoAtendimento = 'Imediato' | 'Com Prazo';

export interface ItemSolicitacaoForm {
  produto_id: string;
  codprod?: string;
  descricao?: string;
  quantidade: number;
  unidade_medida: string;
  observacao?: string;
}

export interface NovaSolicitacaoPayload {
  solicitante_id: string;
  destinatario_id: string;
  tipo_solicitacao: TipoSolicitacao;
  finalidade: string;
  descricao_geral?: string;
  itens?: ItemSolicitacaoForm[];
}

export interface SolicitacaoItemView {
  id: string;
  produto_id: string;
  codprod?: string;
  descricao_produto: string;
  unidade_medida: string;
  quantidade_solicitada: number;
  quantidade_atendida?: number;
  observacao?: string;
}

export interface SolicitacaoView {
  id: string;
  codigo_customizado: string;
  tipo_solicitacao: TipoSolicitacao;
  finalidade: string;
  descricao_geral?: string;
  status: StatusSolicitacao;
  tipo_atendimento?: TipoAtendimento;
  prazo_limite?: string;
  justificativa_resposta?: string;
  data_registro: string;
  hora_registro: string;
  solicitante_id: string;
  solicitante_nome: string;
  destinatario_id: string;
  destinatario_nome: string;
  respondido_por_nome?: string;
  respondido_em?: string;
  itens: SolicitacaoItemView[];
}

export interface ResponderSolicitacaoPayload {
  solicitacao_id: string;
  usuario_id: string;
  status: 'Aprovada Total' | 'Aprovada Parcial' | 'Negada';
  tipo_atendimento?: TipoAtendimento;
  prazo_limite?: string;
  justificativa?: string;
  itens_atendidos?: Array<{
    item_id: string;
    quantidade_atendida: number;
  }>;
}