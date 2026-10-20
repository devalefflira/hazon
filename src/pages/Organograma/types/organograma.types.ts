// src/pages/Organograma/types/organograma.types.ts

export const NIVEIS_ORGANOGRAMA = ['Diretoria', 'Gerencia', 'Encarregado', 'Colaborador'] as const;

export type NivelOrganograma = (typeof NIVEIS_ORGANOGRAMA)[number];

/** Ordem de exibição dos níveis dentro de cada equipe (menor = mais alto). */
export const RANK_NIVEL: Record<NivelOrganograma, number> = {
  Diretoria: 0,
  Gerencia: 1,
  Encarregado: 2,
  Colaborador: 3,
};

export interface OrganogramaSetor {
  id: string;
  nome: string;
}

export interface OrganogramaColaborador {
  id: string;
  nome: string;
  cargo: string;
  nivel: NivelOrganograma;
  setor_id: string | null;
  superior_id: string | null;
}

export interface DadosColaborador {
  nome: string;
  cargo: string;
  nivel: NivelOrganograma;
  setor_id: string | null;
  superior_id: string | null;
}

export interface NoOrganograma extends OrganogramaColaborador {
  setor_nome: string | null;
  subordinados: NoOrganograma[];
}
