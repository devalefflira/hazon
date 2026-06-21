import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { pedidosService } from './services/pedidosService';

interface FormalizarPedidoExternoProps {
  token: string;
}

export function FormalizarPedidoExterno({ token }: FormalizarPedidoExternoProps) {
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [pedidoMestre, setPedidoMestre] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    async function carregarDadosPedido() {
      try {
        setLoading(true);
        const { data: mestre, error: errMestre } = await supabase
          .from('pedidos_mestre')
          .select(`id, codigo_customizado, status, fornecedores ( nome_fantasia )`)
          .eq('token_acesso', token)
          .single();

        if (errMestre || !mestre) throw new Error('Ordem de Compra inativa ou inexistente.');
        setPedidoMestre(mestre);

        if (mestre.status === 'Pedido Feito') {
          setSucesso(true);
          return;
        }

        const dadosItens = await pedidosService.obterDetalhesPedido(mestre.id);
        setItens(dadosItens);
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao carregar caderno de pedido.');
      } finally {
        setLoading(false);
      }
    }
    if (token) carregarDadosPedido();
  }, [token]);

  const handleFormalizarAceite = async () => {
    try {
      setProcessando(true);
      await pedidosService.formalizarPedidoViaToken(token);
      setSucesso(true);
    } catch (err: any) {
      alert(`Erro ao formalizar: ${err.message || err}`);
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Mapeando ordem de fornecimento...</p>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-4xl shadow-xl p-8 text-center border border-gray-100">
          <span className="text-5xl block mb-3">📦</span>
          <h2 className="text-[#09797a] font-black text-xl uppercase tracking-wide">Pedido Formalizado!</h2>
          <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
            A confirmação da ordem foi registrada. O status foi alterado para "Pedido Feito" no painel do comprador do Hazon ERP.
          </p>
        </div>
      </div>
    );
  }

  const valorTotalOrdem = itens.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade_solicitada), 0);
  const fornObj = Array.isArray(pedidoMestre?.fornecedores) ? pedidoMestre.fornecedores[0] : pedidoMestre?.fornecedores;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-md bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col border border-gray-100">
        
        {/* CABEÇALHO */}
        <div className="mb-5 border-b border-gray-100 pb-4">
          <h1 className="text-[#09797a] font-black text-base uppercase leading-tight">Confirmar Ordem de Compra</h1>
          <p className="text-[11px] text-[#e07a5f] font-bold mt-0.5 font-mono">Ref: {pedidoMestre?.codigo_customizado} | {fornObj?.nome_fantasia || 'Parceiro Commercial'}</p>
        </div>

        {/* ESPECIFICAÇÕES DOS PRODUTOS */}
        <div className="flex-1 flex flex-col gap-3 mb-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-1">Volumes Requeridos</h3>
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-0.5">
            {itens.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50/60 border border-gray-200 rounded-2xl flex justify-between items-center gap-4">
                <div className="truncate max-w-[65%]">
                  <h4 className="text-xs font-bold text-gray-800 leading-snug truncate uppercase">{item.produto_descricao}</h4>
                  <span className="text-[9px] text-gray-400 font-mono font-bold block mt-0.5">Valor Unitário: R$ {item.preco_unitario.toFixed(2)}</span>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                  <span className="text-xs font-black text-[#09797a] bg-white border border-gray-100 px-3 py-1 rounded-xl">
                    {item.quantidade_solicitada} {item.produto_unidade_medida}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 mt-1">R$ {(item.preco_unitario * item.quantidade_solicitada).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VALOR E FECHAMENTO */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase">Valor Líquido da Ordem</span>
            <span className="text-base font-black text-gray-800">R$ {valorTotalOrdem.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={handleFormalizarAceite}
            disabled={processando || itens.length === 0}
            className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md disabled:opacity-50 active:scale-95 transition-all"
          >
            {processando ? 'Processando Confirmação...' : 'Formalizar e Aceitar Pedido'}
          </button>
        </div>

      </div>
    </div>
  );
}