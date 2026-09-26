// src/pages/Recebimentos/types/recebimento.types.ts

export type TipoDocumentoRecebimento = 
  | 'Nota Fiscal' 
  | 'Não Fiscal / Manual' 
  | 'Caminhão da Casa';

export type StatusGeralFluxo = 'Em Andamento' | 'Pausado' | 'Finalizado';

export type StatusFase = 'Pendente' | 'Em Andamento' | 'Finalizado';

export interface FaseDefinicao {
  ordem: number;
  nome: string;
}

export const LISTA_FASES_RECEBIMENTO: FaseDefinicao[] = [
  { ordem: 1, nome: 'Iniciar Recebimento' },
  { ordem: 2, nome: 'Finalizar Recebimento' },
  { ordem: 3, nome: 'Recepção da Nota' },
  { ordem: 4, nome: 'Entregar para Lançamento' },
  { ordem: 5, nome: 'Iniciar Lançamento' },
  { ordem: 6, nome: 'Finalizar Lançamento' },
  { ordem: 7, nome: 'Iniciar Exposição na Gôndola' },
  { ordem: 8, nome: 'Finalizar Exposição na Gôndola' }
];

export interface FotoRecebimento {
  id?: string;
  tipo_foto: 'frente_produto' | 'codigo_barras' | 'conferencia_cega';
  foto_url: string;
  descricao?: string;
}

export interface RecebimentoFaseView {
  id: string;
  fluxo_id: string;
  ordem_fase: number;
  nome_fase: string;
  status: StatusFase;
  usuario_id?: string;
  usuario_nome?: string;
  iniciado_em?: string;
  finalizado_em?: string;
  tempo_limite_minutos?: number;
  tempo_restante_segundos?: number;
  link_relatorio?: string;
  observacoes?: string;
}

export interface RecebimentoFluxoView {
  id: string;
  codigo_customizado: string;
  tipo_documento: TipoDocumentoRecebimento;
  numero_documento: string;
  is_numero_gerado: boolean;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  cor_veiculo?: string;
  nome_motorista?: string;
  fase_atual: number;
  status_geral: StatusGeralFluxo;
  criador_id: string;
  criador_nome: string;
  data_registro: string;
  hora_registro: string;
  fases: RecebimentoFaseView[];
  fotos?: FotoRecebimento[];
}

export interface IniciarFluxoPayload {
  tipo_documento: TipoDocumentoRecebimento;
  numero_documento?: string;
  is_numero_gerado?: boolean;
  fornecedor_id?: string;
  fornecedor_nome_manual?: string;
  cor_veiculo?: string;
  nome_motorista?: string;
  usuario_id: string;
}

export interface PausarTemporizadorPayload {
  fluxo_id: string;
  fase_id: string;
  usuario_id: string;
  motivo_pausa: 'Intervalo' | 'Outros';
  motivo_pausa_detalhe?: string;
}

export interface RetomarTemporizadorPayload {
  pausa_id: string;
  motivo_retomada: 'Retorno Intervalo' | 'Outros';
  motivo_retomada_detalhe?: string;
}