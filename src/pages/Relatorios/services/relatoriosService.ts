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

  async buscarAvarias(inicio: string, fim: string) {
    const { data, error } = await supabase
      .from("avarias")
      .select("*, produtos(*), motivos_avaria(*)")
      .gte("data_registro", inicio)
      .lte("data_registro", fim);
    if (error) throw error;
    return data || [];
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
  
};
