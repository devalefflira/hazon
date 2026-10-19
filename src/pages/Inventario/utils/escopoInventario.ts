// Arquivo: src/pages/Inventario/utils/escopoInventario.ts
import type { EscopoInventario, HierarquiaProduto } from '../services/inventarioService';

export type ResultadoValidacaoEscopo =
  | { valido: true }
  | { valido: false; motivo: string };

interface ProdutoComHierarquia {
  descricao?: string | null;
  departamento?: string | null;
  secao?: string | null;
  categoria?: string | null;
}

// Normaliza textos para comparação (ignora caixa, espaços extras e bordas)
export const normalizarChaveEscopo = (valor?: string | null): string =>
  (valor ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

export const descreverEscopo = (escopo: EscopoInventario): string =>
  [escopo.departamento, escopo.secao, escopo.categoria].filter(Boolean).join(' › ');

// Regra central: o produto só pode ser contado se pertencer ao mesmo departamento,
// à mesma seção e (quando escolhida) à mesma categoria da coleta.
export function validarProdutoNoEscopo(
  produto: ProdutoComHierarquia,
  escopo: EscopoInventario | null | undefined
): ResultadoValidacaoEscopo {
  if (!escopo) {
    return { valido: false, motivo: 'A coleta ainda não possui departamento e seção definidos.' };
  }

  const departamentoProduto = normalizarChaveEscopo(produto.departamento);
  if (!departamentoProduto) {
    return {
      valido: false,
      motivo: 'Produto sem departamento cadastrado. Não pode ser contado nesta coleta.'
    };
  }

  if (departamentoProduto !== normalizarChaveEscopo(escopo.departamento)) {
    return {
      valido: false,
      motivo: `Produto do departamento "${produto.departamento?.trim()}", diferente do departamento da coleta "${escopo.departamento}".`
    };
  }

  const secaoProduto = normalizarChaveEscopo(produto.secao);
  if (secaoProduto !== normalizarChaveEscopo(escopo.secao)) {
    return {
      valido: false,
      motivo: `Mesmo departamento, mas a seção do produto é "${produto.secao?.trim() || 'não informada'}", diferente da seção da coleta "${escopo.secao}".`
    };
  }

  if (escopo.categoria && normalizarChaveEscopo(produto.categoria) !== normalizarChaveEscopo(escopo.categoria)) {
    return {
      valido: false,
      motivo: `Mesma seção, mas a categoria do produto é "${produto.categoria?.trim() || 'não informada'}", diferente da categoria da coleta "${escopo.categoria}".`
    };
  }

  return { valido: true };
}

// --- Opções em cascata (derivadas do cadastro de produtos) ---

const distintosOrdenados = (valores: string[]): string[] => {
  const mapa = new Map<string, string>();
  for (const valor of valores) {
    const original = valor.trim();
    const chave = normalizarChaveEscopo(original);
    if (!chave) continue;
    if (!mapa.has(chave)) mapa.set(chave, original);
  }
  return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};

export const extrairDepartamentos = (hierarquia: HierarquiaProduto[]): string[] =>
  distintosOrdenados(hierarquia.map((item) => item.departamento));

export const extrairSecoes = (hierarquia: HierarquiaProduto[], departamento: string): string[] => {
  const chaveDep = normalizarChaveEscopo(departamento);
  return distintosOrdenados(
    hierarquia
      .filter((item) => normalizarChaveEscopo(item.departamento) === chaveDep)
      .map((item) => item.secao)
  );
};

export const extrairCategorias = (
  hierarquia: HierarquiaProduto[],
  departamento: string,
  secao: string
): string[] => {
  const chaveDep = normalizarChaveEscopo(departamento);
  const chaveSec = normalizarChaveEscopo(secao);
  return distintosOrdenados(
    hierarquia
      .filter(
        (item) =>
          normalizarChaveEscopo(item.departamento) === chaveDep &&
          normalizarChaveEscopo(item.secao) === chaveSec
      )
      .map((item) => item.categoria ?? '')
  );
};
