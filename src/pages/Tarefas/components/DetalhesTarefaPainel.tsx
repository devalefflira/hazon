// Arquivo: src/pages/Tarefas/components/DetalhesTarefaPainel.tsx
import { useState, useEffect } from 'react';
import { tarefasService } from '../services/tarefasService';
import type { TarefaMestreDTO, TarefaChecklistItemDTO } from '../types/tarefas.types';

interface DetalhesTarefaPainelProps {
  tarefa: TarefaMestreDTO;
  onVoltar: () => void;
}

export function DetalhesTarefaPainel({ tarefa, onVoltar }: DetalhesTarefaPainelProps) {
  const [loading, setLoading] = useState(true);
  const [statusAtual, setStatusAtual] = useState(tarefa.status);
  const [cronometroAtivo, setCronometroAtivo] = useState(tarefa.cronometro_ativo);
  const [checklists, setChecklists] = useState<TarefaChecklistItemDTO[]>([]);
  const [processando, setProcessando] = useState(false);

  async function carregarDados() {
    try {
      setLoading(true);
      const subItens = await tarefasService.obterChecklist(tarefa.id);
      setChecklists(subItens);
    } catch (err) {
      console.error('Erro ao carregar checklist:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, [tarefa.id]);

  const handleAlternarCheck = async (id: string, concluido: boolean) => {
    try {
      setChecklists(prev => prev.map(c => c.id === id ? { ...c, concluido } : c));
      await tarefasService.alternarItemChecklist(id, concluido);
    } catch (err) {
      console.error('Erro ao atualizar item do checklist:', err);
    }
  };

  const handleAction = async (tipo: 'iniciar' | 'pausar' | 'retomar' | 'finalizar') => {
    try {
      setProcessando(true);
      if (tipo === 'iniciar') {
        await tarefasService.iniciarTarefa(tarefa.id);
        setStatusAtual('Em Andamento');
        setCronometroAtivo(true);
      } else if (tipo === 'pausar') {
        await tarefasService.pausarTarefa(tarefa.id);
        setCronometroAtivo(false);
      } else if (tipo === 'retomar') {
        await tarefasService.retomarTarefa(tarefa.id);
        setCronometroAtivo(true);
      } else if (tipo === 'finalizar') {
        await tarefasService.finalizarTarefa(tarefa.id);
        alert('🏁 Ordem de serviço encerrada! Tempo líquido consolidado com sucesso.');
        onVoltar();
        return;
      }
    } catch (err) {
      alert('Falha operacional na transição do cronômetro.');
      console.error(err);
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Mapeando caderno operacional...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 w-full mb-5 border-b border-gray-100 pb-4">
          <button 
            type="button" 
            onClick={onVoltar} 
            className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-sm uppercase leading-tight">{tarefa.tipo_tarefa}</h1>
            <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">Status: {statusAtual}</span>
          </div>
        </div>

        {/* INFORMAÇÕES DA TAREFA */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] pb-4 flex flex-col gap-4">
          <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Descrição do Objetivo</span>
            <p className="text-xs font-bold text-gray-700 uppercase mt-1 leading-normal">{tarefa.descricao}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 px-1 text-[10px] font-bold text-gray-400">
            <div>
              <span className="block uppercase text-[8px] tracking-wider text-gray-400">Criado por:</span>
              <span className="text-gray-700 uppercase">{tarefa.criador_nome}</span>
            </div>
            <div>
              <span className="block uppercase text-[8px] tracking-wider text-gray-400">Responsável:</span>
              <span className="text-gray-700 uppercase">{tarefa.responsavel_nome}</span>
            </div>
          </div>

          {/* LISTAGEM DE CHECKLIST OPCONAL */}
          {checklists.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Checklist de Verificação</h3>
              <div className="flex flex-col gap-2">
                {checklists.map((item) => (
                  <label 
                    key={item.id} 
                    className={`flex items-center gap-3 p-3 border rounded-2xl shadow-sm select-none transition-all ${
                      item.concluido ? 'bg-gray-50/80 border-gray-100' : 'bg-white border-gray-200 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={statusAtual === 'Concluídas' || processando}
                      checked={item.concluido}
                      onChange={(e) => handleAlternarCheck(item.id, e.target.checked)}
                      className="w-4 h-4 accent-[#09797a] rounded-md cursor-pointer disabled:cursor-default"
                    />
                    <span className={`text-xs font-bold uppercase ${item.concluido ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.descricao}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMANDOS DO CRONÔMETRO (PLAY / PAUSE / STOP) */}
        <div className="pt-4 border-t border-gray-100 mt-auto bg-white flex flex-col gap-2.5">
          
          {statusAtual === 'Pendentes' && (
            <button
              type="button"
              disabled={processando}
              onClick={() => handleAction('iniciar')}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              ▶ Iniciar Tarefa
            </button>
          )}

          {statusAtual === 'Em Andamento' && (
            <div className="flex flex-col gap-2">
              {cronometroAtivo ? (
                <button
                  type="button"
                  disabled={processando}
                  onClick={() => handleAction('pausar')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  ⏸ Pausar Produtividade
                </button>
              ) : (
                <button
                  type="button"
                  disabled={processando}
                  onClick={() => handleAction('retomar')}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  ▶ Retomar Atividade
                </button>
              )}

              <button
                type="button"
                disabled={processando}
                onClick={() => handleAction('finalizar')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                🏁 Finalizar e Salvar Tempo
              </button>
            </div>
          )}

          {statusAtual === 'Concluídas' && (
            <div className="bg-gray-100 p-4 rounded-2xl text-center border border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Duração Total Registrada</span>
              <span className="text-xl font-black text-gray-700 font-mono block mt-1">⏱️ {tarefa.tempo_gasto_minutos} minutos</span>
              <button
                type="button"
                onClick={onVoltar}
                className="w-full mt-3 border border-gray-300 text-gray-600 bg-white py-2.5 rounded-xl text-xs font-bold shadow-sm active:scale-98 transition-all"
              >
                Voltar ao Painel
              </button>
            </div>
          )}
          
        </div>

      </div>
    </div>
  );
}