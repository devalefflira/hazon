// Arquivo: src/pages/Tarefas/components/NovaTarefaModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { tarefasService } from '../services/tarefasService';

interface NovaTarefaModalProps {
  usuarioLogadoId: string;
  onFechar: () => void;
  onSucesso: () => void;
}

export function NovaTarefaModal({ usuarioLogadoId, onFechar, onSucesso }: NovaTarefaModalProps) {
  const [loadingCarga, setLoadingCarga] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Listas Relacionais
  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);
  const [listaFornecedores, setListaFornecedores] = useState<any[]>([]);

  // Estados Base do Formulário
  const [responsavelId, setResponsavelId] = useState('');
  const [tipoTarefa, setTipoTarefa] = useState('OPERACIONAL');
  const [prioridade, setPrioridade] = useState('Média');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [descricao, setDescricao] = useState('');

  // Estados Extras Reativos (Recebimento de Mercadorias)
  const [numeroNF, setNumeroNF] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [conferenteId, setConferenteId] = useState('');
  const [identificacaoDoca, setIdentificacaoDoca] = useState('Principal');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [nomeMotorista, setNomeMotorista] = useState('');

  useEffect(() => {
    async function carregarDadosRelacionais() {
      try {
        setLoadingCarga(true);
        const [{ data: users }, { data: forns }] = await Promise.all([
          supabase.from('usuarios').select('id, nome').order('nome', { ascending: true }),
          supabase.from('fornecedores').select('id, nome_fantasia').order('nome_fantasia', { ascending: true })
        ]);

        const totalUsers = users || [];
        setListaUsuarios(totalUsers);
        setListaFornecedores(forns || []);

        if (totalUsers.length > 0) {
          setResponsavelId(totalUsers[0].id);
          setConferenteId(totalUsers[0].id);
        }
        if (forns && forns.length > 0) {
          setFornecedorId(forns[0].id);
        }
      } catch (err) {
        console.error('Erro ao preparar formulário de tarefas:', err);
      } finally {
        setLoadingCarga(false);
      }
    }
    carregarDadosRelacionais();
  }, []);

  const handleSalvarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsavelId || !prazoEntrega || !descricao.trim() || salvando) return;

    try {
      setSalvando(true);
      
      await tarefasService.criarTarefa({
        criador_id: usuarioLogadoId,
        responsavel_id: responsavelId,
        descricao: descricao,
        tipo_tarefa: tipoTarefa,
        prioridade: prioridade,
        prazo_entrega_planejado: prazoEntrega,
        // Extras
        numero_nota_fiscal: numeroNF,
        fornecedor_id: fornecedorId,
        conferente_id: conferenteId,
        identificacao_doca: identificacaoDoca,
        placa_veiculo: placaVeiculo,
        nome_motorista: nomeMotorista
      });

      alert('🚀 Nova Tarefa cadastrada e distribuída!');
      onSucesso();
    } catch (err) {
      alert('Erro ao registrar tarefa.');
    } finally {
      setSalvando(false);
    }
  };

  if (loadingCarga) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-center items-center z-50">
        <p className="text-white text-xs font-bold animate-pulse uppercase tracking-widest">Preparando folha de atribuição...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-end md:items-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-4xl md:rounded-4xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-scale-up">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
          <h2 className="text-[#09797a] font-black text-base uppercase">Distribuir Nova Tarefa</h2>
          <button onClick={onFechar} className="text-gray-400 font-bold hover:text-gray-600 text-sm">✕</button>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSalvarTarefa} className="flex flex-col gap-3">
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Colaborador Responsável</label>
            <select
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
            >
              {listaUsuarios.map(u => <option key={u.id} value={u.id}>{u.nome.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Tipo de Atividade</label>
              <select
                value={tipoTarefa}
                onChange={(e) => setTipoTarefa(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
              >
                <option value="CONTAGEM DE ESTOQUE">CONTAGEM DE ESTOQUE</option>
                <option value="NOTA DE FALTA">NOTA DE FALTA</option>
                <option value="AVARIAS">AVARIAS</option>
                <option value="RECEBIMENTO DE MERCADORIAS">RECEBIMENTO DE MERCADORIAS</option>
                <option value="LIMPEZA DO DEPÓSITO">LIMPEZA DO DEPÓSITO</option>
                <option value="ORGANIZAÇÃO DO DEPÓSITO">ORGANIZAÇÃO DO DEPÓSITO</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
              >
                <option value="Baixa">BAIXA</option>
                <option value="Média">MÉDIA</option>
                <option value="Alta">ALTA</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Prazo Máximo de Entrega</label>
            <input
              type="date"
              required
              value={prazoEntrega}
              onChange={(e) => setPrazoEntrega(e.target.value)}
              className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-4 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
            />
          </div>

          {/* 🚚 CONDICIONAL EXCLUSIVA: RECEBIMENTO DE MERCADORIAS */}
          {tipoTarefa === 'RECEBIMENTO DE MERCADORIAS' && (
            <div className="bg-teal-50/50 border border-teal-200 p-4 rounded-3xl flex flex-col gap-3 animate-scale-up mt-1">
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-widest border-b border-teal-100 pb-1 block">Logística de Recebimento</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-teal-700 uppercase px-1">Nº Nota Fiscal</label>
                  <input
                    type="text"
                    value={numeroNF}
                    onChange={(e) => setNumeroNF(e.target.value)}
                    placeholder="Ex: 123.456"
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-teal-700 uppercase px-1">Identificação da Doca</label>
                  <select
                    value={identificacaoDoca}
                    onChange={(e) => setIdentificacaoDoca(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
                  >
                    <option value="Principal">PRINCIPAL</option>
                    <option value="Doca 02">DOCA 02</option>
                    <option value="Doca 03">DOCA 03</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-teal-700 uppercase px-1">Fornecedor Emissor</label>
                <select
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase"
                >
                  {listaFornecedores.map(f => <option key={f.id} value={f.id}>{f.nome_fantasia}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-teal-700 uppercase px-1">Conferente Alocado</label>
                <select
                  value={conferenteId}
                  onChange={(e) => setConferenteId(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase"
                >
                  {listaUsuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-teal-700 uppercase px-1">Placa Veículo</label>
                  <input
                    type="text"
                    value={placaVeiculo}
                    onChange={(e) => setPlacaVeiculo(e.target.value)}
                    placeholder="ABC-1234"
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-teal-700 uppercase px-1">Nome Motorista</label>
                  <input
                    type="text"
                    value={nomeMotorista}
                    onChange={(e) => setNomeMotorista(e.target.value)}
                    placeholder="NOME COMPLETO"
                    className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-700 focus:outline-none focus:border-[#09797a] uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Descrição Detalhada das Instruções</label>
            <textarea
              required
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="DESCREVA AQUI DETALHADAMENTE O QUE O COLABORADOR DEVE EXECUTAR..."
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-2xl font-bold text-xs text-gray-700 focus:outline-none focus:border-[#09797a] uppercase resize-none leading-normal"
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase shadow-md active:scale-95 transition-all mt-2 disabled:opacity-40"
          >
            {salvando ? 'Salvando e Notificando...' : 'Confirmar e Publicar'}
          </button>
        </form>

      </div>
    </div>
  );
}