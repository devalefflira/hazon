// Arquivo: src/pages/Cotacoes/ResponderCotacao.tsx
import { useState, useEffect } from 'react';
import { cotacoesService } from './services/cotacoesService';

interface ResponderCotacaoProps {
  token: string;
}

interface ItemForm {
  id: string;
  descricao: string;
  codigo_barras: string | null;
  unidade_medida: string;
  preco: string;
}

export function ResponderCotacao({ token }: ResponderCotacaoProps) {
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [submetendo, setSubmetendo] = useState(false);

  const [fornecedorNome, setFornecedorNome] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([]);

  useEffect(() => {
    async function carregarFormulario() {
      try {
        setLoading(true);
        const dados = await cotacoesService.obterDetalhesCotacaoPorToken(token);

        if (dados.respondido_em) {
          setSucesso(true);
          return;
        }

        setFornecedorNome(dados.fornecedor_nome);
        setPrazoEntrega(dados.prazo_entrega_dias ? String(dados.prazo_entrega_dias) : '');
        setCondicoesPagamento(dados.condicoes_pagamento);

        const itensIniciais = dados.itens.map((item: any) => ({
          id: item.id,
          descricao: item.descricao,
          codigo_barras: item.codigo_barras,
          unidade_medida: item.unidade_medida,
          preco: ''
        }));
        setItens(itensIniciais);
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Erro ao carregar link de cotação.');
      } finally {
        setLoading(false);
      }
    }
    if (token) carregarFormulario();
  }, [token]);

  const handlePrecoChange = (id: string, valor: string) => {
    setItens(prev => prev.map(item => item.id === id ? { ...item, preco: valor } : item));
  };

  const handleEnviarResposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prazoEntrega || !condicoesPagamento) {
      alert('Preencha o prazo de entrega e as condições de pagamento.');
      return;
    }

    const precosPreenchidos = itens.every(item => item.preco && Number(item.preco) > 0);
    if (!precosPreenchidos) {
      alert('Informe um preço válido maior que zero para todos os itens.');
      return;
    }

    try {
      setSubmetendo(true);
      await cotacoesService.registrarRespostaFornecedor({
        token_acesso: token,
        prazo_entrega_dias: Number(prazoEntrega),
        condicoes_pagamento: condicoesPagamento,
        respostas: itens.map(item => ({
          produto_id: item.id,
          preco_ofertado: Number(item.preco)
        }))
      });
      setSucesso(true);
    } catch (err: any) {
      alert(`Erro: ${err.message || err}`);
    } finally {
      setSubmetendo(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Buscando caderno de encargos...</p>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-4xl shadow-xl p-8 text-center border border-gray-100">
          <span className="text-5xl block mb-3">🤝</span>
          <h2 className="text-[#09797a] font-black text-xl uppercase tracking-wide">Proposta Recebida!</h2>
          <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">
            Seus preços foram consolidados no painel de auditoria do comprador do Hazon ERP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <form onSubmit={handleEnviarResposta} className="w-full max-w-md bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col border border-gray-100">
        <div className="mb-5 border-b border-gray-100 pb-4">
          <h1 className="text-[#09797a] font-black text-base uppercase leading-tight">Proposta Comercial</h1>
          <p className="text-[11px] text-[#e07a5f] font-bold mt-0.5 font-mono">{fornecedorNome}</p>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Prazo de Entrega (Dias Úteis)</label>
            <input type="number" required value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="Ex: 3" className="w-full text-xs bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl focus:outline-none focus:border-[#09797a] font-medium" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Forma / Condição de Pagamento</label>
            <input type="text" required value={condicoesPagamento} onChange={(e) => setConditionsPagamentoLocal(e.target.value)} placeholder="Ex: Boleto 30 dias" className="w-full text-xs bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl focus:outline-none focus:border-[#09797a] font-medium" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 mb-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-1">Produtos Solicitados</h3>
          <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-0.5">
            {itens.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col gap-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 leading-snug">{item.descricao}</h4>
                  <span className="text-[9px] text-gray-400 font-mono font-bold">UM: {item.unidade_medida}</span>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-[#09797a]">
                  <span className="text-xs font-bold text-gray-400">R$</span>
                  <input type="number" step="0.01" required value={item.preco} onChange={(e) => handlePrecoChange(item.id, e.target.value)} placeholder="0,00" className="w-full text-xs font-black text-gray-800 focus:outline-none bg-transparent" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submetendo} className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold disabled:opacity-50">
          {submetendo ? 'Submetendo Proposta...' : 'Enviar Preços'}
        </button>
      </form>
    </div>
  );

  function setConditionsPagamentoLocal(val: string) {
    setCondicoesPagamento(val || '');
  }
}