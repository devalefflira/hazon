import { useState, useEffect } from 'react';
import { tarefasService } from './services/tarefasService';
import type { TarefaMestreDTO } from './types/tarefas.types';
import { NovaTarefaModal } from './components/NovaTarefaModal';
import { DetalhesTarefaPainel } from './components/DetalhesTarefaPainel';

interface TarefasProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export function Tarefas({ usuarioLogadoId, onVoltarParaHome }: TarefasProps) {
  const [loading, setLoading] = useState(true);
  const [tarefas, setTarefas] = useState<TarefaMestreDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'Pendentes' | 'Em Andamento' | 'Concluídas'>('Pendentes');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'Hoje' | 'Esta Semana' | 'Este Mês'>('Hoje');
  const [modalAberto, setModalAberto] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaMestreDTO | null>(null);

  async function carregarTarefas() {
    try {
      setLoading(true);
      const dados = await tarefasService.listarTarefas(filtroPeriodo);
      setTarefas(dados);
    } catch (err) {
      console.error('Erro ao buscar painel de tarefas:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTarefas();
  }, [filtroPeriodo]);

  const tarefasFiltradas = tarefas.filter(t => t.status === activeTab);

  const getCorPrioridade = (prioridade: string) => {
    if (prioridade === 'Alta') return 'bg-red-100 text-red-800 border-red-200';
    if (prioridade === 'Média') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (tarefaSelecionada) {
    return (
      <DetalhesTarefaPainel
        tarefa={tarefaSelecionada}
        onVoltar={() => {
          setTarefaSelecionada(null);
          carregarTarefas();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER COM DISPARADOR DE CRIAÇÃO */}
        <div className="flex justify-between items-center w-full mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Tarefas</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Produtividade Operacional</p>
            </div>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="bg-[#09797a] text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            + Nova Tarefa
          </button>
        </div>

        {/* FILTROS DE PERÍODO TEMPORAL */}
        <div className="flex gap-2 mb-4 justify-start px-0.5">
          {(['Hoje', 'Esta Semana', 'Este Mês'] as const).map((periodo) => (
            <button
              key={periodo}
              onClick={() => setFiltroPeriodo(periodo)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                filtroPeriodo === periodo
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {periodo}
            </button>
          ))}
        </div>

        {/* ESTEIRA DE STATUS */}
        <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-2xl mb-5 select-none">
          {(['Pendentes', 'Em Andamento', 'Concluídas'] as const).map((tab) => {
            const count = tarefas.filter(t => t.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 text-[10px] font-black rounded-xl uppercase transition-all tracking-tight ${
                  activeTab === tab 
                    ? 'bg-[#09797a] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'Pendentes' && 'Pendentes'}
                {tab === 'Em Andamento' && 'Em Curso'}
                {tab === 'Concluídas' && 'Feitas'}
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* LISTAGEM DE CARTÕES FILTRADOS E ORDENADOS POR PESO */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pb-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10">Mapeando ordens de serviço...</p>
          ) : tarefasFiltradas.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma tarefa listada para este período.</p>
          ) : (
            tarefasFiltradas.map((tarefa) => (
              <div
                key={tarefa.id}
                onClick={() => setTarefaSelecionada(tarefa)}
                className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 transition-all flex flex-col gap-3 shadow-sm cursor-pointer hover:border-[#09797a] active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1 truncate max-w-[70%]">
                    <span className="text-[10px] text-gray-400 font-mono font-black uppercase">{tarefa.tipo_tarefa}</span>
                    <h3 className="text-xs font-black text-gray-700 truncate uppercase leading-tight">{tarefa.descricao}</h3>
                    <span className="text-[9px] text-gray-400 font-bold block mt-0.5">👤 Executor: {tarefa.responsavel_nome}</span>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border shrink-0 ${getCorPrioridade(tarefa.prioridade)}`}>
                    {tarefa.prioridade}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-1">
                  <span className="text-[9px] text-gray-400 font-mono font-bold">
                    Prazo: {new Date(tarefa.prazo_entrega_planejado + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  {tarefa.status === 'Em Andamento' && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${tarefa.cronometro_ativo ? 'bg-teal-100 text-teal-800 animate-pulse' : 'bg-amber-100 text-amber-800'}`}>
                      {tarefa.cronometro_ativo ? '⏱️ Cronômetro Rodando' : '⏸️ Pausada'}
                    </span>
                  )}
                  {tarefa.status === 'Concluídas' && (
                    <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                      ⏱️ Gasto: {tarefa.tempo_gasto_minutos} min
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* MODAL DE CRIAÇÃO ASSINCRONA */}
      {modalAberto && (
        <NovaTarefaModal
          criadorId={usuarioLogadoId}
          onFechar={() => setModalAberto(false)}
          onSucesso={() => {
            setModalAberto(false);
            carregarTarefas();
          }}
        />
      )}
    </div>
  );
}