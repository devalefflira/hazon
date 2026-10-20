// src/pages/Organograma/services/organogramaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { DadosColaborador, OrganogramaColaborador, OrganogramaSetor } from '../types/organograma.types';

export const organogramaService = {
  async listarSetores(): Promise<OrganogramaSetor[]> {
    const { data, error } = await supabase
      .from('organograma_setores')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return (data || []) as OrganogramaSetor[];
  },

  async salvarSetor(id: string | null, nome: string): Promise<void> {
    if (id) {
      const { error } = await supabase
        .from('organograma_setores')
        .update({ nome: nome.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('organograma_setores').insert([{ nome: nome.trim() }]);
    if (error) throw error;
  },

  // Os colaboradores do setor excluído ficam sem setor (ON DELETE SET NULL).
  async excluirSetor(id: string): Promise<void> {
    const { error } = await supabase.from('organograma_setores').delete().eq('id', id);
    if (error) throw error;
  },

  async listarColaboradores(): Promise<OrganogramaColaborador[]> {
    const { data, error } = await supabase
      .from('organograma_colaboradores')
      .select('id, nome, cargo, nivel, setor_id, superior_id')
      .order('nome', { ascending: true });

    if (error) throw error;
    return (data || []) as OrganogramaColaborador[];
  },

  async salvarColaborador(id: string | null, dados: DadosColaborador): Promise<void> {
    const payload = {
      nome: dados.nome.trim(),
      cargo: dados.cargo.trim(),
      nivel: dados.nivel,
      setor_id: dados.setor_id,
      superior_id: dados.superior_id,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabase.from('organograma_colaboradores').update(payload).eq('id', id);
      if (error) throw error;
      return;
    }

    const { error } = await supabase.from('organograma_colaboradores').insert([payload]);
    if (error) throw error;
  },

  // Passa os subordinados de um colaborador para outro superior (usado antes de excluir).
  async reatribuirSubordinados(superiorAtualId: string, novoSuperiorId: string | null): Promise<void> {
    const { error } = await supabase
      .from('organograma_colaboradores')
      .update({ superior_id: novoSuperiorId, updated_at: new Date().toISOString() })
      .eq('superior_id', superiorAtualId);

    if (error) throw error;
  },

  async excluirColaborador(id: string): Promise<void> {
    const { error } = await supabase.from('organograma_colaboradores').delete().eq('id', id);
    if (error) throw error;
  },
};
