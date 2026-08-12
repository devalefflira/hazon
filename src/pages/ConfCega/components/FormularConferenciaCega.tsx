// Arquivo: src/pages/ConfCega/components/FormularConferenciaCega.tsx
import { useState, useEffect } from 'react';
import { confCegaService, type ConferenciaItemRegistro } from '../services/conferenciasService';

interface FormularConferenciaCegaProps {
  conferencia?: any;
  conferenciaMestreId?: string;
  onVoltar: () => void;
  usuarioLogado?: any;
}

export function FormularConferenciaCega({
  conferencia,
  conferenciaMestreId,
  onVoltar
}: FormularConferenciaCegaProps) {
  const idMestreFinal = conferenciaMestreId || conferencia?.id || '';

  const [itensConferidos, setItensConferidos] = useState<ConferenciaItemRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados de Bipagem
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidadeMedida, setUnidadeMedida] = useState<string>('UN');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  const carregarItens = async () => {
    if (!idMestreFinal) return;
    try {
      setLoading(true);
      setErro(null);
      const dados = await confCegaService.listarItensConferidos(idMestreFinal);
      setItensConferidos(dados);
    } catch (err: any) {
      console.error(err);
      setErro('Falha ao conectar com o banco de conferências do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarItens();
  }, [idMestreFinal]);

  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await confCegaService.buscarProdutoPorTermo(termoBusca);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  const handleSelecionarProduto = (p: any) => {
    setProdutoSelecionado(p);
    setTermoBusca(`${p.codprod} - ${p.descricao}`);
    setUnidadeMedida(p.unidade || 'UN');
    setProdutosEncontrados([]);
  };

  const handleGravarBipagem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produtoSelecionado) {
      alert('Selecione ou bipe um produto válido.');
      return;
    }

    if (!quantidade || quantidade <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    try {
      setSalvando(true);

      await confCegaService.registrarItemConferido({
        conferencia_mestre_id: idMestreFinal,
        produto_id: produtoSelecionado.id,
        quantidade_conferida: Number(quantidade),
        unidade_medida: unidadeMedida,
        observacao: observacao.trim()
      });

      setProdutoSelecionado(null);
      setTermoBusca('');
      setQuantidade(1);
      setUnidadeMedida('UN');
      setObservacao('');
      carregarItens();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar item na conferência.');
    } finally {
      setSalvando(false);
    }
  };

  // AÇÕES DO LOTE (CONCLUIR, PAUSAR, CANCELAR)
  const handleFinalizarLote = async () => {
    if (!confirm('Deseja concluir esta conferência?')) return;
    try {
      setProcessandoAcao(true);
      await confCegaService.atualizarStatusConferencia(idMestreFinal, 'Concluida');
      alert('Conferência finalizada com sucesso!');
      onVoltar();
    } catch (err) {
      alert('Erro ao concluir conferência.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handlePausarLote = async () => {
    try {
      setProcessandoAcao(true);
      await confCegaService.atualizarStatusConferencia(idMestreFinal, 'Pausada');
      onVoltar();
    } catch (err) {
      alert('Erro ao pausar conferência.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleCancelarLote = async () => {
    if (!confirm('Tem certeza de que deseja cancelar esta conferência? Ela será removida da lista em curso.')) return;
    try {
      setProcessandoAcao(true);
      await confCegaService.atualizarStatusConferencia(idMestreFinal, 'Cancelada');
      alert('Conferência cancelada com sucesso!');
      onVoltar();
    } catch (err) {
      alert('Erro ao cancelar conferência.');
    } finally {
      setProcessandoAcao(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePausarLote}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Conferência Cega</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">
                Lote: <span className="font-mono text-gray-600">{idMestreFinal ? `${idMestreFinal.slice(0, 8)}...` : 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl text-center">
            {erro}
          </div>
        )}

        {/* FORMULÁRIO DE BIPAGEM */}
        <form onSubmit={handleGravarBipagem} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Registrar / Bipear Mercadoria</span>

          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Código de Barras (EAN) ou Descrição</label>
            <input
              type="text"
              autoFocus
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                setProdutoSelecionado(null);
              }}
              placeholder="Bipe o EAN ou digite para buscar..."
              className="w-full h-11 text-xs bg-white border border-gray-200 px-4 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-800"
            />

            {produtosEncontrados.length > 0 && !produtoSelecionado && (
              <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelecionarProduto(p)}
                    className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase transition-colors"
                  >
                    <span>{p.codprod} - {p.descricao}</span>
                    <span className="text-[9px] font-mono text-gray-400 normal-case">
                      EAN: {p.codbarra || 'N/A'} | Unidade Padrão: {p.unidade || 'UN'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {produtoSelecionado && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-800">
              <div>
                <span className="text-[9px] font-black text-emerald-800 block uppercase">Item Bipado/Confirmado</span>
                <span>{produtoSelecionado.descricao}</span>
                <span className="block text-[10px] font-mono text-gray-500 mt-0.5">
                  Cód: {produtoSelecionado.codprod} | EAN: {produtoSelecionado.codbarra || 'N/A'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProdutoSelecionado(null);
                  setTermoBusca('');
                }}
                className="text-red-500 font-bold text-[10px] px-2.5 py-1 bg-white rounded-lg border border-red-100"
              >
                Trocar
              </button>
            </div>
          )}

          {/* QUANTIDADE, UNIDADE E OBSERVAÇÃO */}
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Qtd</label>
              <input
                type="number"
                min={0.01}
                step="any"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800 text-center"
              />
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Unidade</label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800 text-center uppercase"
              >
                <option value="UN">UN</option>
                <option value="CX">CX</option>
                <option value="FD">FD</option>
                <option value="SC">SC</option>
                <option value="KG">KG</option>
                <option value="L">L</option>
                <option value="PCT">PCT</option>
                <option value="AM">AM</option>
              </select>
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Observação (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Embalagem avariada"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando || !produtoSelecionado}
            className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 mt-1"
          >
            {salvando ? 'Gravando Bipe...' : '+ Confirmar Bipe'}
          </button>
        </form>

        {/* LISTAGEM DE ITENS JÁ CONFERIDOS */}
        <div className="flex-1 flex flex-col gap-2">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">
            Itens Conferidos neste Lote ({itensConferidos.length})
          </span>

          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Consultando lote...</div>
          ) : itensConferidos.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma mercadoria bipada neste lote até o momento.
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[30vh] pr-1">
              {itensConferidos.map((item) => {
                const prod = (item.produtos || {}) as Record<string, any>;
                const unidadeExibida = item.unidade_medida || prod.unidade || 'UN';

                return (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md">
                          Cód: {prod.codprod || 'N/A'}
                        </span>
                        {prod.codbarra && (
                          <span className="text-[9px] font-mono text-gray-400">EAN: {prod.codbarra}</span>
                        )}
                      </div>
                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                        {prod.descricao || 'PRODUTO NÃO ENCONTRADO'}
                      </h4>
                      {item.observacao && (
                        <p className="text-[10px] text-amber-800 font-bold mt-0.5">Obs: {item.observacao}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-xs text-[#09797a] bg-emerald-100 px-2.5 py-1 rounded-xl block">
                        {item.quantidade_contada || item.quantidade_conferida} {unidadeExibida}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BARRA DE AÇÕES DO LOTE (FINALIZAR, PAUSAR, CANCELAR) */}
        <div className="pt-3 border-t border-gray-100 flex gap-2">
          <button
            type="button"
            disabled={processandoAcao}
            onClick={handleCancelarLote}
            className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase transition-all"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={processandoAcao}
            onClick={handlePausarLote}
            className="flex-1 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase transition-all"
          >
            Pausar
          </button>

          <button
            type="button"
            disabled={processandoAcao || itensConferidos.length === 0}
            onClick={handleFinalizarLote}
            className="flex-2 py-3 bg-[#09797a] text-white hover:bg-[#075f60] rounded-2xl text-xs font-black uppercase shadow-md transition-all disabled:opacity-40"
          >
            Finalizar Lote
          </button>
        </div>

      </div>
    </div>
  );
}

export default FormularConferenciaCega;