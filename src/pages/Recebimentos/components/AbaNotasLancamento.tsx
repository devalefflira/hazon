// src/pages/Recebimentos/components/AbaNotasLancamento.tsx
import { useState, useEffect } from 'react';
import { recebimentoService } from '../services/recebimentoService';
import type { RecebimentoFluxoView, FotoRecebimento } from '../types/recebimento.types';

interface AbaNotasLancamentoProps {
  usuarioId: string;
  onAtualizar: () => void;
}

export default function AbaNotasLancamento({
  usuarioId,
  onAtualizar
}: AbaNotasLancamentoProps) {
  const [documentos, setDocumentos] = useState<RecebimentoFluxoView[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modais de controle
  const [itemParaPausa, setItemParaPausa] = useState<{ fluxoId: string; faseId: string } | null>(null);
  const [motivoPausa, setMotivoPausa] = useState<'Intervalo' | 'Outros'>('Intervalo');
  const [detalhePausa, setDetalhePausa] = useState('');

  const [itemParaFinalizar, setItemParaFinalizar] = useState<{ fluxoId: string; faseId: string; ordem: number } | null>(null);
  const [linkRelatorio, setLinkRelatorio] = useState('');
  const [processando, setProcessando] = useState(false);

  // Modal para Visualizar Fotos Anexadas
  const [fotosVisualizacao, setFotosVisualizacao] = useState<{ docCodigo: string; fotos: FotoRecebimento[] } | null>(null);
  const [fotoEmZoom, setFotoEmZoom] = useState<string | null>(null);

  // Temporizador local
  const [temposRestantes, setTemposRestantes] = useState<Record<string, number>>({});

  const carregarDocumentos = async () => {
    try {
      setCarregando(true);
      const res = await recebimentoService.listarNotasParaLancamento();
      setDocumentos(res);

      const novosTempos: Record<string, number> = {};
      res.forEach((doc) => {
        const fase5 = doc.fases.find((f) => f.ordem_fase === 5);
        const limiteSegundos = (fase5?.tempo_limite_minutos || (doc.tipo_documento === 'Nota Fiscal' ? 60 : 180)) * 60;
        
        if (fase5?.iniciado_em) {
          const segundosPassados = Math.floor((Date.now() - new Date(fase5.iniciado_em).getTime()) / 1000);
          novosTempos[doc.id] = Math.max(0, limiteSegundos - segundosPassados);
        } else {
          novosTempos[doc.id] = limiteSegundos;
        }
      });
      setTemposRestantes(novosTempos);
    } catch (err) {
      console.error('Erro ao carregar documentos de lançamento:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTemposRestantes((prev) => {
        const atualizado = { ...prev };
        Object.keys(atualizado).forEach((id) => {
          if (atualizado[id] > 0) {
            atualizado[id] -= 1;
          }
        });
        return atualizado;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const mins = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const handleIniciarLancamento = async (doc: RecebimentoFluxoView) => {
    const fase5 = doc.fases.find((f) => f.ordem_fase === 5);
    if (!fase5) return;

    try {
      setProcessando(true);
      await recebimentoService.finalizarFaseEAvancar({
        fluxoId: doc.id,
        faseId: fase5.id,
        ordemAtual: 5,
        usuarioId
      });
      await carregarDocumentos();
      onAtualizar();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmarPausa = async () => {
    if (!itemParaPausa) return;
    if (motivoPausa === 'Outros' && !detalhePausa.trim()) {
      alert('Especifique o motivo da pausa.');
      return;
    }

    try {
      setProcessando(true);
      await recebimentoService.pausarTemporizadorLancamento({
        fluxo_id: itemParaPausa.fluxoId,
        fase_id: itemParaPausa.faseId,
        usuario_id: usuarioId,
        motivo_pausa: motivoPausa,
        motivo_pausa_detalhe: detalhePausa.trim() || undefined
      });

      await recebimentoService.alternarStatusFluxo(itemParaPausa.fluxoId, 'Pausado');
      alert('Lançamento pausado com sucesso.');
      setItemParaPausa(null);
      setDetalhePausa('');
      await carregarDocumentos();
      onAtualizar();
    } catch (err: any) {
      alert(`Erro ao pausar: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmarFinalizacao = async () => {
    if (!itemParaFinalizar) return;
    if (!linkRelatorio.trim()) {
      alert('Por favor, informe o link do relatório de lançamento.');
      return;
    }

    try {
      setProcessando(true);
      // Finaliza fase 6 e limpa as fotos automaticamente
      await recebimentoService.finalizarFaseEAvancar({
        fluxoId: itemParaFinalizar.fluxoId,
        faseId: itemParaFinalizar.faseId,
        ordemAtual: 6,
        usuarioId,
        linkRelatorio: linkRelatorio.trim()
      });

      alert('Lançamento concluído com sucesso! As fotos temporárias foram eliminadas.');
      setItemParaFinalizar(null);
      setLinkRelatorio('');
      await carregarDocumentos();
      onAtualizar();
    } catch (err: any) {
      alert(`Erro ao finalizar lançamento: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  // Abrir fotos da carga
  const handleVisualizarFotos = async (doc: RecebimentoFluxoView) => {
    try {
      setProcessando(true);
      const fotos = await recebimentoService.buscarFotosFluxo(doc.id);
      if (fotos.length === 0) {
        alert('Nenhuma foto anexada a este documento.');
        return;
      }
      setFotosVisualizacao({
        docCodigo: doc.numero_documento,
        fotos
      });
    } catch (err: any) {
      alert(`Erro ao carregar fotos: ${err.message}`);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">
          Documentos Entregues para Lançamento ({documentos.length})
        </span>
        <button
          type="button"
          onClick={carregarDocumentos}
          className="text-[11px] font-black uppercase text-[#09797a] hover:underline cursor-pointer"
        >
          🔄 Atualizar Lista
        </button>
      </div>

      {carregando ? (
        <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
          Carregando notas pendentes...
        </div>
      ) : documentos.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
          Nenhum documento aguardando lançamento no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {documentos.map((doc) => {
            const fase5 = doc.fases.find((f) => f.ordem_fase === 5);
            const fase6 = doc.fases.find((f) => f.ordem_fase === 6);
            const lancamentoIniciado = fase5?.status === 'Finalizado';
            const tempoRestante = temposRestantes[doc.id] || 0;
            const tempoEsgotado = tempoRestante === 0;

            return (
              <div 
                key={doc.id} 
                className="bg-white border-2 border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#09797a]">
                      #{doc.codigo_customizado}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {doc.tipo_documento}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase">
                      Doc: {doc.numero_documento}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Origem: <strong>{doc.fornecedor_nome}</strong>
                    </p>
                  </div>

                  {/* Botão de Ver Fotos (quando for Não Fiscal ou Caminhão) */}
                  {doc.tipo_documento !== 'Nota Fiscal' && (
                    <button
                      type="button"
                      onClick={() => handleVisualizarFotos(doc)}
                      className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <span>📷</span>
                      <span>Ver Fotos dos Produtos</span>
                    </button>
                  )}

                  {/* Cronômetro */}
                  <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                    tempoEsgotado 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-teal-50/60 border-teal-200/80 text-teal-950'
                  }`}>
                    <div>
                      <span className="text-[9px] font-black uppercase block tracking-wider opacity-70">
                        Tempo Limite do Lançamento
                      </span>
                      <span className="text-lg font-black font-mono">
                        {formatarTempo(tempoRestante)}
                      </span>
                    </div>

                    <span className="text-xs font-black uppercase">
                      {tempoEsgotado ? '⚠️ Estourado' : '⏳ No Prazo'}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                  {!lancamentoIniciado ? (
                    <button
                      type="button"
                      disabled={processando}
                      onClick={() => handleIniciarLancamento(doc)}
                      className="w-full py-2.5 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      ▶ Iniciar Lançamento
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setItemParaPausa({ fluxoId: doc.id, faseId: fase5?.id || '' })}
                        className="flex-1 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black uppercase transition-all cursor-pointer"
                      >
                        ⏸ Pausar
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemParaFinalizar({ fluxoId: doc.id, faseId: fase6?.id || '', ordem: 6 })}
                        className="flex-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        ✓ Finalizar Lançamento
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE FOTOS COM ZOOM */}
      {fotosVisualizacao && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setFotosVisualizacao(null)}
        >
          <div 
            className="w-full max-w-xl bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-[#09797a] block">
                  Documento: {fotosVisualizacao.docCodigo}
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase">
                  Fotos Capturadas na Recepção
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFotosVisualizacao(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {fotosVisualizacao.fotos.map((f, i) => (
                <div 
                  key={i} 
                  onClick={() => setFotoEmZoom(f.foto_url)}
                  className="relative rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group hover:shadow-md transition-all"
                >
                  <img src={f.foto_url} alt={`Foto ${i}`} className="w-full h-36 object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase">
                    {f.tipo_foto.replace('_', ' ')}
                  </span>
                  <span className="absolute top-1.5 right-1.5 bg-white/90 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                    🔍 Zoom
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFotosVisualizacao(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZOOM EM TELA CHEIA */}
      {fotoEmZoom && (
        <div 
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-2 animate-fadeIn"
          onClick={() => setFotoEmZoom(null)}
        >
          <img src={fotoEmZoom} alt="Zoom" className="max-w-full max-h-[92vh] object-contain rounded-2xl" />
        </div>
      )}

      {/* MODAL DE PAUSA */}
      {itemParaPausa && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setItemParaPausa(null)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-black text-slate-900 uppercase">
              Pausar Temporizador de Lançamento
            </h3>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Motivo da Pausa</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Intervalo', 'Outros'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivoPausa(m)}
                    className={`py-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                      motivoPausa === m
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {motivoPausa === 'Outros' && (
                <input
                  type="text"
                  value={detalhePausa}
                  onChange={(e) => setDetalhePausa(e.target.value)}
                  placeholder="Especifique o motivo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 mt-1"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setItemParaPausa(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processando}
                onClick={handleConfirmarPausa}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-xs cursor-pointer"
              >
                Confirmar Pausa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FINALIZAÇÃO (RELATÓRIO) */}
      {itemParaFinalizar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn"
          onClick={() => setItemParaFinalizar(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] font-black uppercase text-[#09797a] block">
                Conclusão de Lançamento
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase">
                Adicionar Link do Relatório de Entrada
              </h3>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                * Link do Relatório de Lançamento
              </label>
              <input
                type="url"
                value={linkRelatorio}
                onChange={(e) => setLinkRelatorio(e.target.value)}
                placeholder="https://drive.google.com/... ou link do ERP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                ℹ️ Ao concluir, as fotos temporárias dos produtos serão excluídas automaticamente para liberar espaço.
              </span>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setItemParaFinalizar(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={processando}
                onClick={handleConfirmarFinalizacao}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Concluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}