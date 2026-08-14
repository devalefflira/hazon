// Arquivo: src/pages/Vencimentos/index.tsx
import { useState, useEffect } from 'react';
import { vencimentosService } from './services/vencimentosService';
import type { VencimentoItem } from './services/vencimentosService';

interface VencimentosProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
  onDirecionarParaAvaria?: (produtoPreDefinido: any) => void;
}

export default function Vencimentos({
  onVoltarParaHome,
  usuarioLogado,
  onDirecionarParaAvaria
}: VencimentosProps) {
  const [itens, setItens] = useState<VencimentoItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Abas
  const [abaPrincipal, setAbaPrincipal] = useState<'A_VENCER' | 'VENCIDOS'>('A_VENCER');
  const [subAbaAVencer, setSubAbaAVencer] = useState<'CRITICO' | 'ALERTA' | 'NORMAL'>('CRITICO');

  // Modal Novo Controle
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [lote, setLote] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const lista = await vencimentosService.listarTodosVencimentos();
      setItens(lista);
    } catch (err) {
      console.error('Erro ao carregar vencimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Autocomplete de Produto
  useEffect(() => {
    if (!termoBuscaProduto.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await vencimentosService.buscarProdutos(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto, produtoSelecionado]);

  // Cálculo automático de dias para vencer no modal
  const calcularDiasModal = () => {
    if (!dataValidade) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVal = new Date(dataValidade + 'T00:00:00');
    const difTempo = dataVal.getTime() - hoje.getTime();
    return Math.ceil(difTempo / (1000 * 60 * 60 * 24));
  };

  const diasModal = calcularDiasModal();

  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }
    if (!dataValidade) {
      alert('Informe a data de validade.');
      return;
    }

    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');
      await vencimentosService.salvarControle({
        produto_id: produtoSelecionado.id,
        lote: lote.trim(),
        data_validade: dataValidade,
        quantidade: Number(quantidade || 1),
        usuario_id: userObj?.id
      });

      alert('Controle de vencimento registrado com sucesso!');
      setModalNovoAberto(false);
      setProdutoSelecionado(null);
      setTermoBuscaProduto('');
      setLote('');
      setDataValidade('');
      setQuantidade(1);
      carregarDados();
    } catch (err) {
      alert('Erro ao salvar controle de vencimento.');
    } finally {
      setSalvando(false);
    }
  };

  // Filtros
  const itensAVencer = itens.filter((i: VencimentoItem) => i.diasParaVencer >= 0);
  const itensVencidos = itens.filter((i: VencimentoItem) => i.diasParaVencer < 0);

  const itensCriticos = itensAVencer.filter((i: VencimentoItem) => i.diasParaVencer <= 30);
  const itensAlerta = itensAVencer.filter((i: VencimentoItem) => i.diasParaVencer >= 31 && i.diasParaVencer <= 45);
  const itensNormais = itensAVencer.filter((i: VencimentoItem) => i.diasParaVencer >= 46);

  const listaExibicao =
    abaPrincipal === 'VENCIDOS'
      ? itensVencidos
      : subAbaAVencer === 'CRITICO'
      ? itensCriticos
      : subAbaAVencer === 'ALERTA'
      ? itensAlerta
      : itensNormais;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">VENCIMENTOS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Monitoramento de Validades e Lotes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Inserir Controle
          </button>
        </div>

        {/* ABAS PRINCIPAIS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaPrincipal('A_VENCER')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaPrincipal === 'A_VENCER' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'
            }`}
          >
            A Vencer ({itensAVencer.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaPrincipal('VENCIDOS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${
              abaPrincipal === 'VENCIDOS' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'
            }`}
          >
            Vencidos ({itensVencidos.length})
          </button>
        </div>

        {/* SUB-ABAS A VENCER */}
        {abaPrincipal === 'A_VENCER' && (
          <div className="flex gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setSubAbaAVencer('CRITICO')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 ${
                subAbaAVencer === 'CRITICO' ? 'bg-red-100 text-red-700 border border-red-300 shadow-sm' : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              ≤ 30 Dias ({itensCriticos.length})
            </button>
            <button
              type="button"
              onClick={() => setSubAbaAVencer('ALERTA')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 ${
                subAbaAVencer === 'ALERTA' ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              31 a 45 Dias ({itensAlerta.length})
            </button>
            <button
              type="button"
              onClick={() => setSubAbaAVencer('NORMAL')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 ${
                subAbaAVencer === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm' : 'bg-gray-50 text-gray-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ≥ 46 Dias ({itensNormais.length})
            </button>
          </div>
        )}

        {/* LISTAGEM DOS PRODUTOS */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando validades...</div>
          ) : listaExibicao.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhum produto encontrado nesta categoria de vencimento.
            </div>
          ) : (
            listaExibicao.map((item: VencimentoItem) => {
              const prod: any = item.produtos || {};
              const dataValFmt = new Date(item.data_validade + 'T00:00:00').toLocaleDateString('pt-BR');

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center hover:bg-emerald-50/20 transition-all"
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                        {item.codigo_customizado || 'VEN'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        Cód: {prod.codprod || 'N/A'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        item.origem === 'Inventário' ? 'bg-purple-100 text-purple-700' :
                        item.origem === 'Conf. Cega' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        Origem: {item.origem}
                      </span>
                    </div>

                    <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                      {prod.descricao || 'PRODUTO NÃO ENCONTRADO'}
                    </h4>

                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-1 flex-wrap">
                      <span>LOTE: <strong className="text-gray-800">{item.lote}</strong></span>
                      <span>QTD: <strong className="text-gray-800">{item.quantidade} {prod.unidade || 'UN'}</strong></span>
                      <span>VALIDADE: <strong className="text-gray-800">{dataValFmt}</strong></span>
                    </div>

                    {/* IDENTIFICAÇÃO DO USUÁRIO, DATA E HORA */}
                    <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1 font-bold">
                      <span>👤 {item.usuarioNome || 'SISTEMA'},</span>
                      <span>{item.dataHoraRegistro}</span>
                    </div>
                  </div>

                  {/* STATUS / AÇÃO */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {item.diasParaVencer < 0 ? (
                        <span className="text-xs font-black text-red-600 block">
                          Vencido há {Math.abs(item.diasParaVencer)} dias
                        </span>
                      ) : item.diasParaVencer === 0 ? (
                        <span className="text-xs font-black text-red-600 block">
                          Vence Hoje!
                        </span>
                      ) : (
                        <span className={`text-xs font-black block ${
                          item.diasParaVencer <= 30 ? 'text-red-600' :
                          item.diasParaVencer <= 45 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          Vence em {item.diasParaVencer} dias
                        </span>
                      )}
                    </div>

                    {/* Botão direcionando para Avaria no caso de Vencido */}
                    {abaPrincipal === 'VENCIDOS' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onDirecionarParaAvaria) {
                            onDirecionarParaAvaria({
                              produto: prod,
                              quantidade: item.quantidade
                            });
                          } else {
                            alert('Direcionando para Avarias...');
                          }
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-2.5 rounded-xl font-black text-base shadow-sm active:scale-95 transition-all"
                        title="Registrar Avaria por Vencimento"
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* MODAL INSERIR NOVO CONTROLE */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <form onSubmit={handleSalvarNovo} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">INSERIR CONTROLE DE VENCIMENTO</h3>
              <button type="button" onClick={() => setModalNovoAberto(false)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
              {/* PRODUTO */}
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Bipe o EAN ou busque por descrição/código..."
                  value={termoBuscaProduto}
                  onChange={(e) => {
                    setTermoBuscaProduto(e.target.value);
                    setProdutoSelecionado(null);
                  }}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />

                {produtosEncontrados.length > 0 && !produtoSelecionado && (
                  <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 divide-y divide-gray-100">
                    {produtosEncontrados.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProdutoSelecionado(p);
                          setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
                          setProdutosEncontrados([]);
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                      >
                        <span>{p.codprod} - {p.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Lote</label>
                  <input
                    type="text"
                    placeholder="Ex: LT-2026/01"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Quantidade</label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    required
                    value={quantidade}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantidade(val === '' ? '' : Number(val));
                    }}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Dias para Vencer</label>
                  <div className={`w-full h-10 rounded-xl flex items-center justify-center text-xs font-black border ${
                    diasModal === null ? 'bg-gray-100 text-gray-400 border-gray-200' :
                    diasModal < 0 ? 'bg-red-100 text-red-700 border-red-300' :
                    diasModal <= 30 ? 'bg-red-50 text-red-600 border-red-200' :
                    diasModal <= 45 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {diasModal === null ? 'Aguardando Data' : diasModal < 0 ? `Vencido (${Math.abs(diasModal)} d)` : `${diasModal} dias`}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalNovoAberto(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando || !produtoSelecionado || !dataValidade}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}