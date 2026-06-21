// Arquivo: src/pages/Pedidos/components/FormularQuantidadesPedido.tsx
import { useState, useEffect } from 'react';
import { pedidosService } from '../services/pedidosService';
import type { PedidoMestreDTO, PedidoItemDTO } from '../types/pedidos.types';

export interface FormularQuantidadesPedidoProps {
  pedido: PedidoMestreDTO;
  modoLeitura?: boolean; 
  onVoltar: () => void;
}

export function FormularQuantidadesPedido({ pedido, modoLeitura = false, onVoltar }: FormularQuantidadesPedidoProps) {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<PedidoItemDTO[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarItens() {
      try {
        setLoading(true);
        const dados = await pedidosService.obterDetalhesPedido(pedido.id);
        setItens(dados);
      } catch (err) {
        console.error('Erro ao buscar itens do pedido:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarItens();
  }, [pedido.id]);

  const handleQuantidadeChange = (id: string, valor: string) => {
    if (modoLeitura) return; 
    setItens(prev => prev.map(item => item.id === id ? { ...item, quantidade_solicitada: Number(valor) } : item));
  };

  const handleEnviarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoLeitura) return;
    
    const algumaQuantidadeInvalida = itens.some((x: PedidoItemDTO) => x.quantidade_solicitada <= 0);
    if (algumaQuantidadeInvalida) {
      alert('Por favor, determine uma quantidade maior que zero para todos os itens.');
      return;
    }

    try {
      setSalvando(true);
      await pedidosService.enviarPedidoParaVendedor({
        pedido_id: pedido.id,
        itens: itens.map((x: PedidoItemDTO) => ({
          item_id: x.id,
          quantidade_solicitada: x.quantidade_solicitada
        }))
      });
      alert('🚀 Pedido enviado e link de formalização gerado com sucesso!');
      onVoltar();
    } catch (err: any) {
      alert(`Falha operacional: ${err.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  const valorTotalPedido = itens.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade_solicitada), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Buscando mapa de produtos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <form onSubmit={handleEnviarVendedor} className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)] relative">
        
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
              {modoLeitura ? 'Resumo do Pedido' : 'Estipular Volumes'}
            </h1>
            <p className="text-[10px] text-gray-400 font-mono font-bold">Ordem: {pedido.codigo_customizado}</p>
          </div>
        </div>

        {/* DETALHES DO FORNECEDOR */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] pb-4 flex flex-col gap-3">
          <div className="p-3 bg-teal-50/40 border border-teal-100 rounded-2xl mb-1 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-[#09797a] uppercase tracking-wider block">Fornecedor</span>
              <span className="text-xs font-black text-gray-700 uppercase block mt-0.5">{pedido.fornecedor_nome_fantasia}</span>
            </div>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${
              pedido.status === 'Pedido Feito' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {pedido.status === 'Pedido Feito' ? 'Concluído' : pedido.status === 'Falta Pedir' ? 'Aberto' : 'Pendente'}
            </span>
          </div>

          {/* LISTAGEM DE ITENS */}
          {itens.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-3xl p-4 bg-gray-50/40 flex flex-col gap-3 shadow-sm">
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase leading-tight">{item.produto_descricao}</h4>
                <div className="flex justify-between items-center mt-1">
                  {item.produto_codigo_barras && <span className="text-[9px] text-gray-400 font-mono font-bold">EAN: {item.produto_codigo_barras}</span>}
                  <span className="text-[10px] text-gray-500 font-bold bg-white px-2 py-0.5 border border-gray-100 rounded-lg">Custo Unitário: R$ {item.preco_unitario.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 focus-within:border-[#09797a]">
                <div className="flex items-center gap-1 w-full">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Qtd:</span>
                  <input
                    type="number"
                    required
                    disabled={modoLeitura}
                    readOnly={modoLeitura} 
                    value={item.quantidade_solicitada || ''}
                    onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                    placeholder="0"
                    className={`w-full text-xs font-black text-gray-800 focus:outline-none bg-transparent ${modoLeitura ? 'cursor-default' : ''}`}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase shrink-0">
                  {item.produto_unidade_medida}
                </span>
              </div>

              <div className="flex justify-between items-center px-1 text-[10px] text-gray-400 font-bold">
                <span>Subtotal do Item:</span>
                <span className="text-gray-700 font-black">R$ {(item.preco_unitario * item.quantidade_solicitada).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div className="pt-4 border-t border-gray-100 mt-auto flex flex-col gap-3 bg-white w-full">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-gray-400 uppercase">Total Geral do Pedido</span>
            <span className="text-sm font-black text-[#09797a]">R$ {valorTotalPedido.toFixed(2)}</span>
          </div>

          {modoLeitura ? (
            <button
              type="button"
              onClick={onVoltar}
              className="w-full border border-[#09797a] text-[#09797a] py-4 rounded-3xl text-xs font-black shadow-sm text-center"
            >
              Voltar ao Painel
            </button>
          ) : (
            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md flex justify-center items-center"
            >
              {salvando ? 'Processando Ordem...' : 'Fechar Quantidades e Gerar Link'}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}