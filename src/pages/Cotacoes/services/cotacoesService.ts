import { supabase } from '../../../lib/supabaseClient';

// Contratos de tipos estritos espelhados no Schema do PostgreSQL
export interface NotaFaltaPendente {
  id: string;
  codigo_customizado: string;
  produto_id: string;
  setor_id: string;
  subsetor_id: string;
  produtos: { descricao: string; codigo_barras: string };
  categorias_setores: { nome: string };
  categorias_subsetores: { nome: string };
  motivos_falta: { descricao: string };
}

export interface FornecedorSetor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
}

export interface CotacaoMestreRegistro {
  id: string;
  status: string;
  created_at: string;
  usuarios: { nome: string };
  itens_vinculados_count: number;
}

export const cotacoesService = {
  // 1. Busca todas as Notas de Falta que estão na gôndola com status 'Pendente'
  async listarFaltasPendentes(): Promise<NotaFaltaPendente[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        id,
        codigo_customizado,
        produto_id,
        setor_id,
        subsetor_id,
        produtos:produto_id ( descricao, codigo_barras ),
        categorias_setores:setor_id ( nome ),
        categorias_subsetores:subsetor_id ( nome ),
        motivos_falta:motivo_falta_id ( descricao )
      `)
      .eq('status_cotacao', 'Pendente')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as NotaFaltaPendente[];
  },

  // 2. Localiza fornecedores que atendem a um determinado Setor comercial
  async listarFornecedoresPorSetor(setorId: string): Promise<FornecedorSetor[]> {
    if (!setorId) return [];

    // Busca na tabela pivot vendedor_setores quais fornecedores possuem vendedores vinculados para o setor
    const { data, error } = await supabase
      .from('vendedor_setores')
      .select(`
        vendedores:vendedor_id (
          fornecedores:fornecedor_id ( id, razao_social, nome_fantasia, cnpj )
        )
      `)
      .eq('categoria_id', setorId);

    if (error) throw error;

    // Remove duplicidades de fornecedores mapeados no relacionamento
    const fornecedoresMapeados: FornecedorSetor[] = [];
    const idsExistentes = new Set<string>();

    data?.forEach((item: any) => {
      const fornecedor = item.vendedores?.fornecedores;
      if (fornecedor && !idsExistentes.has(fornecedor.id)) {
        idsExistentes.add(fornecedor.id);
        fornecedoresMapeados.push(fornecedor);
      }
    });

    return fornecedoresMapeados;
  },

  // 3. Abre uma rodada de negociação criando a cotação mestre, a amarração pivot e atualizando as notas de falta (Transacional)
  async criarRodadaCotacao(dados: {
    comprador_id: string;
    nota_falta_ids: string[];
    fornecedor_ids: string[];
  }): Promise<void> {
    if (dados.nota_falta_ids.length === 0 || dados.fornecedor_ids.length === 0) {
      throw new Error('É necessário selecionar ao menos um item e um fornecedor.');
    }

    // A. Cria o registro mestre da cotação
    const { data: novaCotacao, error: errorMestre } = await supabase
      .from('cotacoes_mestre')
      .insert([
        {
          comprador_id: dados.comprador_id,
          status: 'Aberta'
        }
      ])
      .select('id')
      .single();

    if (errorMestre) throw errorMestre;
    const cotacaoId = novaCotacao.id;

    // B. Cria os vínculos pivots de amarração com as Notas de Falta selecionadas
    const itensVinculadosPayload = dados.nota_falta_ids.map(notaId => ({
      cotacao_mestre_id: cotacaoId,
      nota_falta_id: notaId
    }));

    const { error: errorItens } = await supabase
      .from('cotacao_itens_vinculados')
      .insert(itensVinculadosPayload);

    if (errorItens) throw errorItens;

    // C. Cria o convite de acesso para cada Fornecedor selecionado na rodada
    const validadeToken = new Date();
    validadeToken.setDate(validadeToken.getDate() + 5); // Token expira em 5 dias

    const fornecedoresPayload = dados.fornecedor_ids.map(fornId => ({
      cotacao_mestre_id: cotacaoId,
      fornecedor_id: fornId,
      token_validade: validadeToken.toISOString()
    }));

    const { error: errorForn } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .insert(fornecedoresPayload);

    if (errorForn) throw errorForn;

    // D. GATILHO DE MUDANÇA DE ESTADO: Atualiza em lote as Notas de Falta selecionadas de 'Pendente' para 'Em Cotação'
    const { error: errorStatusFalta } = await supabase
      .from('notas_falta')
      .update({ status_cotacao: 'Em Cotação' })
      .in('id', dados.nota_falta_ids);

    if (errorStatusFalta) throw errorStatusFalta;
  },

  // 4. Lista o histórico do Dashboard de Cotações ativas e concluídas
  async listarHistoricoCotacoes(): Promise<CotacaoMestreRegistro[]> {
    const { data, error } = await supabase
      .from('cotacoes_mestre')
      .select(`
        id,
        status,
        created_at,
        usuarios:comprador_id ( nome ),
        cotacao_itens_vinculados ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      status: c.status,
      created_at: c.created_at,
      usuarios: { nome: c.usuarios?.nome || 'Comprador' },
      itens_vinculados_count: c.cotacao_itens_vinculados?.[0]?.count || 0
    }));
  }
};