// Arquivo: src/pages/Cotacoes/index.tsx
import { useState, useEffect } from 'react';
import { cotacoesService } from './services/cotacoesService';
import type { CotacaoMestreRegistro } from './types/cotacoes.types';
import NovaCotacao from './NovaCotacao';
import DetalhesCotacaoPainel from './DetalhesCotacaoPainel';

export default function Cotacoes() {
  const [view, setView] = useState<'list' | 'create' | 'details'>('list');
  const [loading, setLoading] = useState(true);
  const [historico, setHistorico] = useState<CotacaoMestreRegistro[]>([]);
  const [selectedCotacaoId, setSelectedCotacaoId] = useState<string>('');

  // Simulando ID do comprador logado em ambiente de desenvolvimento
  const compradorIdMock = '00000000-0000-0000-0000-000000000000';

  async function carregarHistorico() {
    try {
      setLoading(true);
      const dados = await cotacoesService.listarHistoricoCotacoes();
      setHistorico(dados);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === 'list') {
      carregarHistorico();
    }
  }, [view]);

  if (view === 'create') {
    return (
      <NovaCotacao 
        compradorId={compradorIdMock} 
        onVoltar={() => setView('list')} 
        onSucesso={() => setView('list')} 
      />
    );
  }

  if (view === 'details' && selectedCotacaoId) {
    return (
      <DetalhesCotacaoPainel 
        cotacaoId={selectedCotacaoId} 
        onVoltar={() => setView('list')} 
        onSucesso={() => setView('list')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans selection:bg-transparent flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full mb-6 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Cotações</h1>
            <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Controle operacional de rodadas</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="bg-[#09797a] text-white text-xs font-black px-4 py-3 rounded-2xl shadow-md active:scale-95 transition-all tracking-wide"
          >
            + Nova Rodada
          </button>
        </div>

        {/* HISTÓRICO DE RODADAS */}
        <div className="flex-1 overflow-y-auto pr-0.5 max-h-[calc(100vh-170px)] pb-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10">Buscando histórico operacional...</p>
          ) : historico.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhuma rodada de cotação aberta no sistema.</p>
          ) : (
            historico.map((row) => (
              <div 
                key={row.id} 
                onClick={() => {
                  setSelectedCotacaoId(row.id);
                  setView('details');
                }}
                className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 hover:border-[#09797a] transition-all cursor-pointer flex justify-between items-center shadow-sm active:scale-[0.99]"
              >
                <div className="flex flex-col gap-1 truncate max-w-[70%]">
                  <span className="text-[10px] text-gray-400 font-mono font-black uppercase">
                    Ref: #{row.id.substring(0, 8)}
                  </span>
                  <span className="text-xs font-black text-gray-700 truncate uppercase">
                    {row.usuarios?.nome || 'Comprador Global'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    📦 {row.itens_vinculados_count} itens vinculados nesta rodada
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                    row.status === 'Concluída' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {row.status}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono font-bold">
                    {new Date(row.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}