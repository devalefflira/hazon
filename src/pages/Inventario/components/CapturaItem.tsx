import { useState, useEffect } from 'react';
import { inventarioService } from '../services/inventarioService';
import type { ItemInventariado } from '../services/inventarioService';

interface CapturaItemProps {
  inventarioId: string;
  localCapturaId: string;
  somenteConsulta: boolean;
}

interface ProdutoConsultado {
  id: string;
  codigo_barras: string;
  descricao: string;
}

export default function CapturaItem({ inventarioId, localCapturaId, somenteConsulta }: CapturaItemProps) {
  // Campos do Formulário
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [multiplicador, setMultiplicador] = useState<number | ''>(1);
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');

  // Estados Operacionais
  const [produto, setProduto] = useState<ProdutoConsultado | null>(null);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [itensContabilizados, setItensContabilizados] = useState<ItemInventariado[]>([]);

  // Carrega o carrinho de itens salvos da sessão corrente
  const carregarItensSessao = async () => {
    try {
      const dados = await inventarioService.listarItensDoInventario(inventarioId);
      setItensContabilizados(dados);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarItensSessao();
  }, [inventarioId]);

  // Busca reativa com Debounce do Produto por EAN
  useEffect(() => {
    if (codigo.trim().length < 3) {
      setProduto(null);
      setFeedback('');
      return;
    }

    const consultar = setTimeout(async () => {
      try {
        setBuscandoProduto(true);
        const prod = await inventarioService.buscarProdutoPorCodigo(codigo.trim());
        if (prod) {
          setProduto(prod);
          setFeedback(`✅ ${prod.descricao}`);
        } else {
          setProduto(null);
          setFeedback('⚠️ Produto não localizado.');
        }
      } catch (err) {
        setFeedback('❌ Erro na consulta.');
      } finally {
        setBuscandoProduto(false);
      }
    }, 400);

    return () => clearTimeout(consultar);
  }, [codigo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteConsulta) return;
    if (!produto || !quantidade || !multiplicador) return;

    try {
      setSalvando(true);
      setErro('');

      // Regra de Negócio: Fardos/Pacotes convertidos para Unidades brutas
      const totalUnidades = Number(quantidade) * Number(multiplicador);

      await inventarioService.salvarItemContabilizado({
        inventario_id: inventarioId,
        produto_id: produto.id,
        quantidade_contabilizada: totalUnidades,
        local_captura_id: localCapturaId,
        lote: lote.trim(),
        data_validade: validade || null
      });

      // Limpeza dos campos operacionais (Preservando o Local de Coleta conforme solicitado)
      setCodigo('');
      setQuantidade(1);
      setMultiplicador(1);
      setLote('');
      setValidade('');
      setProduto(null);
      setFeedback('🎉 Item lançado!');

      // Atualiza o grid de contagem em tempo real
      carregarItensSessao();
      setTimeout(() => setFeedback(''), 2000);

    } catch (err) {
      setErro('Erro ao salvar item no banco.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* FORMULÁRIO DE CAPTURA (OCULTO CASO SEJA APENAS CONSULTA) */}
      {!somenteConsulta ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
          {erro && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-xl text-center font-bold">{erro}</div>}
          
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-gray-500 pl-1">Código de Barras</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Bipe ou digite..."
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 h-10 text-xs outline-none focus:border-[#09797a] font-semibold pr-8"
                autoFocus
              />
              {buscandoProduto && <div className="absolute right-3 top-3 animate-spin rounded-full h-4 w-4 border-b-2 border-[#09797a]" />}
            </div>
            {feedback && <div className="text-[10px] font-bold mt-1 text-[#09797a]">{feedback}</div>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 pl-1">Qtd Contada</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-xl px-3 h-10 text-xs outline-none focus:border-[#09797a] font-bold"
                required
                disabled={!produto}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 pl-1">Multiplicador</label>
              <input
                type="number"
                min="1"
                value={multiplicador}
                onChange={(e) => setMultiplicador(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-white border border-gray-300 rounded-xl px-3 h-10 text-xs outline-none focus:border-[#09797a] font-bold text-emerald-700"
                required
                disabled={!produto}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 pl-1">Lote (Op)</label>
              <input
                type="text"
                placeholder="Ex: L12"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl px-3 h-10 text-xs outline-none focus:border-[#09797a]"
                disabled={!produto}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 pl-1">Validade (Op)</label>
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl px-2 h-10 text-xs outline-none focus:border-[#09797a]"
                disabled={!produto}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando || !produto}
            className="w-full h-11 bg-[#09797a] text-white rounded-xl text-xs font-bold active:scale-95 disabled:opacity-40 transition-all shadow-sm mt-1"
          >
            {salvando ? 'Gravando...' : 'Confirmar & Lançar'}
          </button>
        </form>
      ) : null}

      {/* GRID DE ITENS CONTABILIZADOS EM TEMPO REAL */}
      <div className="flex flex-col flex-1 select-none">
        <h3 className="text-xs font-black text-gray-700 mb-2 pl-1 uppercase tracking-wider">
          Itens Coletados ({itensContabilizados.length})
        </h3>
        <div className="flex flex-col gap-2 max-h-55 overflow-y-auto pr-1">
          {itensContabilizados.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed">
              Nenhum item lançado nesta sessão.
            </div>
          ) : (
            itensContabilizados.map((it) => (
              <div key={it.id} className="bg-white border border-gray-200 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-xs">
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-gray-800 text-xs truncate max-w-50">
                    {it.produtos?.descricao}
                  </span>
                  <span className="bg-[#09797a]/10 text-[#09797a] font-mono font-black text-xs px-2 py-0.5 rounded-md">
                    {it.quantidade_contabilizada} UN
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>📍 {it.locais_captura?.nome}</span>
                  {it.lote && <span>Lote: {it.lote}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}