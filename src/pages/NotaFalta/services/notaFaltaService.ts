// Arquivo: src/pages/NotaFalta/services/notaFaltaService.ts
import { supabase } from '../../../lib/supabaseClient';

export const notaFaltaService = {
  // 1. Buscar motivos de falta
  async listarMotivosFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_falta')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Buscar produtos por termo (EAN, CODPROD ou Descrição)
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 3. Salvar ou Atualizar Lote (Persiste no banco tanto em Pendente/Pausada quanto em Concluida)
  async salvarLoteNotasFalta(payload: {
    codigo_customizado?: string | null;
    responsavel_nome: string;
    secao_nome: string;
    usuario_id: string;
    status: 'Pendente' | 'Concluida';
    itens: Array<{
      produto_id: string;
      motivo_falta_id: string;
      quantidade_restante: number;
      unidade_restante: string;
    }>;
  }): Promise<void> {
    const codigoCustom = payload.codigo_customizado || `F-${Math.floor(1000 + Math.random() * 9000)}`;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    // Se estiver sobrescrevendo uma nota existente no banco, remove os itens antigos do lote antes de reinserir
    if (payload.codigo_customizado) {
      const { error: deleteError } = await supabase
        .from('notas_falta')
        .delete()
        .eq('codigo_customizado', payload.codigo_customizado);

      if (deleteError) {
        console.error('Erro ao limpar lote existente:', deleteError);
      }
    }

    const registrosInsert = payload.itens.map((item) => ({
      codigo_customizado: codigoCustom,
      usuario_id: payload.usuario_id,
      produto_id: item.produto_id,
      motivo_falta_id: item.motivo_falta_id,
      quantidade_restante: item.quantidade_restante,
      unidade_restante: item.unidade_restante,
      status_cotacao: payload.status,
      setor_nome: payload.secao_nome,
      data_registro: dataAtual,
      hora_registro: horaAtual
    }));

    const { error } = await supabase
      .from('notas_falta')
      .insert(registrosInsert);

    if (error) {
      console.error('Erro ao registrar nota de falta:', error);
      throw error;
    }
  },

  // 4. Listar todas as Notas do Banco
  async listarNotasFalta(): Promise<any[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        *,
        produtos ( id, codprod, descricao, codbarra, unidade ),
        motivos_falta ( id, descricao ),
        usuarios ( id, nome )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};