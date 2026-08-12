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
  // Resolve o ID do lote da conferência de forma flexível
  const idMestreFinal = conferenciaMestreId || conferencia?.id || '';

  const [itensConferidos, setItensConferidos] = useState<ConferenciaItemRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados de Bipagem / Entrada de Produto
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // 1. Carrega o histórico de itens conferidos no lote
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

  // 2. Busca dinâmica por CODPROD, EAN ou Nome (Autocomplete/Bipagem)
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

  // 3. Grava a Bipagem/Conferência do Item
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
        observacao: observacao.trim()
      });

      // Reseta o formulário de entrada mantendo o foco no leitor
      setProdutoSelecionado(null);
      setTermoBusca('');
      setQuantidade(1);
      setObservacao('');
      carregarItens();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar item na conferência.');
    } finally {
      setSalvando(false);
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
              onClick={onVoltar}
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

        {/* ALERTA DE ERRO */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl text-center">
            {erro}
          </div>
        )}

        {/* FORMULÁRIO DE BIPAGEM / REGISTRO DE ITEM */}
        <form onSubmit={handleGravarBipagem} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Registrar / Bipear Mercadoria</span>

          {/* BUSCA / BIPE DE EAN OU CODPROD */}
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

            {/* DROPDOWN DE RESULTADOS */}
            {produtosEncontrados.length > 0 && !produtoSelecionado && (
              <div className="absolute top-16 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setTermoBusca(`${p.codprod} - ${p.descricao}`);
                      setProdutosEncontrados([]);
                    }}
                    className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase transition-colors"
                  >
                    <span>{p.codprod} - {p.descricao}</span>
                    <span className="text-[9px] font-mono text-gray-400 normal-case">
                      EAN: {p.codbarra || 'N/A'} | Unidade: {p.unidade || 'UN'} | Dep: {p.departamento || 'GERAL'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CONFIRMAÇÃO DO PRODUTO SELECIONADO */}
          {produtoSelecionado && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-800">
              <div>
                <span className="text-[9px] font-black text-emerald-800 block uppercase">Item Bipado/Confirmado</span>
                <span>{produtoSelecionado.descricao}</span>
                <span className="block text-[10px] font-mono text-gray-500 mt-0.5">
                  Cód: {produtoSelecionado.codprod} | EAN: {produtoSelecionado.codbarra || 'N/A'} | Unid: {produtoSelecionado.unidade || 'UN'}
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

          {/* QUANTIDADE E OBSERVAÇÃO */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Qtd Conferida</label>
              <input
                type="number"
                min={0.01}
                step="any"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
              />
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
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-1">
              {itensConferidos.map((item) => {
                const prod = (item.produtos || {}) as Record<string, any>;
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
                        {item.quantidade_conferida} {prod.unidade || 'UN'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default FormularConferenciaCega;