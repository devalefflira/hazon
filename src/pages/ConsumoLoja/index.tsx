// src/pages/ConsumoLoja/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { consumoLojaService } from './services/consumoLojaService';
import { 
  LOCAIS_CONSUMO, 
  type ConsumoLojaItemView, 
  type FinalidadeConsumo,
  type LimiteConsumoView, 
  type LimiteHistoricoView 
} from './types/consumoLoja.types';
import NovoRegistroConsumo from './components/NovoRegistroConsumo';

interface ConsumoLojaProps {
  onVoltar?: () => void;
  onNavegar?: (tela: string) => void;
  onNavegarParaHome?: () => void;
  usuarioLogadoId?: string;
  [key: string]: any;
}

type AbaNavegacao = 'principal' | 'consumo' | 'materia-prima';

export default function ConsumoLoja(props: ConsumoLojaProps) {
  const { onVoltar, onNavegar, onNavegarParaHome, usuarioLogadoId } = props;
  const usuarioId = usuarioLogadoId || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id || '';

  // Handler seguro de retorno para a Home
  const handleVoltarParaHome = () => {
    if (typeof onVoltar === 'function') {
      onVoltar();
    } else if (typeof onNavegarParaHome === 'function') {
      onNavegarParaHome();
    } else if (typeof onNavegar === 'function') {
      onNavegar('home');
    } else {
      window.location.href = '/';
    }
  };

  // Modo tela cheia de Novo Registro
  const [modoNovoRegistro, setModoNovoRegistro] = useState(false);

  // Navegação Principal (3 Abas)
  const [abaAtiva, setAbaAtiva] = useState<AbaNavegacao>('principal');

  // Sub-abas de Controle de Consumo
  const [subAbaConsumo, setSubAbaConsumo] = useState<'visao-geral' | 'limites'>('visao-geral');

  // Filtros Retráteis
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [localFiltro, setLocalFiltro] = useState('Todos');

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState<number>(10);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Dados
  const [itensPrincipal, setItensPrincipal] = useState<ConsumoLojaItemView[]>([]);
  const [itensMateriaPrima, setItensMateriaPrima] = useState<ConsumoLojaItemView[]>([]);
  const [limites, setLimites] = useState<LimiteConsumoView[]>([]);
  const [historicoLimites, setHistoricoLimites] = useState<LimiteHistoricoView[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modal de Edição de Finalidade
  const [itemEmEdicao, setItemEmEdicao] = useState<ConsumoLojaItemView | null>(null);
  const [novaFinalidade, setNovaFinalidade] = useState<FinalidadeConsumo>('Consumo/Despesa');
  const [novoProdutoProduzido, setNovoProdutoProduzido] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  // Formulário de Ajuste de Limite
  const [localLimiteForm, setLocalLimiteForm] = useState<string>(LOCAIS_CONSUMO[0]);
  const [valorLimiteInput, setValorLimiteInput] = useState<number>(1000);
  const [salvandoLimite, setSalvandoLimite] = useState(false);

  // Mês de referência atual (ex: '2026-09') e primeiro dia do mês
  const agora = new Date();
  const mesAtual = agora.toISOString().slice(0, 7);
  const primeiroDiaDoMes = `${mesAtual}-01`;

  const carregarDados = async () => {
    try {
      setCarregando(true);

      const dtInicioEfetiva = dataInicio || primeiroDiaDoMes;
      const dtFimEfetiva = dataFim || undefined;

      if (abaAtiva === 'principal') {
        const itensRes = await consumoLojaService.buscarItensConsumo(
          dtInicioEfetiva,
          dtFimEfetiva,
          undefined,
          localFiltro,
          'Consumo/Despesa'
        );
        setItensPrincipal(itensRes);
        setPaginaAtual(1);
      } else if (abaAtiva === 'consumo') {
        const [limitesRes, histRes, itensConsumo] = await Promise.all([
          consumoLojaService.obterLimitesDoMes(mesAtual),
          consumoLojaService.listarHistoricoLimites(mesAtual),
          consumoLojaService.buscarItensConsumo(
            primeiroDiaDoMes,
            undefined,
            undefined,
            'Todos',
            'Consumo/Despesa'
          )
        ]);
        setLimites(limitesRes);
        setHistoricoLimites(histRes);
        setItensPrincipal(itensConsumo);
      } else if (abaAtiva === 'materia-prima') {
        const itensMatRes = await consumoLojaService.buscarItensConsumo(
          dtInicioEfetiva,
          dtFimEfetiva,
          undefined,
          localFiltro,
          'Uso na Produção/Transformação'
        );
        setItensMateriaPrima(itensMatRes);
        setPaginaAtual(1);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [abaAtiva, subAbaConsumo, dataInicio, dataFim, localFiltro]);

  // Cálculos de Totais e Paginação mantidos no topo da árvore
  const itensAtuais = abaAtiva === 'materia-prima' ? itensMateriaPrima : itensPrincipal;
  const valorTotalPeriodo = itensAtuais.reduce((acc, curr) => acc + curr.valor_total_item, 0);
  const totalPaginas = Math.ceil(itensAtuais.length / itensPorPagina) || 1;

  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return itensAtuais.slice(inicio, inicio + itensPorPagina);
  }, [itensAtuais, paginaAtual, itensPorPagina]);

  const gastosPorLocal: Record<string, number> = {};
  itensPrincipal.forEach((it) => {
    gastosPorLocal[it.local] = (gastosPorLocal[it.local] || 0) + it.valor_total_item;
  });

  const handleSalvarLimite = async () => {
    if (!usuarioId) {
      alert('Sessão de usuário não identificada.');
      return;
    }
    if (valorLimiteInput < 0) {
      alert('O valor limite não pode ser negativo.');
      return;
    }
    try {
      setSalvandoLimite(true);
      await consumoLojaService.definirOuAlterarLimite(
        localLimiteForm,
        mesAtual,
        valorLimiteInput,
        usuarioId
      );
      alert('Limite atualizado com sucesso!');
      carregarDados();
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setSalvandoLimite(false);
    }
  };

  const handleAbrirEdicao = (it: ConsumoLojaItemView) => {
    setItemEmEdicao(it);
    setNovaFinalidade(it.finalidade);
    setNovoProdutoProduzido(it.produto_produzido || '');
  };

  const handleSalvarEdicaoFinalidade = async () => {
    if (!itemEmEdicao) return;
    if (novaFinalidade === 'Uso na Produção/Transformação' && !novoProdutoProduzido.trim()) {
      alert('Para itens de produção, informe qual produto é produzido.');
      return;
    }

    try {
      setSalvandoEdicao(true);
      await consumoLojaService.atualizarFinalidadeItem(
        itemEmEdicao.id,
        novaFinalidade,
        novoProdutoProduzido.trim()
      );
      setItemEmEdicao(null);
      carregarDados();
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
      {modoNovoRegistro ? (
        <div className="w-full flex justify-center">
          <NovoRegistroConsumo
            usuarioId={usuarioId}
            onVoltar={() => setModoNovoRegistro(false)}
            onSalvoSucesso={() => {
              setModoNovoRegistro(false);
              carregarDados();
            }}
          />
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-5 min-h-[calc(100vh-24px)]">
          
          {/* HEADER SUPERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleVoltarParaHome}
                className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
                title="Voltar para a Página Inicial"
              >
                ←
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  Consumo da Loja
                </h1>
                <p className="text-xs text-slate-400 font-bold">
                  Gestão de Despesas Internas &amp; Insumos de Produção
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModoNovoRegistro(true)}
              className="px-4 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-900/20 active:scale-95 transition-all cursor-pointer"
            >
              + Novo Registro
            </button>
          </div>

          {/* NAVEGAÇÃO PRINCIPAL (3 ABAS) */}
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setAbaAtiva('principal')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                abaAtiva === 'principal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📋 Principal
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('consumo')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                abaAtiva === 'consumo'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🛒 Controle de Consumo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('materia-prima')}
              className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                abaAtiva === 'materia-prima'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              🥖 Matéria-Prima
            </button>
          </div>

          {/* ================= ABA 1: PRINCIPAL ================= */}
          {abaAtiva === 'principal' && (
            <div className="flex flex-col gap-5">
              {/* FILTROS RETRÁTEIS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-black uppercase text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>🔍</span>
                    <span>Filtros de Pesquisa</span>
                  </div>
                  <span>{filtrosAbertos ? '▲ Recolher' : '▼ Expandir Filtros'}</span>
                </button>

                {filtrosAbertos && (
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200/60 mt-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Local / Setor
                      </label>
                      <select
                        value={localFiltro}
                        onChange={(e) => setLocalFiltro(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800"
                      >
                        <option value="Todos">Todos os Locais</option>
                        {LOCAIS_CONSUMO.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* TOTALIZADOR NO PERÍODO */}
              <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                    Valor Total do Consumo {dataInicio ? 'no Período' : `em ${mesAtual}`}
                  </span>
                  <span className="text-2xl font-black font-mono text-teal-950">
                    R$ {valorTotalPeriodo.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <span className="text-xs font-black uppercase text-teal-700 bg-white px-3 py-1.5 rounded-xl border border-teal-100 shadow-xs">
                  {itensPrincipal.length} {itensPrincipal.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {/* BARRA DE CONTROLE DA PAGINAÇÃO */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Lançamentos Registrados ({itensPrincipal.length})
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Exibir Itens:</span>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => {
                      setItensPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black text-slate-700 cursor-pointer focus:outline-none focus:border-[#09797a]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* CARDS COM OS ITENS */}
              <div className="flex flex-col gap-2.5">
                {carregando ? (
                  <div className="p-8 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
                    Carregando lançamentos...
                  </div>
                ) : itensPaginados.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                    Nenhum registro encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {itensPaginados.map((it) => (
                      <div
                        key={it.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-[#09797a]/50 transition-all"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-black text-[10px]">
                              {it.codprod || 'S/C'}
                            </span>
                            <span className="font-black text-xs text-slate-900 uppercase">
                              {it.descricao_produto}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black uppercase">
                              {it.local}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-medium">
                            <span>Qtd: <strong className="text-slate-700">{it.quantidade} {it.unidade_medida}</strong></span>
                            <span>•</span>
                            <span>Resp: <strong className="text-slate-700">{it.usuario_nome}</strong></span>
                            <span>•</span>
                            <span>Data: <strong className="text-slate-700">{it.data_registro.split('-').reverse().join('/')} às {it.hora_registro.slice(0, 5)}</strong></span>
                          </div>

                          {it.observacao && (
                            <div className="mt-0.5 text-[11px] text-slate-500 italic">
                              "{it.observacao}"
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <span className="text-sm font-black font-mono text-teal-900 block">
                            R$ {it.valor_total_item.toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(it)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-[10px] font-black text-slate-600 hover:text-teal-800 uppercase flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Alterar Finalidade / Classificação"
                          >
                            ✏️ Editar Finalidade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* NAVEGAÇÃO ENTRE PÁGINAS */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 px-1">
                  <button
                    type="button"
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    ← Anterior
                  </button>

                  <span className="text-xs font-black text-slate-500 uppercase">
                    Página <strong className="text-slate-800">{paginaAtual}</strong> de <strong className="text-slate-800">{totalPaginas}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: CONTROLE DE CONSUMO ================= */}
          {abaAtiva === 'consumo' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSubAbaConsumo('visao-geral')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      subAbaConsumo === 'visao-geral'
                        ? 'bg-teal-50 text-[#09797a] border border-teal-200'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Visão Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubAbaConsumo('limites')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      subAbaConsumo === 'limites'
                        ? 'bg-teal-50 text-[#09797a] border border-teal-200'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Limites
                  </button>
                </div>

                <span className="text-[11px] font-black uppercase text-slate-400">
                  Mês Ref: {mesAtual}
                </span>
              </div>

              {subAbaConsumo === 'visao-geral' ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                    Acompanhamento de Teto por Setor ({mesAtual})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LOCAIS_CONSUMO.map((loc) => {
                      const lim = limites.find((l) => l.local === loc);
                      const teto = Number(lim?.valor_limite || 0);
                      const gasto = Number(gastosPorLocal[loc] || 0);
                      const perc = teto > 0 ? Math.min(100, Math.round((gasto / teto) * 100)) : 0;
                      const restante = Math.max(0, teto - gasto);

                      const corProgresso = perc >= 90 ? 'bg-red-500' : perc >= 70 ? 'bg-amber-500' : 'bg-[#09797a]';

                      return (
                        <div key={loc} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800 uppercase">{loc}</span>
                            <span className="text-[11px] font-black text-slate-600 font-mono">{perc}% consumido</span>
                          </div>

                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className={`h-full ${corProgresso} transition-all`} style={{ width: `${perc}%` }} />
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400">
                              Gasto: <strong className="text-slate-700">R$ {gasto.toFixed(2).replace('.', ',')}</strong>
                            </span>
                            <span className="text-slate-400">
                              Resta: <strong className={restante === 0 && teto > 0 ? 'text-red-600' : 'text-emerald-700'}>R$ {restante.toFixed(2).replace('.', ',')}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col gap-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Ajustar Limite Mensal por Local
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                          Local / Setor
                        </label>
                        <select
                          value={localLimiteForm}
                          onChange={(e) => setLocalLimiteForm(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800"
                        >
                          {LOCAIS_CONSUMO.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                          Teto Mensal (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={valorLimiteInput}
                          onChange={(e) => setValorLimiteInput(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-800"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={salvandoLimite}
                          onClick={handleSalvarLimite}
                          className="w-full py-2 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          {salvandoLimite ? 'Gravando...' : 'Gravar Limite'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                      Limites Definidos para {mesAtual}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {LOCAIS_CONSUMO.map((loc) => {
                        const lim = limites.find((l) => l.local === loc);
                        return (
                          <div key={loc} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                            <div>
                              <span className="text-xs font-black text-slate-800 uppercase block">{loc}</span>
                              {lim ? (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Ajustado por {lim.usuario_nome} em {lim.data_ajuste} às {lim.hora_ajuste}
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">Sem teto cadastrado</span>
                              )}
                            </div>
                            <span className="text-sm font-black font-mono text-[#09797a]">
                              R$ {Number(lim?.valor_limite || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                      Auditoria de Alterações de Limites (Histórico do Mês)
                    </span>

                    {historicoLimites.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-medium">
                        Nenhuma alteração de limite registrada neste mês.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {historicoLimites.map((h) => (
                          <div key={h.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-black text-slate-800 uppercase">{h.local}</span>
                              <span className="text-[10px] text-slate-400 ml-2">
                                {h.data_alteracao} às {h.hora_alteracao} por <strong>{h.usuario_nome}</strong>
                              </span>
                            </div>
                            <div className="font-mono text-right">
                              <span className="line-through text-slate-400 mr-2">
                                R$ {h.valor_anterior.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="font-black text-[#09797a]">
                                R$ {h.valor_novo.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 3: MATÉRIA-PRIMA ================= */}
          {abaAtiva === 'materia-prima' && (
            <div className="flex flex-col gap-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-black uppercase text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>🔍</span>
                    <span>Filtros de Matéria-Prima</span>
                  </div>
                  <span>{filtrosAbertos ? '▲ Recolher' : '▼ Expandir Filtros'}</span>
                </button>

                {filtrosAbertos && (
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-200/60 mt-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Data Final
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Local / Setor Produtivo
                      </label>
                      <select
                        value={localFiltro}
                        onChange={(e) => setLocalFiltro(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800"
                      >
                        <option value="Todos">Todos os Locais</option>
                        {LOCAIS_CONSUMO.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Custo Total de Matéria-Prima {dataInicio ? 'no Período' : `em ${mesAtual}`}
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-950">
                    R$ {valorTotalPeriodo.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <span className="text-xs font-black uppercase text-amber-800 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-xs">
                  {itensMateriaPrima.length} {itensMateriaPrima.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Insumos Utilizados na Produção ({itensMateriaPrima.length})
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Exibir Itens:</span>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => {
                      setItensPorPagina(Number(e.target.value));
                      setPaginaAtual(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-black text-slate-700 cursor-pointer focus:outline-none focus:border-[#09797a]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {carregando ? (
                  <div className="p-8 text-center text-xs font-black uppercase text-amber-700 animate-pulse">
                    Carregando registros de matéria-prima...
                  </div>
                ) : itensPaginados.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                    Nenhum registro de matéria-prima encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {itensPaginados.map((it) => (
                      <div
                        key={it.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-amber-400 transition-all"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-black text-[10px]">
                              {it.codprod || 'S/C'}
                            </span>
                            <span className="font-black text-xs text-slate-900 uppercase">
                              {it.descricao_produto}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                              {it.local}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 font-medium">
                            <span>Qtd: <strong className="text-slate-700">{it.quantidade} {it.unidade_medida}</strong></span>
                            <span>•</span>
                            <span>Resp: <strong className="text-slate-700">{it.usuario_nome}</strong></span>
                            <span>•</span>
                            <span>Data: <strong className="text-slate-700">{it.data_registro.split('-').reverse().join('/')} às {it.hora_registro.slice(0, 5)}</strong></span>
                          </div>

                          {it.produto_produzido && (
                            <div className="mt-1 text-[11px] text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 w-fit">
                              🥖 Produziu: {it.produto_produzido}
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <span className="text-sm font-black font-mono text-amber-900 block">
                            R$ {it.valor_total_item.toFixed(2).replace('.', ',')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAbrirEdicao(it)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-[10px] font-black text-amber-900 uppercase flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                            title="Alterar Finalidade / Classificação"
                          >
                            ✏️ Editar Finalidade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 px-1">
                  <button
                    type="button"
                    disabled={paginaAtual === 1}
                    onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    ← Anterior
                  </button>

                  <span className="text-xs font-black text-slate-500 uppercase">
                    Página <strong className="text-slate-800">{paginaAtual}</strong> de <strong className="text-slate-800">{totalPaginas}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* MODAL DE EDIÇÃO DE FINALIDADE */}
      {itemEmEdicao && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setItemEmEdicao(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block">Classificação de Item</span>
                <h3 className="text-xs font-black text-slate-900 uppercase line-clamp-1">
                  {itemEmEdicao.descricao_produto}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Finalidade do Item
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovaFinalidade('Consumo/Despesa')}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                      novaFinalidade === 'Consumo/Despesa'
                        ? 'bg-[#09797a] text-white border-[#09797a]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🛒 Consumo / Despesa
                  </button>

                  <button
                    type="button"
                    onClick={() => setNovaFinalidade('Uso na Produção/Transformação')}
                    className={`p-2.5 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                      novaFinalidade === 'Uso na Produção/Transformação'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🥖 Matéria-Prima
                  </button>
                </div>
              </div>

              {novaFinalidade === 'Uso na Produção/Transformação' && (
                <div className="animate-fadeIn">
                  <label className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                    * Qual Produto foi Produzido?
                  </label>
                  <input
                    type="text"
                    value={novoProdutoProduzido}
                    onChange={(e) => setNovoProdutoProduzido(e.target.value)}
                    placeholder="Ex: Pão Francês, Bolo, Frango Assado..."
                    className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoEdicao}
                onClick={handleSalvarEdicaoFinalidade}
                className="px-5 py-2 rounded-xl bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white font-black text-xs uppercase shadow-md cursor-pointer active:scale-95 transition-all"
              >
                {salvandoEdicao ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}