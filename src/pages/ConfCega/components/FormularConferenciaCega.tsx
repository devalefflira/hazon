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

  // Estados de Entrada do Bipe
  const [codigoBipado, setCodigoBipado] = useState('');
  const [quantidadeInput, setQuantidadeInput] = useState('1');
  const [produtoDetectado, setProdutoBipado] = useState<ProdutoBipado | null>(null);

  const inputBipeRef = useRef<HTMLInputElement>(null);

  async function carregarItensJaContados() {
    try {
      setLoadingItens(true);
      const dados = await conferenciasService.obterItensConferidos(conferencia.id);
      setItensContados(dados);
    } catch (err) {
      console.error('Erro ao carregar itens conferidos:', err);
    } finally {
      setLoadingItens(false);
    }
  }

  useEffect(() => {
    carregarItensJaContados();
  }, [conferencia.id]);

  // Foca automaticamente no campo de bipe para agilizar o uso do leitor físico
  useEffect(() => {
    if (!loadingItens && conferencia.status === 'Em Andamento' && !produtoDetectado) {
      inputBipeRef.current?.focus();
    }
  }, [loadingItens, produtoDetectado, conferencia.status]);

  // Atalho reativo: se o conferente bipa um EAN, procura o produto no banco
  const handlePesquisarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoBipado.trim() || processandoBipe) return;

    try {
      setProcessandoBipe(true);
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id, descricao, codigo_barras,
          unidades_medida:unidade_medida_id ( sigla )
        `)
        .eq('codigo_barras', codigoBipado.trim())
        .limit(1);

      if (error || !data || data.length === 0) {
        alert('⚠️ ATENÇÃO: Produto não cadastrado na base de dados do Hazon!');
        setCodigoBipado('');
        return;
      }

      const p = data[0];
      setProdutoBipado({
        id: p.id,
        descricao: p.descricao,
        codigo_barras: p.codigo_barras,
        sigla_unidade: p.unidades_medida?.sigla || 'UN'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setProcessandoBipe(false);
    }
  };

  const handleConfirmarVolumeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoDetectado || Number(quantidadeInput) <= 0) return;

    try {
      setProcessandoBipe(true);
      await conferenciasService.registrarOuIncrementarItem({
        conferencia_mestre_id: conferencia.id,
        produto_id: produtoDetectado.id,
        quantidade_contada: Number(quantidadeInput)
      });

      // Limpa os estados do bipe para o próximo produto
      setProdutoBipado(null);
      setCodigoBipado('');
      setQuantidadeInput('1');
      
      // Recarrega a lista cega do painel
      await carregarItensJaContados();
    } catch (err) {
      alert('Erro ao registrar contagem.');
    } {
      setProcessandoBipe(false);
    }
  };

  const handleEncerrarConferenciaTotal = async () => {
    if (itensContados.length === 0) {
      alert('Não é possível finalizar uma conferência vazia.');
      return;
    }

    const conf = window.confirm('Deseja realmente finalizar esta conferência cega?\nO registro será trancado para auditoria externa.');
    if (!conf) return;

    try {
      setFinalizando(true);
      await conferenciasService.finalizarConferencia(conferencia.id);
      alert('📦 Conferência concluída! Dados descarregados e prontos para cruzamento no ERP.');
      onVoltar();
    } catch (err) {
      alert('Erro ao finalizar conferência.');
    } finally {
      setFinalizando(false);
    }
  };

  if (loadingItens) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Preparando folha de coleta cega...</p>
      </div>
    );
  }

  const modoLeitura = conferencia.status === 'Concluída';

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 w-full mb-5 border-b border-gray-100 pb-4">
          <button
            type="button"
            onClick={onVoltar}
            className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-base uppercase leading-tight">
              {modoLeitura ? 'Conferência Fechada' : 'Coleta às Cegas'}
            </h1>
            <p className="text-[10px] text-gray-400 font-mono font-bold">Ordem: {conferencia.codigo_customizado} | Pedido: {conferencia.pedido_codigo_customizado}</p>
          </div>
        </div>

        {/* ÁREA DE ENTRADA DO LEITOR (SÓ EXIBE SE ESTIVER EM ANDAMENTO) */}
        {!modoLeitura && (
          <div className="mb-4 bg-gray-50 p-3 rounded-3xl border border-gray-200">
            {produtoDetectado ? (
              // SUB-FORMULÁRIO DE QUANTIDADE DO PRODUTO DETECTADO
              <form onSubmit={handleConfirmarVolumeItem} className="flex flex-col gap-2 animate-scale-up">
                <div className="px-1 truncate">
                  <span className="text-[9px] font-black text-[#09797a] uppercase tracking-wider block">Produto Identificado</span>
                  <span className="text-xs font-black text-gray-700 uppercase block truncate mt-0.5">{produtoDetectado.descricao}</span>
                </div>
                <div className="flex gap-2 items-center mt-1">
                  <div className="flex-1 flex bg-white border border-gray-200 rounded-xl px-3 items-center focus-within:border-[#09797a] h-10">
                    <input
                      type="number"
                      step="any"
                      required
                      autoFocus
                      value={quantidadeInput}
                      onChange={(e) => setQuantidadeInput(e.target.value)}
                      placeholder="Qtd Contada"
                      className="w-full text-xs font-bold text-gray-700 focus:outline-none bg-transparent"
                    />
                    <span className="text-[10px] font-black text-gray-400 uppercase ml-1">{produtoDetectado.sigla_unidade}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={processandoBipe}
                    className="bg-[#09797a] text-white text-xs font-black px-4 h-10 rounded-xl shadow-sm active:scale-95 transition-all"
                  >
                    Gravar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setProdutoBipado(null); setCodigoBipado(''); }}
                    className="bg-gray-200 text-gray-500 text-xs font-bold px-3 h-10 rounded-xl"
                  >
                    ✕
                  </button>
                </div>
              </form>
            ) : (
              // FORMULÁRIO DE CAPTURA DO LEITOR DE BARRAS
              <form onSubmit={handlePesquisarCodigo} className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Aguardando bipe do produto...</label>
                <div className="flex bg-white border border-gray-200 rounded-xl px-3 items-center focus-within:border-[#09797a] h-11 mt-0.5">
                  <input
                    ref={inputBipeRef}
                    type="text"
                    value={codigoBipado}
                    onChange={(e) => setCodigoBipado(e.target.value)}
                    placeholder="BIPE O CÓDIGO DE BARRAS AQUI..."
                    className="w-full text-xs font-bold text-gray-700 focus:outline-none bg-transparent uppercase"
                  />
                  <span className="text-xs select-none">📷</span>
                </div>
              </form>
            )}
          </div>
        )}

        {/* LISTAGEM CEGA DOS VOLUMES JÁ COLETADOS */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pb-4 flex flex-col gap-2.5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-1 border-b border-gray-50 pb-1">Lista de Volumes Digitados</h3>
          {itensContados.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhum volume bipado nesta conferência.</p>
          ) : (
            itensContados.map((item) => (
              <div key={item.id} className="p-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl flex justify-between items-center gap-4 shadow-sm animate-fade-in">
                <div className="truncate max-w-[70%]">
                  <h4 className="text-xs font-black text-gray-700 leading-tight truncate uppercase">{item.produto_descricao}</h4>
                  <span className="text-[9px] text-gray-400 font-mono block mt-0.5">EAN: {item.produto_codigo_barras}</span>
                </div>
                <span className="text-xs font-black text-[#09797a] bg-white border border-gray-100 px-3 py-1.5 rounded-xl shrink-0 shadow-sm">
                  {item.quantidade_contada} {item.produto_unidade_medida}
                </span>
              </div>
            ))
          )}
        </div>

        {/* RODAPÉ MESTRE */}
        {!modoLeitura && (
          <div className="pt-4 border-t border-gray-100 mt-auto bg-white w-full">
            <button
              type="button"
              disabled={finalizando || itensContados.length === 0}
              onClick={handleEncerrarConferenciaTotal}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-black uppercase tracking-wide shadow-md active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
            >
              {finalizando ? 'Fechando Recebimento...' : 'Finalizar Conferência Cega'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}