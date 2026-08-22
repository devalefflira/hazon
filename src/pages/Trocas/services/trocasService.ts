// src/pages/Trocas/services/trocasService.ts
import { supabase } from '../../../lib/supabaseClient';

export const trocasService = {
  // 1. Listar Fornecedores Cadastrados
  async listarFornecedores(): Promise<any[]> {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, razao_social, nome_fantasia, cnpj')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Listar Itens de Avaria com Destinação "Troca" sincronizados com a tabela trocas
  async listarItensTroca(): Promise<any[]> {
    // Busca todas as avarias marcadas com destino de Troca
    const { data: avarias, error: errAvarias } = await supabase
      .from('avarias')
      .select(`
        id,
        codigo_customizado,
        quantidade,
        data_registro,
        hora_registro,
        observacao,
        destinacao,
        produtos (
          id,
          codprod,
          descricao,
          unidade,
          custoreal
        )
      `)
      .ilike('destinacao', '%troca%')
      .order('data_registro', { ascending: false });

    if (errAvarias) throw errAvarias;

    // Busca os registros de trocas existentes
    const { data: trocas, error: errTrocas } = await supabase
      .from('trocas')
      .select(`
        *,
        fornecedores ( id, nome_fantasia, razao_social ),
        usuarios:recebido_por ( id, nome )
      `);

    if (errTrocas) throw errTrocas;

    const mapTrocas = new Map<string, any>();
    (trocas || []).forEach((t: any) => {
      mapTrocas.set(t.avaria_id, t);
    });

    // Mescla avarias com seus dados de troca
    return (avarias || []).map((av: any) => {
      const trocaVinculada = mapTrocas.get(av.id);
      return {
        avaria_id: av.id,
        troca_id: trocaVinculada?.id || null,
        codigo_customizado: av.codigo_customizado,
        produto_id: av.produtos?.id,
        codprod: av.produtos?.codprod,
        descricao_produto: av.produtos?.descricao || 'PRODUTO NÃO IDENTIFICADO',
        quantidade: Number(av.quantidade || 0),
        unidade: av.produtos?.unidade || 'UN',
        custoreal: Number(av.produtos?.custoreal || 0),
        data_coleta: av.data_registro,
        hora_coleta: av.hora_registro,
        observacao: av.observacao,
        fornecedor_id: trocaVinculada?.fornecedor_id || null,
        fornecedor_nome: trocaVinculada?.fornecedores?.nome_fantasia || trocaVinculada?.fornecedores?.razao_social || 'Não Identificado',
        status: trocaVinculada?.status || 'Não iniciado',
        anotacoes: trocaVinculada?.anotacoes || '',
        troca_realizada: trocaVinculada?.troca_realizada || false,
        recebido_por_nome: trocaVinculada?.usuarios?.nome || null,
        recebido_data: trocaVinculada?.recebido_data || null,
        recebido_hora: trocaVinculada?.recebido_hora || null
      };
    });
  },

  // 3. Vincular ou Alterar Fornecedor da Avaria
  async atribuirFornecedor(avariaId: string, fornecedorId: string): Promise<void> {
    const { data: existente } = await supabase
      .from('trocas')
      .select('id')
      .eq('avaria_id', avariaId)
      .maybeSingle();

    if (existente) {
      const { error } = await supabase
        .from('trocas')
        .update({ fornecedor_id: fornecedorId || null })
        .eq('id', existente.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('trocas')
        .insert([{
          avaria_id: avariaId,
          fornecedor_id: fornecedorId || null,
          status: 'Não iniciado'
        }]);
      if (error) throw error;
    }
  },

  // 4. Enviar Grupo de Itens para Negociação
  async enviarParaNegociar(avariaIds: string[]): Promise<void> {
    for (const id of avariaIds) {
      const { data: existente } = await supabase
        .from('trocas')
        .select('id')
        .eq('avaria_id', id)
        .maybeSingle();

      if (existente) {
        await supabase
          .from('trocas')
          .update({ status: 'Enviado' })
          .eq('id', existente.id);
      } else {
        await supabase
          .from('trocas')
          .insert([{
            avaria_id: id,
            status: 'Enviado'
          }]);
      }
    }
  },

  // 5. Atualizar Status da Negociação (E, A, N com anotação)
  async atualizarStatusNegociacao(avariaIds: string[], novoStatus: string, anotacao?: string): Promise<void> {
    for (const id of avariaIds) {
      const payload: Record<string, any> = { status: novoStatus };
      if (anotacao !== undefined) {
        payload.anotacoes = anotacao;
      }

      await supabase
        .from('trocas')
        .update(payload)
        .eq('avaria_id', id);
    }
  },

  // 6. Confirmar Recebimento / Finalizar Ciclo
  async confirmarRecebimento(avariaIds: string[], usuarioId: string): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (const id of avariaIds) {
      await supabase
        .from('trocas')
        .update({
          troca_realizada: true,
          recebido_por: usuarioId,
          recebido_data: dataAtual,
          recebido_hora: horaAtual
        })
        .eq('avaria_id', id);
    }
  }
};