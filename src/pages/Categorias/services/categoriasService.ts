import { supabase } from '../../../lib/supabaseClient';

export const categoriasService = {
  // --- 1. SETORES E SUBSETORES ---
  async listarSetoresComSubsetores() {
    // 1. Buscamos de forma absolutamente separada
    const { data: setores, error: errSetores } = await supabase
      .from('categorias_setores')
      .select('id, nome')
      .order('nome');

    const { data: subsetores, error: errSub } = await supabase
      .from('categorias_subsetores')
      .select('id, setor_id, nome')
      .order('nome');

    if (errSetores) throw errSetores;
    if (errSub) throw errSub;

    // 2. Cruzamos em memória (Safe Merge)
    return setores?.map(setor => ({
      ...setor,
      categorias_subsetores: subsetores?.filter(sub => sub.setor_id === setor.id) || []
    })) || [];
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