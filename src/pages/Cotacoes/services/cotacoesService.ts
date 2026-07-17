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

  async listarFornecedoresPorSetor(setorId: string): Promise<FornecedorSugeridoDTO[]> {
    if (!setorId) return [];

    const { data, error } = await supabase
      .from('vendedor_setores')
      .select(`
        vendedor_id,
        vendedores:vendedor_id (
          id, nome, telefone, fornecedor_id,
          fornecedores:fornecedor_id ( id, razao_social, nome_fantasia, cnpj )
        )
      `)
      .eq('categoria_id', setorId);

    if (error) throw error;

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

  async criarRodadaCotacao(payload: CriarCotacaoPayload): Promise<void> {
    if (!payload.nota_falta_ids.length || !payload.fornecedores.length) {
      throw new Error('É mandatório vincular itens e fornecedores para disparar.');
    }

    // 1. Grava o mestre
    const { data: mestre, error: errMestre } = await supabase
      .from('cotacoes_mestre')
      .insert([{ comprador_id: payload.comprador_id, status: 'Aberta' }])
      .select('id')
      .single();

    if (errMestre) throw errMestre;
    if (!mestre?.id) throw new Error('Erro na geração da chave primária da rodada.');

    // 2. Grava os itens vinculados na pivot N:N
    const itensPayload = payload.nota_falta_ids.map(id => ({
      cotacao_mestre_id: mestre.id, 
      nota_falta_id: id
    }));
    const { error: errItens } = await supabase.from('cotacoes_itens_vinculados').insert(itensPayload);
    if (errItens) throw errItens;

    // 3. Define a validade padrão do link comercial (5 dias)
    const validadeToken = new Date();
    validadeToken.setDate(validadeToken.getDate() + 5);

    // 4. Grava os convites forçando o token gerado de forma síncrona pelo cliente
    const fornPayload = payload.fornecedores.map(f => ({
      cotacao_mestre_id: mestre.id,
      fornecedor_id: f.fornecedor_id,
      vendedor_id: f.vendedor_id || null,
      token_acesso: f.token_acesso, // CORREÇÃO: Força a gravação do token correto
      token_validade: validadeToken.toISOString()
    }));
    const { error: errForn } = await supabase.from('cotacoes_fornecedores_vinculados').insert(fornPayload);
    if (errForn) throw errForn;

    // 5. Atualiza a esteira original de Notas de Falta
    const { error: errFalta } = await supabase
      .from('notas_falta')
      .update({ status_cotacao: 'Em Cotação' })
      .in('id', payload.nota_falta_ids);
    if (errFalta) throw errFalta;
  },

  async obterDetalhesCotacaoPorToken(token: string) {
    if (!token) throw new Error('Token inválido.');
    
    const { data: vinculos, error: errVinculo } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .select(`
        id, 
        cotacao_mestre_id, 
        prazo_entrega_dias, 
        condicoes_pagamento, 
        respondido_em,
        fornecedor_id
      `)
      .eq('token_acesso', token);

    if (errVinculo || !vinculos || vinculos.length === 0) {
      throw new Error('Link comercial inativo ou expirado.');
    }

    const vinculo = vinculos[0];

    // Busca o nome do fornecedor de forma isolada e segura
    const { data: fornData } = await supabase
      .from('fornecedores')
      .select('razao_social, nome_fantasia')
      .eq('id', vinculo.fornecedor_id)
      .single();

    // Busca os itens vinculados à cotação mestre resolvendo a descrição do produto
    const { data: itensVinculados, error: errItens } = await supabase
      .from('cotacoes_itens_vinculados')
      .select(`
        nota_falta_id,
        notas_falta:nota_falta_id (
          id,
          produto_id,
          produtos:produto_id (
            id, 
            descricao, 
            codigo_barras,
            unidades_medida:unidade_medida_id ( sigla )
          )
        )
      `)
      .eq('cotacao_mestre_id', vinculo.cotacao_mestre_id);

    if (errItens) throw errItens;

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
      fornecedor_nome: fornData?.nome_fantasia || fornData?.razao_social || 'Fornecedor',
      itens: itensFormatados
    };
  },

  async registrarRespostaFornecedor(payload: SubmeterRespostaFornecedorPayload): Promise<void> {
    const vinculo = await this.obterDetalhesCotacaoPorToken(payload.token_acesso);
    if (vinculo.respondido_em) throw new Error('Esta rodada já foi respondida por sua empresa.');

    const respostasPayload = payload.respostas.map(r => ({
      cotacao_fornecedor_id: vinculo.vinculo_id,
      produto_id: r.produto_id,
      preco_ofertado: r.preco_ofertado
    }));

    const { error: errResp } = await supabase.from('cotacoes_respostas_itens').insert(respostasPayload);
    if (errResp) throw errResp;

    const { error: errVinculo } = await supabase
      .from('cotacoes_fornecedores_vinculados')
      .update({
        prazo_entrega_dias: payload.prazo_entrega_dias,
        condicoes_pagamento: payload.condicoes_pagamento,
        respondido_em: new Date().toISOString()
      })
      .eq('id', vinculo.vinculo_id);

    if (errVinculo) throw errVinculo;
  },

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
      usuarios: registro.usuarios ? { nome: String(registro.usuarios.nome) } : null,
      itens_vinculados_count: registro.cotacoes_itens_vinculados?.[0]?.count || 0
    }));
  },

  async concluirCotacao(payload: ConcluirCotacaoPayload): Promise<boolean> {
    // 1. Atualiza o status da Cotação Mestre
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

    // 2. Grava a lista de itens ganhadores da auditoria
    const listagemGanhadores = payload.itens_ganhadores.map(item => ({
      cotacao_mestre_id: payload.cotacao_mestre_id,
      cotacao_resposta_item_id: item.resposta_item_id
    }));

    const { error: errGanhadores } = await supabase.from('cotacoes_ganhadores').insert(listagemGanhadores);
    if (errGanhadores) throw errGanhadores;

    // 3. Atualiza as Notas de Falta originais para 'Finalizada'
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

    // =========================================================================
    // AUTOMAÇÃO DO MÓDULO DE PEDIDOS: DISPARO DO SPLIT POR FORNECEDOR
    // =========================================================================
    try {
      // Busca os detalhes das respostas vencedoras para descobrir quem são os fornecedores
      const { data: detalhesGanhadores } = await supabase
        .from('cotacoes_respostas_itens')
        .select(`
          id, produto_id, preco_ofertado,
          vinculo:cotacao_fornecedor_id (
            fornecedor_id, vendedor_id, cotacao_mestre_id,
            cotacoes_mestre ( comprador_id )
          )
        `)
        .in('id', payload.itens_ganhadores.map(ig => ig.resposta_item_id));

      if (detalhesGanhadores && detalhesGanhadores.length > 0) {
        // Agrupa os itens em memória pelo ID do Fornecedor
        const agrupamentoFornecedores: { [key: string]: any[] } = {};
        let compradorId = '00000000-0000-0000-0000-000000000000';

        detalhesGanhadores.forEach((item: any) => {
          const fornId = item.vinculo?.fornecedor_id;
          if (item.vinculo?.cotacoes_mestre?.comprador_id) {
            compradorId = item.vinculo.cotacoes_mestre.comprador_id;
          }
          if (fornId) {
            if (!agrupamentoFornecedores[fornId]) {
              agrupamentoFornecedores[fornId] = [];
            }
            agrupamentoFornecedores[fornId].push(item);
          }
        });

        // Para cada fornecedor vencedor único, gera um cabeçalho de pedido e injeta os itens dele
        for (const fornId of Object.keys(agrupamentoFornecedores)) {
          const itensDoFornecedor = agrupamentoFornecedores[fornId];
          const primeiroItem = itensDoFornecedor[0];

          // Descobre o contador sequencial atual para gerar o código amigável (Ex: #000001)
          const { count } = await supabase
            .from('pedidos_mestre')
            .select('*', { count: 'exact', head: true });
          
          const proximoNumero = (count || 0) + 1;
          const codigoFormatado = `#${String(proximoNumero).padStart(6, '0')}`;

          // Insere o cabeçalho mestre do Pedido
          const { data: novoPedido, error: errPedMestre } = await supabase
            .from('pedidos_mestre')
            .insert([{
              codigo_customizado: codigoFormatado,
              cotacao_mestre_id: payload.cotacao_mestre_id,
              fornecedor_id: fornId,
              vendedor_id: primeiroItem.vinculo?.vendedor_id || null,
              comprador_id: compradorId,
              status: 'Falta Pedir'
            }])
            .select('id')
            .single();

          if (!errPedMestre && novoPedido?.id) {
            // Insere a listagem de produtos com o preço travado da cotação e quantidade inicial 0
            const cargaItensPedido = itensDoFornecedor.map((item: any) => ({
              pedido_mestre_id: novoPedido.id,
              produto_id: item.produto_id,
              preco_unitario: item.preco_ofertado,
              quantidade_solicitada: 0.00 // Será estabelecida pelo comprador na esteira 'Falta Pedir'
            }));

            await supabase.from('pedido_itens').insert(cargaItensPedido);
          }
        }
      }
    } catch (errSplit) {
      // Log defensivo para não quebrar a transação principal caso ocorra falha no split secundário
      console.error('Falha interna ao processar o split automático de pedidos:', errSplit);
    }

    return true;
  }
}