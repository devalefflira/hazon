// Arquivo: src/pages/Trocas/services/trocasService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface TrocaItem {
  id?: string;
  avaria_id: string;
  fornecedor_id?: string;
  status: 'Não iniciado' | 'Comunicado ao fornecedor' | 'Aguardando retorno do fornecedor' | 'Negociação Finalizada';
  anotacoes?: string;
  previsao_troca?: string;
  troca_realizada: boolean;
  recebido_por?: string;
  recebido_data?: string;
  recebido_hora?: string;
  created_at?: string;
  updated_at?: string;
  avaria: {
    id: string;
    codigo_customizado: string;
    quantidade: number;
    preco_custo_na_perda: number;
    destinacao: string;
    observacao?: string;
    data_registro: string;
    hora_registro: string;
    produtos?: {
      id: string;
      codprod: string;
      descricao: string;
      unidade?: string;
    };
    usuarios?: {
      id: string;
      nome: string;
    };
  };
  fornecedor?: {
    id: string;
    nome_fantasia: string;
    razao_social: string;
  };
  usuario_recebedor?: {
    id: string;
    nome: string;
  };
}

export const trocasService = {
  // 1. Listar Fornecedores para busca com autocomplete
  async buscarFornecedores(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, nome_fantasia, razao_social, cnpj')
      .or(`nome_fantasia.ilike.%${termo}%,razao_social.ilike.%${termo}%,cnpj.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Listar e sincronizar avarias com destino 'Troca Fornecedor'
  async listarTrocas(): Promise<TrocaItem[]> {
    // 2.1 Busca todas as avarias com destinação 'Troca Fornecedor'
    const { data: avarias, error: errAvarias } = await supabase
      .from('avarias')
      .select(`
        id, codigo_customizado, quantidade, preco_custo_na_perda, destinacao, observacao,
        data_registro, hora_registro, created_at,
        produtos ( id, codprod, descricao, unidade ),
        usuarios ( id, nome )
      `)
      .ilike('destinacao', '%Troca Fornecedor%')
      .order('created_at', { ascending: false });

    if (errAvarias) throw errAvarias;

    // 2.2 Busca os registros de trocas existentes
    const { data: registrosTrocas, error: errTrocas } = await supabase
      .from('trocas')
      .select(`
        *,
        fornecedores ( id, nome_fantasia, razao_social ),
        usuarios:recebido_por ( id, nome )
      `);

    if (errTrocas) throw errTrocas;

    const mapaTrocas: Record<string, any> = {};
    (registrosTrocas || []).forEach((t: any) => {
      mapaTrocas[t.avaria_id] = t;
    });

    const listaFinal: TrocaItem[] = [];

    (avarias || []).forEach((av: any) => {
      const trocaExistente = mapaTrocas[av.id];

      if (trocaExistente) {
        listaFinal.push({
          id: trocaExistente.id,
          avaria_id: av.id,
          fornecedor_id: trocaExistente.fornecedor_id,
          status: trocaExistente.status || 'Não iniciado',
          anotacoes: trocaExistente.anotacoes,
          previsao_troca: trocaExistente.previsao_troca,
          troca_realizada: trocaExistente.troca_realizada || false,
          recebido_por: trocaExistente.recebido_por,
          recebido_data: trocaExistente.recebido_data,
          recebido_hora: trocaExistente.recebido_hora,
          created_at: trocaExistente.created_at,
          updated_at: trocaExistente.updated_at,
          avaria: av,
          fornecedor: trocaExistente.fornecedores,
          usuario_recebedor: trocaExistente.usuarios
        });
      } else {
        // Se ainda não tem registro na tabela trocas, inicia com 'Não iniciado'
        listaFinal.push({
          avaria_id: av.id,
          status: 'Não iniciado',
          troca_realizada: false,
          avaria: av
        });
      }
    });

    return listaFinal;
  },

  // 3. Atualizar ou Criar Registro de Negociação de Troca
  async salvarNegociacao(payload: {
    avaria_id: string;
    fornecedor_id?: string;
    status: string;
    anotacoes?: string;
    previsao_troca?: string;
  }): Promise<void> {
    const agora = new Date().toISOString();

    const objetoUpsert: any = {
      avaria_id: payload.avaria_id,
      fornecedor_id: payload.fornecedor_id || null,
      status: payload.status,
      anotacoes: payload.anotacoes?.trim() || null,
      previsao_troca: payload.status === 'Negociação Finalizada' && payload.previsao_troca ? payload.previsao_troca : null,
      updated_at: agora
    };

    const { error } = await supabase
      .from('trocas')
      .upsert(objetoUpsert, { onConflict: 'avaria_id' });

    if (error) throw error;
  },

  // 4. Confirmar que a mercadoria física chegou na loja (Joinha)
  async confirmarRecebimentoTroca(avaria_id: string, usuario_id: string): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const { error } = await supabase
      .from('trocas')
      .update({
        troca_realizada: true,
        recebido_por: usuario_id,
        recebido_data: dataAtual,
        recebido_hora: horaAtual,
        updated_at: agora.toISOString()
      })
      .eq('avaria_id', avaria_id);

    if (error) throw error;
  }
};