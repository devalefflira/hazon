// Arquivo: src/pages/Orcamentos/services/orcamentosService.ts
import { supabase } from '../../../lib/supabaseClient';

export const orcamentosService = {
  // 1. Buscar clientes cadastrados por termo
  async buscarClientes(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, cpf_cnpj, contato_whatsapp, cidade, estado, endereco, numero, ponto_referencia, pasta')
      .eq('ativo', true)
      .or(`nome.ilike.%${termo}%,cpf_cnpj.ilike.%${termo}%,contato_whatsapp.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Buscar produtos por termo
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const { data, error } = await supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, pvenda')
      .or(`codbarra.ilike.%${termo}%,codprod.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 3. Salvar ou Atualizar Orçamento Completo
  async salvarOrcamento(payload: {
    codigo_customizado?: string | null;
    usuario_id: string;
    cliente_id?: string | null;
    cliente_nome: string;
    cidade: string;
    estado: string;
    endereco?: string;
    bairro?: string;
    numero?: string;
    contato_whatsapp?: string;
    valor_total: number;
    status: 'Pendente' | 'Concluido';
    itens: Array<{
      produto_id: string;
      quantidade: number;
      embalagem: number;
      unidade_medida: string;
      preco_custo_unitario: number;
      preco_venda_tabela: number;
      percentual_desconto: number;
      preco_final_unitario: number;
      valor_total_item: number;
    }>;
  }): Promise<void> {
    const codigoCustom = payload.codigo_customizado || `ORC-${Math.floor(1000 + Math.random() * 9000)}`;
    const dataAtual = new Date().toISOString().split('T')[0];
    const horaAtual = new Date().toLocaleTimeString('pt-BR');

    let orcamentoMestreId = '';

    if (payload.codigo_customizado) {
      const { data: mestreExistente } = await supabase
        .from('orcamentos_mestre')
        .select('id')
        .eq('codigo_customizado', payload.codigo_customizado)
        .maybeSingle();

      if (mestreExistente) {
        orcamentoMestreId = mestreExistente.id;

        const { error: errorUpdate } = await supabase
          .from('orcamentos_mestre')
          .update({
            cliente_id: payload.cliente_id || null,
            cliente_nome: payload.cliente_nome,
            cidade: payload.cidade,
            estado: payload.estado,
            endereco: payload.endereco,
            bairro: payload.bairro,
            numero: payload.numero,
            contato_whatsapp: payload.contato_whatsapp,
            valor_total: payload.valor_total,
            status: payload.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orcamentoMestreId);

        if (errorUpdate) throw errorUpdate;

        await supabase
          .from('orcamento_itens')
          .delete()
          .eq('orcamento_mestre_id', orcamentoMestreId);
      }
    }

    if (!orcamentoMestreId) {
      const { data: novoMestre, error: errorMestre } = await supabase
        .from('orcamentos_mestre')
        .insert([{
          codigo_customizado: codigoCustom,
          usuario_id: payload.usuario_id,
          cliente_id: payload.cliente_id || null,
          cliente_nome: payload.cliente_nome,
          cidade: payload.cidade,
          estado: payload.estado,
          endereco: payload.endereco,
          bairro: payload.bairro,
          numero: payload.numero,
          contato_whatsapp: payload.contato_whatsapp,
          valor_total: payload.valor_total,
          status: payload.status,
          data_registro: dataAtual,
          hora_registro: horaAtual
        }])
        .select()
        .single();

      if (errorMestre) throw errorMestre;
      orcamentoMestreId = novoMestre.id;
    }

    const itensInsert = payload.itens.map((item) => ({
      orcamento_mestre_id: orcamentoMestreId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      embalagem: item.embalagem || 1,
      unidade_medida: item.unidade_medida,
      preco_custo_unitario: item.preco_custo_unitario,
      preco_venda_tabela: item.preco_venda_tabela,
      percentual_desconto: item.percentual_desconto,
      preco_final_unitario: item.preco_final_unitario,
      valor_total_item: item.valor_total_item
    }));

    const { error: errorItens } = await supabase
      .from('orcamento_itens')
      .insert(itensInsert);

    if (errorItens) throw errorItens;
  },

  // 4. Listar Orçamentos
  async listarOrcamentos(): Promise<any[]> {
    const { data, error } = await supabase
      .from('orcamentos_mestre')
      .select(`
        *,
        usuarios ( id, nome ),
        orcamento_itens (
          *,
          produtos ( id, codprod, descricao, codbarra, unidade )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar orçamentos:', error);
      return [];
    }
    return data || [];
  }
};