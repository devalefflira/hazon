// src/pages/Avarias/components/RegistrarAvariaLote.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { avariasService } from '../services/avariasService';

interface ItemLote {
  produto_id: string;
  codprod: string;
  descricao: string;
  unidade: string;
  custoreal: number;
  departamento?: string;
  quantidade: number;
}

interface RegistrarAvariaLoteProps {
  onVoltar: () => void;
  onSucesso: () => void;
  usuarioLogadoId?: string;
}

const DESTINACOES_OPCOES = [
  'Descarte',
  'Troca Fornecedor',
  'Consumo Interno',
  'Doação'
];

const MOTIVOS_PADRAO = [
  { id: 'm1', descricao: 'Avaria (Geral)' },
  { id: 'm2', descricao: 'Vencimento' },
  { id: 'm3', descricao: 'Erros no Manuseio e Empilhamento' },
  { id: 'm4', descricao: 'Quebra da Cadeia do Frio (Ruptura Térmica)' },
  { id: 'm5', descricao: 'Embalagens Inadequadas ou Fragilizadas' },
  { id: 'm6', descricao: 'Pragas Urbanas e Roedores' }
];

export default function RegistrarAvariaLote({
  onVoltar,
  onSucesso,
  usuarioLogadoId
}: RegistrarAvariaLoteProps) {
  // Parâmetros Globais do Lote
  const [motivosLista, setMotivosLista] = useState<any[]>(MOTIVOS_PADRAO);
  const [motivoId, setMotivoId] = useState('');
  const [destinacao, setDestinacao] = useState(DESTINACOES_OPCOES[0]);
  const [observacaoGeral, setObservacaoGeral] = useState('');

  // Busca do Produto Atual
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [quantidadeAtual, setQuantidadeAtual] = useState<number | ''>(1);

  // Lista Prévia de Itens do Lote
  const [itensLote, setItensLote] = useState<ItemLote[]>([]);
  const [salvando, setSalvando] = useState(false);

  const inputQtdRef = useRef<HTMLInputElement>(null);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Carrega motivos reais do banco
  useEffect(() => {
    avariasService.listarMotivosAvaria()
      .then((dados) => {
        if (dados && dados.length > 0) {
          setMotivosLista(dados);
          setMotivoId(dados[0].id);
        } else {
          setMotivoId(MOTIVOS_PADRAO[0].id);
        }
      })
      .catch(() => setMotivoId(MOTIVOS_PADRAO[0].id));
  }, []);

  // Autocomplete com curinga %
  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await avariasService.buscarProdutos(termoBusca);
        setProdutosEncontrados(res || []);
      } catch (err) {
        console.error('Erro na busca de produtos:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  // Adicionar produto à lista prévia
  const handleAdicionarItem = () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto antes de adicionar.');
      return;
    }

    const qtdNumerica = Number(quantidadeAtual);
    if (!qtdNumerica || qtdNumerica <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    // Se o item já estiver no lote, apenas incrementa a quantidade
    setItensLote((prev) => {
      const idx = prev.findIndex((it) => it.produto_id === produtoSelecionado.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx].quantidade += qtdNumerica;
        return copia;
      }

      return [
        {
          produto_id: produtoSelecionado.id,
          codprod: produtoSelecionado.codprod,
          descricao: produtoSelecionado.descricao,
          unidade: produtoSelecionado.unidade || 'UN',
          custoreal: Number(produtoSelecionado.custoreal || 0),
          departamento: produtoSelecionado.departamento,
          quantidade: qtdNumerica
        },
        ...prev
      ];
    });

    // Limpa os campos de inserção para o próximo bip/digitação
    setProdutoSelecionado(null);
    setTermoBusca('');
    setQuantidadeAtual(1);
    inputBuscaRef.current?.focus();
  };

  // Alterar quantidade direto na linha
  const handleEditarQuantidade = (produtoId: string, novaQtd: number) => {
    if (novaQtd <= 0) return;
    setItensLote((prev) =>
      prev.map((it) => (it.produto_id === produtoId ? { ...it, quantidade: novaQtd } : it))
    );
  };

  // Remover item individual da lista
  const handleRemoverItem = (produtoId: string) => {
    setItensLote((prev) => prev.filter((it) => it.produto_id !== produtoId));
  };

  // Totalizadores do Lote
  const totalPerdaLote = useMemo(() => {
    return itensLote.reduce((acc, it) => acc + it.quantidade * it.custoreal, 0);
  }, [itensLote]);

  const totalUnidadesLote = useMemo(() => {
    return itensLote.reduce((acc, it) => acc + it.quantidade, 0);
  }, [itensLote]);

  // Submissão do Lote
  const handleSalvarLote = async () => {
    if (itensLote.length === 0) {
      alert('Adicione pelo menos um produto à lista.');
      return;
    }
    if (!motivoId) {
      alert('Selecione o motivo da avaria.');
      return;
    }

    try {
      setSalvando(true);
      await avariasService.registrarAvariasEmLote({
        motivo_avaria_id: motivoId,
        destinacao,
        observacao: observacaoGeral.trim(),
        usuario_id: usuarioLogadoId,
        itens: itensLote.map((it) => ({
          produto_id: it.produto_id,
          quantidade: it.quantidade,
          preco_custo_na_perda: it.custoreal,
          unidade: it.unidade,
          departamento: it.departamento
        }))
      });

      alert(`${itensLote.length} produtos registrados em avaria com sucesso!`);
      onSucesso();
    } catch (err: any) {
      alert('Erro ao salvar lote: ' + (err.message || 'Erro inesperado'));
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header com Botão de Voltar */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVoltar}
            className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none cursor-pointer"
          >
            ←
          </button>
          <div>
            <h1 className="text-[#09797a] font-black text-base sm:text-xl leading-none uppercase">
              REGISTRO EM LOTE
            </h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
              Lançamento Conjunto com Mesmo Motivo e Destino
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 1: PARÂMETROS COMUNS DO LOTE */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          1. Parâmetros Gerais do Lote
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Motivo da Avaria *
            </label>
            <select
              value={motivoId}
              onChange={(e) => setMotivoId(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-slate-300 px-3 rounded-xl font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
            >
              {motivosLista.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.descricao.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Destinação *
            </label>
            <select
              value={destinacao}
              onChange={(e) => setDestinacao(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-slate-300 px-3 rounded-xl font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
            >
              {DESTINACOES_OPCOES.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
            Observação do Lote (Opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Quebra de lote durante descarga no depósito..."
            value={observacaoGeral}
            onChange={(e) => setObservacaoGeral(e.target.value)}
            className="w-full h-10 text-xs bg-white border border-slate-300 px-3 rounded-xl font-bold text-slate-800 outline-none focus:border-[#09797a]"
          />
        </div>
      </div>

      {/* BLOCO 2: BUSCADOR E BOTÃO DE ADIÇÃO (+) */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3 shadow-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          2. Inserir Produtos no Lote
        </span>

        <div className="flex flex-col sm:flex-row gap-2 items-end">
          {/* Campo de Busca Universal */}
          <div className="flex-1 w-full flex flex-col gap-1 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Produto (Código, EAN, Descrição ou %)
            </label>
            <input
              ref={inputBuscaRef}
              type="text"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                setProdutoSelecionado(null);
              }}
              placeholder="Bipe o código de barras ou busque o item..."
              className="w-full h-11 text-xs bg-white border border-slate-300 px-3 rounded-2xl font-bold text-slate-800 outline-none focus:border-[#09797a]"
            />

            {/* Dropdown de Autocomplete */}
            {produtosEncontrados.length > 0 && !produtoSelecionado && (
              <div className="absolute top-16 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-30 divide-y divide-slate-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setTermoBusca(`${p.codprod} - ${p.descricao}`);
                      setProdutosEncontrados([]);
                      inputQtdRef.current?.focus();
                      inputQtdRef.current?.select();
                    }}
                    className="w-full text-left p-3 hover:bg-teal-50 flex justify-between items-center text-xs font-bold text-slate-800 uppercase"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate">{p.codprod} - {p.descricao}</div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        EAN: {p.codbarra || '-'} • Custo: R$ {Number(p.custoreal || 0).toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[#09797a] font-black whitespace-nowrap">+ Escolher</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantidade */}
          <div className="w-full sm:w-28 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Qtd
            </label>
            <input
              ref={inputQtdRef}
              type="number"
              min={0.01}
              step="any"
              value={quantidadeAtual}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdicionarItem();
                }
              }}
              onChange={(e) => {
                const v = e.target.value;
                setQuantidadeAtual(v === '' ? '' : Number(v));
              }}
              className="w-full h-11 text-xs bg-white border border-slate-300 px-2 rounded-2xl font-black text-slate-800 text-center outline-none focus:border-[#09797a]"
            />
          </div>

          {/* Botão Rápido de Adicionar (+) */}
          <button
            type="button"
            onClick={handleAdicionarItem}
            className="w-full sm:w-11 h-11 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl font-black text-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer flex-shrink-0"
            title="Adicionar ao Lote"
          >
            +
          </button>
        </div>
      </div>

      {/* BLOCO 3: LISTAGEM PRÉVIA DE CONFERÊNCIA DO LOTE */}
      <div className="flex-1 flex flex-col gap-2 min-h-[220px]">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-black uppercase text-slate-700 tracking-wide">
            Itens no Lote ({itensLote.length})
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500">
            Total Qtd: <strong>{totalUnidadesLote}</strong> • Total Perda:{' '}
            <strong className="text-red-700 font-black">
              R$ {totalPerdaLote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>

        {itensLote.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs font-bold italic">
            Nenhum produto adicionado. Use a busca acima e clique em "+" para montar o lote.
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-1">
            {itensLote.map((it) => {
              const subtotalItem = it.quantidade * it.custoreal;

              return (
                <div
                  key={it.produto_id}
                  className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      CÓD: {it.codprod}
                    </span>
                    <h4 className="font-black text-xs text-slate-800 uppercase truncate">
                      {it.descricao}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Custo Unit: R$ {it.custoreal.toFixed(2)} • Subtotal:{' '}
                      <strong className="text-red-700">R$ {subtotalItem.toFixed(2)}</strong>
                    </span>
                  </div>

                  {/* Edição Rápida de Quantidade e Exclusão */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                      <input
                        type="number"
                        min={0.01}
                        step="any"
                        value={it.quantidade}
                        onChange={(e) => handleEditarQuantidade(it.produto_id, Number(e.target.value))}
                        className="w-14 text-xs font-black text-center bg-transparent outline-none font-mono"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {it.unidade}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoverItem(it.produto_id)}
                      className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center text-xs transition-all cursor-pointer"
                      title="Excluir item do lote"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 4: BOTÕES CANCELAR E SALVAR */}
      <div className="pt-2 border-t border-slate-100 flex gap-2">
        <button
          type="button"
          onClick={onVoltar}
          className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold uppercase transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={salvando || itensLote.length === 0}
          onClick={handleSalvarLote}
          className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>📦</span>
          <span>{salvando ? 'Salvando Lote...' : `Salvar Avarias em Lote (${itensLote.length})`}</span>
        </button>
      </div>
    </div>
  );
}