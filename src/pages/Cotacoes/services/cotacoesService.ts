import { supabase } from '../../../lib/supabaseClient';
import type {
  ItemFaltaCotacaoDTO,
  FornecedorSugeridoDTO,
  CotacaoMestre,
  CriarCotacaoPayload,
  SubmeterRespostaFornecedorPayload,
  ConcluirCotacaoPayload,
  CotacaoMestreRegistro
} from '../types/cotacoes.types';

export const cotacoesService = {
  async listarFaltasPendentes(): Promise<ItemFaltaCotacaoDTO[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        id, codigo_customizado, produto_id, setor_id, subsetor_id, status_cotacao, data_registro,
        produtos:produto_id ( descricao, codigo_barras ),
        categorias_setores:setor_id ( nome ),
        categorias_subsetores:subsetor_id ( nome ),
        motivos_falta:motivo_falta_id ( descricao )
      `)
      .eq('status_cotacao', 'Pendente')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      id: item.id,
      codigo_customizado: item.codigo_customizado,
      produto_id: item.produto_id,
      produto_descricao: item.produtos?.descricao,
      produto_codigo_barras: item.produtos?.codigo_barras,
      setor_id: item.setor_id,
      setor_nome: item.categorias_setores?.nome,
      subsetor_id: item.subsetor_id,
      subsetor_nome: item.categorias_subsetores?.nome,
      motivo_falta_descricao: item.motivos_falta?.descricao,
      status_cotacao: item.status_cotacao,
      data_registro: item.data_registro,
    }));
  },

  async listarFornecedoresPorSetor(setorId: string): Promise<FornecedorSugeridoDTO[]> {
    if (!setorId) return [];

    const { data, error } = await supabase
      .from('vendedor_setores')
      .select(`
        vendedores:vendedor_id (
          id, nome, telefone,
          fornecedores:fornecedor_id ( id, razao_social, nome_fantasia, cnpj )
        )
      `)
      .eq('categoria_id', setorId);

    if (error) throw error;

    const map = new Map<string, FornecedorSugeridoDTO>();
    data?.forEach((item: any) => {
      const vend = item.vendedores;
      const forn = vend?.fornecedores;
      if (forn && !map.has(forn.id)) {
        map.set(forn.id, {
          fornecedor_id: forn.id,
          razao_social: forn.razao_social,
          nome_fantasia: forn.nome_fantasia,
          cnpj: forn.cnpj,
          vendedor_id: vend.id,
          vendedor_nome: vend.nome,
          vendedor_telefone: vend.telefone
        });
      }
    });

    return Array.from(map.values());
  },

  async criarRodadaCotacao(payload: CriarCotacaoPayload): Promise<void> {
    if (!payload.nota_falta_ids.length || !payload.fornecedores.length) {
      throw new Error('Itens e fornecedores são obrigatórios.');
    }

    const { data: mestre, error: errMestre } = await supabase
      .from('cotacoes_mestre')
      .insert([{ comprador_id: payload.comprador_id, status: 'Aberta' }])
      .select('id').single();

    if (errMestre) throw errMestre;

    const itensPayload = payload.nota_falta_ids.map(id => ({
      cotacao_mestre_id: mestre.id, nota_falta_id: id
    }));
    await supabase.from('cotacao_itens_vinculados').insert(itensPayload);

    const validadeToken = new Date();
    validadeToken.setDate(validadeToken.getDate() + 5);

    const fornPayload = payload.fornecedores.map(f => ({
      cotacao_mestre_id: mestre.id,
      fornecedor_id: f.fornecedor_id,
      vendedor_id: f.vendedor_id,
      token_validade: validadeToken.toISOString()
    }));
    await supabase.from('cotacoes_fornecedores_vinculados').insert(fornPayload);

    await supabase.from('notas_falta').update({ status_cotacao: 'Em Cotação' }).in('id', payload.nota_falta_ids);
  },

  async obterDetalhesCotacaoPorToken(token: string) {
    const { data, error } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .select(`
        id, cotacao_mestre_id, prazo_entrega_dias, condicoes_pagamento, respondido_em,
        fornecedores ( razao_social ),
        cotacoes_mestre ( 
          status, 
          cotacao_itens_vinculados ( 
            notas_falta ( produtos ( id, descricao, codigo_barras, unidades_medida(sigla) ) ) 
          ) 
        )
      `)
      .eq('token_acesso', token)
      .single();

    if (error || !data) throw new Error('Token inválido ou expirado.');
    return data;
  },

  async registrarRespostaFornecedor(payload: SubmeterRespostaFornecedorPayload): Promise<void> {
    const vinculo = await this.obterDetalhesCotacaoPorToken(payload.token_acesso);
    if (vinculo.respondido_em) throw new Error('Cotação já respondida.');

    const respostasPayload = payload.respostas.map(r => ({
      cotacao_fornecedor_id: vinculo.id,
      produto_id: r.produto_id,
      preco_ofertado: r.preco_ofertado
    }));

    await supabase.from('cotacoes_respostas_itens').insert(respostasPayload);
    await supabase
      .from('cotacoes_fornecedores_vinculados')
      .update({
        prazo_entrega_dias: payload.prazo_entrega_dias,
        condicoes_pagamento: payload.condicoes_pagamento,
        respondido_em: new Date().toISOString()
      })
      .eq('id', vinculo.id);
  },

  async concluirCotacao(payload: ConcluirCotacaoPayload): Promise<void> {
    await supabase
      .from('cotacoes_mestre')
      .update({
        status: 'Concluída',
        cenario_escolhido: payload.cenario_escolhido,
        justificativa_escolha: payload.justificativa_escolha,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.cotacao_mestre_id);

    if (payload.itens_ganhadores.length > 0) {
      const ids = payload.itens_ganhadores.map(i => i.resposta_item_id);
      await supabase.from('cotacoes_respostas_itens').update({ ganhou_item: true }).in('id', ids);
    }
  },

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

    return (data || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      usuarios: { nome: item.usuarios?.nome || 'Comprador' },
      itens_vinculados_count: item.cotacao_itens_vinculados?.[0]?.count || 0
    }));
  }

};