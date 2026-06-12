import { useState, useEffect } from 'react';
import NovaCotacao from './NovaCotacao';
import { cotacoesService } from './services/cotacoesService';
import type { CotacaoMestreRegistro } from './types/cotacoes.types';
import { BadgeStatusCotacao } from './components/BadgeStatusCotacao';
import DetalhesCotacaoPainel from './DetalhesCotacaoPainel';

interface CotacoesProps {
  onVoltarParaHome: () => void;
  usuarioLogado: { id: string; nome: string; perfil: string };
}

type ViewState = 'dashboard' | 'nova-cotacao' | 'detalhes';

export default function Cotacoes({ onVoltarParaHome, usuarioLogado }: CotacoesProps) {
  const [view, setView] = useState<ViewState>('dashboard');
  const [idCotacaoSelecionada, setIdCotacaoSelecionada] = useState<string>('');
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

  if (view === 'detalhes') {
    return (
      <DetalhesCotacaoPainel
        cotacaoId={idCotacaoSelecionada}
        onVoltar={() => setView('dashboard')}
        onSucesso={() => setView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">

        {/* CABEÇALHO COM ESTILIZAÇÃO DO PADRÃO HAZON */}
        <div className="flex items-center gap-3 w-full mb-6 border-b border-gray-100 pb-4">
          <button
            onClick={onVoltarParaHome}
            className="p-2 hover:bg-gray-50 rounded-full active:scale-90 transition-all text-[#09797a] font-bold text-xl"
          >
            ←
          </button>
          <h1 className="text-[#09797a] font-bold text-xl leading-tight">Cotações</h1>
        </div>

        {/* LISTAGEM DE HISTÓRICO COM ROLAGEM ISOLADA */}
        <div className="flex-1 overflow-y-auto pr-0.5 max-h-[calc(100vh-220px)]">
          {loading ? (
            <p className="text-center text-gray-500 mt-6 text-sm font-medium">Carregando cotações...</p>
          ) : historico.length === 0 ? (
            <p className="text-center text-gray-500 mt-6 text-sm">Nenhuma rodada de cotação aberta.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {historico.map((cotacao) => (
                <div
                  key={cotacao.id}
                  onClick={() => {
                    setIdCotacaoSelecionada(cotacao.id);
                    setView('detalhes');
                  }}
                  className="p-4 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-200/60 pb-2">
                    <span className="text-[11px] text-gray-500 font-mono font-bold tracking-wider">
                      # {cotacao.id.substring(0, 8).toUpperCase()}
                    </span>
                    <div className="shrink-0">
                      <BadgeStatusCotacao status={cotacao.status as any} />
                    </div>
                  </div>

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
        </div>

        {/* BOTÃO OPERACIONAL FIXADO NO RODAPÉ DO DISPOSITIVO */}
        <div className="pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={() => setView('nova-cotacao')}
            className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-sm font-bold shadow-md flex justify-center items-center gap-2 active:scale-95 transition-all"
          >
            <span className="text-lg leading-none">+</span> Nova Cotação
          </button>
        </div>

      </div>
    </div>
  );
}