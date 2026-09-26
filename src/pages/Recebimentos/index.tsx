// src/pages/Recebimentos/index.tsx
import { useState, useEffect } from 'react';
import { recebimentoService } from './services/recebimentoService';
import type { 
  RecebimentoFluxoView, 
  StatusGeralFluxo 
} from './types/recebimento.types';
import CardFluxoRecebimento from './components/CardFluxoRecebimento';
import ModalNovoFluxo from './components/ModalNovoFluxo';
import ModalFotosRecepcao from './components/ModalFotosRecepcao';
import AbaNotasLancamento from './components/AbaNotasLancamento';

interface RecebimentosProps {
  onVoltarParaHome?: () => void;
  usuarioLogadoId?: string;
  [key: string]: any;
}

type AbaPrincipal = 'fluxos' | 'notas' | 'finalizados';
type SubAbaFluxos = 'Em Andamento' | 'Pausado';

export default function Recebimentos(props: RecebimentosProps) {
  const { onVoltarParaHome, usuarioLogadoId } = props;
  const userStorage = JSON.parse(localStorage.getItem('hazon_user') || '{}');
  const userId = usuarioLogadoId || userStorage?.id || '';

  const handleVoltar = () => {
    if (typeof onVoltarParaHome === 'function') {
      onVoltarParaHome();
    }
  };

  // Navegação
  const [abaAtiva, setAbaAtiva] = useState<AbaPrincipal>('fluxos');
  const [subAbaFluxos, setSubAbaFluxos] = useState<SubAbaFluxos>('Em Andamento');

  // Filtro de Período para Finalizados
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicioFinalizados, setDataInicioFinalizados] = useState('');
  const [dataFimFinalizados, setDataFimFinalizados] = useState(hoje);

  // Paginação para Finalizados
  const [itensPorPagina, setItensPorPagina] = useState<number>(5);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalFotosInfo, setModalFotosInfo] = useState<{ fluxoId: string; faseId: string; tipoDoc: any } | null>(null);

  // Modal de Exposição na Gôndola (PDF anexado)
  const [fluxoGondola, setFluxoGondola] = useState<{ 
    fluxoId: string; 
    faseId: string; 
    linkRelatorio?: string;
    ordem: number;
  } | null>(null);

  // Listagem de Fluxos
  const [fluxos, setFluxos] = useState<RecebimentoFluxoView[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarFluxos = async () => {
    try {
      setCarregando(true);
      const statusParam: StatusGeralFluxo = 
        abaAtiva === 'finalizados' 
          ? 'Finalizado' 
          : subAbaFluxos;

      const filtros = abaAtiva === 'finalizados' && (dataInicioFinalizados || dataFimFinalizados)
        ? {
            dataInicio: dataInicioFinalizados || undefined,
            dataFim: dataFimFinalizados || undefined
          }
        : undefined;

      const dados = await recebimentoService.listarFluxos(statusParam, filtros);
      setFluxos(dados);
      setPaginaAtual(1); // Reinicia na primeira página ao trocar filtros
    } catch (err) {
      console.error('Erro ao carregar fluxos de recebimento:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (abaAtiva !== 'notas') {
      carregarFluxos();
    }
  }, [abaAtiva, subAbaFluxos]);

  // Avançar fase a partir do Card
  const handleAvancarFase = async (fluxoId: string, faseId: string, ordem: number) => {
    const fluxoAlvo = fluxos.find((f) => f.id === fluxoId);

    // Se estiver na fase 7 (Iniciar Exposição) ou 8 (Finalizar Exposição), abre modal da Gôndola com PDF
    if (ordem === 7 || ordem === 8) {
      const fase6 = fluxoAlvo?.fases.find((f) => f.ordem_fase === 6);
      setFluxoGondola({
        fluxoId,
        faseId,
        linkRelatorio: fase6?.link_relatorio,
        ordem
      });
      return;
    }

    try {
      await recebimentoService.finalizarFaseEAvancar({
        fluxoId,
        faseId,
        ordemAtual: ordem,
        usuarioId: userId
      });
      carregarFluxos();
    } catch (err: any) {
      alert(`Erro ao avançar fase: ${err.message}`);
    }
  };

  const handlePausarFluxo = async (fluxoId: string) => {
    try {
      await recebimentoService.alternarStatusFluxo(fluxoId, 'Pausado');
      carregarFluxos();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleRetomarFluxo = async (fluxoId: string) => {
    try {
      await recebimentoService.alternarStatusFluxo(fluxoId, 'Em Andamento');
      carregarFluxos();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleAbrirFotos = (fluxoId: string, faseId: string) => {
    const f = fluxos.find((item) => item.id === fluxoId);
    setModalFotosInfo({
      fluxoId,
      faseId,
      tipoDoc: f?.tipo_documento || 'Não Fiscal / Manual'
    });
  };

  // Abrir ou baixar PDF a partir do Base64
  const abrirOuBaixarPdf = (pdfUrl: string) => {
    try {
      if (pdfUrl.startsWith('data:application/pdf')) {
        const base64Data = pdfUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(pdfUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível abrir o PDF.');
    }
  };

  // Cálculos de Paginação
  const totalPaginas = Math.ceil(fluxos.length / itensPorPagina) || 1;
  const fluxosExibidos = abaAtiva === 'finalizados'
    ? fluxos.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina)
    : fluxos;

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
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
                Recebimentos
              </h1>
              <p className="text-xs text-slate-400 font-bold">
                Ciclo e Esteira Operacional da Mercadoria
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="px-4 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-900/20 active:scale-95 transition-all cursor-pointer"
          >
            + Novo Fluxo
          </button>
        </div>

        {/* 3 ABAS PRINCIPAIS */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setAbaAtiva('fluxos')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'fluxos'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🚚 Fluxos
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('notas')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'notas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📄 Notas / Lançamento
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('finalizados')}
            className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              abaAtiva === 'finalizados'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✓ Fluxos Finalizados
          </button>
        </div>

        {/* SUB-ABAS (Fluxos em Andamento / Pausados) */}
        {abaAtiva === 'fluxos' && (
          <div className="flex gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setSubAbaFluxos('Em Andamento')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                subAbaFluxos === 'Em Andamento'
                  ? 'bg-teal-50 text-[#09797a] border border-teal-200'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              🟡 Em Andamento
            </button>
            <button
              type="button"
              onClick={() => setSubAbaFluxos('Pausado')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                subAbaFluxos === 'Pausado'
                  ? 'bg-teal-50 text-[#09797a] border border-teal-200'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              ⏸ Pausados
            </button>
          </div>
        )}

        {/* FILTROS E PAGINAÇÃO NA ABA DE FLUXOS FINALIZADOS */}
        {abaAtiva === 'finalizados' && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Filtro por Período & Exibição
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={dataInicioFinalizados}
                  onChange={(e) => setDataInicioFinalizados(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={dataFimFinalizados}
                  onChange={(e) => setDataFimFinalizados(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Itens por Página
                </label>
                <select
                  value={itensPorPagina}
                  onChange={(e) => {
                    setItensPorPagina(Number(e.target.value));
                    setPaginaAtual(1);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDataInicioFinalizados('');
                  setDataFimFinalizados(hoje);
                  carregarFluxos();
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase cursor-pointer"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={carregarFluxos}
                className="px-4 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Aplicar Filtro
              </button>
            </div>
          </div>
        )}

        {/* LISTAGEM DE FLUXOS (FLUXOS OU FINALIZADOS) */}
        {abaAtiva !== 'notas' && (
          <div className="flex flex-col gap-4">
            {carregando ? (
              <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
                Carregando esteira de recebimento...
              </div>
            ) : fluxosExibidos.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                Nenhum fluxo encontrado para este status ou período.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {fluxosExibidos.map((fluxo) => (
                  <CardFluxoRecebimento
                    key={fluxo.id}
                    fluxo={fluxo}
                    onAvancarFase={handleAvancarFase}
                    onPausarFluxo={handlePausarFluxo}
                    onRetomarFluxo={handleRetomarFluxo}
                    onAbrirFotosRecepcao={handleAbrirFotos}
                  />
                ))}

                {/* BARRA DE PAGINAÇÃO (EM FLUXOS FINALIZADOS) */}
                {abaAtiva === 'finalizados' && totalPaginas > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 px-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} - {Math.min(paginaAtual * itensPorPagina, fluxos.length)} de {fluxos.length} fluxos
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={paginaAtual === 1}
                        onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-black uppercase cursor-pointer"
                      >
                        ◀ Anterior
                      </button>

                      <span className="text-xs font-black text-[#09797a] px-2 font-mono">
                        {paginaAtual} / {totalPaginas}
                      </span>

                      <button
                        type="button"
                        disabled={paginaAtual === totalPaginas}
                        onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-black uppercase cursor-pointer"
                      >
                        Próxima ▶
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA NOTAS / LANÇAMENTO */}
        {abaAtiva === 'notas' && (
          <AbaNotasLancamento
            usuarioId={userId}
            onAtualizar={carregarFluxos}
          />
        )}

      </div>

      {/* Modal Iniciar Novo Fluxo */}
      {modalNovoAberto && (
        <ModalNovoFluxo
          usuarioId={userId}
          onFechar={() => setModalNovoAberto(false)}
          onCriadoSucesso={() => {
            setModalNovoAberto(false);
            setAbaAtiva('fluxos');
            setSubAbaFluxos('Em Andamento');
            carregarFluxos();
          }}
        />
      )}

      {/* Modal Upload de Fotos */}
      {modalFotosInfo && (
        <ModalFotosRecepcao
          fluxoId={modalFotosInfo.fluxoId}
          faseId={modalFotosInfo.faseId}
          tipoDocumento={modalFotosInfo.tipoDoc}
          onFechar={() => setModalFotosInfo(null)}
          onSalvoSucesso={async () => {
            setModalFotosInfo(null);
            await recebimentoService.finalizarFaseEAvancar({
              fluxoId: modalFotosInfo.fluxoId,
              faseId: modalFotosInfo.faseId,
              ordemAtual: 3,
              usuarioId: userId
            });
            carregarFluxos();
          }}
        />
      )}

      {/* MODAL GÔNDOLA COM VISUALIZADOR/DOWNLOAD DO PDF E EXCLUSÃO AO FINALIZAR */}
      {fluxoGondola && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setFluxoGondola(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-[#09797a] block">
                Exposição na Gôndola
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase">
                {fluxoGondola.ordem === 7 ? 'Iniciar Reposição de Produtos' : 'Finalizar Exposição na Gôndola'}
              </h3>
            </div>

            {fluxoGondola.linkRelatorio ? (
              <div className="bg-teal-50 border border-teal-200 p-3 rounded-2xl flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-teal-800">
                  Relatório de Entrada Anexado (PDF)
                </span>
                
                <button
                  type="button"
                  onClick={() => abrirOuBaixarPdf(fluxoGondola.linkRelatorio!)}
                  className="py-2.5 px-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>📄</span>
                  <span>Abrir / Baixar Relatório PDF</span>
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium italic">
                Nenhum relatório PDF disponível no momento.
              </span>
            )}

            {fluxoGondola.ordem === 8 && (
              <span className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 block">
                ⚠️ Ao finalizar esta etapa, o fluxo será encerrado por completo e o PDF será apagado do banco de dados para economizar espaço.
              </span>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setFluxoGondola(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await recebimentoService.finalizarFaseEAvancar({
                    fluxoId: fluxoGondola.fluxoId,
                    faseId: fluxoGondola.faseId,
                    ordemAtual: fluxoGondola.ordem,
                    usuarioId: userId
                  });
                  setFluxoGondola(null);
                  carregarFluxos();
                }}
                className="px-4 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 cursor-pointer"
              >
                {fluxoGondola.ordem === 7 ? 'Iniciar Exposição' : 'Concluir Fluxo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}