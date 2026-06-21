import { useState, useEffect } from 'react';
import { pedidosService } from './services/pedidosService';
import type { PedidoMestreDTO } from './types/pedidos.types';
import { FormularQuantidadesPedido } from './components/FormularQuantidadesPedido';

interface PedidosProps {
  usuarioLogadoId: string;
  onVoltarParaHome: () => void;
}

export function Pedidos({ onVoltarParaHome }: PedidosProps) {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<PedidoMestreDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'Falta Pedir' | 'Pendente Confirmação Vendedor' | 'Pedido Feito'>('Falta Pedir');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoMestreDTO | null>(null);

  async function carregarPedidos() {
    try {
      setLoading(true);
      const dados = await pedidosService.listarPedidos();
      setPedidos(dados);
    } catch (err) {
      console.error('Erro ao listar ordens de compra:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  const pedidosFiltrados = pedidos.filter(p => p.status === activeTab);

  if (pedidoSelecionado && activeTab === 'Falta Pedir') {
    return (
      <FormularQuantidadesPedido
        pedido={pedidoSelecionado}
        onVoltar={() => {
          setPedidoSelecionado(null);
          carregarPedidos();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full mb-5 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">Pedidos</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gerenciamento de Ordens de Compra</p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE STATUS (ESTEIRA REATIVA) */}
        <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-2xl mb-5 select-none">
          {(['Falta Pedir', 'Pendente Confirmação Vendedor', 'Pedido Feito'] as const).map((tab) => {
            const count = pedidos.filter(p => p.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 text-[10px] font-black rounded-xl uppercase transition-all tracking-tight ${
                  activeTab === tab 
                    ? 'bg-[#09797a] text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'Falta Pedir' && 'Falta Pedir'}
                {tab === 'Pendente Confirmação Vendedor' && 'Pendentes'}
                {tab === 'Pedido Feito' && 'Concluídos'}
                <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-230px)] pb-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-center text-gray-400 text-xs font-bold py-10">Processando ordens de fornecimento...</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-medium py-10">Nenhum pedido nesta etapa.</p>
          ) : (
            pedidosFiltrados.map((pedido) => (
              <div
                key={pedido.id}
                onClick={() => activeTab === 'Falta Pedir' && setPedidoSelecionado(pedido)}
                className={`border border-gray-200 rounded-3xl p-4 bg-gray-50/40 transition-all flex justify-between items-center shadow-sm ${
                  activeTab === 'Falta Pedir' ? 'cursor-pointer hover:border-[#09797a] active:scale-[0.99]' : 'select-text'
                }`}
              >
                <div className="flex flex-col gap-1 truncate max-w-[70%]">
                  <span className="text-[10px] text-gray-400 font-mono font-black uppercase">Ordem: {pedido.codigo_customizado}</span>
                  <span className="text-xs font-black text-gray-700 truncate uppercase">{pedido.fornecedor_nome_fantasia}</span>
                  <span className="text-[10px] text-gray-400 font-medium">👤 Vendedor: {pedido.vendedor_nome}</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {activeTab === 'Pendente Confirmação Vendedor' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}?pedidoToken=${pedido.token_acesso}`);
                        alert('🔗 Link de formalização copiado para envio!');
                      }}
                      className="text-[9px] bg-[#e07a5f] text-white font-black px-2.5 py-1 rounded-xl shadow-sm active:scale-90 transition-all"
                    >
                      Copiar Link
                    </button>
                  )}
                  {activeTab === 'Pedido Feito' && pedido.formalizado_em && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded-xl uppercase">
                      ✓ Feito
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 font-mono font-bold">
                    {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}