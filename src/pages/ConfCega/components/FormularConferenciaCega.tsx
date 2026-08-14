// Arquivo: src/pages/ConfCega/components/FormularConferenciaCega.tsx
import { useState, useEffect } from 'react';
import { conferenciasService } from '../services/conferenciasService';
import type { ConferenciaItem } from '../types/conferencias.types';

interface FormularConferenciaCegaProps {
  conferencia?: any;
  conferenciaId?: string;
  codigoLote?: string;
  onVoltar?: () => void;
  onFinalizarOuPausar?: () => void;
  onCancelar?: () => void;
  usuarioLogado?: any;
}

export default function FormularConferenciaCega({
  conferencia,
  conferenciaId,
  codigoLote,
  onVoltar,
  onFinalizarOuPausar,
  onCancelar
}: FormularConferenciaCegaProps) {
  const idAtual = conferenciaId || conferencia?.id || '';
  const loteAtual = codigoLote || conferencia?.codigo_customizado || 'LOTE';

  const [itens, setItens] = useState<ConferenciaItem[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  // Campos do Bipe
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [unidade, setUnidade] = useState('UN');
  const [lote, setLote] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvandoBipe, setSalvandoBipe] = useState(false);

  const carregarItensLote = async () => {
    if (!idAtual) return;
    try {
      const conf = await conferenciasService.obterConferenciaPorId(idAtual);
      if (conf && conf.conferencia_itens) {
        setItens(conf.conferencia_itens);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarItensLote();
  }, [idAtual]);

  // Autocomplete de Produto
  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await conferenciasService.buscarProdutos(termoBusca);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  const handleConfirmarBipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione ou bipe um produto válido.');
      return;
    }

    try {
      setSalvandoBipe(true);
      await conferenciasService.adicionarItemConferencia({
        conferencia_mestre_id: idAtual,
        produto_id: produtoSelecionado.id,
        quantidade_contada: Number(quantidade || 1),
        unidade_medida: unidade,
        lote: lote.trim() || undefined,
        data_validade: dataValidade || undefined,
        observacao: observacao.trim() || undefined
      });

      // Limpa campos para o próximo bipe
      setProdutoSelecionado(null);
      setTermoBusca('');
      setQuantidade(1);
      setLote('');
      setDataValidade('');
      setObservacao('');
      carregarItensLote();
    } catch (err) {
      alert('Erro ao registrar item conferido.');
    } finally {
      setSalvandoBipe(false);
    }
  };

  const handleRemoverItem = async (itemId?: string) => {
    if (!itemId) return;
    if (!confirm('Deseja remover este item da conferência?')) return;
    try {
      await conferenciasService.removerItemConferencia(itemId);
      carregarItensLote();
    } catch (err) {
      alert('Erro ao remover item.');
    }
  };

  const handleFinalizar = async () => {
    if (itens.length === 0) {
      alert('Nenhum item foi conferido.');
      return;
    }
    try {
      await conferenciasService.atualizarStatusConferencia(idAtual, 'Finalizado');
      alert('Lote de conferência finalizado com sucesso!');
      if (onFinalizarOuPausar) onFinalizarOuPausar();
      else if (onVoltar) onVoltar();
    } catch (err) {
      alert('Erro ao finalizar conferência.');
    }
  };

  const handleVoltarOuPausar = () => {
    if (onFinalizarOuPausar) onFinalizarOuPausar();
    else if (onVoltar) onVoltar();
  };

  const handleCancelarTudo = () => {
    if (onCancelar) onCancelar();
    else if (onVoltar) onVoltar();
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 select-none min-h-[calc(100vh-32px)]">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <button type="button" onClick={handleVoltarOuPausar} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
        <div>
          <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONFERÊNCIA CEGA</h1>
          <p className="text-[11px] text-gray-400 font-mono font-bold mt-1">Lote: {loteAtual}</p>
        </div>
      </div>

      {/* FORMULÁRIO DE REGISTRAR / BIPAR */}
      <form onSubmit={handleConfirmarBipe} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
        <span className="text-[10px] font-black text-gray-400 uppercase px-1">Registrar / Bipear Mercadoria</span>

        {/* BUSCA PRODUTO */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Código de Barras (EAN) ou Descrição *</label>
          <input
            type="text"
            required
            placeholder="Bipe o EAN ou digite para buscar..."
            value={termoBusca}
            onChange={(e) => {
              setTermoBusca(e.target.value);
              setProdutoSelecionado(null);
            }}
            className="w-full h-11 text-xs bg-white border border-[#09797a] px-3 rounded-xl font-bold text-gray-800"
          />

          {produtosEncontrados.length > 0 && !produtoSelecionado && (
            <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-gray-100">
              {produtosEncontrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProdutoSelecionado(p);
                    setTermoBusca(`${p.codprod} - ${p.descricao}`);
                    setUnidade(p.unidade || 'UN');
                    setProdutosEncontrados([]);
                  }}
                  className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                >
                  <span>{p.codprod} - {p.descricao}</span>
                  <span className="text-[10px] text-gray-400 font-mono">EAN: {p.codbarra || 'S/EAN'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LOTE E VENCIMENTO */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Lote</label>
            <input
              type="text"
              placeholder="Ex: LT-2026/01"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Vencimento (Data)</label>
            <input
              type="date"
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
            />
          </div>
        </div>

        {/* QTD, UNIDADE E OBS */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Qtd *</label>
            <input
              type="number"
              min={0.01}
              step="any"
              required
              value={quantidade}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value;
                setQuantidade(val === '' ? '' : Number(val));
              }}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800 text-center"
            />
          </div>

          <div className="col-span-3 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Unidade</label>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800 uppercase text-center"
            >
              <option value="UN">UN</option>
              <option value="CX">CX</option>
              <option value="KG">KG</option>
              <option value="FD">FD</option>
              <option value="PCT">PCT</option>
            </select>
          </div>

          <div className="col-span-6 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Observação (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Embalagem avariada"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={salvandoBipe || !produtoSelecionado}
          className="w-full h-11 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          {salvandoBipe ? 'Registrando...' : '+ Confirmar Bipe'}
        </button>
      </form>

      {/* LISTA DE ITENS CONFERIDOS */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        <span className="text-[10px] font-black text-gray-400 uppercase px-1">
          Itens Conferidos Neste Lote ({itens.length})
        </span>

        {itens.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
            Nenhuma mercadoria bipada neste lote até o momento.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {itens.map((item) => {
              const prod: any = item.produtos || {};
              const dataValFmt = item.data_validade
                ? new Date(item.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')
                : null;

              return (
                <div key={item.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      Cód: {prod.codprod || 'N/A'}
                    </span>
                    <h4 className="font-black text-xs text-gray-800 uppercase mt-0.5">
                      {prod.descricao || 'PRODUTO'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase mt-1">
                      <span>Qtd: <strong className="text-gray-800">{item.quantidade_contada} {item.unidade_medida || 'UN'}</strong></span>
                      {item.lote && <span>| Lote: <strong className="text-gray-800">{item.lote}</strong></span>}
                      {dataValFmt && <span>| Validade: <strong className="text-gray-800">{dataValFmt}</strong></span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoverItem(item.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-xl font-black text-xs uppercase transition-all"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTÕES INFERIORES */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleCancelarTudo}
          className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleVoltarOuPausar}
          className="flex-1 py-3 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase"
        >
          Pausar
        </button>
        <button
          type="button"
          onClick={handleFinalizar}
          disabled={itens.length === 0}
          className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          Finalizar Lote
        </button>
      </div>

    </div>
  );
}