// src/pages/AssistentePrecificacao/types/precificacao.types.ts

/** Linha do CSV já convertida para números e datas ISO (YYYY-MM-DD). */
export interface ItemImportado {
  codprod: string;
  descricao: string;
  codbarra: string;
  unidade: string;
  embalagem: string;
  dataAlteracao: string | null;
  custoAtual: number;
  custoPenultimo: number;
  custoAntepenultimo: number;
  precoVenda: number;
  margemCadastroPct: number | null;
  margemCalculadaPct: number | null;
  codFornecedor: string;
  nomeFornecedor: string;
  dataUltimaEntrada: string | null;
  numeroNota: string;
}

export interface ResultadoImportacaoCsv {
  itens: ItemImportado[];
  erros: string[];
  dataMaxima: string | null;
  dataMinima: string | null;
}

export interface ParametrosAnalise {
  margemMetaPct: number;
  limiarAtencaoPct: number;
  limiarCriticoPct: number;
}

export type SeveridadeAlerta = 'critico' | 'atencao' | 'info';

export interface AlertaAnalise {
  codigo: string;
  severidade: SeveridadeAlerta;
  mensagem: string;
}

export type StatusAnalise = 'Pendente' | 'OK' | 'Atenção' | 'Crítico' | 'Fora do período' | 'Sem cadastro';

export interface ResultadoAnaliseItem {
  status: StatusAnalise;
  variacaoUltimoPct: number | null;
  variacaoPenultimoPct: number | null;
  margemRealPct: number | null;
  precoSugerido: number | null;
  precisaAjuste: boolean;
  revisarCusto: boolean;
  alertas: AlertaAnalise[];
}

/** Dados do cadastro atual do produto (tabela produtos). */
export interface ProdutoCadastro {
  id: string;
  codprod: string;
  custoreal: number;
  pvenda: number;
}

/** Linha persistida em precificacao_itens. */
export interface ItemPrecificacaoRegistro {
  id: string;
  lote_id: string;
  produto_id: string | null;
  codprod: string;
  descricao: string;
  codbarra: string | null;
  unidade: string | null;
  embalagem: string | null;
  data_alteracao_preco: string | null;
  custo_atual: number;
  custo_penultimo: number;
  custo_antepenultimo: number;
  preco_venda: number;
  margem_cadastro_pct: number | null;
  margem_calculada_pct: number | null;
  cod_fornecedor: string | null;
  nome_fornecedor: string | null;
  data_ultima_entrada: string | null;
  numero_nota: string | null;
  dentro_periodo: boolean;
  analisado: boolean;
  variacao_ultimo_pct: number | null;
  variacao_penultimo_pct: number | null;
  margem_real_pct: number | null;
  margem_meta_pct: number | null;
  preco_sugerido: number | null;
  precisa_ajuste: boolean;
  status: StatusAnalise;
  alertas: AlertaAnalise[];
}

export interface LotePrecificacao {
  id: string;
  codigo_customizado: string;
  usuario_id: string;
  arquivo_nome: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  total_itens: number;
  total_ajustes_sugeridos: number;
  parametros: ParametrosAnalise;
  status: string;
  created_at: string;
}

export interface AjusteAplicado {
  lote_id: string;
  item_id: string | null;
  produto_id: string;
  codprod: string;
  descricao: string;
  preco_anterior: number;
  preco_novo: number;
  custo_considerado: number;
  margem_anterior_pct: number | null;
  margem_nova_pct: number | null;
  motivo: string;
  usuario_id: string;
}
