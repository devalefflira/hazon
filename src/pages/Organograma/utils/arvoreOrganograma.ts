// src/pages/Organograma/utils/arvoreOrganograma.ts
import { RANK_NIVEL } from '../types/organograma.types';
import type { NoOrganograma, OrganogramaColaborador, OrganogramaSetor } from '../types/organograma.types';

/** Monta a árvore a partir da lista plana (cada colaborador aponta para o seu superior). */
export function montarArvore(
  colaboradores: OrganogramaColaborador[],
  setores: OrganogramaSetor[]
): NoOrganograma[] {
  const nomeDoSetor = new Map<string, string>(setores.map((s) => [s.id, s.nome] as [string, string]));
  const nos = new Map<string, NoOrganograma>();

  colaboradores.forEach((c) => {
    nos.set(c.id, {
      ...c,
      setor_nome: c.setor_id ? (nomeDoSetor.get(c.setor_id) ?? null) : null,
      subordinados: [],
    });
  });

  const raizes: NoOrganograma[] = [];
  nos.forEach((no) => {
    const superior = no.superior_id ? nos.get(no.superior_id) : undefined;
    if (superior) superior.subordinados.push(no);
    else raizes.push(no);
  });

  const ordenar = (lista: NoOrganograma[]) => {
    lista.sort(
      (a, b) => RANK_NIVEL[a.nivel] - RANK_NIVEL[b.nivel] || a.nome.localeCompare(b.nome, 'pt-BR')
    );
    lista.forEach((n) => ordenar(n.subordinados));
  };
  ordenar(raizes);

  return raizes;
}

/** Ids de todos os colaboradores abaixo de um colaborador (subordinados diretos e indiretos). */
export function coletarDescendentes(id: string, colaboradores: OrganogramaColaborador[]): Set<string> {
  const filhosPorSuperior = new Map<string, string[]>();
  colaboradores.forEach((c) => {
    if (!c.superior_id) return;
    const lista = filhosPorSuperior.get(c.superior_id) ?? [];
    lista.push(c.id);
    filhosPorSuperior.set(c.superior_id, lista);
  });

  const resultado = new Set<string>();
  const pilha: string[] = [id];
  while (pilha.length > 0) {
    const atual = pilha.pop() as string;
    for (const filho of filhosPorSuperior.get(atual) ?? []) {
      if (!resultado.has(filho)) {
        resultado.add(filho);
        pilha.push(filho);
      }
    }
  }
  return resultado;
}
