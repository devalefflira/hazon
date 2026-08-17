// Arquivo: src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRecord, FiltrosAvariaPayload, NovaAvariaPayload } from '../types/avarias.types';

export const avariasService = {
  // 1. Listar registros de Avarias com Departamento, Seção e Categoria dos produtos
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

  // 4. Buscar produtos por autocomplete
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const pattern = termo.trim().replace(/\s+/g, '%').replace(/%+/g, '%');

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, departamento, secao, categoria')
      .or(`codbarra.ilike.%${pattern}%,codprod.ilike.%${pattern}%,descricao.ilike.%${pattern}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 5. Registrar Nova Avaria (Gera Data e Hora no fuso horário local)
  async registrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    const codigoCustom = `AV${Math.floor(1000 + Math.random() * 9000)}`;
    
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD
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

    const { error } = await supabase
      .from('avarias')
      .insert([objetoInsert]);

    if (error) {
      console.error('Erro detalhado ao registrar avaria:', error);
      throw error;
    }
  },

  // Alias para manter compatibilidade
  async cadastrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    return this.registrarAvaria(payload);
  }
};