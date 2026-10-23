// src/pages/AuditoriaPrecificacao/types/auditoria.types.ts

export const SECOES_AUDITORIA: string[] = [
  'Bebidas',
  'Limpeza',
  'Cereais',
  'Massas Alimentícias',
  'Molhos',
  'Temperos',
  'Biscoitos',
  'Doces',
  'Outro'
];

export const OPCAO_OUTRO = 'Outro';

export type SituacaoItem = 'CORRETO' | 'INCORRETO' | 'SEM_PRECO';

export const ROTULO_SITUACAO: Record<SituacaoItem, string> = {
  CORRETO: 'Correto',
  INCORRETO: 'Incorreto',
  SEM_PRECO: 'Sem preço'
};

export type ClassificacaoMargem =
  | 'MUITO_ABAIXO'
  | 'ABAIXO'
  | 'IDEAL'
  | 'TOLERAVEL'
  | 'MUITO_ACIMA'
  | 'SEM_PARAMETRO';

export const ROTULO_CLASSIFICACAO: Record<ClassificacaoMargem, string> = {
  MUITO_ABAIXO: 'Muito abaixo',
  ABAIXO: 'Abaixo',
  IDEAL: 'Ideal',
  TOLERAVEL: 'Tolerável',
  MUITO_ACIMA: 'Muito acima',
  SEM_PARAMETRO: 'Sem parâmetro'
};

/** Classificações fora da faixa tolerável: entram em "Itens para Corrigir". */
export const CLASSIFICACOES_FORA_DA_FAIXA: ClassificacaoMargem[] = ['MUITO_ABAIXO', 'ABAIXO', 'MUITO_ACIMA'];

export type StatusCorrecao = 'Pendente' | 'Corrigido';

export interface AuditoriaRegistro {
  id: string;
  codigo_customizado: string;
  usuario_id: string;
  secao: string;
  secao_outro_descricao: string | null;
  classe: string | null;
  status: 'Em andamento' | 'Finalizada';
  data_inicio: string;
  data_fim: string | null;
  total_itens: number;
  total_corretos: number;
  total_incorretos: number;
  total_sem_preco: number;
  created_at: string;
  usuarios?: { nome: string | null } | null;
}

export interface AuditoriaItemRegistro {
  id: string;
  auditoria_id: string;
  produto_id: string;
  codprod: string;
  descricao: string;
  codbarra: string | null;
  departamento: string | null;
  secao_produto: string | null;
  categoria: string | null;
  custo_sistema: number;
  preco_sistema: number;
  situacao: SituacaoItem;
  preco_encontrado: number | null;
  observacao: string | null;
  secao_local: string;
  data_auditoria: string;
  etiqueta_pendente: boolean;
  etiqueta_impressa_em: string | null;
  preco_margem: number | null;
  margem_real_pct: number | null;
  margem_meta_pct: number | null;
  margem_classificacao: ClassificacaoMargem | null;
  correcao_status: StatusCorrecao | null;
  corrigido_em: string | null;
  usuario_id: string;
  auditado_em: string;
  usuarios?: { nome: string | null } | null;
}

export interface ParametroMargem {
  id?: string;
  departamento: string;
  secao: string;
  categoria: string;
  margem_alvo_pct: number;
}

export interface ConfigMargem {
  faixa_ideal_pp: number;
  faixa_tolerancia_pp: number;
  faixa_muito_pp: number;
}

export interface ResumoSituacoes {
  total: number;
  corretos: number;
  incorretos: number;
  semPreco: number;
}

/** Nome exibido da seção: "Outro" vira "Outro: Hortifruti" quando especificado. */
export function rotuloSecao(secao: string, outroDescricao: string | null | undefined): string {
  return secao === OPCAO_OUTRO && outroDescricao ? `Outro: ${outroDescricao}` : secao;
}

export function resumirItens(itens: AuditoriaItemRegistro[]): ResumoSituacoes {
  return {
    total: itens.length,
    corretos: itens.filter((i) => i.situacao === 'CORRETO').length,
    incorretos: itens.filter((i) => i.situacao === 'INCORRETO').length,
    semPreco: itens.filter((i) => i.situacao === 'SEM_PRECO').length
  };
}
