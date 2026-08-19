// src/pages/ConsumoLoja/components/NovoRegistroConsumo.tsx
import { useState, useEffect } from 'react';
import { consumoLojaService } from '../services/consumoLojaService';
import type { ProdutoBusca, ItemConsumoForm } from '../types/consumoLoja.types';

const LOCAIS_OPCOES = [
  'Frente de Loja',
  'Crediário',
  'Limpeza',
  'Escritório',
  'Depósito',
  'Açougue',
  'Padaria',
  'Hortifruti'
];

interface Props {
  usuarioId: string;
  onVoltar: () => void;
  onSucesso: () => void;
}

export default function NovoRegistroConsumo({ usuarioId, onVoltar, onSucesso }: Props) {
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<ProdutoBusca[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoBusca | null>(null);

  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [local, setLocal] = useState(LOCAIS_OPCOES[0]);
  const [departamento, setDepartamento] = useState('');
  const [custoUnitario, setCustoUnitario] = useState<number>(0);
  const [observacaoItem, setObservacaoItem] = useState('');
  const [observacaoGeral] = useState('');

  const [itens, setItens] = useState<ItemConsumoForm[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!busca.trim() || produtoSelecionado) {
      setSugestoes([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const resultados = await consumoLojaService.buscarProdutos(busca);
        setSugestoes(resultados || []);
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [busca, produtoSelecionado]);

  const handleSelectProduto = (prod: ProdutoBusca) => {
    setProdutoSelecionado(prod);
    setBusca(`${prod.codprod} - ${prod.descricao}`);
    setDepartamento(prod.departamento || 'Sem Departamento');
    setCustoUnitario(Number(prod.custoreal || 0));
    setSugestoes([]);
  };

  const handleAdicionarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }

    const qtd = Number(quantidade || 1);
    const novoItem: ItemConsumoForm = {
      produto_id: produtoSelecionado.id,
      codprod: produtoSelecionado.codprod,
      descricao: produtoSelecionado.descricao,
      quantidade: qtd,
      unidade_medida: produtoSelecionado.unidade || 'UN',
      local,
      departamento,
      custo_unitario: custoUnitario,
      valor_total_item: custoUnitario * qtd,
      observacao: observacaoItem.trim() || undefined
    };

    setItens((prev) => [...prev, novoItem]);

    setProdutoSelecionado(null);
    setBusca('');
    setQuantidade(1);
    setDepartamento('');
    setCustoUnitario(0);
    setObservacaoItem('');
  };

  const handleRemoverItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleSalvar = async () => {
    if (itens.length === 0) {
      alert('Adicione ao menos um item à lista antes de salvar.');
      return;
    }

    try {
      setSalvando(true);
      await consumoLojaService.salvarRegistroConsumo(usuarioId, itens, observacaoGeral.trim() || undefined);
      alert('Consumo registrado com sucesso!');
      onSucesso();
    } catch (err: any) {
      alert('Erro ao salvar registro de consumo: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const totalGeral = itens.reduce((acc, curr) => acc + curr.valor_total_item, 0);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltar}
              className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">NOVO REGISTRO DE CONSUMO</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Lançamento Interno de Materiais e Insumos
              </p>
            </div>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form onSubmit={handleAdicionarItem} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            1. Dados do Produto
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Produto *</label>
              <input
                type="text"
                required
                placeholder="Busque por código do sistema, código de barras ou descrição..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setProdutoSelecionado(null);
                }}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
              />

              {sugestoes.length > 0 && !produtoSelecionado && (
                <div className="absolute top-16 left-0 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {sugestoes.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectProduto(prod)}
                      className="w-full text-left p-3 hover:bg-teal-50/60 flex justify-between items-center text-xs font-bold text-slate-800 uppercase"
                    >
                      <div>
                        <div>{prod.codprod} - {prod.descricao}</div>
                        <span className="text-[10px] text-slate-400 font-mono">Depto: {prod.departamento || '-'}</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-emerald-800">
                        Custo: R$ {Number(prod.custoreal || 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade (UN) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantidade}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setQuantidade(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 text-center font-bold text-slate-800 focus:border-[#09797a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Local *</label>
              <select
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase focus:border-[#09797a]"
              >
                {LOCAIS_OPCOES.map((loc) => (
                  <option key={loc} value={loc}>{loc.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
              <input
                type="text"
                readOnly
                placeholder="Preenchimento automático"
                value={departamento}
                className="w-full h-10 text-xs bg-slate-100 border border-slate-200 px-3 rounded-xl font-bold text-slate-600 uppercase cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (Custo Unitário)</label>
              <input
                type="text"
                readOnly
                value={custoUnitario > 0 ? `R$ ${custoUnitario.toFixed(2)}` : 'R$ 0,00'}
                className="w-full h-10 text-xs bg-slate-100 border border-slate-200 px-3 text-right font-mono font-black text-emerald-900 rounded-xl cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Observação do Item</label>
            <input
              type="text"
              placeholder="Ex: Utilizado para limpeza da área de vendas..."
              value={observacaoItem}
              onChange={(e) => setObservacaoItem(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
            />
          </div>

          <button
            type="submit"
            disabled={!produtoSelecionado}
            className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 mt-1"
          >
            + Adicionar à Lista
          </button>
        </form>

        {/* ITENS ADICIONADOS */}
        <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
          <span className="text-[10px] font-black uppercase text-slate-400 block px-1">
            Itens no Registro Atual ({itens.length})
          </span>

          {itens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
              Nenhum item adicionado ainda. Preencha os dados acima e clique em "Adicionar à Lista".
            </div>
          ) : (
            itens.map((it, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded">
                      {it.codprod}
                    </span>
                    <span className="uppercase text-slate-800">{it.descricao}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Local: <strong className="text-slate-700">{it.local}</strong> • Depto: <strong className="text-slate-700">{it.departamento}</strong> • Qtd: <strong className="text-slate-700">{it.quantidade} {it.unidade_medida}</strong>
                  </div>
                  {it.observacao && (
                    <p className="text-[9px] text-slate-400 italic mt-0.5">Obs: {it.observacao}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-emerald-800 font-black text-sm">
                    {it.valor_total_item.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoverItem(idx)}
                    className="w-7 h-7 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RODAPÉ */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-3">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex justify-between items-center">
            <span className="text-xs font-black text-emerald-950 uppercase">Valor Total do Consumo:</span>
            <span className="font-mono text-base sm:text-lg font-black text-emerald-900">
              {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onVoltar}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando || itens.length === 0}
              onClick={handleSalvar}
              className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}