// Arquivo: src/pages/Cotacoes/services/cotacoesService.ts
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
  /**
   * Lista todas as Notas de Falta que ainda estão com status 'Pendente'
   */
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
      produto_descricao: item.produtos?.descricao || 'Produto não encontrado',
      produto_codigo_barras: item.produtos?.codigo_barras || null,
      setor_id: item.setor_id,
      setor_nome: item.categorias_setores?.nome || 'Setor',
      subsetor_id: item.subsetor_id,
      subsetor_nome: item.categorias_subsetores?.nome || 'Subsetor',
      motivo_falta_descricao: item.motivos_falta?.descricao || 'Não informado',
      status_cotacao: item.status_cotacao,
      data_registro: item.data_registro
    }));
  },

  /**
   * Busca os fornecedores compatíveis com base no setor (categoria) selecionado
   */
  async listarFornecedoresPorSetor(setorId: string): Promise<FornecedorSugeridoDTO[]> {
    if (!setorId) return [];

    const { data, error } = await supabase
      .from('vendedor_setores')
      .select(`
        vendedor_id,
        vendedores:vendedor_id (
          id,
          nome,
          telefone,
          fornecedor_id,
          fornecedores:fornecedor_id (
            id,
            razao_social,
            nome_fantasia,
            cnpj
          )
        )
      `)
      .eq('categoria_id', setorId);

    if (error) {
      console.error('Erro na query de fornecedores por setor:', error);
      throw error;
    }

    const map = new Map<string, FornecedorSugeridoDTO>();
    
    (data || []).forEach((item: any) => {
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

  /**
   * Cria uma nova rodada de cotação de forma síncrona e ordenada no PostgreSQL
   */
  async criarRodadaCotacao(payload: CriarCotacaoPayload): Promise<void> {
    if (!payload.nota_falta_ids.length || !payload.fornecedores.length) {
      throw new Error('Itens e fornecedores são obrigatórios para abrir uma rodada.');
    }

    const { data: mestre, error: errMestre } = await supabase
      .from('cotacoes_mestre')
      .insert([{ 
        comprador_id: payload.comprador_id, 
        status: 'Aberta',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single();

    if (errMestre) {
      console.error('Erro ao criar cotacoes_mestre:', errMestre);
      throw errMestre;
    }

    if (!mestre || !mestre.id) {
      throw new Error('Falha crítica: O ID da cotação mestre não foi retornado pelo Supabase.');
    }

    const itensPayload = payload.nota_falta_ids.map(id => ({
      cotacao_mestre_id: mestre.id, 
      nota_falta_id: id
    }));
    
    const { error: errItens } = await supabase
      .from('cotacoes_itens_vinculados')
      .insert(itensPayload);

    if (errItens) {
      console.error('Erro ao vincular itens:', errItens);
      throw errItens;
    }

    const validadeToken = new Date();
    validadeToken.setDate(validadeToken.getDate() + 5);

    const fornPayload = payload.fornecedores.map(f => ({
      cotacao_mestre_id: mestre.id,
      fornecedor_id: f.fornecedor_id,
      vendedor_id: f.vendedor_id || null,
      token_validade: validadeToken.toISOString()
    }));
    
    const { error: errForn } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .insert(fornPayload);

    if (errForn) {
      console.error('Erro ao vincular fornecedores:', errForn);
      throw errForn;
    }

    const { error: errUpdateFalta } = await supabase
      .from('notas_falta')
      .update({ status_cotacao: 'Em Cotação' })
      .in('id', payload.nota_falta_ids);

    if (errUpdateFalta) {
      console.error('Erro ao atualizar notas_falta:', errUpdateFalta);
      throw errUpdateFalta;
    }
  },

  /**
   * Obtém de forma linear os dados da cotação mestre e os produtos vinculados via token
   */
  async obtenerDetalhesCotacaoPorToken(token: string) {
    if (!token) throw new Error('Token de acesso não fornecido.');

    const { data: vinculo, error: errVinculo } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .select(`
        id,
        cotacao_mestre_id,
        prazo_entrega_dias,
        condicoes_pagamento,
        respondido_em,
        fornecedores:fornecedor_id ( razao_social, nome_fantasia )
      `)
      .eq('token_acesso', token)
      .single();

    if (errVinculo || !vinculo) {
      console.error('Erro ao validar token comercial:', errVinculo);
      throw new Error('Link de acesso inválido ou expirado.');
    }

    const { data: itensVinculados, error: errItens } = await supabase
      .from('cotacoes_itens_vinculados')
      .select(`
        notas_falta:nota_falta_id (
          id,
          produtos:produto_id (
            id,
            descricao,
            codigo_barras,
            unidades_medida:unidade_medida_id ( sigla )
          )
        )
      `)
      .eq('cotacao_mestre_id', vinculo.cotacao_mestre_id);

    if (errItens) {
      console.error('Erro ao buscar itens vinculados da cotação:', errItens);
      throw errItens;
    }

    const itensFormatados = (itensVinculados || []).map((iv: any) => {
      const prod = iv.notas_falta?.produtos;
      return {
        id: String(prod?.id || ''),
        descricao: String(prod?.descricao || 'Produto não identificado'),
        codigo_barras: prod?.codigo_barras ? String(prod.codigo_barras) : null,
        unidade_medida: String(prod?.unidades_medida?.sigla || 'UN')
      };
    }).filter(item => item.id !== '');

    return {
      vinculo_id: vinculo.id,
      cotacao_mestre_id: vinculo.cotacao_mestre_id,
      respondido_em: vinculo.respondido_em,
      prazo_entrega_dias: vinculo.prazo_entrega_dias || '',
      condicoes_pagamento: vinculo.condicoes_pagamento || '',
      fornecedor_nome: vinculo.fornecedores?.nome_fantasia || vinculo.fornecedores?.razao_social || 'Fornecedor',
      itens: itensFormatados as any[] // Força o cast para evitar conflito com contratos globais desatualizados
    };
  },

  /**
   * Registra a resposta com preços de cada item enviado pelo painel externo do vendedor
   */
  async registrarRespostaFornecedor(payload: SubmeterRespostaFornecedorPayload): Promise<void> {
    const vinculo = await this.obtenerDetalhesCotacaoPorToken(payload.token_acesso);
    if (vinculo.respondido_em) throw new Error('Esta cotação já foi respondida previamente.');

    const respostasPayload = payload.respostas.map(r => ({
      cotacao_fornecedor_id: vinculo.vinculo_id,
      produto_id: r.produto_id,
      preco_ofertado: r.preco_ofertado
    }));

    const { error: errRespostas } = await supabase
      .from('cotacoes_respostas_itens')
      .insert(respostasPayload);

    if (errRespostas) throw errRespostas;

    const { error: errVinculoUpdate } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .update({
        prazo_entrega_dias: payload.prazo_entrega_dias,
        condicoes_pagamento: payload.condicoes_pagamento,
        respondido_em: new Date().toISOString()
      })
      .eq('id', vinculo.vinculo_id);

    if (errVinculoUpdate) throw errVinculoUpdate;
  },

  /**
   * Lista o histórico completo das rodadas abertas para o dashboard do comprador
   */
  async listarHistoricoCotacoes(): Promise<CotacaoMestreRegistro[]> {
    const { data, error } = await supabase
      .from('cotacoes_mestre')
      .select(`
        id, status, created_at, comprador_id,
        usuarios:comprador_id ( nome ),
        cotacoes_itens_vinculados ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((registro: any) => ({
      id: registro.id,
      status: registro.status,
      created_at: registro.created_at,
      comprador_id: registro.comprador_id,
      usuarios: registro.usuarios ? { nome: registro.usuarios.nome } : null,
      itens_vinculados_count: registro.cotacoes_itens_vinculados?.[0]?.count || 0
    }));
  },

  /**
   * Fecha a rodada, grava os itens vencedores em cotacoes_ganhadores e finaliza as faltas
   */
  async concluirCotacao(payload: ConcluirCotacaoPayload): Promise<boolean> {
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

    const listagemGanhadores = payload.itens_ganhadores.map(item => ({
      cotacao_mestre_id: payload.cotacao_mestre_id,
      cotacao_resposta_item_id: item.resposta_item_id
    }));

    const { error: errGanhadores } = await supabase
      .from('cotacoes_ganhadores')
      .insert(listagemGanhadores);

    if (errGanhadores) throw errGanhadores;

    const { data: itensVinculados } = await supabase
      .from('cotacoes_itens_vinculados')
      .select('nota_falta_id')
      .eq('cotacao_mestre_id', payload.cotacao_mestre_id);

    const idsNotasFalta = (itensVinculados || []).map(iv => iv.nota_falta_id);

    if (idsNotasFalta.length > 0) {
      await supabase
        .from('notas_falta')
        .update({ status_cotacao: 'Finalizada' })
        .in('id', idsNotasFalta);
    }

    return true;
  }
};