// Arquivo: src/pages/NotaFalta/services/notaFaltaService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface NotaFaltaRegistro {
  id: string;
  codigo_customizado: string;
  data_registro: string;
  hora_registro: string;
  status_cotacao: string;
  quantidade_restante?: number;
  unidade_restante?: string;
  produtos?: {
    codprod?: string;
    descricao?: string;
    codbarra?: string;
    unidade?: string;
    departamento?: string;
    secao?: string;
    categoria?: string;
  };
  motivos_falta?: {
    id?: string;
    descricao?: string;
  };
}

export const notaFaltaService = {
  async listarNotasFalta(statusFiltro = 'TODOS'): Promise<NotaFaltaRegistro[]> {
    let query = supabase
      .from('notas_falta')
      .select(`
        id,
        codigo_customizado,
        data_registro,
        hora_registro,
        status_cotacao,
        quantidade_restante,
        unidade_restante,
        produtos (
          codprod,
          descricao,
          codbarra,
          unidade,
          departamento,
          secao,
          categoria
        ),
        motivos_falta ( id, descricao )
      `);

    if (statusFiltro !== 'TODOS') {
      query = query.eq('status_cotacao', statusFiltro);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro no Supabase ao listar notas de falta:', error);
      throw error;
    }

    return (data || []) as unknown as NotaFaltaRegistro[];
  },

  async buscarProdutoPorTermo(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async listarMotivosFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_falta')
      .select('id, descricao')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async cadastrarNotaFalta(payload: {
    usuario_id: string;
    produto_id: string;
    motivo_falta_id: string;
    quantidade_restante?: number;
    unidade_restante?: string;
  }): Promise<void> {
    const codigoCustom = `NF${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase
      .from('notas_falta')
      .insert([{
        codigo_customizado: codigoCustom,
        usuario_id: payload.usuario_id,
        produto_id: payload.produto_id,
        setor_id: null,
        subsetor_id: null,
        motivo_falta_id: payload.motivo_falta_id,
        quantidade_restante: payload.quantidade_restante || 0,
        unidade_restante: payload.unidade_restante || 'UN',
        status_cotacao: 'Pendente'
      }]);

    if (error) throw error;
  }
};