import { useState, useEffect } from 'react';
import { cotacoesService } from './services/cotacoesService';

interface ResponderCotacaoProps {
  token: string;
}

export default function ResponderCotacao({ token }: ResponderCotacaoProps) {
  const [loading, setLoading] = useState(true);
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [itens, setItens] = useState<any[]>([]);
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [prazo, setPrazo] = useState('');
  const [pagamento, setPagamento] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    cotacoesService.obterDetalhesCotacaoPorToken(token)
      .then((res: any) => {
        setFornecedorNome(res.fornecedores?.razao_social || 'Fornecedor');
        
        // Extrai os produtos vinculados de dentro da estrutura relacional
        const itensVinculados = res.cotacoes_mestre?.cotacao_itens_vinculados || [];
        const produtosMapeados = itensVinculados.map((iv: any) => iv.notas_falta?.produtos).filter(Boolean);
        
        setItens(produtosMapeados);
      })
      .catch((err) => {
        console.error(err);
        alert('Este link de cotação é inválido ou já expirou.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prazo || !pagamento) {
      alert('Prazo de entrega e Condições de pagamento são obrigatórios.');
      return;
    }

    const respostasPayload = itens.map(item => ({
      produto_id: item.id,
      preco_ofertado: parseFloat(precos[item.id] || '0')
    }));

    try {
      await cotacoesService.registrarRespostaFornecedor({
        token_acesso: token,
        prazo_entrega_dias: parseInt(prazo),
        condicoes_pagamento: pagamento,
        respostas: respostasPayload
      });
      setSucesso(true);
    } catch (err: any) {
      alert(`Erro ao enviar proposta: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <p className="text-sm font-medium text-gray-500">Carregando formulário comercial...</p>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4 font-sans">
        <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl p-6 text-center">
          <span className="text-4xl block mb-2">🎉</span>
          <h2 className="text-[#09797a] font-black text-lg uppercase">Proposta Enviada!</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Sua tabela de preços e condições comerciais foram registradas com sucesso no painel do comprador. Obrigado!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans">
      <form onSubmit={handleSubmeter} className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-5">
        
        <div>
          <h1 className="text-[#09797a] font-black text-lg uppercase">Portal do Fornecedor</h1>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">Empresa: {fornecedorNome}</p>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-80 border-y border-gray-100 py-3">
          <p className="text-xs font-bold text-gray-700">Informe os valores unitários (R$):</p>
          {itens.map((item) => (
            <div key={item.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-gray-800 uppercase">{item.descricao}</span>
              {item.codigo_barras && (
                <span className="text-[10px] text-gray-400 font-mono font-medium">EAN: {item.codigo_barras}</span>
              )}
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 h-10 mt-1">
                <span className="text-xs text-gray-400 font-bold mr-1.5">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={precos[item.id] || ''}
                  onChange={(e) => setPrecos(prev => ({ ...prev, [item.id]: e.target.value }))}
                  className="w-full h-full text-xs font-bold text-gray-700 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wide">Prazo de Entrega (Dias Úteis)</label>
            <input
              type="number"
              required
              placeholder="Ex: 3"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl h-11 px-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#09797a]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wide">Condições de Pagamento</label>
            <input
              type="text"
              required
              placeholder="Ex: Boleto 28 dias ou Pix"
              value={pagamento}
              onChange={(e) => setPagamento(e.target.value)}
              className="w-full border border-gray-200 rounded-xl h-11 px-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-[#09797a]"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#09797a] text-white py-4 rounded-3xl text-xs font-bold shadow-md active:scale-95 transition-all mt-2"
        >
          Submeter Proposta Oficial
        </button>
      </form>
    </div>
  );
}