export type StatusTarefa = 'Pendentes' | 'Em Andamento' | 'Concluídas';

export type TipoTarefa =
  | 'Contagem de Estoque'
  | 'Nota de Falta'
  | 'Avarias'
  | 'Recebimento de Mercadorias'
  | 'Limpeza do Depósito'
  | 'Organização do Depósito';

export type PrioridadeTarefa = 'Baixa' | 'Média' | 'Alta';

export interface TarefaMestreDTO {
  id: string;
  criador_id: string;
  criador_nome: string;
  responsavel_id: string;
  responsavel_nome: string;
  descricao: string;
  status: StatusTarefa;
  tipo_tarefa: TipoTarefa;
  prioridade: PrioridadeTarefa;
  prioridade_peso: number;
  data_inicio_planejada: string;
  prazo_entrega_planejado: string;
  tempo_gasto_minutos: number;
  created_at: string;
  cronometro_ativo?: boolean; // Indica se a tarefa possui um bloco de tempo aberto (rodando agora)
}

export interface TarefaChecklistItemDTO {
  id: string;
  tarefa_id: string;
  descricao: string;
  concluido: boolean;
}

export interface CriarTarefaPayload {
  criador_id: string;
  responsavel_id: string;
  descricao: string;
  tipo_tarefa: TipoTarefa;
  prioridade: PrioridadeTarefa;
  data_inicio_planejada: string;
  prazo_entrega_planejado: string;
  checklists?: string[]; // Array de strings com as descrições dos sub-itens
}