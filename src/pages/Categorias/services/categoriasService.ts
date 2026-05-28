import { supabase } from '../../../lib/supabaseClient';

export const categoriasService = {
  // --- 1. SETORES E SUBSETORES ---
  async listarSetoresComSubsetores() {
    // Traz os setores ordenados e força a ordenação alfabética também nos subsetores
    const { data, error } = await supabase
      .from('categorias_setores')
      .select(`
        id,
        nome,
        categorias_subsetores (
          id,
          nome
        )
      `)
      .order('nome', { ascending: true })
      .order('nome', { foreignTable: 'categorias_subsetores', ascending: true });

    if (error) throw error;
    return data;
  },

  async salvarSetor(nome: string) {
    const { data, error } = await supabase
      .from('categorias_setores')
      .insert([{ nome }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async salvarSubsetor(setorId: string, nome: string) {
    const { data, error } = await supabase
      .from('categorias_subsetores')
      .insert([{ setor_id: setorId, nome }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- 2. UNIDADES DE MEDIDA ---
  async listarUnidadesMedida() {
    const { data, error } = await supabase
      .from('unidades_medida')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data;
  },

  async salvarUnidadeMedida(sigla: string, descricao: string) {
    const { data, error } = await supabase
      .from('unidades_medida')
      .insert([{ sigla: sigla.toUpperCase(), descricao }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- 3. LOCAIS DE CAPTURA ---
  async listarLocaisCaptura() {
    const { data, error } = await supabase
      .from('locais_captura')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  async salvarLocalCaptura(nome: string) {
    const { data, error } = await supabase
      .from('locais_captura')
      .insert([{ nome }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- 4. MOTIVOS DE FALTA, AVARIA E STATUS DE VALIDADE ---
  async listarMotivosFalta() {
    const { data, error } = await supabase.from('motivos_falta').select('*').order('descricao', { ascending: true });
    if (error) throw error;
    return data;
  },

  async salvarMotivoFalta(descricao: string) {
    const { data, error } = await supabase.from('motivos_falta').insert([{ descricao }]).select().single();
    if (error) throw error;
    return data;
  },

  async listarMotivosAvaria() {
    const { data, error } = await supabase.from('motivos_avaria').select('*').order('descricao', { ascending: true });
    if (error) throw error;
    return data;
  },

  async salvarMotivoAvaria(descricao: string) {
    const { data, error } = await supabase.from('motivos_avaria').insert([{ descricao }]).select().single();
    if (error) throw error;
    return data;
  },

  async listarStatusValidade() {
    const { data, error } = await supabase.from('status_validade').select('*').order('nome', { ascending: true });
    if (error) throw error;
    return data;
  }
};