import { supabase } from '../../../lib/supabaseClient';
import type {
  ItemFaltaCotacaoDTO,
  FornecedorSugeridoDTO,
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

  // Implementação da listagem do Histórico para suprir a demanda do index.tsx
  async listarHistoricoCotacoes(): Promise<CotacaoMestreRegistro[]> {
    const { data, error } = await supabase
      .from('cotacoes_mestre')
      .select(`
        id, status, created_at, comprador_id,
        usuarios:comprador_id ( nome ),
        cotacao_itens_vinculados ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((registro: any) => ({
      id: registro.id,
      status: registro.status,
      created_at: registro.created_at,
      comprador_id: registro.comprador_id,
      usuarios: registro.usuarios,
      itens_vinculados_count: registro.cotacao_itens_vinculados?.[0]?.count || 0
    }));
  },

  async concluirCotacao(payload: {
    cotacao_mestre_id: string;
    cenario_escolhido: string;
    justificativa_escolha: string;
    itens_ganhadores: { resposta_item_id: string }[];
  }): Promise<boolean> {
    // 1. Atualiza o status e a auditoria diretamente na tabela mestre
    const { error: errMestre } = await supabase
      .from('cotacoes_mestre')
      .update({ 
        status: 'Concluída',
        cenario_escolhido: payload.cenario_escolhido,
        justificativa_escolha: payload.justificativa_escolha,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.cotacao_mestre_id);

    if (errMestre) throw errMestre;

    // 2. Grava os itens vencedores na nova tabela criada no banco de dados
    const ganhadoresPayload = payload.itens_ganhadores.map(item => ({
      cotacao_mestre_id: payload.cotacao_mestre_id,
      cotacao_resposta_item_id: item.resposta_item_id,
      cenario_escolhido: payload.cenario_escolhido,
      justificativa: payload.justificativa_escolha,
      criado_em: new Date().toISOString()
    }));

    const { error: errGanhadores } = await supabase
      .from('cotacoes_ganhadores')
      .insert(ganhadoresPayload);

    if (errGanhadores) throw errGanhadores;

    // 3. Liberação reativa das Notas de Falta para 'Finalizada'
    const { data: itensVinculados } = await supabase
      .from('cotacao_itens_vinculados')
      .select('nota_falta_id')
      .eq('cotacao_mestre_id', payload.cotacao_mestre_id);

    const idsNotasFalta = (itensVinculados || []).map(iv => iv.nota_falta_id);

    if (idsNotasFalta.length > 0) {
      const { data: fornVinculados } = await supabase
        .from('cotacoes_fornecedores_vinculados')
        .select('id')
        .eq('cotacao_mestre_id', payload.cotacao_mestre_id);

      const idsForn = (fornVinculados || []).map(f => f.id);

      if (idsForn.length > 0) {
        const { data: respondidos } = await supabase
          .from('cotacoes_respostas_itens')
          .select('produto_id')
          .in('cotacao_fornecedor_id', idsForn);

        console.log('Itens consolidados com sucesso comerciais:', respondidos?.length || 0);
      }

      await supabase
        .from('notas_falta')
        .update({ status_cotacao: 'Finalizada' })
        .in('id', idsNotasFalta);
    }

    return true;
  }
};