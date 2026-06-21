// Arquivo: src/pages/Tarefas/types/tarefas.types.ts

export interface TarefaMestreDTO {
  id: string;
  criador_id: string;
  criador_nome: string;
  responsavel_id: string;
  responsavel_nome: string;
  descricao: string;
  status: string;
  tipo_tarefa: string;
  prioridade: string;
  prioridade_peso: number;
  data_inicio_planejada: string;
  prazo_entrega_planejado: string;
  tempo_gasto_minutos: number;
  created_at: string;
  cronometro_ativo: boolean; // <-- RESGATADO

  // Campos de Recebimento de Mercadorias
  numero_nota_fiscal?: string | null;
  fornecedor_id?: string | null;
  fornecedor_nome?: string | null;
  conferente_id?: string | null;
  conferente_nome?: string | null;
  identificacao_doca?: string | null;
  placa_veiculo?: string | null;
  nome_motorista?: string | null;
}

export interface CriarTarefaPayload {
  criador_id: string;
  responsavel_id: string;
  descricao: string;
  tipo_tarefa: string;
  prioridade: string;
  prazo_entrega_planejado: string;
  numero_nota_fiscal?: string | null;
  fornecedor_id?: string | null;
  conferente_id?: string | null;
  identificacao_doca?: string | null;
  placa_veiculo?: string | null;
  nome_motorista?: string | null;
}

export interface ChecklistItemDTO {
  id: string;
  tarefa_id: string;
  descricao: string;
  concluido: boolean;
}

// Fallback/Alias para manter retrocompatibilidade com DetalhesTarefaPainel
export type TarefaChecklistItemDTO = ChecklistItemDTO;