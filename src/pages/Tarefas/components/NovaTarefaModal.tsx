// Arquivo: src/pages/Tarefas/components/NovaTarefaModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { tarefasService } from '../services/tarefasService';
import type { TipoTarefa, PrioridadeTarefa } from '../types/tarefas.types';

interface NovaTarefaModalProps {
  criadorId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

interface UsuarioLista {
  id: string;
  nome: string;
}

export function NovaTarefaModal({ criadorId, onFechar, onSucesso }: NovaTarefaModalProps) {
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [submetendo, setSubmetendo] = useState(false);

  // Estados do Formulário
  const [responsavelId, setResponsavelId] = useState('');
  const [tipoTarefa, setTipoTarefa] = useState<TipoTarefa>('Contagem de Estoque');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('Média');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [prazoEntrega, setPrazoEntrega] = useState('');

  // Estados do Checklist Dinâmico
  const [checklistInput, setChecklistInput] = useState('');
  const [checklists, setChecklists] = useState<string[]>([]);

  useEffect(() => {
    async function carregarUsuarios() {
      try {
        setLoadingUsuarios(true);
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome')
          .order('nome', { ascending: true });

        if (error) throw error;
        setUsuarios(data || []);
        if (data && data.length > 0) setResponsavelId(data[0].id);
      } catch (err) {
        console.error('Erro ao listar operadores para OS:', err);
      } finally {
        setLoadingUsuarios(false);
      }
    }
    carregarUsuarios();
  }, []);

  const handleAdicionarChecklist = () => {
    if (!checklistInput.trim()) return;
    setChecklists(prev => [...prev, checklistInput.trim().toUpperCase()]);
    setChecklistInput('');
  };

  const handleRemoverChecklist = (index: number) => {
    setChecklists(prev => prev.filter((_, i) => i !== index));
  };

  const handleSalvarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsavelId || !descricao.trim() || !prazoEntrega) {
      alert('Por favor, preencha todos os campos obrigatórios da ordem.');
      return;
    }

    try {
      setSubmetendo(true);
      await tarefasService.criarTarefa({
        criador_id: criadorId,
        responsavel_id: responsavelId,
        descricao: descricao.trim().toUpperCase(),
        tipo_tarefa: tipoTarefa,
        prioridade: prioridade,
        data_inicio_planejada: dataInicio,
        prazo_entrega_planejado: prazoEntrega,
        checklists: checklists
      });

      alert('🚀 Ordem de Serviço cadastrada e triada com sucesso!');
      onSucesso();
    } catch (err: any) {
      alert(`Falha ao salvar OS: ${err.message || err}`);
    } finally {
      setSubmetendo(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 font-sans backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-4xl shadow-2xl px-5 py-6 flex flex-col max-h-[calc(100vh-40px)] animate-scale-up">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
          <h2 className="text-[#09797a] font-black text-base uppercase tracking-wide">Nova Ordem de Serviço</h2>
          <button 
            type="button" 
            onClick={onFechar} 
            className="text-gray-400 font-bold hover:text-gray-600 text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* FORMULÁRIO ROLÁVEL */}
        <form onSubmit={handleSalvarTarefa} className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-3.5 pb-2">
          
          {/* TIPO DE TAREFA */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tipo de Atividade</label>
            <select
              value={tipoTarefa}
              onChange={(e) => setTipoTarefa(e.target.value as TipoTarefa)}
              className="w-full text-xs bg-gray-50 border border-gray-200 px-4 h-11 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
            >
              <option value="Contagem de Estoque">CONTAGEM DE ESTOQUE</option>
              <option value="Nota de Falta">NOTA DE FALTA</option>
              <option value="Avarias">AVARIAS</option>
              <option value="Recebimento de Mercadorias">RECEBIMENTO DE MERCADORIAS</option>
              <option value="Limpeza do Depósito">LIMPEZA DO DEPÓSITO</option>
              <option value="Organização do Depósito">ORGANIZAÇÃO DO DEPÓSITO</option>
            </select>
          </div>

          {/* RESPONSÁVEL EXECUTOR */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Operador Responsável</label>
            <select
              disabled={loadingUsuarios}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 px-4 h-11 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
            >
              {loadingUsuarios ? (
                <option>A carregar operadores...</option>
              ) : (
                usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))
              )}
            </select>
          </div>

          {/* PRIORIDADE */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nível de Prioridade</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl">
              {(['Baixa', 'Média', 'Alta'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridade(p)}
                  className={`py-2 text-[10px] font-black rounded-xl uppercase transition-all ${
                    prioridade === p 
                      ? 'bg-gray-800 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* CRONOGRAMA DE DATAS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Data de Início</label>
              <input 
                type="date" 
                required 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)} 
                className="w-full text-xs bg-gray-50 border border-gray-200 px-4 h-11 rounded-2xl focus:outline-none focus:border-[#09797a] font-mono font-bold text-gray-700" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Prazo de Entrega</label>
              <input 
                type="date" 
                required 
                value={prazoEntrega} 
                onChange={(e) => setPrazoEntrega(e.target.value)} 
                className="w-full text-xs bg-gray-50 border border-gray-200 px-4 h-11 rounded-2xl focus:outline-none focus:border-[#09797a] font-mono font-bold text-gray-700" 
              />
            </div>
          </div>

          {/* DESCRIÇÃO MESTRE */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Detalhamento do Objetivo</label>
            <textarea
              required
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="EX: FAZER CONTAGEM COMPLETA DO CORREDOR B..."
              className="w-full text-xs bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 placeholder:text-gray-300 resize-none uppercase"
            />
          </div>

          {/* INJEÇÃO DE CHECKLIST OPCONAL */}
          <div className="flex flex-col gap-1 border-t border-gray-50 pt-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Checklist de Sub-tarefas (Opcional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                placeholder="EX: CONFERIR CAIXAS AVARIADAS"
                className="w-full text-xs bg-gray-50 border border-gray-200 px-4 h-11 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
              />
              <button
                type="button"
                onClick={handleAdicionarChecklist}
                className="bg-[#09797a] text-white font-black text-xs px-4 h-11 rounded-2xl shrink-0 active:scale-90 transition-all"
              >
                +
              </button>
            </div>

            {/* LISTAGEM FLUIDA DE SUB-ITENS ADICIONADOS */}
            {checklists.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 bg-gray-50 p-2.5 rounded-2xl max-h-28 overflow-y-auto">
                {checklists.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-600 truncate max-w-[85%]">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoverChecklist(idx)}
                      className="text-red-500 font-bold text-xs px-1 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SUBMETER */}
          <button
            type="submit"
            disabled={submetendo}
            className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold tracking-wide uppercase shadow-md active:scale-95 transition-all mt-2 flex justify-center items-center"
          >
            {submetendo ? 'A salvar Ordem...' : 'Lançar e Distribuir Tarefa'}
          </button>

        </form>
      </div>
    </div>
  );
}