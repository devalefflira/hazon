// src/pages/RupturaGondola/types/ruptura.types.ts

export interface RupturaAuditoria {
  id: string;
  codigo_customizado: string;
  usuario_id: string;
  usuario_nome?: string;
  setor_nome: string;
  rua_corredor?: string;
  status: 'Em Andamento' | 'Concluída' | 'Cancelada';
  total_itens_auditados: number;
  total_rupturas: number;
  observacao?: string;
  data_registro: string;
  hora_registro: string;
  created_at: string;
}

export interface RupturaItem {
  id: string;
  auditoria_id: string;
  produto_id: string;
  tem_estoque_gondola: boolean;
  estoque_virtual?: number;
  preco_gondola?: number;
  motivo_ruptura?: string;
  foto_url?: string;
  teve_entrada_erp?: boolean;
  tipo_ruptura?: 'OPERACIONAL' | 'COMERCIAL' | 'SEM_RUPTURA';
  created_at: string;
  produto?: {
    codprod: string;
    descricao: string;
    codbarra?: string;
    pvenda?: number;
  };
}

export interface ErpEntradaImportacao {
  id: string;
  nome_arquivo: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_registros: number;
  created_at: string;
}

export interface ErpEntradaMercadoria {
  id: string;
  importacao_id: string;
  data_inicial: string;
  data_final: string;
  codprod: string;
  descricao: string;
  unidade: string;
  codbarra: string;
  ncm?: string;
  departamento?: string;
  secao?: string;
  categoria?: string;
}