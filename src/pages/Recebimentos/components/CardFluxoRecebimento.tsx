// src/pages/Recebimentos/components/CardFluxoRecebimento.tsx
import { useState } from 'react';
import type { 
  RecebimentoFluxoView, 
  RecebimentoFaseView 
} from '../types/recebimento.types';

interface CardFluxoRecebimentoProps {
  fluxo: RecebimentoFluxoView;
  onAvancarFase: (fluxoId: string, faseId: string, ordem: number) => void;
  onPausarFluxo: (fluxoId: string) => void;
  onRetomarFluxo: (fluxoId: string) => void;
  onAbrirFotosRecepcao: (fluxoId: string, faseId: string) => void;
}

export default function CardFluxoRecebimento({
  fluxo,
  onAvancarFase,
  onPausarFluxo,
  onRetomarFluxo,
  onAbrirFotosRecepcao
}: CardFluxoRecebimentoProps) {
  const [faseDetalhes, setFaseDetalhes] = useState<RecebimentoFaseView | null>(null);
  
  // Se for finalizado, inicia recolhido (false). Se estiver em andamento/pausado, inicia expandido (true).
  const [expandido, setExpandido] = useState<boolean>(fluxo.status_geral !== 'Finalizado');

  const handleBotaoMais = (fase: RecebimentoFaseView) => {
    if (fase.status === 'Finalizado') {
      setFaseDetalhes(fase);
      return;
    }

    if (fase.ordem_fase === fluxo.fase_atual) {
      if (fase.ordem_fase === 3 && fluxo.tipo_documento !== 'Nota Fiscal') {
        onAbrirFotosRecepcao(fluxo.id, fase.id);
        return;
      }
      onAvancarFase(fluxo.id, fase.id, fase.ordem_fase);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-slate-200/90 shadow-xs p-4 sm:p-6 flex flex-col gap-4 relative transition-all">
      
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <span className="font-mono text-xs font-black text-[#09797a] tracking-wider block">
            # Fluxo: {fluxo.codigo_customizado}
          </span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-black uppercase text-slate-800">
              {fluxo.tipo_documento}
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs font-bold text-slate-600">
              Doc/Carga: <strong className="text-slate-900 font-mono">{fluxo.numero_documento}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            Origem: <strong>{fluxo.fornecedor_nome}</strong>
          </span>
        </div>

        {/* Status e Ações */}
        <div className="flex items-center gap-2">
          {fluxo.status_geral === 'Em Andamento' && (
            <button
              type="button"
              onClick={() => onPausarFluxo(fluxo.id)}
              className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            >
              ⏸ Pausar
            </button>
          )}

          {fluxo.status_geral === 'Pausado' && (
            <button
              type="button"
              onClick={() => onRetomarFluxo(fluxo.id)}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            >
              ▶ Retomar
            </button>
          )}

          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
            fluxo.status_geral === 'Em Andamento'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : fluxo.status_geral === 'Pausado'
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {fluxo.status_geral}
          </span>

          {/* Botão de Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black cursor-pointer transition-transform active:scale-95 ml-1"
            title={expandido ? 'Recolher Fases' : 'Ver Todas as Fases'}
          >
            {expandido ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Resumo quando estiver retraído */}
      {!expandido && (
        <div className="flex items-center justify-between py-1 text-xs text-slate-500">
          <span className="font-semibold">
            {fluxo.status_geral === 'Finalizado' 
              ? '✓ Todas as 8 etapas concluídas com sucesso' 
              : `Etapa atual: ${fluxo.fases.find(f => f.ordem_fase === fluxo.fase_atual)?.nome_fase || 'Em Andamento'}`}
          </span>
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="text-[11px] font-black uppercase text-[#09797a] hover:underline cursor-pointer"
          >
            Ver detalhes das fases ➔
          </button>
        </div>
      )}

      {/* Esteira Gráfica Vertical das 8 Fases (Renderizada quando expandido) */}
      {expandido && (
        <div className="relative flex flex-col gap-7 my-2 pl-2 sm:pl-28 animate-fadeIn">
          
          {/* Linha vertical contínua */}
          <div className="absolute left-[38px] sm:left-[142px] top-6 bottom-6 w-1 bg-slate-300 -translate-x-1/2 z-0" />

          {fluxo.fases.map((fase) => {
            const isAtiva = fase.ordem_fase === fluxo.fase_atual && fluxo.status_geral !== 'Finalizado';
            const isConcluida = fase.status === 'Finalizado';
            const isPendente = fase.status === 'Pendente';

            const circleColor = isConcluida
              ? 'bg-emerald-500 border-emerald-600 text-white'
              : isAtiva
              ? 'bg-amber-400 border-amber-500 text-white animate-pulse'
              : 'bg-rose-500 border-rose-600 text-white';

            return (
              <div key={fase.id} className="relative flex items-center gap-4 z-10">
                
                {isAtiva && (
                  <div className="hidden sm:flex items-center gap-2 absolute -left-28 text-[#09797a] font-black text-xs uppercase animate-pulse">
                    <span>Fase Atual</span>
                    <span className="text-xl">➔</span>
                  </div>
                )}

                <div className="relative">
                  <div 
                    className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-black shadow-md transition-transform ${circleColor}`}
                  >
                    {isConcluida && '✓'}
                    {isAtiva && '⏳'}
                    {isPendente && '—'}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBotaoMais(fase)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-400 hover:bg-[#09797a] text-white border-2 border-white flex items-center justify-center font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                    title={isConcluida ? 'Ver Detalhes' : 'Avançar Fase'}
                  >
                    +
                  </button>
                </div>

                <div className="flex flex-col">
                  <span className={`text-xs sm:text-sm font-black uppercase tracking-tight ${
                    isAtiva ? 'text-[#09797a]' : isConcluida ? 'text-slate-800' : 'text-slate-500'
                  }`}>
                    {fase.nome_fase}
                  </span>

                  {isConcluida && fase.finalizado_em && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      Concluído em: {new Date(fase.finalizado_em).toLocaleDateString('pt-BR')} às {new Date(fase.finalizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes da Fase */}
      {faseDetalhes && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setFaseDetalhes(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-[#09797a] block">
                  Auditoria de Etapa Concluída
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  {faseDetalhes.nome_fase}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFaseDetalhes(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Número do Documento / Carga</span>
                <strong className="text-slate-800 font-mono">{fluxo.numero_documento}</strong>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Fornecedor / Origem</span>
                <strong className="text-slate-800">{fluxo.fornecedor_nome}</strong>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Operador Responsável</span>
                <strong className="text-slate-800">{faseDetalhes.usuario_nome || 'Operador'}</strong>
              </div>
              {faseDetalhes.iniciado_em && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Início da Fase</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {new Date(faseDetalhes.iniciado_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {faseDetalhes.finalizado_em && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Finalização da Fase</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {new Date(faseDetalhes.finalizado_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
              {faseDetalhes.link_relatorio && (
                <div className="mt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Relatório de Lançamento</span>
                  <a 
                    href={faseDetalhes.link_relatorio} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[#09797a] underline font-bold text-xs"
                  >
                    Abrir link do relatório ↗
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFaseDetalhes(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}