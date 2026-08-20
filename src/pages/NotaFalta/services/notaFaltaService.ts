// Arquivo: src/pages/NotaFalta/services/notaFaltaService.ts
import { supabase } from '../../../lib/supabaseClient';

export const notaFaltaService = {
  // 1. Buscar produtos por código, barras ou fragmentos da descrição
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

  // 2. Listar Motivos de Falta
  async listarMotivosFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_falta')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Listar Setores / Seções (incluindo opção GERAL)
  async listarSetores(): Promise<any[]> {
    const { data, error } = await supabase
      .from('categorias_setores')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    const lista = data || [];
    // Garante a existência do setor/seção GERAL
    const temGeral = lista.some((s: any) => s.nome?.toUpperCase() === 'GERAL');
    if (!temGeral) {
      return [{ id: 'geral-id', nome: 'Geral' }, ...lista];
    }
    return lista;
  },

  // 4. Listar Notas de Falta agrupadas ou individuais
  async listarNotasFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        *,
        produtos (
          id,
          codprod,
          descricao,
          codbarra,
          unidade,
          departamento,
          secao,
          categoria
        ),
        motivos_falta (
          id,
          descricao
        ),
        usuarios (
          id,
          nome
        )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 5. Salvar novos itens da Nota de Falta
  async salvarItensNotaFalta(payload: {
    usuario_id: string;
    setor_nome: string;
    itens: {
      produto_id: string;
      motivo_falta_id: string;
      quantidade_restante: number;
      unidade_restante: string;
    }[];
  }): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const codigoCustomizado = `NF-${Math.floor(100000 + Math.random() * 900000)}`;

    const registros = payload.itens.map((it) => ({
      codigo_customizado: codigoCustomizado,
      usuario_id: payload.usuario_id,
      produto_id: it.produto_id,
      setor_nome: payload.setor_nome,
      motivo_falta_id: it.motivo_falta_id,
      quantidade_restante: it.quantidade_restante,
      unidade_restante: it.unidade_restante,
      status_cotacao: 'Pendente',
      data_registro: dataAtual,
      hora_registro: horaAtual
    }));

    const { error } = await supabase.from('notas_falta').insert(registros);
    if (error) {
      console.error('Erro ao salvar notas de falta:', error);
      throw error;
    }
  }
};