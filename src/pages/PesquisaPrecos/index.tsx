// src/pages/PesquisaPrecos/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { 
  pesquisaPrecosService, 
  type Concorrente, 
  type PesquisaItemForm 
} from './services/pesquisaPrecosService';
import { gerarPdfAnalisePrecos } from './utils/gerarPdfAnalisePrecos';

interface PesquisaPrecosProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
  onNavegarParaOfertas?: () => void;
}

type TabPrincipal = 'LISTAGEM' | 'ANALISES' | 'ENVIADOS_OFERTAS' | 'CONCORRENTES';
type TabConcorrentes = 'MEUS_CONCORRENTES' | 'CADASTRAR_NOVO' | 'RANKING';

const ORIGENS_DISPONIVEIS = [
  'Sidcley',
  'Carlos Junio',
  'Jose Carlos',
  'Áleff Lira',
  'Carlos Henrique',
  'Outro'
];

export default function PesquisaPrecos({
  onVoltarParaHome,
  usuarioLogado,
  usuarioLogadoId,
  onNavegarParaOfertas
}: PesquisaPrecosProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
  const nomeUsuarioLogado = usuarioLogado?.nome || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.nome || 'Operador';

  const [abaAtiva, setAbaAtiva] = useState<TabPrincipal>('LISTAGEM');
  const [subAbaConcorrentes, setSubAbaConcorrentes] = useState<TabConcorrentes>('MEUS_CONCORRENTES');

  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [concorrentes, setConcorrentes] = useState<Concorrente[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros da Listagem
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [concorrenteFiltro, setConcorrenteFiltro] = useState('TODOS');
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');

  // Modo Janela Cheia (Nova Pesquisa / Edição)
  const [modoJanelaCheia, setModoJanelaCheia] = useState<'NOVA' | 'EDITAR' | null>(null);
  const [pesquisaEmEdicaoId, setPesquisaEmEdicaoId] = useState<string | null>(null);

  // Form Nova Pesquisa
  const [formOrigem, setFormOrigem] = useState(ORIGENS_DISPONIVEIS[0]);
  const [formConcorrenteId, setFormConcorrenteId] = useState('');
  const [formCategoria, setFormCategoria] = useState<'Gôndola' | 'Atacado'>('Gôndola');
  const [itensForm, setItensForm] = useState<PesquisaItemForm[]>([]);
  const [salvandoPesquisa, setSalvandoPesquisa] = useState(false);

  // Busca Autocomplete
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);

  // Modal Ver Lista da Pesquisa
  const [pesquisaVerLista, setPesquisaVerLista] = useState<any | null>(null);

  // Análise Selecionada
  const [pesquisaAnalise, setPesquisaAnalise] = useState<any | null>(null);
  const [itensExpandidosAnalise, setItensExpandidosAnalise] = useState<Record<string, boolean>>({});

  // Form Novo Concorrente
  const [modalNovoConcorrente, setModalNovoConcorrente] = useState(false);
  const [concorrenteRazao, setConcorrenteRazao] = useState('');
  const [concorrenteFantasia, setConcorrenteFantasia] = useState('');
  const [salvandoConcorrente, setSalvandoConcorrente] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaPesquisas, listaConcorrentes] = await Promise.all([
        pesquisaPrecosService.listarPesquisas(),
        pesquisaPrecosService.listarConcorrentes()
      ]);
      setPesquisas(listaPesquisas);
      setConcorrentes(listaConcorrentes);
      if (listaConcorrentes.length > 0 && !formConcorrenteId) {
        setFormConcorrenteId(listaConcorrentes[0].id);
      }
    } catch (err: any) {
      console.error('Erro ao carregar módulo de pesquisa de preços:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Autocomplete de Produtos
  useEffect(() => {
    if (!termoBuscaProduto.trim()) {
      setProdutosEncontrados([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await pesquisaPrecosService.buscarProdutos(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [termoBuscaProduto]);

  const formatarDataSegura = (dataStr?: string) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  // Filtragem da Listagem
  const pesquisasFiltradas = useMemo(() => {
    return pesquisas.filter((p) => {
      const dt = p.data_registro ? p.data_registro.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;
      if (concorrenteFiltro !== 'TODOS' && p.concorrente_id !== concorrenteFiltro) return false;
      if (tipoFiltro !== 'TODOS' && p.categoria_pesquisa !== tipoFiltro) return false;
      return true;
    });
  }, [pesquisas, dataInicio, dataFim, concorrenteFiltro, tipoFiltro]);

  // Lista para a aba "Enviados para Ofertas"
  const pesquisasComPerdedores = useMemo(() => {
    return pesquisas
      .map((p) => {
        const itensPerdidos = (p.pesquisa_precos_itens || []).filter(
          (it: any) => Number(it.preco_concorrente || 0) < Number(it.preco_venda || 0) && Number(it.preco_concorrente || 0) > 0
        );
        return {
          ...p,
          itensPerdidos
        };
      })
      .filter((p) => p.itensPerdidos.length > 0);
  }, [pesquisas]);

  // Ranking de Concorrentes (quem ganhou mais vezes proporcionalmente)
  const rankingConcorrentes = useMemo(() => {
    const mapa = new Map<string, { nome: string; totalDisputado: number; vitoriasConcorrente: number }>();

    pesquisas.forEach((p) => {
      const concId = p.concorrente_id;
      const concNome = p.pesquisa_precos_concorrentes?.nome_fantasia || p.pesquisa_precos_concorrentes?.razao_social || 'Concorrente';

      if (!mapa.has(concId)) {
        mapa.set(concId, { nome: concNome, totalDisputado: 0, vitoriasConcorrente: 0 });
      }

      const dados = mapa.get(concId)!;
      (p.pesquisa_precos_itens || []).forEach((it: any) => {
        const venda = Number(it.preco_venda || 0);
        const conc = Number(it.preco_concorrente || 0);
        if (conc > 0 && venda > 0) {
          dados.totalDisputado += 1;
          if (conc < venda) {
            dados.vitoriasConcorrente += 1;
          }
        }
      });
    });

    return Array.from(mapa.values())
      .map((r) => ({
        ...r,
        taxaVitoria: r.totalDisputado > 0 ? (r.vitoriasConcorrente / r.totalDisputado) * 100 : 0
      }))
      .sort((a, b) => b.taxaVitoria - a.taxaVitoria);
  }, [pesquisas]);

  // Adicionar produto na lista da nova pesquisa
  const handleAdicionarProdutoForm = (prod: any) => {
    if (itensForm.some((i) => i.produto_id === prod.id)) {
      alert('Produto já adicionado na pesquisa.');
      return;
    }

    setItensForm((prev) => [
      ...prev,
      {
        produto_id: prod.id,
        codprod: prod.codprod,
        descricao: prod.descricao,
        preco_custo: Number(prod.custoreal || 0),
        preco_venda: Number(prod.pvenda || 0),
        preco_concorrente: 0
      }
    ]);

    setTermoBuscaProduto('');
    setProdutosEncontrados([]);
  };

  const handleSalvarPesquisaCompleta = async () => {
    if (!formConcorrenteId) {
      alert('Selecione um concorrente.');
      return;
    }
    if (itensForm.length === 0) {
      alert('Adicione ao menos um produto para salvar a pesquisa.');
      return;
    }

    try {
      setSalvandoPesquisa(true);
      await pesquisaPrecosService.salvarPesquisa({
        id: pesquisaEmEdicaoId || undefined,
        usuario_id: idUsuarioFinal,
        concorrente_id: formConcorrenteId,
        origem: formOrigem,
        categoria_pesquisa: formCategoria,
        itens: itensForm
      });

      alert(pesquisaEmEdicaoId ? 'Pesquisa de preços atualizada com sucesso!' : 'Pesquisa de preços salva com sucesso!');
      setModoJanelaCheia(null);
      setPesquisaEmEdicaoId(null);
      setItensForm([]);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao salvar pesquisa: ' + err.message);
    } finally {
      setSalvandoPesquisa(false);
    }
  };

  const handleAbrirEdicao = (p: any) => {
    setPesquisaEmEdicaoId(p.id);
    setFormOrigem(p.origem || ORIGENS_DISPONIVEIS[0]);
    setFormConcorrenteId(p.concorrente_id);
    setFormCategoria(p.categoria_pesquisa || 'Gôndola');
    setItensForm(
      (p.pesquisa_precos_itens || []).map((it: any) => ({
        produto_id: it.produto_id,
        codprod: it.produtos?.codprod || '-',
        descricao: it.produtos?.descricao || 'Produto',
        preco_custo: Number(it.preco_custo || 0),
        preco_venda: Number(it.preco_venda || 0),
        preco_concorrente: Number(it.preco_concorrente || 0)
      }))
    );
    setModoJanelaCheia('EDITAR');
  };

  const handleSalvarNovoConcorrente = async () => {
    if (!concorrenteRazao.trim() || !concorrenteFantasia.trim()) {
      alert('Preencha a Razão Social e o Nome Fantasia.');
      return;
    }
    try {
      setSalvandoConcorrente(true);
      await pesquisaPrecosService.cadastrarConcorrente({
        razao_social: concorrenteRazao.trim(),
        nome_fantasia: concorrenteFantasia.trim()
      });
      alert('Concorrente cadastrado com sucesso!');
      setModalNovoConcorrente(false);
      setConcorrenteRazao('');
      setConcorrenteFantasia('');
      carregarDados();
    } catch (err: any) {
      alert('Erro ao cadastrar concorrente: ' + err.message);
    } finally {
      setSalvandoConcorrente(false);
    }
  };

  const handleSincronizarOfertas = async (p: any) => {
    try {
      const perdedores = (p.pesquisa_precos_itens || []).filter(
        (it: any) => Number(it.preco_concorrente || 0) < Number(it.preco_venda || 0) && Number(it.preco_concorrente || 0) > 0
      );

      if (perdedores.length === 0) {
        alert('Esta pesquisa não possui itens perdedores para enviar.');
        return;
      }

      await pesquisaPrecosService.sincronizarComOfertas(p, perdedores);
      await pesquisaPrecosService.marcarEnviadoParaOfertas(p.id);

      alert(`Sucesso! ${perdedores.length} produto(s) sincronizados com o módulo de Ofertas (Origem Pesquisa).`);
      carregarDados();

      if (onNavegarParaOfertas) {
        onNavegarParaOfertas();
      }
    } catch (err: any) {
      alert('Erro ao sincronizar com Ofertas: ' + err.message);
    }
  };

  // --- TELA CHEIA: NOVA PESQUISA / EDITAR PESQUISA ---
  if (modoJanelaCheia) {
    const agoraStr = new Date().toLocaleDateString('pt-BR');
    const horaStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#09797a] uppercase">
                {modoJanelaCheia === 'NOVA' ? 'NOVA PESQUISA DE PREÇOS' : 'EDITAR PESQUISA DE PREÇOS'}
              </h1>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                Resp: <strong className="text-slate-700">{nomeUsuarioLogado}</strong> • Data: <strong>{agoraStr} {horaStr}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setModoJanelaCheia(null);
                setPesquisaEmEdicaoId(null);
                setItensForm([]);
              }}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center text-xs"
            >
              ✕
            </button>
          </div>

          {/* Dados Cabeçalho da Pesquisa */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Origem (Solicitante) *</label>
              <select
                value={formOrigem}
                onChange={(e) => setFormOrigem(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
              >
                {ORIGENS_DISPONIVEIS.map((orig) => (
                  <option key={orig} value={orig}>{orig.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Concorrente Pesquisado *</label>
              <select
                value={formConcorrenteId}
                onChange={(e) => setFormConcorrenteId(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
              >
                {concorrentes.length === 0 && <option value="">Nenhum concorrente cadastrado</option>}
                {concorrentes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia?.toUpperCase() || c.razao_social?.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria de Pesquisa *</label>
              <select
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value as any)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
              >
                <option value="Gôndola">🏪 GÔNDOLA (VAREJO)</option>
                <option value="Atacado">📦 ATACADO</option>
              </select>
            </div>
          </div>

          {/* Campo de Busca de Produtos */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Adicionar Produto (Código Sistema, Código de Barras ou Descrição com %)
            </label>
            <input
              type="text"
              placeholder="Digite o código ou nome do produto para buscar..."
              value={termoBuscaProduto}
              onChange={(e) => setTermoBuscaProduto(e.target.value)}
              className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
            />

            {produtosEncontrados.length > 0 && (
              <div className="absolute top-20 left-4 right-4 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {produtosEncontrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAdicionarProdutoForm(p)}
                    className="w-full text-left p-3 hover:bg-teal-50 flex justify-between items-center text-xs font-bold text-slate-800 uppercase"
                  >
                    <div>
                      <div>{p.codprod} - {p.descricao}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Custo: R$ {Number(p.custoreal || 0).toFixed(2)} • Venda: R$ {Number(p.pvenda || 0).toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[#09797a] text-[10px] font-black">+ Inserir</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Listagem de Itens da Pesquisa para Preenchimento */}
          <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase text-slate-400 block px-1">
              Itens da Pesquisa ({itensForm.length})
            </span>

            {itensForm.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                Nenhum produto adicionado. Utilize a barra de busca acima para incluir os itens.
              </div>
            ) : (
              itensForm.map((it, idx) => (
                <div
                  key={it.produto_id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-mono text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded font-black">
                      {it.codprod}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5 leading-snug">
                      {it.descricao}
                    </h4>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 flex gap-3">
                      <span>Custo: <strong className="text-slate-700">R$ {it.preco_custo.toFixed(2)}</strong></span>
                      <span>Nosso Preço: <strong className="text-emerald-700 font-bold">R$ {it.preco_venda.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Preço Concorrente (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value={it.preco_concorrente || ''}
                        onChange={(e) => {
                          const novo = [...itensForm];
                          novo[idx].preco_concorrente = e.target.value === '' ? 0 : Number(e.target.value);
                          setItensForm(novo);
                        }}
                        className="w-28 h-9 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2 text-center font-mono font-black text-red-600 focus:bg-white focus:border-[#09797a]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setItensForm(itensForm.filter((i) => i.produto_id !== it.produto_id))}
                      className="w-8 h-8 mt-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Botões Cancelar e Salvar */}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setModoJanelaCheia(null);
                setPesquisaEmEdicaoId(null);
                setItensForm([]);
              }}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvandoPesquisa || itensForm.length === 0}
              onClick={handleSalvarPesquisaCompleta}
              className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvandoPesquisa ? 'Salvando...' : 'Salvar Pesquisa'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL (COM AS 4 ABAS) ---
  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome || (() => window.history.back())}
              className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">PESQUISA DE PREÇOS</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Inteligência de Mercado e Análise Concorrencial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPesquisaEmEdicaoId(null);
              setItensForm([]);
              setModoJanelaCheia('NOVA');
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + NOVA PESQUISA
          </button>
        </div>

        {/* 4 ABAS PRINCIPAIS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('LISTAGEM')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'LISTAGEM' ? 'bg-[#09797a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Listagem</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {pesquisasFiltradas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('ANALISES')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'ANALISES' ? 'bg-[#09797a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Análises</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('ENVIADOS_OFERTAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'ENVIADOS_OFERTAS' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Enviados p/ Ofertas</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {pesquisasComPerdedores.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('CONCORRENTES')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'CONCORRENTES' ? 'bg-indigo-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Concorrentes</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {concorrentes.length}
            </span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: LISTAGEM */}
        {abaAtiva === 'LISTAGEM' && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {/* Filtros Retráteis */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                  Filtros de Pesquisa
                </span>
                <button
                  type="button"
                  onClick={() => setFiltrosExpandidos((prev) => !prev)}
                  className="w-7 h-7 rounded-xl bg-white border border-slate-300 text-[#09797a] font-black text-sm flex items-center justify-center shadow-sm"
                >
                  {filtrosExpandidos ? '−' : '+'}
                </button>
              </div>

              {filtrosExpandidos && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data Inicial</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data Final</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Concorrente</label>
                    <select
                      value={concorrenteFiltro}
                      onChange={(e) => setConcorrenteFiltro(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                    >
                      <option value="TODOS">TODOS</option>
                      {concorrentes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome_fantasia?.toUpperCase() || c.razao_social?.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Pesquisa</label>
                    <select
                      value={tipoFiltro}
                      onChange={(e) => setTipoFiltro(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                    >
                      <option value="TODOS">TODOS</option>
                      <option value="Gôndola">GÔNDOLA</option>
                      <option value="Atacado">ATACADO</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Lista dos Cards */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando pesquisas...</div>
              ) : pesquisasFiltradas.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                  Nenhuma pesquisa de preço cadastrada.
                </div>
              ) : (
                pesquisasFiltradas.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                          {p.codigo_customizado}
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          CONCORRENTE: {p.pesquisa_precos_concorrentes?.nome_fantasia || 'Concorrente'}
                        </span>
                        <span className="text-[9px] font-bold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                          {p.categoria_pesquisa}
                        </span>
                      </div>

                      <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                        {p.pesquisa_precos_itens?.length || 0} PRODUTOS PESQUISADOS
                      </h3>

                      <div className="text-[10px] text-slate-400 font-medium mt-1">
                        Resp: <strong className="text-slate-600">{p.usuarios?.nome || 'Sistema'}</strong> • Origem:{' '}
                        <strong className="text-slate-600">{p.origem}</strong> • em{' '}
                        <strong>{formatarDataSegura(p.data_registro)}</strong> às{' '}
                        <strong>{p.hora_registro?.slice(0, 5)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => setPesquisaVerLista(p)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                      >
                        Ver Lista
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAbrirEdicao(p)}
                        className="px-3.5 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all active:scale-95"
                      >
                        Editar Lista
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: ANÁLISES */}
        {abaAtiva === 'ANALISES' && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {!pesquisaAnalise ? (
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 block px-1">
                  Selecione uma pesquisa para ver a análise estratégica
                </span>
                {pesquisas.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3"
                  >
                    <div>
                      <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                        {p.codigo_customizado}
                      </span>
                      <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1">
                        {p.pesquisa_precos_concorrentes?.nome_fantasia || 'Concorrente'} ({p.categoria_pesquisa})
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {p.pesquisa_precos_itens?.length || 0} produtos • em {formatarDataSegura(p.data_registro)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPesquisaAnalise(p)}
                      className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all"
                    >
                      Ver Análise →
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Painel Detalhado de Análise Item a Item */
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <button
                      type="button"
                      onClick={() => setPesquisaAnalise(null)}
                      className="text-xs font-black text-[#09797a] uppercase hover:underline"
                    >
                      ← Voltar à Lista de Pesquisas
                    </button>
                    <h3 className="font-black text-sm text-slate-800 uppercase mt-1">
                      {pesquisaAnalise.codigo_customizado} - {pesquisaAnalise.pesquisa_precos_concorrentes?.nome_fantasia}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => gerarPdfAnalisePrecos(pesquisaAnalise)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                    >
                      📄 Gerar PDF (Paisagem)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSincronizarOfertas(pesquisaAnalise)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all active:scale-95"
                    >
                      Enviar p/ Ofertas 🚀
                    </button>
                  </div>
                </div>

                {/* Lista de Itens com Destaque Verde/Vermelho e Botão (+) */}
                <div className="space-y-2">
                  {(pesquisaAnalise.pesquisa_precos_itens || []).map((it: any) => {
                    const custo = Number(it.preco_custo || 0);
                    const venda = Number(it.preco_venda || 0);
                    const conc = Number(it.preco_concorrente || 0);

                    const nossoVenceu = venda <= conc;
                    const diferencaCentavos = Math.abs(venda - conc);
                    const diferencaPerc = conc > 0 ? (diferencaCentavos / conc) * 100 : 0;

                    const margemAtual = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
                    const precoAlvoCombate = conc > 0.05 ? conc - 0.05 : conc;
                    const margemCombate = precoAlvoCombate > 0 ? ((precoAlvoCombate - custo) / precoAlvoCombate) * 100 : 0;

                    const expandido = Boolean(itensExpandidosAnalise[it.id]);

                    return (
                      <div
                        key={it.id}
                        className={`border rounded-2xl p-3 transition-all ${
                          nossoVenceu 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        {/* Cabeçalho do Item */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setItensExpandidosAnalise((prev) => ({ ...prev, [it.id]: !prev[it.id] }))}
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center transition-all ${
                                nossoVenceu ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                              }`}
                            >
                              {expandido ? '−' : '+'}
                            </button>
                            <span className="font-black text-xs uppercase text-slate-800 truncate">
                              {it.produtos?.codprod} - {it.produtos?.descricao}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-xs font-black">
                            <span className={nossoVenceu ? 'text-emerald-700' : 'text-slate-700'}>
                              Nosso: R$ {venda.toFixed(2)}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className={!nossoVenceu ? 'text-red-700' : 'text-slate-700'}>
                              Conc: R$ {conc.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Detalhes Expansíveis (+ / -) */}
                        {expandido && (
                          <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-bold animate-fadeIn">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase">2. Diferença em Centavos</span>
                              <span className="text-slate-800 font-mono text-sm">
                                R$ {diferencaCentavos.toFixed(2)} {nossoVenceu ? 'mais barato' : 'mais caro'}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase">3. Vantagem Competitiva</span>
                              <span className={`font-mono text-sm ${nossoVenceu ? 'text-emerald-700' : 'text-red-700'}`}>
                                {diferencaPerc.toFixed(1)}% {nossoVenceu ? 'melhor' : 'pior'}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[9px] text-slate-400 block uppercase">4. Impacto na Margem</span>
                              {nossoVenceu ? (
                                <span className="text-emerald-800 font-mono text-xs">
                                  Margem Atual: {margemAtual.toFixed(1)}% (Oportunidade de expansão)
                                </span>
                              ) : (
                                <span className="text-red-800 font-mono text-xs">
                                  Margem atual cai de {margemAtual.toFixed(1)}% para {margemCombate.toFixed(1)}% (vendendo a R$ {precoAlvoCombate.toFixed(2)})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: ENVIADOS PARA OFERTAS */}
        {abaAtiva === 'ENVIADOS_OFERTAS' && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            <span className="text-xs font-black uppercase text-slate-400 px-1">
              Pesquisas com itens de preço de venda desvantajoso frente ao concorrente
            </span>

            {pesquisasComPerdedores.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                Nenhuma pesquisa com preços desfavoráveis pendente de oferta.
              </div>
            ) : (
              pesquisasComPerdedores.map((p) => (
                <div
                  key={p.id}
                  className="p-4 bg-white border border-red-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {p.codigo_customizado}
                      </span>
                      <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {p.pesquisa_precos_concorrentes?.nome_fantasia}
                      </span>
                    </div>

                    <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1">
                      {p.itensPerdidos.length} PRODUTO(S) COM PREÇO SUPERIOR AO CONCORRENTE
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPesquisaVerLista(p)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase"
                    >
                      Ver Lista
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSincronizarOfertas(p)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
                    >
                      Sincronizar com Ofertas ⚡
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 4: CONCORRENTES */}
        {abaAtiva === 'CONCORRENTES' && (
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
            {/* Sub-abas de Concorrentes */}
            <div className="flex gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setSubAbaConcorrentes('MEUS_CONCORRENTES')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                  subAbaConcorrentes === 'MEUS_CONCORRENTES' ? 'bg-[#09797a] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Meus Concorrentes ({concorrentes.length})
              </button>

              <button
                type="button"
                onClick={() => setModalNovoConcorrente(true)}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#09797a] rounded-xl text-xs font-black uppercase transition-all"
              >
                + Cadastrar Novo
              </button>

              <button
                type="button"
                onClick={() => setSubAbaConcorrentes('RANKING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
                  subAbaConcorrentes === 'RANKING' ? 'bg-[#09797a] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                🏆 Ranking de Vitórias
              </button>
            </div>

            {subAbaConcorrentes === 'MEUS_CONCORRENTES' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {concorrentes.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-1">
                    <span className="font-black text-xs uppercase text-slate-800">{c.nome_fantasia}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{c.razao_social}</span>
                  </div>
                ))}
              </div>
            )}

            {subAbaConcorrentes === 'RANKING' && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-400 block px-1">
                  Proporção de vitórias de preço por concorrente nas pesquisas
                </span>
                {rankingConcorrentes.map((r, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-50 text-[#09797a] font-black flex items-center justify-center font-mono">
                        {idx + 1}º
                      </span>
                      <span className="uppercase text-slate-800">{r.nome}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-emerald-700">{r.vitoriasConcorrente} vitórias em {r.totalDisputado} itens</span>
                      <span className="text-slate-400 block text-[10px]">{r.taxaVitoria.toFixed(1)}% de vantagem</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL CADASTRAR CONCORRENTE */}
      {modalNovoConcorrente && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-[#09797a] uppercase">Cadastrar Concorrente</h3>
              <button
                type="button"
                onClick={() => setModalNovoConcorrente(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Razão Social *</label>
                <input
                  type="text"
                  value={concorrenteRazao}
                  onChange={(e) => setConcorrenteRazao(e.target.value)}
                  placeholder="Ex: SUPERMERCADO EXEMPLO LTDA"
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Fantasia *</label>
                <input
                  type="text"
                  value={concorrenteFantasia}
                  onChange={(e) => setConcorrenteFantasia(e.target.value)}
                  placeholder="Ex: MERCADO EXEMPLO"
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNovoConcorrente(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoConcorrente}
                onClick={handleSalvarNovoConcorrente}
                className="flex-2 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95"
              >
                {salvandoConcorrente ? 'Salvando...' : 'Salvar Concorrente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER LISTA DA PESQUISA */}
      {pesquisaVerLista && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 max-h-[85vh] animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                  {pesquisaVerLista.codigo_customizado}
                </span>
                <h3 className="text-sm font-black text-slate-800 uppercase mt-0.5">
                  Itens da Pesquisa vs {pesquisaVerLista.pesquisa_precos_concorrentes?.nome_fantasia}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPesquisaVerLista(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(pesquisaVerLista.pesquisa_precos_itens || []).map((it: any) => (
                <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">Cód: {it.produtos?.codprod}</span>
                    <h4 className="font-black text-slate-800 uppercase mt-0.5">{it.produtos?.descricao}</h4>
                    <span className="text-[10px] text-slate-400">
                      Nosso Preço: <strong className="text-emerald-700 font-mono">R$ {Number(it.preco_venda || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-red-600">
                    <span className="text-[9px] text-slate-400 block uppercase">Concorrente</span>
                    R$ {Number(it.preco_concorrente || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPesquisaVerLista(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}