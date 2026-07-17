// 1. Controle de Validades
export interface RelatorioValidadeDTO {
  codigo_barras: string;
  produto_descricao: string;
  lote: string;
  data_validade: string;
  quantidade_contabilizada: number;
  local_captura_nome: string;
  dias_para_vencer: number;
}

// 2. Itens Inventariados
export interface RelatorioInventariadoDTO {
  codigo_inventario: string;
  codigo_barras: string;
  produto_descricao: string;
  local_coleta_nome: string;
  quantidade_coleta: number;
  data_coleta: string;
  hora_coleta: string;
  conferente_nome: string;
}

// 3. Notas de Falta
export interface RelatorioNotaFaltaDTO {
  codigo_customizado: string;
  codigo_barras: string;
  produto_descricao: string;
  setor_nome: string;
  subsetor_nome: string;
  motivo_descricao: string;
  status_cotacao: string;
  data_registro: string;
  operador_nome: string;
}

// 4. Cotações
export interface RelatorioCotacaoDTO {
  codigo_cotacao_id: string;
  comprador_nome: string;
  status: string;
  cenario_escolhido: string;
  justificativa_escolha: string;
  quantidade_fornecedores: number;
  created_at: string;
}

// 5. Avarias
export interface RelatorioAvariaDTO {
  codigo_customizado: string;
  codigo_barras: string;
  produto_descricao: string;
  quantidade: number;
  produto_unidade_medida: string;
  motivo_descricao: string;
  destinacao: string;
  observacao: string | null;
  operador_nome: string;
  data_registro: string;
}

// 6. Pedidos Formalizados
export interface RelatorioPedidoDTO {
  codigo_customizado: string;
  fornecedor_nome: string;
  vendedor_nome: string;
  comprador_nome: string;
  status: string;
  valor_total: number;
  origem_pedido: 'COTAÇÃO' | 'CONF. CEGA';
  created_at: string;
}

// 7. Manifestos Concluídos (Conf. Cega)
export interface RelatorioManifestoDTO {
  codigo_customizado: string;
  numero_nota_fiscal: string;
  data_emissao_nota: string;
  fornecedor_nome: string;
  prazo_entrega_dias: number;
  quantidade_itens_diferentes: number;
  conferente_nome: string;
  data_fechamento: string;
}

// Auditoria de Frios
export interface FiltrosAuditoriaFrios {
  status: string;        // 'TODOS' | 'Conforme' | 'Limite de Tolerância' | 'Não Conforme'
  equipamento_id: string; // 'TODOS' | uuid
  periodo: 'TODOS' | 'HOJE' | 'ONTEM' | 'DATA_ESPECIFICA';
  data_customizada?: string;
}