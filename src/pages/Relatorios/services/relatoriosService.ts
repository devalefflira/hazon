import { supabase } from '../../../lib/supabaseClient';
import type * as Types from '../types/relatorios.types';

export const relatoriosService = {
  // 1. Controle de Validades
  async obterControleValidades(dataInicio: string, dataFim: string): Promise<Types.RelatorioValidadeDTO[]> {
    const { data, error } = await supabase
      .from('inventario_itens')
      .select(`
        lote, data_validade, quantidade_contabilizada,
        produtos ( codigo_barras, descricao ),
        locais_captura ( nome )
      `)
      .gte('data_validade', dataInicio)
      .lte('data_validade', dataFim)
      .order('data_validade', { ascending: true }) as any;

    if (error) throw error;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return (data || []).map((i: any) => {
      const validade = new Date(i.data_validade + 'T00:00:00');
      const diffTime = validade.getTime() - hoje.getTime();
      const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        codigo_barras: i.produtos?.codigo_barras || 'N/A',
        produto_descricao: i.produtos?.descricao || 'Produto não cadastrado',
        lote: i.lote || 'NÃO INFORMADO',
        data_validade: i.data_validade,
        quantidade_contabilizada: Number(i.quantidade_contabilizada || 0),
        local_captura_nome: i.locais_captura?.nome || 'Depósito Central',
        dias_para_vencer: diffDias
      };
    });
  },

  // 2. Itens Inventariados
  async obterItensInventariados(dataInicio: string, dataFim: string): Promise<Types.RelatorioInventariadoDTO[]> {
    const { data, error } = await supabase
      .from('inventario_itens')
      .select(`
        quantidade_contabilizada,
        inventarios ( codigo_customizado, data_registro, hora_registro, usuarios ( nome ) ),
        produtos ( codigo_barras, descricao ),
        locais_captura ( nome )
      `)
      .gte('inventarios.data_registro', dataInicio)
      .lte('inventarios.data_registro', dataFim) as any;

    if (error) throw error;

    // Filtro defensivo na memória para sanar junções cruzadas nulas
    const filtrados = (data || []).filter((i: any) => i.inventarios !== null);

    return filtrados.map((i: any) => ({
      codigo_inventario: i.inventarios?.codigo_customizado || 'N/A',
      codigo_barras: i.produtos?.codigo_barras || 'N/A',
      produto_descricao: i.produtos?.descricao || 'Produto não cadastrado',
      local_coleta_nome: i.locais_captura?.nome || 'Geral',
      quantidade_coleta: Number(i.quantidade_contabilizada || 0),
      data_coleta: i.inventarios?.data_registro || '',
      hora_coleta: i.inventarios?.hora_registro || '',
      conferente_nome: i.inventarios?.usuarios?.nome || 'Operador'
    }));
  },

  // 3. Notas de Falta
  async obterNotasFalta(dataInicio: string, dataFim: string): Promise<Types.RelatorioNotaFaltaDTO[]> {
    const { data, error } = await supabase
      .from('notas_falta')
      .select(`
        codigo_customizado, status_cotacao, data_registro,
        produtos ( codigo_barras, descricao ),
        categorias_setores ( nome ),
        categorias_subsetores ( nome ),
        motivos_falta ( descricao ),
        usuarios ( nome )
      `)
      .gte('data_registro', dataInicio)
      .lte('data_registro', dataFim)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((n: any) => ({
      codigo_customizado: n.codigo_customizado,
      codigo_barras: n.produtos?.codigo_barras || 'N/A',
      produto_descricao: n.produtos?.descricao || 'Desconhecido',
      setor_nome: n.categorias_setores?.nome || 'Geral',
      subsetor_nome: n.categorias_subsetores?.nome || 'Geral',
      motivo_descricao: n.motivos_falta?.descricao || 'Não informado',
      status_cotacao: n.status_cotacao,
      data_registro: n.data_registro,
      operador_nome: n.usuarios?.nome || 'Operador'
    }));
  },

  // 4. Cotações
  async obterCotacoes(dataInicio: string, dataFim: string): Promise<Types.RelatorioCotacaoDTO[]> {
    const { data, error } = await supabase
      .from('cotacoes_mestre')
      .select(`
        id, status, cenario_escolhido, justificativa_escolha, created_at,
        usuarios ( nome ),
        cotacoes_fornecedores_vinculados ( id )
      `)
      .gte('created_at', `${dataInicio}T00:00:00`)
      .lte('created_at', `${dataFim}T23:59:59`)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((c: any) => ({
      codigo_cotacao_id: c.id.substring(0, 8).toUpperCase(),
      comprador_nome: c.usuarios?.nome || 'Comprador',
      status: c.status,
      cenario_escolhido: c.cenario_escolhido || 'NÃO DEFINIDO',
      justificativa_escolha: c.justificativa_escolha || 'Sem observações anotadas.',
      quantidade_fornecedores: Array.isArray(c.cotacoes_fornecedores_vinculados) ? c.cotacoes_fornecedores_vinculados.length : 0,
      created_at: c.created_at
    }));
  },

  // 5. Avarias
  async obterAvarias(dataInicio: string, dataFim: string): Promise<Types.RelatorioAvariaDTO[]> {
    const { data, error } = await supabase
      .from('avarias')
      .select(`
        codigo_customizado, quantidade, destinacao, observacao, data_registro,
        produtos ( codigo_barras, descricao, unidades_medida:unidade_medida_id ( sigla ) ),
        motivos_avaria ( descricao ),
        usuarios ( nome )
      `)
      .gte('data_registro', dataInicio)
      .lte('data_registro', dataFim)
      .order('data_registro', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((a: any) => {
      const prod = a.produtos;
      const sigla = prod?.unidades_medida ? (Array.isArray(prod.unidades_medida) ? prod.unidades_medida[0]?.sigla : prod.unidades_medida.sigla) : 'UN';

      return {
        codigo_customizado: a.codigo_customizado,
        codigo_barras: prod?.codigo_barras || 'N/A',
        produto_descricao: prod?.descricao || 'Produto removido',
        quantidade: Number(a.quantidade || 0),
        produto_unidade_medida: sigla || 'UN',
        motivo_descricao: a.motivos_avaria?.descricao || 'Quebra operacional',
        destinacao: a.destinacao,
        observacao: a.observacao,
        operador_nome: a.usuarios?.nome || 'Operador',
        data_registro: a.data_registro
      };
    });
  },

  // 6. Pedidos Formalizados
  async obterPedidosFormalizados(dataInicio: string, dataFim: string): Promise<Types.RelatorioPedidoDTO[]> {
    const { data, error } = await supabase
      .from('pedidos_mestre')
      .select(`
        codigo_customizado, status, formalizado_em, created_at, cotacao_mestre_id,
        fornecedores:fornecedor_id ( nome_fantasia ),
        vendedores:vendedor_id ( nome ),
        usuarios ( nome ),
        pedido_itens ( preco_unitario, quantidade_solicitada )
      `)
      .gte('created_at', `${dataInicio}T00:00:00`)
      .lte('created_at', `${dataFim}T23:59:59`)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((p: any) => {
      // Calcula o valor total calculando o somatório dos itens do pedido
      const itens = p.pedido_itens || [];
      const total = itens.reduce((acc: number, item: any) => acc + (Number(item.preco_unitario || 0) * Number(item.quantidade_solicitada || 0)), 0);

      // Rastreia a origem do pedido: se não tiver cotacao_mestre_id, veio da Conf. Cega
      const origem: 'COTAÇÃO' | 'CONF. CEGA' = p.cotacao_mestre_id ? 'COTAÇÃO' : 'CONF. CEGA';

      return {
        codigo_customizado: p.codigo_customizado,
        fornecedor_nome: p.fornecedores?.nome_fantasia || 'FORNECEDOR DIRETO',
        vendedor_nome: p.vendedores?.nome || 'Direto',
        comprador_nome: p.usuarios?.nome || 'Módulo de Compras',
        status: p.status,
        valor_total: total,
        origem_pedido: origem,
        created_at: p.created_at
      };
    });
  },

  // 7. Manifestos Concluídos (Conf. Cega)
  async obterManifestosConcluidores(dataInicio: string, dataFim: string): Promise<Types.RelatorioManifestoDTO[]> {
    const { data, error } = await supabase
      .from('conferencias_mestre')
      .select(`
        id, codigo_customizado, numero_nota_fiscal, data_emissao_nota, data_conferencia, updated_at,
        usuarios ( nome ),
        fornecedores:fornecedor_id ( nome_fantasia ),
        conferencia_itens ( id )
      `)
      .eq('status', 'Concluída')
      .gte('data_conferencia', dataInicio)
      .lte('data_conferencia', dataFim)
      .order('data_conferencia', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((c: any) => {
      // Diferença entre Data do Recebimento e Data de Emissão da Nota
      let diffDias = 0;
      if (c.data_emissao_nota && c.data_conferencia) {
        const emissao = new Date(c.data_emissao_nota + 'T00:00:00');
        const recebimento = new Date(c.data_conferencia + 'T00:00:00');
        diffDias = Math.floor((recebimento.getTime() - emissao.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        codigo_customizado: c.codigo_customizado,
        numero_nota_fiscal: c.numero_nota_fiscal || 'N/A',
        data_emissao_nota: c.data_emissao_nota || '',
        fornecedor_nome: c.fornecedores?.nome_fantasia || 'FORNECEDOR MANUAL',
        prazo_entrega_dias: diffDias < 0 ? 0 : diffDias,
        quantidade_itens_diferentes: Array.isArray(c.conferencia_itens) ? c.conferencia_itens.length : 0,
        conferente_nome: c.usuarios?.nome || 'Conferente',
        data_fechamento: c.updated_at
      };
    });
  }
};