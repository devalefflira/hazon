// src/pages/Solicitacoes/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { solicitacoesService } from './services/solicitacoesService';
import type { SolicitacaoView } from './types/solicitacoes.types';
import NovaSolicitacao from './components/NovaSolicitacao';
import DetalhesSolicitacaoModal from './components/DetalhesSolicitacaoModal';

interface SolicitacoesProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: { id: string; nome: string; perfil: string };
  usuarioLogadoId?: string;
  [key: string]: any;
}

type AbaStatus = 'Pendentes' | 'Aprovadas' | 'Negadas';

export default function Solicitacoes(props: SolicitacoesProps) {
  const { onVoltarParaHome, usuarioLogado, usuarioLogadoId } = props;
  const userStorage = JSON.parse(localStorage.getItem('hazon_user') || '{}');
  const userId = usuarioLogadoId || usuarioLogado?.id || userStorage?.id || '';
  const userName = usuarioLogado?.nome || userStorage?.nome || 'Operador';

  const handleVoltar = () => {
    if (typeof onVoltarParaHome === 'function') {
      onVoltarParaHome();
    }
  };

  // Estados de navegação
  const [modoNovaSolicitacao, setModoNovaSolicitacao] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaStatus>('Pendentes');
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoView | null>(null);

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState<number>(10);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Listagens
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoView[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarSolicitacoes = async () => {
    try {
      setCarregando(true);
      const dados = await solicitacoesService.listarSolicitacoes(abaAtiva);
      setSolicitacoes(dados);
      setPaginaAtual(1);
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
  }, [abaAtiva]);

  // Cálculos de Paginação
  const totalPaginas = Math.ceil(solicitacoes.length / itensPorPagina) || 1;
  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return solicitacoes.slice(inicio, inicio + itensPorPagina);
  }, [solicitacoes, paginaAtual, itensPorPagina]);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
      {modoNovaSolicitacao ? (
        <div className="w-full flex justify-center">
          <NovaSolicitacao
            usuarioId={userId}
            nomeUsuario={userName}
            onVoltar={() => setModoNovaSolicitacao(false)}
            onSalvoSucesso={() => {
              setModoNovaSolicitacao(false);
              carregarSolicitacoes();
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-5 min-h-[calc(100vh-24px)]">
          
          {/* HEADER SUPERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleVoltar}
                className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
                title="Voltar para a Página Inicial"
              >
                ←
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  Solicitações Internas
                </h1>
                <p className="text-xs text-slate-400 font-bold">
                  Requisições e Pedidos entre Colaboradores e Setores
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModoNovaSolicitacao(true)}
              className="px-4 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-900/20 active:scale-95 transition-all cursor-pointer"
            >
              + Nova Solicitação
            </button>
          </div>

          {/* ABAS: PENDENTES / APROVADAS / NEGADAS */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setAbaAtiva('Pendentes')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                abaAtiva === 'Pendentes'
                  ? 'bg-white text-amber-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>🟡 Pendentes</span>
              {abaAtiva === 'Pendentes' && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[10px] font-mono">
                  {solicitacoes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('Aprovadas')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                abaAtiva === 'Aprovadas'
                  ? 'bg-white text-emerald-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>✅ Aprovadas</span>
              {abaAtiva === 'Aprovadas' && (
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                  {solicitacoes.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('Negadas')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                abaAtiva === 'Negadas'
                  ? 'bg-white text-red-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>❌ Negadas</span>
              {abaAtiva === 'Negadas' && (
                <span className="px-1.5 py-0.2 rounded-md bg-red-100 text-red-800 text-[10px] font-mono">
                  {solicitacoes.length}
                </span>
              )}
            </button>
          </div>

          {/* BARRA DE CONTROLE DA PAGINAÇÃO */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Solicitações {abaAtiva} ({solicitacoes.length})
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Exibir Itens:</span>
              <select
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(Number(e.target.value));
                  setPaginaAtual(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black text-slate-700 cursor-pointer focus:outline-none focus:border-[#09797a]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* LISTAGEM DOS CARDS */}
          <div className="flex flex-col gap-2.5">
            {carregando ? (
              <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
                Carregando solicitações...
              </div>
            ) : itensPaginados.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                Nenhuma solicitação encontrada nesta aba.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {itensPaginados.map((sol) => {
                  const prazoExibicao = sol.tipo_atendimento === 'Com Prazo' && sol.prazo_limite
                    ? sol.prazo_limite.split('-').reverse().join('/')
                    : sol.tipo_atendimento === 'Imediato'
                    ? 'Imediato'
                    : 'A definir';

                  const badgeStatusColor = 
                    sol.status === 'Pendente'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : sol.status === 'Aprovada Total'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : sol.status === 'Aprovada Parcial'
                      ? 'bg-orange-50 text-orange-800 border-orange-200'
                      : 'bg-red-50 text-red-800 border-red-200';

                  return (
                    <div
                      key={sol.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-[#09797a]/50 transition-all"
                    >
                      <div className="flex flex-col gap-1.5 flex-1">
                        {/* Topo do Card */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            #{sol.codigo_customizado}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black uppercase">
                            {sol.tipo_solicitacao}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${badgeStatusColor}`}>
                            {sol.status}
                          </span>
                        </div>

                        {/* Pessoas Envolvidas */}
                        <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-x-2">
                          <span>Solicitante: <strong className="text-slate-900">{sol.solicitante_nome}</strong></span>
                          <span className="text-slate-300">➔</span>
                          <span>Destino: <strong className="text-[#09797a]">{sol.destinatario_nome}</strong></span>
                        </div>

                        {/* Metadados: Quando e Prazo */}
                        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-medium">
                          <span>Quando: <strong className="text-slate-600">{sol.data_registro.split('-').reverse().join('/')} às {sol.hora_registro}</strong></span>
                          <span>•</span>
                          <span>Prazo: <strong className="text-slate-700">{prazoExibicao}</strong></span>
                          {sol.tipo_solicitacao === 'Produto' && (
                            <>
                              <span>•</span>
                              <span>Total de Itens: <strong className="text-slate-700">{sol.itens.length}</strong></span>
                            </>
                          )}
                        </div>

                        {/* Finalidade */}
                        <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                          "{sol.finalidade}"
                        </div>
                      </div>

                      {/* Botão de Ver Detalhes / Responder */}
                      <div className="self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSolicitacaoSelecionada(sol)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-black text-slate-700 hover:text-teal-800 uppercase flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        >
                          {sol.status === 'Pendente' && sol.destinatario_id === userId ? '⚡ Responder' : '🔎 Ver Detalhes'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* NAVEGAÇÃO ENTRE PÁGINAS */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 px-1">
              <button
                type="button"
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
              >
                ← Anterior
              </button>

              <span className="text-xs font-black text-slate-500 uppercase">
                Página <strong className="text-slate-800">{paginaAtual}</strong> de <strong className="text-slate-800">{totalPaginas}</strong>
              </span>

              <button
                type="button"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
              >
                Próxima →
              </button>
            </div>
          )}

        </div>
      )}

      {/* Modal de Detalhes e Decisão */}
      {solicitacaoSelecionada && (
        <DetalhesSolicitacaoModal
          solicitacao={solicitacaoSelecionada}
          usuarioLogadoId={userId}
          onFechar={() => setSolicitacaoSelecionada(null)}
          onRespostaSalva={() => {
            setSolicitacaoSelecionada(null);
            carregarSolicitacoes();
          }}
        />
      )}

    </div>
  );
}