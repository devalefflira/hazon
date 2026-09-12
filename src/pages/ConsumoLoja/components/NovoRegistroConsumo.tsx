// src/pages/ConsumoLoja/components/NovoRegistroConsumo.tsx
import { useState } from 'react';
import { consumoLojaService } from '../services/consumoLojaService';
import { LOCAIS_CONSUMO, type FinalidadeConsumo, type ItemConsumoForm } from '../types/consumoLoja.types';

interface Props {
  usuarioId: string;
  onVoltar: () => void;
  onSalvoSucesso: () => void;
}

export default function NovoRegistroConsumo({ usuarioId, onVoltar, onSalvoSucesso }: Props) {
  // Etapa 1: Definição de Contexto
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [localEscolhido, setLocalEscolhido] = useState<string>(LOCAIS_CONSUMO[0]);
  const [finalidadeEscolhida, setFinalidadeEscolhida] = useState<FinalidadeConsumo>('Consumo/Despesa');

  // Etapa 2: Formulário de Itens
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacaoItem, setObservacaoItem] = useState('');
  const [produtoProduzido, setProdutoProduzido] = useState('');

  // Itens na Grade do Lote
  const [itensLote, setItensLote] = useState<ItemConsumoForm[]>([]);
  const [salvando, setSalvando] = useState(false);

  const handleBuscarProdutos = async (termo: string) => {
    setTermoBusca(termo);
    if (!termo.trim()) {
      setProdutosEncontrados([]);
      return;
    }
    try {
      const prods = await consumoLojaService.buscarProdutos(termo);
      setProdutosEncontrados(prods);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelecionarProduto = (p: any) => {
    setProdutoSelecionado(p);
    setTermoBusca(`${p.codprod} - ${p.descricao}`);
    setProdutosEncontrados([]);
  };

  const handleAdicionarItem = () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto da busca.');
      return;
    }
    if (quantidade <= 0) {
      alert('Informe uma quantidade maior que zero.');
      return;
    }
    if (finalidadeEscolhida === 'Uso na Produção/Transformação' && !produtoProduzido.trim()) {
      alert('O campo "Qual Produto será Produzido?" é obrigatório para produção.');
      return;
    }

    const custo = Number(produtoSelecionado.custoreal || 0);
    const subtotal = quantidade * custo;

    const novoItem: ItemConsumoForm = {
      produto_id: produtoSelecionado.id,
      codprod: produtoSelecionado.codprod,
      descricao: produtoSelecionado.descricao,
      quantidade,
      unidade_medida: produtoSelecionado.unidade || 'UN',
      local: localEscolhido,
      departamento: produtoSelecionado.departamento || 'Geral',
      custo_unitario: custo,
      valor_total_item: subtotal,
      observacao: observacaoItem.trim() || undefined,
      finalidade: finalidadeEscolhida,
      produto_produzido: finalidadeEscolhida === 'Uso na Produção/Transformação' ? produtoProduzido.trim() : undefined
    };

    setItensLote((prev) => [...prev, novoItem]);

    // Reseta inputs parciais
    setProdutoSelecionado(null);
    setTermoBusca('');
    setQuantidade(1);
    setObservacaoItem('');
    setProdutoProduzido('');
  };

  const handleRemoverItem = (idx: number) => {
    setItensLote((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSalvarFinal = async () => {
    if (itensLote.length === 0) {
      alert('Adicione ao menos um item antes de salvar.');
      return;
    }
    try {
      setSalvando(true);
      await consumoLojaService.salvarRegistroConsumo(
        usuarioId,
        localEscolhido,
        finalidadeEscolhida,
        itensLote
      );
      onSalvoSucesso();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const totalGeral = itensLote.reduce((acc, curr) => acc + curr.valor_total_item, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-5 sm:p-8 flex flex-col gap-6">

        {/* Topo / Voltar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltar}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                Novo Registro de Saída
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {etapa === 1 ? 'Etapa 1: Definição de Destino e Finalidade' : `Etapa 2: Lançamento de Itens (${localEscolhido})`}
              </p>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
            finalidadeEscolhida === 'Uso na Produção/Transformação'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-teal-50 text-[#09797a] border border-teal-200'
          }`}>
            {finalidadeEscolhida}
          </span>
        </div>

        {/* ETAPA 1: ESCOLHA DE LOCAL E FINALIDADE */}
        {etapa === 1 ? (
          <div className="flex flex-col gap-6 py-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-2">
                1. Selecione o Local / Setor Solicitante
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LOCAIS_CONSUMO.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocalEscolhido(loc)}
                    className={`p-3.5 rounded-2xl border text-xs font-black uppercase transition-all flex items-center justify-center text-center ${
                      localEscolhido === loc
                        ? 'bg-[#09797a] text-white border-[#09797a] shadow-md shadow-teal-900/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block mb-2">
                2. Finalidade da Saída
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setFinalidadeEscolhida('Consumo/Despesa')}
                  className={`cursor-pointer p-4 rounded-3xl border-2 transition-all flex flex-col gap-1.5 ${
                    finalidadeEscolhida === 'Consumo/Despesa'
                      ? 'border-[#09797a] bg-teal-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-800 uppercase">
                      Consumo / Despesa Operacional
                    </span>
                    <span className="text-xl">🛒</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Materiais de limpeza, expediente ou uso direto no setor. <strong>Deduz do limite mensal do setor</strong>.
                  </p>
                </div>

                <div
                  onClick={() => setFinalidadeEscolhida('Uso na Produção/Transformação')}
                  className={`cursor-pointer p-4 rounded-3xl border-2 transition-all flex flex-col gap-1.5 ${
                    finalidadeEscolhida === 'Uso na Produção/Transformação'
                      ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-800 uppercase">
                      Uso na Produção / Transformação
                    </span>
                    <span className="text-xl">🥖</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Insumos e matérias-primas que viram outro produto acabado. <strong>Não reduz o teto de gastos do setor</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onVoltar}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setEtapa(2)}
                className="px-6 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all"
              >
                Avançar para Itens →
              </button>
            </div>
          </div>
        ) : (
          /* ETAPA 2: LANÇAMENTO DE ITENS */
          <div className="flex flex-col gap-5">
            {/* Contexto Rápido */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Local Selecionado</span>
                <span className="text-xs font-black text-slate-800">{localEscolhido}</span>
              </div>
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="text-[11px] font-bold text-[#09797a] hover:underline uppercase"
              >
                Alterar Contexto
              </button>
            </div>

            {/* Inputs de Adição */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Adicionar Produto ao Lote
              </span>

              {/* Autocomplete */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                  Pesquisar Produto (Cód, Barras ou Descrição %)
                </label>
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => handleBuscarProdutos(e.target.value)}
                  placeholder="Digite para pesquisar..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
                />

                {produtosEncontrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 flex flex-col">
                    {produtosEncontrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelecionarProduto(p)}
                        className="p-2.5 text-left border-b border-slate-100 hover:bg-teal-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-800">{p.descricao}</span>
                          <span className="text-[10px] text-slate-400 ml-2">Cód: {p.codprod}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-teal-800">
                          R$ {Number(p.custoreal || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantidade e Custo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Custo Unitário (R$)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`R$ ${Number(produtoSelecionado?.custoreal || 0).toFixed(2).replace('.', ',')}`}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Subtotal Estimado
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`R$ ${(quantidade * Number(produtoSelecionado?.custoreal || 0)).toFixed(2).replace('.', ',')}`}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-teal-900"
                  />
                </div>
              </div>

              {/* Campo Obrigatório para Produção */}
              {finalidadeEscolhida === 'Uso na Produção/Transformação' ? (
                <div>
                  <label className="text-[10px] font-black uppercase text-amber-700 block mb-1">
                    * Qual Produto será Produzido? (Obrigatório)
                  </label>
                  <input
                    type="text"
                    value={produtoProduzido}
                    onChange={(e) => setProdutoProduzido(e.target.value)}
                    placeholder="Ex: Pão Francês, Bolo de Cenoura, Frango Assado..."
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Observação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observacaoItem}
                    onChange={(e) => setObservacaoItem(e.target.value)}
                    placeholder="Ex: Limpeza do balcão de frios"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAdicionarItem}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                + Adicionar Item à Lista
              </button>
            </div>

            {/* Tabela / Lista dos Itens do Lote */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                Itens a Registrar ({itensLote.length})
              </span>

              {itensLote.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                  Nenhum item adicionado ao lote ainda.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {itensLote.map((it, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 uppercase">
                          {it.descricao}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {it.quantidade} {it.unidade_medida} x R$ {it.custo_unitario.toFixed(2).replace('.', ',')} = <strong className="text-slate-800">R$ {it.valor_total_item.toFixed(2).replace('.', ',')}</strong>
                        </span>
                        {it.produto_produzido && (
                          <span className="text-[10px] text-amber-700 font-bold mt-0.5">
                            Produz: {it.produto_produzido}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoverItem(idx)}
                        className="text-red-500 hover:text-red-700 font-black text-sm p-1.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé com Totais e Salvar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-black uppercase text-slate-400">Total do Lançamento:</span>
                <span className="text-xl font-black font-mono text-[#09797a]">
                  R$ {totalGeral.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onVoltar}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvando || itensLote.length === 0}
                  onClick={handleSalvarFinal}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md active:scale-95 transition-all"
                >
                  {salvando ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}