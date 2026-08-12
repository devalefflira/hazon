// Arquivo: src/pages/Produtos/types/produtos.types.ts

export interface ProdutoDTO {
  id: string;
  codprod: string;
  descricao: string;
  codbarra?: string | null;
  unidade: string;
  custoreal: number;
  pvenda: number;
  departamento?: string | null;
  secao?: string | null;
  categoria?: string | null;
  created_at?: string;
  updated_at?: string;

  // === ALIASES DE COMPATIBILIDADE RETROATIVA (MANTÉM O INDEX.TSX E COMPONENTES FUNCIONANDO) ===
  codigo_barras?: string | null;
  ean: string;       // Garantido como string
  setor: string;     // Garantido como string (resolve o erro da linha 32)
  subsetor?: string | null;
  unidade_medida_id?: string | null;
  setor_id?: string | null;
  subsetor_id?: string | null;
}

export interface CriarProdutoPayload {
  // Campos Novos
  codprod?: string;
  descricao: string;
  codbarra?: string;
  unidade?: string;
  custoreal?: number;
  pvenda?: number;
  departamento?: string;
  secao?: string;
  categoria?: string;

  // === CAMPOS LEGADOS DO FORMULÁRIO (EVITA ERRO TS2353 NO CADASTROPRODUTO.TSX) ===
  codigo_barras?: string;
  ean?: string;
  unidade_medida_id?: string;
  setor_id?: string;
  subsetor_id?: string;
  setor?: string;
  subsetor?: string;
}