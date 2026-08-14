// Arquivo: src/pages/Inventario/components/CapturaItem.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface CapturaItemProps {
  inventarioId: string;
  localCapturaId: string;
  localNome?: string;
  somenteConsulta?: boolean;
  onTrocarLocal?: () => void;
  onConcluir?: () => void;
}

export default function CapturaItem({
  inventarioId,
  localCapturaId,
  localNome = 'Geral',
  somenteConsulta = false,
  onTrocarLocal,
  onConcluir
}: CapturaItemProps) {
  const [itens, setItens] = useState<any[]>([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [lote, setLote] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarItens = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario_itens')
        .select(`
          id,
          quantidade_contabilizada,
          lote,
          data_validade,
          produtos:produto_id ( id, codprod, codbarra, descricao, unidade ),
          locais_captura:local_captura_id ( id, nome )
        `)
        .eq('inventario_id', inventarioId)
        .order('id', { ascending: false });

      if (error) {
        console.error('Erro ao carregar itens do inventário:', error);
        return;
      }

      setItens(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarItens();
  }, [inventarioId, localCapturaId]);

  // Autocomplete de Produto
  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('id, codprod, codbarra, descricao, unidade')
          .or(`codbarra.ilike.%${termoBusca}%,codprod.ilike.%${termoBusca}%,descricao.ilike.%${termoBusca}%`)
          .limit(10);

        if (error) throw error;
        setProdutosEncontrados(data || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  const handleSalvarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }

    try {
      setSalvando(true);
      const { error } = await supabase.from('inventario_itens').insert([
        {
          inventario_id: inventarioId,
          produto_id: produtoSelecionado.id,
          local_captura_id: localCapturaId,
          quantidade_contabilizada: Number(quantidade || 1),
          lote: lote.trim() || null,
          data_validade: dataValidade || null
        }
      ]);

      if (error) throw error;

      setProdutoSelecionado(null);
      setTermoBusca('');
      setQuantidade(1);
      setLote('');
      setDataValidade('');
      carregarItens();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar item no inventário.');
    } finally {
      setSalvando(false);
    }
  };

  const handleRemoverItem = async (id: string) => {
    if (somenteConsulta) return;
    if (!confirm('Deseja excluir este item da contagem?')) return;
    try {
      const { error } = await supabase.from('inventario_itens').delete().eq('id', id);
      if (error) throw error;
      carregarItens();
    } catch (err) {
      alert('Erro ao remover item.');
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 select-none min-h-[calc(100vh-32px)]">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          {onTrocarLocal && (
            <button
              type="button"
              onClick={onTrocarLocal}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONTAGEM FÍSICA</h1>
            <p className="text-[11px] text-gray-400 font-bold mt-1">
              Local: <strong className="text-gray-700">{localNome}</strong>
            </p>
          </div>
        </div>

        {onTrocarLocal && !somenteConsulta && (
          <button
            type="button"
            onClick={onTrocarLocal}
            className="text-xs text-[#09797a] font-black uppercase underline"
          >
            Trocar Local
          </button>
        )}
      </div>

      {/* FORMULÁRIO DE BIPAGEM (Oculto em modo de somente consulta) */}
      {!somenteConsulta && (
        <form onSubmit={handleSalvarItem} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
          <span className="text-[10px] font-black text-gray-400 uppercase px-1">Registrar Item</span>

          <div className="flex flex-col gap-1 relative">
            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">EAN, Código ou Descrição *</label>
            <input
              type="text"
              required
              placeholder="Bipe ou digite para buscar..."
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

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
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

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Lote</label>
              <input
                type="text"
                placeholder="Opcional"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800 uppercase"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Validade</label>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-gray-200 px-2 rounded-xl font-bold text-gray-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando || !produtoSelecionado}
            className="w-full h-11 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : '+ Confirmar Contagem'}
          </button>
        </form>
      )}

      {/* LISTAGEM DE ITENS CONTABILIZADOS */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        <span className="text-[10px] font-black text-gray-400 uppercase px-1">
          Itens Contados no Inventário ({itens.length})
        </span>

        {itens.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
            Nenhum item contado ainda.
          </div>
        ) : (
          itens.map((item) => {
            const prod = item.produtos || {};
            const dataFmt = item.data_validade
              ? new Date(item.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')
              : null;

            return (
              <div
                key={item.id}
                className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded">
                      {prod.codprod}
                    </span>
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded uppercase">
                      {item.locais_captura?.nome || 'Local'}
                    </span>
                  </div>

                  <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                    {prod.descricao}
                  </h4>

                  <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase mt-1">
                    <span>Qtd: <strong className="text-gray-800">{item.quantidade_contabilizada} {prod.unidade || 'UN'}</strong></span>
                    {item.lote && <span>| Lote: <strong className="text-gray-800">{item.lote}</strong></span>}
                    {dataFmt && <span>| Val: <strong className="text-gray-800">{dataFmt}</strong></span>}
                  </div>
                </div>

                {!somenteConsulta && (
                  <button
                    type="button"
                    onClick={() => handleRemoverItem(item.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-xl font-black text-xs uppercase transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      {onConcluir && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onConcluir}
            className="w-full py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            {somenteConsulta ? 'Voltar' : 'Finalizar Inventário'}
          </button>
        </div>
      )}
    </div>
  );
}