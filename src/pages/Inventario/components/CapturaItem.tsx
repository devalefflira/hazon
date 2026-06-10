import { useState, useEffect } from 'react';
import { inventarioService } from '../services/inventarioService';

interface CapturaItemProps {
  inventarioId: string;
  localCapturaId: string;
  onItemSalvo: () => void; // Alinhado como onItemSalvo
}

interface ProdutoConsultado {
  id: string;
  codigo_barras: string;
  descricao: string;
  unidade_medida_id: string;
}

export default function CapturaItem({ inventarioId, localCapturaId, onItemSalvo }: CapturaItemProps) {
  const [codigo, setCodigo] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [produto, setProduto] = useState<ProdutoConsultado | null>(null);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const [mensagemFeedback, setMensagemFeedback] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (codigo.trim().length < 3) {
      setProduto(null);
      setMensagemFeedback('');
      return;
    }

    const consultarBanco = setTimeout(async () => {
      try {
        setBuscandoProduto(true);
        setErro('');
        
        const prod = await inventarioService.buscarProdutoPorCodigo(codigo.trim());
        
        if (prod) {
          setProduto(prod as unknown as ProdutoConsultado);
          setMensagemFeedback(`✅ ${prod.descricao}`);
        } else {
          setProduto(null);
          setMensagemFeedback('⚠️ Produto não localizado no sistema.');
        }
      } catch (err) {
        console.error(err);
        setMensagemFeedback('❌ Erro ao consultar produto.');
      } finally {
        setBuscandoProduto(false);
      }
    }, 500);

    return () => clearTimeout(consultarBanco);
  }, [codigo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produto || !quantidade || quantidade <= 0) {
      setErro('Verifique o produto e insira uma quantidade válida.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await inventarioService.salvarItemContabilizado({
        inventario_id: inventarioId,
        produto_id: produto.id,
        quantidade: Number(quantidade),
        local_captura_id: localCapturaId
      });

      onItemSalvo(); // Dispara o callback correto
      setCodigo('');
      setQuantidade(1);
      setProduto(null);
      setMensagemFeedback('🎉 Item adicionado com sucesso!');
      
      setTimeout(() => setMensagemFeedback(''), 2000);

    } catch (err: any) {
      console.error(err);
      setErro('Erro ao salvar a contagem no Supabase.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full animate-fadeIn select-none">
      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 text-center font-medium">
          {erro}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Código de Barras</label>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Digite ou bipe o código..."
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            disabled={salvando}
            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-12 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-semibold pr-10"
            autoFocus
          />
          {buscandoProduto && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#09797a]"></div>
            </div>
          )}
        </div>
        
        {mensagemFeedback && (
          <div className={`text-xs font-bold mt-1 px-2 py-1.5 rounded-lg border ${
            produto 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            {mensagemFeedback}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold text-gray-500 pl-1">Quantidade Contada</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          placeholder="Ex: 12"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={salvando || !produto}
          className="bg-gray-50 border border-gray-300 rounded-xl px-3 h-12 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all font-bold disabled:opacity-50"
          required
        />
      </div>

      <button
        type="submit"
        disabled={salvando || buscandoProduto || !produto}
        className="w-full h-12 bg-[#09797a] text-white rounded-xl text-sm font-bold active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-md mt-2 flex justify-center items-center"
      >
        {salvando ? 'Processando contagem...' : 'Confirmar & Lançar'}
      </button>
    </form>
  );
}