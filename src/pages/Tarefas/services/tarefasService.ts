import { supabase } from '../../../lib/supabaseClient';
import type { TarefaMestreDTO, TarefaChecklistItemDTO, CriarTarefaPayload } from '../types/tarefas.types';

export const tarefasService = {
  // Lista tarefas aplicando filtros de período e ordenação estrita (Peso da Prioridade descendo + Idade da tarefa subindo)
  async listarTarefas(filtroPeriodo: 'Hoje' | 'Esta Semana' | 'Este Mês'): Promise<TarefaMestreDTO[]> {
    let query = supabase
      .from('tarefas_mestre')
      .select(`
        *,
        criador:criador_id ( nome ),
        responsavel:responsavel_id ( nome ),
        tarefa_tempos ( id, pausado_em )
      `);

    const hojeStr = new Date().toISOString().split('T')[0];

    if (filtroPeriodo === 'Hoje') {
      query = query.eq('data_inicio_planejada', hojeStr);
    } else if (filtroPeriodo === 'Esta Semana') {
      // Filtro para a semana corrente (PostgreSQL ISO Week)
      const d = new Date();
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const segunda = new Date(d.setDate(diffToMonday)).toISOString().split('T')[0];
      const domingo = new Date(d.setDate(diffToMonday + 6)).toISOString().split('T')[0];
      
      query = query.gte('data_inicio_planejada', segunda).lte('data_inicio_planejada', domingo);
    } else if (filtroPeriodo === 'Este Mês') {
      const d = new Date();
      const primeiroDia = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      
      query = query.gte('data_inicio_planejada', primeiroDia).lte('data_inicio_planejada', ultimoDia);
    }

    // ORDENAÇÃO EXIGIDA: Maior prioridade para menor prioridade, e da mais velha para a mais nova
    query = query
      .order('prioridade_peso', { ascending: false })
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t: any) => {
      // Verifica se o cronômetro está rodando agora (existe algum bloco sem data de pausa)
      const cronometroAtivo = (t.tarefa_tempos || []).some((time: any) => !time.pausado_em);

      return {
        id: t.id,
        criador_id: t.criador_id,
        criador_nome: t.criador?.nome || 'Sistema',
        responsavel_id: t.responsavel_id,
        responsavel_nome: t.responsavel?.nome || 'Operador',
        descricao: t.descricao,
        status: t.status,
        tipo_tarefa: t.tipo_tarefa,
        prioridade: t.prioridade,
        prioridade_peso: t.prioridade_peso,
        data_inicio_planejada: t.data_inicio_planejada,
        prazo_entrega_planejado: t.prazo_entrega_planejado,
        tempo_gasto_minutos: t.tempo_gasto_minutos || 0,
        created_at: t.created_at,
        cronometro_ativo: cronometroAtivo
      };
    });
  },

  // Insere uma nova tarefa mestre e descarrega os itens opcionais do checklist
  async criarTarefa(payload: CriarTarefaPayload): Promise<void> {
    const pesos = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
    const peso = pesos[payload.prioridade] || 2;

    const { data: novaTarefa, error: errMestre } = await supabase
      .from('tarefas_mestre')
      .insert([{
        criador_id: payload.criador_id,
        responsavel_id: payload.responsavel_id,
        descricao: payload.descricao,
        tipo_tarefa: payload.tipo_tarefa,
        prioridade: payload.prioridade,
        prioridade_peso: peso,
        data_inicio_planejada: payload.data_inicio_planejada,
        prazo_entrega_planejado: payload.prazo_entrega_planejado,
        status: 'Pendentes'
      }])
      .select('id')
      .single();

    if (errMestre) throw errMestre;

    if (payload.checklists && payload.checklists.length > 0 && novaTarefa?.id) {
      const cargaChecklist = payload.checklists.map(desc => ({
        tarefa_id: novaTarefa.id,
        descricao: desc,
        concluido: false
      }));
      await supabase.from('tarefa_checklists').insert(cargaChecklist);
    }
  },

  // Busca sub-itens de checklist vinculados
  async obterChecklist(tarefaId: string): Promise<TarefaChecklistItemDTO[]> {
    const { data, error } = await supabase
      .from('tarefa_checklists')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Atualiza o estado de um item do checklist (check/uncheck)
  async alternarItemChecklist(itemId: string, concluido: boolean): Promise<void> {
    await supabase.from('tarefa_checklists').update({ concluido }).eq('id', itemId);
  },

  // 🚀 BOTÃO INICIAR TAREFA: Muda status para 'Em Andamento' e abre bloco de tempo
  async iniciarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefas_mestre').update({ status: 'Em Andamento' }).eq('id', tarefaId);
    await supabase.from('tarefa_tempos').insert([{ tarefa_id: tarefaId }]);
  },

  // ⏸️ BOTÃO PAUSAR TAREFA: Localiza o bloco aberto e crava o carimbo de pausa
  async pausarTarefa(tarefaId: string): Promise<void> {
    const { data } = await supabase
      .from('tarefa_tempos')
      .select('id')
      .eq('tarefa_id', tarefaId)
      .is('pausado_em', null)
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from('tarefa_tempos')
        .update({ pausado_em: new Date().toISOString() })
        .eq('id', data[0].id);
    }
  },

  // ▶️ RETOMAR TAREFA (PLAY APÓS PAUSA): Abre um novo bloco de tempo limpo
  async retomarTarefa(tarefaId: string): Promise<void> {
    await supabase.from('tarefa_tempos').insert([{ tarefa_id: tarefaId }]);
  },

  // 🏁 BOTÃO FINALIZAR TAREFA: Fecha blocos abertos, calcula o tempo líquido total e encerra
  async finalizarTarefa(tarefaId: string): Promise<void> {
    // 1. Garante o fechamento de qualquer cronômetro aberto antes de calcular
    await this.pausarTarefa(tarefaId);

    // 2. Coleta todos os blocos históricos de tempo desta tarefa
    const { data: blocos } = await supabase
      .from('tarefa_tempos')
      .select('disparado_em, pausado_em')
      .eq('tarefa_id', tarefaId);

    let totalMilissegundos = 0;

    if (blocos && blocos.length > 0) {
      blocos.forEach((b: any) => {
        if (b.disparado_em && b.pausado_em) {
          const tInicio = new Date(b.disparado_em).getTime();
          const tFim = new Date(b.pausado_em).getTime();
          totalMilissegundos += (tFim - tInicio);
        }
      });
    }

    const minutosLiquidos = Math.round(totalMilissegundos / 1000 / 60) || 1; // Mínimo de 1 min para tarefas ultra rápidas

    // 3. Salva a métrica final e transiciona o status para Concluídas
    await supabase
      .from('tarefas_mestre')
      .update({
        status: 'Concluídas',
        tempo_gasto_minutos: minutosLiquidos,
        updated_at: new Date().toISOString()
      })
      .eq('id', tarefaId);
  }
};