import { supabase } from '../../../lib/supabaseClient';
import type { ConferenciaMestreDTO, ConferenciaItemDTO, CriarConferenciaPayload, RegistrarItemConferenciaPayload } from '../types/conferencias.types';

export const conferenciasService = {
  // Lista ordens de conferência cega abertas ou finalizadas
  async listarConferencias(): Promise<ConferenciaMestreDTO[]> {
    const { data, error } = await supabase
      .from('conferencias_mestre')
      .select(`
        *,
        usuarios ( nome ),
        pedidos_mestre ( 
          codigo_customizado,
          fornecedores:fornecedor_id ( nome_fantasia )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      codigo_customizado: c.codigo_customizado,
      pedido_mestre_id: c.pedido_mestre_id,
      pedido_codigo_customizado: c.pedidos_mestre?.codigo_customizado || 'N/A',
      fornecedor_nome_fantasia: c.pedidos_mestre?.fornecedores?.nome_fantasia || 'Fornecedor',
      usuario_id: c.usuario_id,
      usuario_nome: c.usuarios?.nome || 'Conferente',
      status: c.status,
      data_conferencia: c.data_conferencia,
      hora_conferencia: c.hora_conferencia,
      created_at: c.created_at
    }));
  },

  // Cria uma nova Ordem de Conferência Cega atrelada a um Pedido de Compra
  async criarConferencia(payload: CriarConferenciaPayload): Promise<void> {
    const { count } = await supabase
      .from('conferencias_mestre')
      .select('*', { count: 'exact', head: true });

    const proximoNumero = (count || 0) + 1;
    const codigoFormatado = `#CC${String(proximoNumero).padStart(6, '0')}`;

    // Captura exata do relógio local (Brasil UTC-3) para evitar loops e desvios de fuso horário
    const agora = new Date();
    const dataLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const horaLocal = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

    const { error } = await supabase
      .from('conferencias_mestre')
      .insert([{
        codigo_customizado: codigoFormatado,
        pedido_mestre_id: payload.pedido_mestre_id,
        usuario_id: payload.usuario_id,
        status: 'Em Andamento',
        data_conferencia: dataLocal,
        hora_conferencia: horaLocal
      }]);

    if (error) throw error;
  },

  // Obtém todos os itens que o conferente já inseriu na ordem atual
  async obterItensConferidos(conferenciaId: string): Promise<ConferenciaItemDTO[]> {
    const { data, error } = await supabase
      .from('conferencia_itens')
      .select(`
        *,
        produtos (
          descricao,
          codigo_barras,
          unidades_medida:unidade_medida_id ( sigla )
        )
      `)
      .eq('conferencia_mestre_id', conferenciaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((i: any) => {
      const prod = i.produtos;
      const siglaUnidade = prod?.unidades_medida
        ? (Array.isArray(prod.unidades_medida) ? prod.unidades_medida[0]?.sigla : prod.unidades_medida.sigla)
        : 'UN';

      return {
        id: i.id,
        conferencia_mestre_id: i.conferencia_mestre_id,
        produto_id: i.produto_id,
        produto_descricao: prod?.descricao || 'Produto Desconhecido',
        produto_codigo_barras: prod?.codigo_barras || '',
        produto_unidade_medida: siglaUnidade || 'UN',
        quantidade_contada: Number(i.quantidade_contada || 0)
      };
    });
  },

  // Adiciona ou incrementa um produto na folha cega (Bipe Inteligente)
  async registrarOuIncrementarItem(payload: RegistrarItemConferenciaPayload): Promise<void> {
    // Verifica se este produto já foi bipado anteriormente nesta mesma conferência
    const { data: existente } = await supabase
      .from('conferencia_itens')
      .select('id, quantidade_contada')
      .eq('conferencia_mestre_id', payload.conferencia_mestre_id)
      .eq('produto_id', payload.produto_id)
      .limit(1);

    if (existente && existente.length > 0) {
      // Se já existe, soma a nova quantidade contada
      const novaQtd = Number(existente[0].quantidade_contada) + payload.quantidade_contada;
      await supabase
        .from('conferencia_itens')
        .update({ quantidade_contada: novaQtd })
        .eq('id', existente[0].id);
    } else {
      // Se for inédito, faz o insert limpo
      await supabase
        .from('conferencia_itens')
        .insert([{
          conferencia_mestre_id: payload.conferencia_mestre_id,
          produto_id: payload.produto_id,
          quantidade_contada: payload.quantidade_contada
        }]);
    }
  },

  // Finaliza de vez a Ordem de Conferência Cega mudando o status para Concluída
  async finalizarConferencia(conferenciaId: string): Promise<void> {
    const { error } = await supabase
      .from('conferencias_mestre')
      .update({ 
        status: 'Concluída',
        updated_at: new Date().toISOString()
      })
      .eq('id', conferenciaId);

    if (error) throw error;
  }
};

export default conferenciasService;