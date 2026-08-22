// src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRecord, FiltrosAvariaPayload, NovaAvariaPayload } from '../types/avarias.types';

export const avariasService = {
  // 1. Listar registros de Avarias
  async listarAvarias(filtros?: FiltrosAvariaPayload): Promise<AvariaRecord[]> {
    let query = supabase
      .from('avarias')
      .select(`
        *,
        produtos ( id, codprod, descricao, codbarra, unidade, custoreal, departamento, secao, categoria ),
        motivos_avaria ( id, descricao ),
        usuarios ( id, nome )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (filtros?.motivo_id) {
      query = query.eq('motivo_avaria_id', filtros.motivo_id);
    }

    if (filtros?.destinacao) {
      query = query.eq('destinacao', filtros.destinacao);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar avarias:', error);
      throw error;
    }

    return (data || []) as AvariaRecord[];
  },

  // 2. Listar Motivos de Avaria
  async listarMotivosAvaria(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Buscar opções únicas de Departamentos, Seções e Categorias
  async buscarOpcoesFiltrosProdutos() {
    const { data, error } = await supabase
      .from('produtos')
      .select('departamento, secao, categoria');

    if (error) throw error;

    const departamentos = Array.from(
      new Set((data || []).map((p: any) => p.departamento).filter(Boolean))
    );
    const secoes = Array.from(
      new Set((data || []).map((p: any) => p.secao).filter(Boolean))
    );
    const categorias = Array.from(
      new Set((data || []).map((p: any) => p.categoria).filter(Boolean))
    );

    return { departamentos, secoes, categorias };
  },

  // 4. Buscar produtos por autocomplete (código, barras ou descrição com %)
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, departamento, secao, categoria');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }

    return data || [];
  },

  // 5. Registrar Nova Avaria (+ Integração automática com Consumo Loja se Destino = Consumo Interno)
  async registrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    const codigoCustom = `AV${Math.floor(1000 + Math.random() * 9000)}`;
    
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let motivoIdFinal = payload.motivo_avaria_id;
    if (motivoIdFinal.startsWith('m')) {
      const { data: motivoBanco } = await supabase
        .from('motivos_avaria')
        .select('id')
        .limit(1)
        .single();

      if (motivoBanco) {
        motivoIdFinal = motivoBanco.id;
      }
    }

    const objetoInsert: Record<string, any> = {
      codigo_customizado: codigoCustom,
      produto_id: payload.produto_id,
      motivo_avaria_id: motivoIdFinal,
      quantidade: payload.quantidade,
      preco_custo_na_perda: payload.preco_custo_na_perda,
      destinacao: payload.destinacao,
      observacao: payload.observacao || null,
      data_registro: dataAtual,
      hora_registro: horaAtual
    };

    if (payload.usuario_id) {
      objetoInsert.usuario_id = payload.usuario_id;
    }

    // Insere na tabela de Avarias
    const { error: errorAvaria } = await supabase
      .from('avarias')
      .insert([objetoInsert]);

    if (errorAvaria) {
      console.error('Erro ao registrar avaria:', errorAvaria);
      throw errorAvaria;
    }

    // Se o destino for "Consumo Interno", gera a cópia trackeada no Consumo Loja
    const destFormatada = (payload.destinacao || '').toLowerCase();
    if (destFormatada.includes('consumo')) {
      try {
        const { data: prodData } = await supabase
          .from('produtos')
          .select('departamento, unidade')
          .eq('id', payload.produto_id)
          .single();

        const valorTotalItem = Number(payload.quantidade || 0) * Number(payload.preco_custo_na_perda || 0);
        const codigoConsumo = `CSM-AV-${Math.floor(100000 + Math.random() * 900000)}`;

        const { data: mestreConsumo, error: errMestre } = await supabase
          .from('consumo_loja_mestre')
          .insert([
            {
              codigo_customizado: codigoConsumo,
              usuario_id: payload.usuario_id,
              data_registro: dataAtual,
              hora_registro: horaAtual,
              valor_total: valorTotalItem,
              observacao: `Origem Avaria (${codigoCustom}) - ${payload.observacao || 'Destino Consumo Interno'}`
            }
          ])
          .select('id')
          .single();

        if (!errMestre && mestreConsumo) {
          await supabase.from('consumo_loja_itens').insert([
            {
              consumo_mestre_id: mestreConsumo.id,
              produto_id: payload.produto_id,
              quantidade: payload.quantidade,
              unidade_medida: prodData?.unidade || 'UN',
              local: 'Consumo Interno (Avaria)',
              departamento: prodData?.departamento || 'Geral',
              custo_unitario: payload.preco_custo_na_perda,
              valor_total_item: valorTotalItem,
              observacao: `Trackeado via Avaria ${codigoCustom}`
            }
          ]);
        }
      } catch (errIntegracao) {
        console.error('Erro ao sincronizar com Consumo Loja:', errIntegracao);
      }
    }
  },

  async cadastrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    return this.registrarAvaria(payload);
  }
};