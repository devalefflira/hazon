// Arquivo: src/pages/ConfCega/components/FormularConferenciaCega.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { conferenciasService } from '../services/conferenciasService';
import type { ConferenciaMestreDTO, ConferenciaItemDTO } from '../types/conferencias.types';

interface FormularConferenciaCegaProps {
  conferencia: ConferenciaMestreDTO;
  onVoltar: () => void;
}

interface ProdutoBipado {
  id: string;
  descricao: string;
  codigo_barras: string;
  sigla_unidade: string;
}

export function FormularConferenciaCega({ conferencia, onVoltar }: FormularConferenciaCegaProps) {
  const [loadingItens, setLoadingItens] = useState(true);
  const [itensContados, setItensContados] = useState<ConferenciaItemDTO[]>([]);
  const [processandoBipe, setProcessandoBipe] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // Estados de Coleta
  const [codigoBipado, setCodigoBipado] = useState('');
  const [quantidadeCaixas, setQuantidadeCaixas] = useState('1');
  const [multiplicador, setMultiplicador] = useState('1');
  const [produtoDetectado, setProdutoBipado] = useState<ProdutoBipado | null>(null);

  const inputBipeRef = useRef<HTMLInputElement>(null);

  async function carregarItensJaContados() {
    try {
      setLoadingItens(true);
      const dados = await conferenciasService.obterItensConferidos(conferencia.id);
      setItensContados(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItens(false);
    }
  }

  useEffect(() => {
    carregarItensJaContados();
  }, [conferencia.id]);

  useEffect(() => {
    if (!loadingItens && conferencia.status === 'Em Andamento' && !produtoDetectado) {
      inputBipeRef.current?.focus();
    }
  }, [loadingItens, produtoDetectado, conferencia.status]);

  // Multiplicação reativa em tempo real para a UX do conferente
  const calcularTotalUnidades = () => {
    const qtd = Number(quantidadeCaixas || 0);
    const mult = Number(multiplicador || 0);
    return (qtd * mult).toFixed(2).replace('.00', '');
  };

  const handlePesquisarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoBipado.trim() || processandoBipe) return;

    try {
      setProcessandoBipe(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`id, descricao, codigo_barras, unidades_medida:unidade_medida_id ( sigla )`)
        .eq('codigo_barras', codigoBipado.trim())
        .limit(1) as any;

      if (error || !data || data.length === 0) {
        alert('⚠️ ATENÇÃO: Produto não localizado na base Hazon!');
        setCodigoBipado('');
        return;
      }

      const p = data[0];
      const siglaUnidade = p.unidades_medida ? (Array.isArray(p.unidades_medida) ? p.unidades_medida[0]?.sigla : p.unidades_medida.sigla) : 'UN';

      setProdutoBipado({
        id: p.id,
        descricao: p.descricao,
        codigo_barras: p.codigo_barras,
        sigla_unidade: siglaUnidade || 'UN'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessandoBipe(false);
    }
  };

  const handleConfirmarVolumeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalUN = Number(quantidadeCaixas) * Number(multiplicador);
    if (!produtoDetectado || totalUN <= 0) return;

    try {
      setProcessandoBipe(true);
      await conferenciasService.registrarOuIncrementarItem({
        conferencia_mestre_id: conferencia.id,
        produto_id: produtoDetectado.id,
        quantidade_contada: totalUN
      });

      setProdutoBipado(null);
      setCodigoBipado('');
      setQuantidadeCaixas('1');
      setMultiplicador('1');
      await carregarItensJaContados();
    } catch (err) {
      alert('Erro ao computar volumes.');
    } finally {
      setProcessandoBipe(false);
    }
  };

  const handleEncerrarConferenciaTotal = async () => {
    if (itensContados.length === 0) return;
    const conf = window.confirm('Finalizar conferência cega desta Nota Fiscal?');
    if (!conf) return;

    try {
      setFinalizando(true);
      await conferenciasService.finalizarConferencia(conferencia.id);
      alert('📦 Recebimento lacrado! Prontificado para descarregamento no ERP externo.');
      onVoltar();
    } catch (err) {
      alert('Erro ao finalizar recebimento.');
    } finally {
      setFinalizando(false);
    }
  };

  const modoLeitura = conferencia.status === 'Concluída';

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 w-full mb-5 border-b border-gray-100 pb-4">
          <button type="button" onClick={onVoltar} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
          <div className="truncate max-w-[85%]">
            <h1 className="text-[#09797a] font-black text-base uppercase leading-none">Coleta de Mercadoria</h1>
            <span className="text-[9px] text-gray-400 font-mono font-bold mt-1 block">NF: {conferencia.numero_nota_fiscal} | {conferencia.fornecedor_nome_fantasia}</span>
          </div>
        </div>

        {/* CALCULADORA DE VOLUMES ÀS CEGAS */}
        {!modoLeitura && (
          <div className="mb-4 bg-gray-50 p-3 rounded-3xl border border-gray-200">
            {produtoDetectado ? (
              <form onSubmit={handleConfirmarVolumeItem} className="flex flex-col gap-3.5 animate-scale-up">
                <div className="px-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider block">Item Identificado</span>
                  <span className="text-xs font-black text-gray-700 uppercase block truncate mt-0.5">{produtoDetectado.descricao}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider px-1">Qtd Embalagens (CX/FD/PC)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={quantidadeCaixas}
                      onChange={(e) => setQuantidadeCaixas(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider px-1">Multiplicador (Itens por CX)</label>
                    <input
                      type="number"
                      required
                      value={multiplicador}
                      onChange={(e) => setMultiplicador(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700"
                    />
                  </div>
                </div>

                {/* VISUALIZADOR REATIVO DO RESULTADO EM UN */}
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex justify-between items-center text-xs text-orange-800 font-bold">
                  <span>🔢 TOTAL EM UNIDADES:</span>
                  <span className="text-base font-black font-mono">{calcularTotalUnidades()} {produtoDetectado.sigla_unidade}</span>
                </div>

                <div className="flex gap-2 w-full pt-1">
                  <button type="submit" className="flex-1 bg-[#09797a] text-white text-xs font-black h-11 rounded-xl shadow-sm uppercase tracking-wider">Gravar Volume</button>
                  <button type="button" onClick={() => { setProdutoBipado(null); setCodigoBipado(''); }} className="bg-gray-200 text-gray-500 text-xs font-bold px-4 h-11 rounded-xl">Cancelar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePesquisarCodigo} className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Aguardando bipe do produto físico...</label>
                <div className="flex bg-white border border-gray-200 rounded-xl px-3 items-center focus-within:border-[#09797a] h-11 mt-0.5">
                  <input ref={inputBipeRef} type="text" value={codigoBipado} onChange={(e) => setCodigoBipado(e.target.value)} placeholder="LEIA O CÓDIGO DE BARRAS DO PRODUTO..." className="w-full text-xs font-bold text-gray-700 focus:outline-none bg-transparent uppercase" />
                  <span className="text-xs">📷</span>
                </div>
              </form>
            )}
          </div>
        )}

        {/* FEED DE PRODUTOS COMPUTADOS */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pb-4 flex flex-col gap-2.5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 border-b border-gray-50 pb-1">Conferência Física Acumulada</h3>
          {itensContados.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhum item computado.</p>
          ) : (
            itensContados.map((item) => (
              <div key={item.id} className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl flex justify-between items-center gap-4 shadow-sm">
                <div className="truncate max-w-[70%]">
                  <h4 className="text-xs font-black text-gray-700 leading-tight truncate uppercase">{item.produto_descricao}</h4>
                  <span className="text-[9px] text-gray-400 font-mono block mt-0.5">EAN: {item.produto_codigo_barras}</span>
                </div>
                <span className="text-xs font-black text-[#09797a] bg-white border border-gray-100 px-3 py-1.5 rounded-xl shrink-0 shadow-sm font-mono">
                  {item.quantidade_contada} {item.produto_unidade_medida}
                </span>
              </div>
            ))
          )}
        </div>

        {!modoLeitura && (
          <div className="pt-4 border-t border-gray-100 mt-auto bg-white w-full">
            <button
              type="button"
              disabled={finalizando || itensContados.length === 0}
              onClick={handleEncerrarConferenciaTotal}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase tracking-wide shadow-md"
            >
              {finalizando ? 'Trancando Manifesto...' : 'Finalizar Recebimento Cego'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}