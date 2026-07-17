export interface EquipamentoFrioDTO {
  id: string;
  tipo_item: 'Ilha Horizontal' | 'Ilha Vertical' | 'Câmara Fria';
  nome: string;
  categoria_frio: string; // <-- INJETADO
  temp_conforme: number;
  temp_limite_tolerancia: number;
  temp_nao_conforme: number;
  created_at: string;
}

export interface AfericaoTemperaturaDTO {
  id: string;
  codigo_customizado: string;
  equipamento_id: string;
  equipamento_nome: string;
  equipamento_tipo: string;
  usuario_id: string;
  usuario_nome: string;
  temperatura_aferida: number;
  status_resultado: 'Conforme' | 'Limite de Tolerância' | 'Não Conforme';
  foto_comprobatoria?: string | null;
  data_registro: string;
  hora_registro: string;
  created_at: string;
}

export interface CriarEquipamentoPayload {
  tipo_item: string;
  nome: string;
  categoria_frio: string; // <-- INJETADO
  temp_conforme: number;
  temp_limite_tolerancia: number;
  temp_nao_conforme: number;
}

export interface CriarAfericaoPayload {
  equipamento_id: string;
  usuario_id: string;
  temperatura_aferida: number;
  foto_comprobatoria: string;
}