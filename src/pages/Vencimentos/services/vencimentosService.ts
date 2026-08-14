// Arquivo: src/pages/Vencimentos/services/vencimentosService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface VencimentoItem {
  id: string;
  codigo_customizado?: string;
  produto_id: string;
  lote: string;
  data_validade: string;
  quantidade: number;
  origem: 'Vencimentos' | 'Inventário' | 'Conf. Cega';
  diasParaVencer: number;
  statusLeitura?: 'Visto' | 'Pendente';
  visualizadoPor?: string;
  visualizadoEm?: string;
  produtos?: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra?: string;
    unidade?: string;
  };
  usuarios?: {
    id: string;
    nome: string;
  };
}

export const vencimentosService = {
  // 1. Buscar produtos para autocomplete
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

  // 2. Salvar Novo Registro Manual de Vencimento
  async salvarControle(payload: {
    produto_id: string;
    lote?: string;
    data_validade: string;
    quantidade?: number;
    usuario_id?: string;
  }): Promise<void> {
    const codigoCustom = `VEN-${Math.floor(1000 + Math.random() * 9000)}`;

    const { error } = await supabase
      .from('vencimentos_controle')
      .insert([{
        codigo_customizado: codigoCustom,
        produto_id: payload.produto_id,
        lote: payload.lote || 'NÃO INFORMADO',
        data_validade: payload.data_validade,
        quantidade: payload.quantidade || 1,
        origem: 'Vencimentos',
        usuario_id: payload.usuario_id || null
      }]);

    if (error) throw error;
  },

  // 3. Marcar notificação como VISTO pelo usuário
  async marcarComoVisto(itemId: string, usuarioId: string): Promise<void> {
    if (!itemId || !usuarioId) return;

    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    await supabase
      .from('notificacoes_leituras')
      .upsert({
        item_id: String(itemId),
        usuario_id: usuarioId,
        data_visualizacao: dataAtual,
        hora_visualizacao: horaAtual,
        visto_em: agora.toISOString()
      }, { onConflict: 'item_id,usuario_id' });
  },

  // 4. Listar e Agregar Registros (Vencimentos + Inventário + Status de Leitura)
  async listarTodosVencimentos(usuarioId?: string): Promise<VencimentoItem[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 4.1. Busca leituras registradas
    const { data: leituras } = await supabase
      .from('notificacoes_leituras')
      .select('item_id, usuario_id, data_visualizacao, hora_visualizacao, usuarios ( nome )');

    const mapaLeituras: Record<string, any> = {};
    (leituras || []).forEach((l: any) => {
      // Guarda a leitura por item e usuário (ou geral)
      mapaLeituras[`${l.item_id}_${l.usuario_id}`] = l;
      mapaLeituras[l.item_id] = l;
    });

    // 4.2. Busca da tabela de controle manual
    const { data: dadosManuais } = await supabase
      .from('vencimentos_controle')
      .select(`
        id, codigo_customizado, produto_id, lote, data_validade, quantidade, origem,
        produtos ( id, codprod, descricao, codbarra, unidade ),
        usuarios ( id, nome )
      `);

    // 4.3. Busca do módulo de Inventário
    const { data: dadosInventario } = await supabase
      .from('inventario_itens')
      .select(`
        id, produto_id, lote, data_validade, quantidade_contabilizada,
        produtos ( id, codprod, descricao, codbarra, unidade )
      `)
      .not('data_validade', 'is', null);

    const listaUnificada: VencimentoItem[] = [];

    // Processa Manuais
    (dadosManuais || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dataVal = new Date(item.data_validade + 'T00:00:00');
      const difTempo = dataVal.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 60 * 60 * 24));

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: item.codigo_customizado,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade || 1),
        origem: item.origem || 'Vencimentos',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        produtos: item.produtos,
        usuarios: item.usuarios
      });
    });

    // Processa Inventário
    (dadosInventario || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dataVal = new Date(item.data_validade + 'T00:00:00');
      const difTempo = dataVal.getTime() - hoje.getTime();
      const dias = Math.ceil(difTempo / (1000 * 60 * 60 * 24));

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: `INV-${String(item.id).slice(0, 4).toUpperCase()}`,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade_contabilizada || 1),
        origem: 'Inventário',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        produtos: item.produtos
      });
    });

    return listaUnificada.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  }
};