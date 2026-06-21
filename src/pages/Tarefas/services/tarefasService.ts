// Arquivo: src/pages/Tarefas/services/tarefasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { TarefaMestreDTO, CriarTarefaPayload, ChecklistItemDTO } from '../types/tarefas.types';

export const tarefasService = {
  async listarTarefas(filtroPeriodo?: string): Promise<TarefaMestreDTO[]> {
    let query = supabase
      .from('tarefas_mestre')
      .select(`
        *,
        criador:criador_id ( nome ),
        responsavel:responsavel_id ( nome ),
        fornecedores:fornecedor_id ( nome_fantasia ),
        conferentes:conferente_id ( nome ),
        tarefa_tempos ( id, pausado_em )
      `);

    // Filtros de período nativos resgatados
    if (filtroPeriodo && filtroPeriodo !== 'TODAS') {
      const hoje = new Date().toISOString().split('T')[0];
      if (filtroPeriodo === 'HOJE') {
        query = query.eq('prazo_entrega_planejado', hoje);
      }
    }

    const { data, error } = await query
      .order('prioridade_peso', { ascending: false })
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((t: any) => {
      // Verifica se o cronômetro está rodando (possui tempo aberto sem data de pausa)
      const tempos = t.tarefa_tempos || [];
      const cronometroAtivo = tempos.some((pt: any) => pt.pausado_em === null);

      return {
        id: t.id,
        criador_id: t.criador_id,
        criador_nome: t.criador?.nome || 'Sistema',
        responsavel_id: t.responsavel_id,
        responsavel_nome: t.responsavel?.nome || 'Não atribuído',
        descricao: t.descricao,
        status: t.status,
        tipo_tarefa: t.tipo_tarefa,
        prioridade: t.prioridade,
        prioridade_peso: Number(t.prioridade_peso || 2),
        data_inicio_planejada: t.data_inicio_planejada,
        prazo_entrega_planejado: t.prazo_entrega_planejado,
        tempo_gasto_minutos: Number(t.tempo_gasto_minutos || 0),
        created_at: t.created_at,
        cronometro_ativo: cronometroAtivo,
        numero_nota_fiscal: t.numero_nota_fiscal,
        fornecedor_id: t.fornecedor_id,
        fornecedor_nome: t.fornecedores?.nome_fantasia || null,
        conferente_id: t.conferente_id,
        conferente_nome: t.conferentes?.nome || null,
        identificacao_doca: t.identificacao_doca,
        placa_veiculo: t.placa_veiculo,
        nome_motorista: t.nome_motorista
      };
    });
  },

  async criarTarefa(payload: CriarTarefaPayload): Promise<void> {
    const pesos: Record<string, number> = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    const peso = pesos[payload.prioridade] || 2;

    const { error } = await supabase
      .from('tarefas_mestre')
      .insert([{
        criador_id: payload.criador_id,
        responsavel_id: payload.responsavel_id,
        descricao: payload.descricao.trim().toUpperCase(),
        tipo_tarefa: payload.tipo_tarefa,
        prioridade: payload.prioridade,
        prioridade_peso: peso,
        prazo_entrega_planejado: payload.prazo_entrega_planejado,
        status: 'Pendentes',
        numero_nota_fiscal: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.numero_nota_fiscal || null : null,
        fornecedor_id: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.fornecedor_id || null : null,
        conferente_id: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.conferente_id || null : null,
        identificacao_doca: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.identificacao_doca || null : null,
        placa_veiculo: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.placa_veiculo || null : null,
        nome_motorista: payload.tipo_tarefa === 'RECEBIMENTO DE MERCADORIAS' ? payload.nome_motorista || null : null
      }]);

    if (error) throw error;
  },

  // MÉTODOS DE CICLO DE VIDA DO CRONÔMETRO RESGATADOS
  async obterChecklist(tarefaId: string): Promise<ChecklistItemDTO[]> {
    const { data, error } = await supabase
      .from('tarefa_checklists')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async alternarItemChecklist(id: string, concluido: boolean): Promise<void> {
    const { error } = await supabase
      .from('tarefa_checklists')
      .update({ concluido })
      .eq('id', id);
    if (error) throw error;
  },

  async iniciarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefas_mestre').update({ status: 'Em Curso' }).eq('id', tarefaId);
    await supabase.from('tarefa_tempos').insert([{ tarefa_id: tarefaId }]);
  },

  async pausarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefas_mestre').update({ status: 'Pausadas' }).eq('id', tarefaId);
    const { data } = await supabase.from('tarefa_tempos').select('id').eq('tarefa_id', tarefaId).is('pausado_em', null).limit(1);
    if (data && data.length > 0) {
      await supabase.from('tarefa_tempos').update({ pausado_em: new Date().toISOString() }).eq('id', data[0].id);
    }
  },

  async retomarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefas_mestre').update({ status: 'Em Curso' }).eq('id', tarefaId);
    await supabase.from('tarefa_tempos').insert([{ tarefa_id: tarefaId }]);
  },

  async finalizarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefas_mestre').update({ status: 'Concluídas' }).eq('id', tarefaId);
    const { data } = await supabase.from('tarefa_tempos').select('id').eq('tarefa_id', tarefaId).is('pausado_em', null).limit(1);
    if (data && data.length > 0) {
      await supabase.from('tarefa_tempos').update({ pausado_em: new Date().toISOString() }).eq('id', data[0].id);
    }
  }
};

export default tarefasService;