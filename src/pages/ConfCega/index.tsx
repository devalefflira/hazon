// Arquivo: src/pages/ConfCega/index.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { conferenciasService } from './services/conferenciasService';
import type { ConferenciaMestreDTO } from './types/conferencias.types';
import { FormularConferenciaCega } from './components/FormularConferenciaCega';

interface ConfCegaProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export function ConfCega({ usuarioLogadoId, onVoltarParaHome }: ConfCegaProps) {
  const [loading, setLoading] = useState(true);
  const [conferencias, setConferencias] = useState<ConferenciaMestreDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'Em Andamento' | 'Concluída'>('Em Andamento');
  
  // Estados para abertura de Nova Conferência baseada em Pedidos Existentes
  const [pedidosAbertos, setPedidosAbertos] = useState<any[]>([]);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState('');
  const [criandoOS, setCriandoOS] = useState(false);
  const [painelNovoAberto, setPainelNovoAberto] = useState(false);

  // Estado de navegação interna para a tela cega
  const [conferenciaAtiva, setConferenciaAtiva] = useState<ConferenciaMestreDTO | null>(null);

  async function inicializarModulo() {
    try {
      setLoading(true);
      const [dadosConf, { data: dadosPedidos }] = await Promise.all([
        conferenciasService.listarConferencias(),
        supabase.from('pedidos_mestre').select(`id, codigo_customizado, fornecedores:fornecedor_id ( nome_fantasia )`).eq('status', 'Pendente Confirmação Vendedor') // Pedidos enviados/pendentes prontos para receber
      ]);

      setConferencias(dadosConf);
      setPedidosAbertos(dadosPedidos || []);
      if (dadosPedidos && dadosPedidos.length > 0) setPedidoSelecionadoId(dadosPedidos[0].id);
    } catch (err) {
      console.error('Erro ao carregar o módulo de Conferência Cega:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    inicializarModulo();
  }, []);

  const handleDispararNovaConferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoSelecionadoId || criandoOS) return;

    try {
      setCriandoOS(true);
      await conferenciasService.criarConferencia({
        pedido_mestre_id: pedidoSelecionadoId,
        usuario_id: usuarioLogadoId
      });
      alert('🚀 Nova Ordem de Conferência Cega gerada com sucesso! Entre na aba Em Andamento para bipar.');
      setPainelNovoAberto(false);
      await inicializarModulo();
    } catch (err) {
      alert('Erro ao criar ordem de conferência.');
    } finally {
      setCriandoOS(false);
    }
  };

  const conferenciasFiltradas = conferencias.filter(c => c.status === activeTab);

  if (conferenciaAtiva) {
    return (
      <FormularConferenciaCega
        conferencia={conferenciaAtiva}
        onVoltar={() => {
          setConferenciaAtiva(null);
          inicializarModulo();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
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
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Conf. Cega</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Recebimento sem Vício de Confirmação</p>
            </div>
          </div>
          <button
            onClick={() => setPainelNovoAberto(!painelNovoAberto)}
            className="bg-[#09797a] text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            {painelNovoAberto ? 'Ver Lista' : '+ Receber'}
          </button>
        </div>

        {painelNovoAberto ? (
          // FORMULÁRIO DE GERAÇÃO DE ENTRADA ÀS CEGAS
          <form onSubmit={handleDispararNovaConferencia} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl mb-5 flex flex-col gap-3 animate-scale-up">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1">Selecione o Pedido de Entrada</label>
              <select
                value={pedidoSelecionadoId}
                onChange={(e) => setPedidoSelecionadoId(e.target.value)}
                className="w-full text-xs bg-white border border-gray-200 px-3 h-11 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase"
              >
                {pedidosAbertos.length === 0 ? (
                  <option>Nenhum pedido pendente de recebimento</option>
                ) : (
                  pedidosAbertos.map(p => (
                    <option key={p.id} value={p.id}>ORDEM: {p.codigo_customizado} | {p.fornecedores?.nome_fantasia}</option>
                  ))
                )}
              </select>
            </div>
            <button
              type="submit"
              disabled={criandoOS || pedidosAbertos.length === 0}
              className="w-full bg-[#09797a] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
            >
              {criandoOS ? 'Gerando Ordem...' : 'Iniciar Recebimento Cego'}
            </button>
          </form>
        ) : (
          // CONTROLES DE ABAS DO HISTÓRICO
          <>
            <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-2xl mb-5 select-none">
              {(['Em Andamento', 'Concluída'] as const).map((tab) => {
                const count = conferencias.filter(c => c.status === tab).length;
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
                    {tab === 'Em Andamento' ? 'Em Curso' : 'Fechadas'}
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* LISTAGEM HISTÓRICA */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pb-4 flex flex-col gap-3">
              {loading ? (
                <p className="text-center text-gray-400 text-xs font-bold py-10">Carregando livro de conferências...</p>
              ) : conferenciasFiltradas.length === 0 ? (
                <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma conferência listada nesta etapa.</p>
              ) : (
                conferenciasFiltradas.map((conf) => (
                  <div
                    key={conf.id}
                    onClick={() => setConferenciaAtiva(conf)}
                    className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 transition-all flex justify-between items-center shadow-sm cursor-pointer hover:border-[#09797a] active:scale-[0.99]"
                  >
                    <div className="flex flex-col gap-1 truncate max-w-[70%]">
                      <span className="text-[10px] text-gray-400 font-mono font-black uppercase">Recebimento: {conf.codigo_customizado}</span>
                      <span className="text-xs font-black text-gray-700 truncate uppercase">{conf.fornecedor_nome_fantasia}</span>
                      <span className="text-[9px] text-gray-400 font-medium">📋 Pedido Ref: {conf.pedido_codigo_customizado}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase ${
                        conf.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                      }`}>
                        {conf.status === 'Concluída' ? 'Feito' : 'Bipar'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono font-bold">
                        {new Date(conf.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}