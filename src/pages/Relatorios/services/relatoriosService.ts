// src/pages/Relatorios/services/relatoriosService.ts
import { supabase } from "../../../lib/supabaseClient";

export const relatoriosService = {
  async buscarInventarios(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("inventario_itens")
      .select("*, inventarios!inner(*), produtos(*), locais_captura(*), status_validade(*)")
      .gte("inventarios.data_registro", inicio)
      .lte("inventarios.data_registro", fim);
    if (error) throw error;
    return data || [];
  },

  async buscarNotasFalta(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("notas_falta")
      .select("*, produtos(*), motivos_falta(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim)
      .order("data_registro", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async buscarCotacoes(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("cotacoes_mestre")
      .select("*, comprador:usuarios(*)")
      .gte("created_at", `${inicio}T00:00:00Z`)
      .lte("created_at", `${fim}T23:59:59Z`);
    if (error) throw error;
    return data || [];
  },

  async buscarOrcamentos(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("orcamentos_mestre")
      .select("*, cliente:clientes(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim);
    if (error) throw error;
    return data || [];
  },

  async buscarAvarias(
    inicio: string,
    fim: string,
    filtros?: { departamento?: string; secao?: string; categoria?: string }
  ) {
    const { data, error } = await supabase
      .from("avarias")
      .select("*, produtos(*), motivos_avaria(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim)
      .order("data_registro", { ascending: false });

    if (error) throw error;

    let resultado = data || [];

    if (filtros?.departamento && filtros.departamento !== "TODOS") {
      resultado = resultado.filter(
        (item: any) => item.produtos?.departamento === filtros.departamento
      );
    }

    if (filtros?.secao && filtros.secao !== "TODOS") {
      resultado = resultado.filter(
        (item: any) => item.produtos?.secao === filtros.secao
      );
    }

    if (filtros?.categoria && filtros.categoria !== "TODOS") {
      resultado = resultado.filter(
        (item: any) => item.produtos?.categoria === filtros.categoria
      );
    }

    return resultado;
  },

  async buscarOpcoesFiltrosProdutos() {
    const { data, error } = await supabase
      .from("produtos")
      .select("departamento, secao, categoria");

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

  async buscarTrocas(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("trocas")
      .select("*, avarias(*, produtos(*)), fornecedores(*), recebido_por_usuario:usuarios(*)")
      .gte("created_at", `${inicio}T00:00:00Z`)
      .lte("created_at", `${fim}T23:59:59Z`);
    if (error) throw error;
    return data || [];
  },

  async buscarPedidos(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("pedidos_mestre")
      .select("*, fornecedores(*), vendedores(*), comprador:usuarios(*)")
      .gte("created_at", `${inicio}T00:00:00Z`)
      .lte("created_at", `${fim}T23:59:59Z`);
    if (error) throw error;
    return data || [];
  },

  async buscarTarefas(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("tarefas_mestre")
      .select("*, responsavel:usuarios!tarefas_mestre_resp_fkey(*)")
      .gte("created_at", `${inicio}T00:00:00Z`)
      .lte("created_at", `${fim}T23:59:59Z`);
    if (error) throw error;
    return data || [];
  },

  async buscarConferencias(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("conferencias_mestre")
      .select("*, fornecedores(*), usuario:usuarios(*)")
      .gte("data_conferencia", inicio)
      .lte("data_conferencia", fim);
    if (error) throw error;
    return data || [];
  },

  async buscarTemperaturas(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("temperatura_afericoes")
      .select("*, temperatura_equipamentos(*), usuario:usuarios(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim);
    if (error) throw error;
    return data || [];
  },

  async buscarOfertas(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("ofertas_mestre")
      .select("*, usuario:usuarios(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim);
    if (error) throw error;
    return data || [];
  },

  async buscarVencimentos(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("vencimentos_controle")
      .select("*, produtos(*), usuario:usuarios(*)")
      .gte("data_validade", inicio)
      .lte("data_validade", fim)
      .order("data_validade", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async buscarDadosConsumoLoja(dataInicio?: string, dataFim?: string): Promise<any[]> {
    // 1. Lançamentos Diretos em Consumo Loja
    let queryConsumo = supabase
      .from('consumo_loja_itens')
      .select(`
        id,
        local,
        departamento,
        quantidade,
        unidade_medida,
        custo_unitario,
        valor_total_item,
        observacao,
        produtos (
          codprod,
          descricao
        ),
        consumo_loja_mestre!inner (
          data_registro,
          hora_registro,
          usuarios (
            nome
          )
        )
      `);

    if (dataInicio) queryConsumo = queryConsumo.gte('consumo_loja_mestre.data_registro', dataInicio);
    if (dataFim) queryConsumo = queryConsumo.lte('consumo_loja_mestre.data_registro', dataFim);

    // 2. Lançamentos de Avarias com destino Consumo Interno
    let queryAvarias = supabase
      .from('avarias')
      .select(`
        id,
        codigo_customizado,
        quantidade,
        preco_custo_na_perda,
        destinacao,
        observacao,
        data_registro,
        hora_registro,
        produtos (
          codprod,
          descricao,
          unidade,
          departamento
        ),
        usuarios (
          nome
        )
      `)
      .ilike('destinacao', '%consumo%');

    if (dataInicio) queryAvarias = queryAvarias.gte('data_registro', dataInicio);
    if (dataFim) queryAvarias = queryAvarias.lte('data_registro', dataFim);

    const [resConsumo, resAvarias] = await Promise.all([queryConsumo, queryAvarias]);

    if (resConsumo.error) throw resConsumo.error;
    if (resAvarias.error) throw resAvarias.error;

    const listaConsumo = (resConsumo.data || []).map((item: any) => ({
      codprod: item.produtos?.codprod || '-',
      descricao: item.produtos?.descricao || 'PRODUTO',
      unidade_medida: item.unidade_medida || 'UN',
      local: item.local || 'Geral',
      departamento: item.departamento || '-',
      quantidade: Number(item.quantidade || 0),
      custo_unitario: Number(item.custo_unitario || 0),
      valor_total_item: Number(item.valor_total_item || 0),
      data_registro: item.consumo_loja_mestre?.data_registro,
      hora_registro: item.consumo_loja_mestre?.hora_registro,
      usuario_nome: item.consumo_loja_mestre?.usuarios?.nome || 'Sistema',
      observacao: item.observacao
    }));

    const listaAvarias = (resAvarias.data || []).map((av: any) => {
      const qtd = Number(av.quantidade || 0);
      const custo = Number(av.preco_custo_na_perda || 0);
      return {
        codprod: av.produtos?.codprod || '-',
        descricao: av.produtos?.descricao || 'PRODUTO',
        unidade_medida: av.produtos?.unidade || 'UN',
        local: 'Consumo Interno (Avaria)',
        departamento: av.produtos?.departamento || '-',
        quantidade: qtd,
        custo_unitario: custo,
        valor_total_item: qtd * custo,
        data_registro: av.data_registro,
        hora_registro: av.hora_registro,
        usuario_nome: av.usuarios?.nome || 'Sistema',
        observacao: av.observacao
      };
    });

    const unificados = [...listaConsumo, ...listaAvarias];
    unificados.sort((a, b) => (b.data_registro || '').localeCompare(a.data_registro || ''));
    return unificados;
  }
};