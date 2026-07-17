// Arquivo: src/pages/ConfCega/services/conferenciasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ConferenciaMestreDTO, ConferenciaItemDTO, CriarConferenciaPayload, RegistrarItemConferenciaPayload } from '../types/conferencias.types';

export const conferenciasService = {
  async listarConferencias(): Promise<ConferenciaMestreDTO[]> {
    const { data, error } = await supabase
      .from('conferencias_mestre')
      .select(`
        *,
        usuarios ( nome ),
        fornecedores:fornecedor_id ( nome_fantasia ),
        pedidos_mestre ( 
          codigo_customizado,
          fornecedores:fornecedor_id ( nome_fantasia )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: any) => {
      const dePedido = !!c.pedido_mestre_id;
      const labelPedido = dePedido ? c.pedidos_mestre?.codigo_customizado || 'N/A' : 'RECEBIMENTO DIRETO (NF)';
      const labelFornecedor = dePedido 
        ? (Array.isArray(c.pedidos_mestre?.fornecedores) ? c.pedidos_mestre?.fornecedores[0]?.nome_fantasia : c.pedidos_mestre?.fornecedores?.nome_fantasia)
        : (Array.isArray(c.fornecedores) ? c.fornecedores[0]?.nome_fantasia : c.fornecedores?.nome_fantasia);

      return {
        id: c.id,
        codigo_customizado: c.codigo_customizado,
        pedido_mestre_id: c.pedido_mestre_id,
        pedido_codigo_customizado: labelPedido,
        fornecedor_id: c.fornecedor_id,
        fornecedor_nome_fantasia: labelFornecedor || 'FORNECEDOR AVULSO',
        usuario_id: c.usuario_id,
        usuario_nome: c.usuarios?.nome || 'Conferente',
        status: c.status,
        numero_nota_fiscal: c.numero_nota_fiscal,
        data_emissao_nota: c.data_emissao_nota,
        data_conferencia: c.data_conferencia,
        hora_conferencia: c.hora_conferencia,
        created_at: c.created_at
      };
    });
  },

  async criarConferencia(payload: CriarConferenciaPayload): Promise<any> {
    const { count } = await supabase
      .from('conferencias_mestre')
      .select('*', { count: 'exact', head: true });

    const proximoNumero = (count || 0) + 1;
    const codigoFormatado = `#CC${String(proximoNumero).padStart(6, '0')}`;

    const agora = new Date();
    const dataLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
    const horaLocal = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}:${String(agora.getSeconds()).padStart(2, '0')}`;

    const idPedidoLimpo = (payload.pedido_mestre_id && payload.pedido_mestre_id !== 'AVULSO') ? payload.pedido_mestre_id : null;
    const idFornecedorLimpo = payload.fornecedor_id ? payload.fornecedor_id : null;

    const { data, error } = await supabase
      .from('conferencias_mestre')
      .insert([{
        codigo_customizado: codigoFormatado,
        pedido_mestre_id: idPedidoLimpo, 
        fornecedor_id: idFornecedorLimpo,
        numero_nota_fiscal: payload.numero_nota_fiscal.trim().toUpperCase(),
        data_emissao_nota: payload.data_emissao_nota,
        usuario_id: payload.usuario_id,
        status: 'Em Andamento',
        data_conferencia: dataLocal,
        hora_conferencia: horaLocal
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

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
      let siglaUnidade = 'UN';
      if (prod?.unidades_medida) {
        siglaUnidade = Array.isArray(prod.unidades_medida)
          ? prod.unidades_medida[0]?.sigla || 'UN'
          : prod.unidades_medida.sigla || 'UN';
      }

      return {
        id: i.id,
        conferencia_mestre_id: i.conferencia_mestre_id,
        produto_id: i.produto_id,
        produto_descricao: prod?.descricao || 'Produto Desconhecido',
        produto_codigo_barras: prod?.codigo_barras || '',
        produto_unidade_medida: siglaUnidade,
        quantidade_contada: Number(i.quantidade_contada || 0)
      };
    });
  },

  async registrarOuIncrementarItem(payload: RegistrarItemConferenciaPayload): Promise<void> {
    const { data: existente } = await supabase
      .from('conferencia_itens')
      .select('id, quantidade_contada')
      .eq('conferencia_mestre_id', payload.conferencia_mestre_id)
      .eq('produto_id', payload.produto_id)
      .limit(1);

    if (existente && existente.length > 0) {
      const novaQtd = Number(existente[0].quantidade_contada) + payload.quantidade_contada;
      await supabase
        .from('conferencia_itens')
        .update({ quantidade_contada: novaQtd })
        .eq('id', existente[0].id);
    } else {
      await supabase
        .from('conferencia_itens')
        .insert([{
          conferencia_mestre_id: payload.conferencia_mestre_id,
          produto_id: payload.produto_id,
          quantidade_contada: payload.quantidade_contada
        }]);
    }
  },

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