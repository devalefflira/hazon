export interface ItemNotaXML {
  xProd: string;
  uCom: string;
  qComOriginal?: number;
  quantidadeContada?: number;
  lote?: string;
  dataValidade?: string;
}

export interface NotaImportadaXML {
  id?: string;
  cnpj: string;
  razaoSocial: string;
  numeroNota: string;
  dataEmissao: string;
  itens: ItemNotaXML[];
}

export interface ConferenciaRegistro {
  id: string;
  codigo_customizado: string;
  numero_nota_fiscal: string;
  data_emissao_nota: string;
  data_conferencia: string;
  hora_conferencia: string;
  status: "Pendente" | "Em Andamento" | "Finalizada";
  observacao?: string;
  updated_at?: string;
  fornecedor?: {
    id: string;
    razao_social: string;
    cnpj: string;
  };
  usuario?: {
    nome: string;
  };
  conferencia_itens?: Array<{
    id: string;
    quantidade_contada: number;
    unidade_medida: string;
    lote?: string;
    data_validade?: string;
    produto?: {
      descricao: string;
    };
  }>;
}

export interface ConferenciaItem {
  id: string;
  conferencia_mestre_id: string;
  produto_id: string;
  quantidade_contada: number;
  unidade_medida: string;
  lote?: string;
  data_validade?: string;
}