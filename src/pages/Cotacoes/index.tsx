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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        
        {/* HEADER ADAPTADO PARA O PADRÃO MÓVEL DO HAZON */}
        <div className="flex items-center gap-3 w-full mb-6 border-b border-gray-100 pb-4">
          <button 
            onClick={etapa === 1 ? onVoltar : () => setEtapa(1)} 
            className="p-2 hover:bg-gray-50 rounded-full active:scale-90 transition-all text-[#09797a] font-bold text-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-bold text-xl leading-tight">Nova Cotação</h1>
            <p className="text-[11px] text-[#e07a5f] font-medium">
              Passo {etapa} de 2: {etapa === 1 ? 'Itens em Falta' : 'Fornecedores'}
            </p>
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO COM ROLAGEM MÓVEL INTERNA */}
        <div className="flex-1 overflow-y-auto pr-0.5 max-h-[calc(100vh-240px)] pb-4">
          {etapa === 1 && (
            <>
              {loadingFaltas ? (
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Carregando faltas...</p>
              ) : faltas.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum item pendente para cotação.</p>
              ) : (
                faltas.map(item => (
                  <CardNotaFalta 
                    key={item.id} 
                    item={item} 
                    selecionado={itensSelecionados.has(item.id)} 
                    onToggle={handleToggleItem} 
                  />
                ))
              )}
            </>
          )}

          {etapa === 2 && (
            <>
              {loadingFornecedores ? (
                <p className="text-center text-gray-500 mt-10 text-sm font-medium">Buscando fornecedores compatíveis...</p>
              ) : fornecedores.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-sm">Nenhum fornecedor encontrado para os setores selecionados.</p>
              ) : (
                fornecedores.map(forn => (
                  <CardFornecedor 
                    key={forn.fornecedor_id} 
                    fornecedor={forn} 
                    selecionado={fornecedoresSelecionados.has(forn.fornecedor_id)} 
                    onToggle={handleToggleFornecedor} 
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* BARRA DE AÇÕES INFERIOR FIXADA NO CONTAINER DA MÁQUINA */}
        <div className="pt-4 border-t border-gray-100 mt-auto flex justify-between items-center bg-white w-full">
          <span className="text-xs text-gray-500 font-bold tracking-wide">
            {etapa === 1 ? `${itensSelecionados.size} itens` : `${fornecedoresSelecionados.size} convites`}
          </span>
          
          {etapa === 1 ? (
            <button 
              onClick={() => setEtapa(2)}
              disabled={itensSelecionados.size === 0}
              className="bg-[#09797a] text-white px-6 py-3 rounded-2xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            >
              Avançar
            </button>
          ) : (
            <button 
              onClick={handleDisparar}
              disabled={fornecedoresSelecionados.size === 0 || salvando}
              className="bg-[#09797a] text-white px-6 py-3 rounded-2xl text-xs font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center gap-2"
            >
              {salvando ? 'Processando...' : 'Disparar Cotação'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}