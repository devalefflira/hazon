import { useState, useEffect } from 'react';
import NovaCotacao from './NovaCotacao';
import { cotacoesService } from './services/cotacoesService';
import type { CotacaoMestreRegistro } from './types/cotacoes.types';
import { BadgeStatusCotacao } from './components/BadgeStatusCotacao';

interface CotacoesProps {
  onVoltarParaHome: () => void;
  usuarioLogado: { id: string; nome: string; perfil: string };
}

type ViewState = 'dashboard' | 'nova-cotacao';

export default function Cotacoes({ onVoltarParaHome, usuarioLogado }: CotacoesProps) {
  const [view, setView] = useState<ViewState>('dashboard');
  const [historico, setHistorico] = useState<CotacaoMestreRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (view === 'dashboard') {
      setLoading(true);
      cotacoesService.listarHistoricoCotacoes()
        .then(setHistorico)
        .catch((err: any) => console.error('Erro ao listar cotações:', err))
        .finally(() => setLoading(false));
    }
  }, [view]);

  if (view === 'nova-cotacao') {
    return (
      <NovaCotacao
        compradorId={usuarioLogado.id}
        onVoltar={() => setView('dashboard')}
        onSucesso={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-[#09797a] text-white p-4 flex items-center gap-3 shadow-md">
        <button onClick={onVoltarParaHome} className="text-xl font-bold p-1">←</button>
        <h1 className="text-lg font-bold">Cotações</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto max-h-[calc(100vh-80px)]">
        {loading ? (
          <p className="text-center text-gray-500 mt-6 text-sm font-medium">Carregando cotações...</p>
        ) : historico.length === 0 ? (
          <p className="text-center text-gray-500 mt-6 text-sm">Nenhuma rodada de cotação aberta.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {historico.map((cotacao) => (
              <div key={cotacao.id} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-all">
                {/* Topo do Card: Força quebra em telas ultra-pequenas se necessário */}
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 pb-2">
                  <span className="text-[11px] text-gray-500 font-mono font-bold tracking-wider">
                    # {cotacao.id.substring(0, 8).toUpperCase()}
                  </span>
                  <div className="shrink-0">
                    <BadgeStatusCotacao status={cotacao.status as any} />
                  </div>
                </div>

                {/* Corpo do Card: Informações Operacionais */}
                <div className="flex flex-col gap-1 px-0.5">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="opacity-60 text-xs">👤</span> {cotacao.usuarios?.nome || 'Comprador'}
                  </p>
                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
                    <span className="opacity-60 text-xs">📦</span> Itens Vinculados: <span className="font-bold text-[#09797a] bg-[#09797a]/5 px-2 py-0.5 rounded-md">{cotacao.itens_vinculados_count}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1 flex justify-end">
                    Abertura: {new Date(cotacao.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <button 
          onClick={() => setView('nova-cotacao')}
          className="w-full bg-[#09797a] text-white py-4 rounded-2xl text-sm font-bold shadow-md flex justify-center items-center gap-2 mt-4"
        >
          <span className="text-lg leading-none">+</span> Nova Cotação
        </button>
      </div>
    </div>
  );
}