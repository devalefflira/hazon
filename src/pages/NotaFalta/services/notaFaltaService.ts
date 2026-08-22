// src/pages/NotaFalta/services/notaFaltaService.ts
import { supabase } from '../../../lib/supabaseClient';

export const notaFaltaService = {
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
    if (error) throw error;
    return data || [];
  },

  async listarNotasFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        *,
        produtos ( id, codprod, descricao, codbarra, unidade, departamento ),
        motivos_falta ( id, descricao ),
        usuarios ( id, nome )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async salvarItensNotaFalta(payload: {
    codigo_customizado?: string;
    usuario_id: string;
    area: string;
    local: string;
    status: 'Em Andamento' | 'Salva' | 'Finalizada';
    itens: {
      produto_id: string;
      tipo_motivo: 'Estoque Baixo' | 'Estoque Zero';
      quantidade_restante?: number;
      unidade_restante?: string;
    }[];
  }): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const codigo = payload.codigo_customizado || `NF-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: motivoBanco } = await supabase.from('motivos_falta').select('id').limit(1).single();
    const motivoFaltaIdFallback = motivoBanco?.id || '00000000-0000-0000-0000-000000000000';

    // Remove itens prévios se for edição de nota pausada
    if (payload.codigo_customizado) {
      await supabase.from('notas_falta').delete().eq('codigo_customizado', payload.codigo_customizado);
    }

    const registros = payload.itens.map((it) => ({
      codigo_customizado: codigo,
      usuario_id: payload.usuario_id,
      produto_id: it.produto_id,
      area: payload.area,
      local: payload.local,
      setor_nome: `${payload.area} - ${payload.local}`,
      motivo_falta_id: motivoFaltaIdFallback,
      quantidade_restante: it.tipo_motivo === 'Estoque Zero' ? 0 : it.quantidade_restante || 1,
      unidade_restante: it.tipo_motivo === 'Estoque Zero' ? 'UN' : it.unidade_restante || 'UN',
      status_cotacao: payload.status,
      data_registro: dataAtual,
      hora_registro: horaAtual
    }));

    const { error } = await supabase.from('notas_falta').insert(registros);
    if (error) throw error;
  },

  async finalizarCicloNota(codigoCustomizado: string): Promise<void> {
    const { error } = await supabase
      .from('notas_falta')
      .update({ status_cotacao: 'Finalizada' })
      .eq('codigo_customizado', codigoCustomizado);

    if (error) throw error;
  }
};