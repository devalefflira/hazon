// src/pages/NotaFalta/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { notaFaltaService } from './services/notaFaltaService';
import { gerarPdfNotaFalta } from './utils/gerarPdfNotaFalta';

interface NotaFaltaProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

type PipelineTab = 'EM_ANDAMENTO' | 'SALVAS' | 'FINALIZADAS';

const AREAS_DISPONIVEIS = ['Frente e Piso de Loja', 'Fundo de Loja', 'Depósito'];

const LOCAIS_FRENTE_DEPOSITO = [
  'Geral',
  'Cereais',
  'Enlatados',
  'Bebidas',
  'Limpeza',
  'Perfumaria / Higiene Pessoal',
  'Bazar',
  'Massas Alimentícias',
  'Laticínios'
];

const LOCAIS_FUNDO_LOJA = ['Geral', 'Açougue', 'Hortifruti', 'Padaria', 'Frios'];

const UNIDADES_OPCOES = ['UN', 'CX', 'FD', 'SC', 'PC'];

export default function NotaFalta({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: NotaFaltaProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaPipeline, setAbaPipeline] = useState<PipelineTab>('SALVAS');

  // Filtros
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('TODAS');
  const [localFiltro, setLocalFiltro] = useState('TODOS');

  // Fluxo de Criação
  const [passoCriacao, setPassoCriacao] = useState<'FECHADO' | 'MODAL_LOCAL' | 'FORM_ITENS'>('FECHADO');
  const [areaEscolhida, setAreaEscolhida] = useState<string>(AREAS_DISPONIVEIS[0]);
  const [localEscolhido, setLocalEscolhido] = useState<string>('Geral');
  const [codigoNotaEmEdicao, setCodigoNotaEmEdicao] = useState<string | null>(null);

  // Formulário de Itens
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [tipoMotivo, setTipoMotivo] = useState<'Estoque Baixo' | 'Estoque Zero'>('Estoque Baixo');
  const [qtdRestante, setQtdRestante] = useState<number | ''>(1);
  const [unidadeRestante, setUnidadeRestante] = useState<string>(UNIDADES_OPCOES[0]);
  const [itensCriacao, setItensCriacao] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Modais de Ação
  const [notaParaFinalizar, setNotaParaFinalizar] = useState<any | null>(null);
  const [notaParaVerItens, setNotaParaVerItens] = useState<any | null>(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const data = await notaFaltaService.listarNotasFalta();
      setNotas(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Busca Inteligente
  useEffect(() => {
    if (!termoBusca.trim() || produtoSelecionado) {
      setProdutosEncontrados([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await notaFaltaService.buscarProdutos(termoBusca);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, produtoSelecionado]);

  // Lista dinâmica de locais
  const listaLocaisAtuais = useMemo(() => {
    if (areaEscolhida === 'Fundo de Loja') return LOCAIS_FUNDO_LOJA;
    return LOCAIS_FRENTE_DEPOSITO;
  }, [areaEscolhida]);

  useEffect(() => {
    setLocalEscolhido('Geral');
  }, [areaEscolhida]);

  // Agrupamento por código
  const notasAgrupadas = useMemo(() => {
    const grupos: Record<string, any> = {};

    notas.forEach((item) => {
      const cod = item.codigo_customizado || 'NF-SEM-CODIGO';
      if (!grupos[cod]) {
        grupos[cod] = {
          codigo_customizado: cod,
          area: item.area || 'Frente e Piso de Loja',
          local: item.local || 'Geral',
          status: item.status_cotacao || 'Salva',
          data_registro: item.data_registro,
          hora_registro: item.hora_registro,
          usuario_nome: item.usuarios?.nome || 'Sistema',
          itens: []
        };
      }
      grupos[cod].itens.push(item);
    });

    return Object.values(grupos);
  }, [notas]);

  // Filtragem por Pipeline e Filtros Avançados
  const notasFiltradas = useMemo(() => {
    return notasAgrupadas.filter((nota) => {
      if (abaPipeline === 'EM_ANDAMENTO' && nota.status !== 'Em Andamento') return false;
      if (abaPipeline === 'SALVAS' && nota.status !== 'Salva' && nota.status !== 'Pendente') return false;
      if (abaPipeline === 'FINALIZADAS' && nota.status !== 'Finalizada') return false;

      const dt = nota.data_registro ? nota.data_registro.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;

      if (areaFiltro !== 'TODAS' && nota.area !== areaFiltro) return false;
      if (localFiltro !== 'TODOS' && nota.local !== localFiltro) return false;

      return true;
    });
  }, [notasAgrupadas, abaPipeline, dataInicio, dataFim, areaFiltro, localFiltro]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [dataInicio, dataFim, areaFiltro, localFiltro, abaPipeline, itensPorPagina]);

  const totalPaginas = Math.ceil(notasFiltradas.length / itensPorPagina) || 1;
  const indexInicial = (paginaAtual - 1) * itensPorPagina;
  const notasPaginadas = notasFiltradas.slice(indexInicial, indexInicial + itensPorPagina);

  const formatarDataSegura = (dataStr?: string) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  const handleAdicionarItemForm = () => {
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }
    if (itensCriacao.some((i) => i.produto_id === produtoSelecionado.id)) {
      alert('Produto já inserido na lista.');
      return;
    }

    setItensCriacao((prev) => [
      ...prev,
      {
        produto_id: produtoSelecionado.id,
        codprod: produtoSelecionado.codprod,
        descricao: produtoSelecionado.descricao,
        custoreal: Number(produtoSelecionado.custoreal || 0),
        tipo_motivo: tipoMotivo,
        quantidade_restante: tipoMotivo === 'Estoque Zero' ? 0 : Number(qtdRestante || 1),
        unidade_restante: tipoMotivo === 'Estoque Zero' ? 'UN' : unidadeRestante
      }
    ]);

    setProdutoSelecionado(null);
    setTermoBusca('');
    setQtdRestante(1);
  };

  const handleSalvarFluxo = async (statusFinal: 'Em Andamento' | 'Salva') => {
    if (itensCriacao.length === 0) {
      alert('Adicione ao menos um produto na lista.');
      return;
    }

    try {
      setSalvando(true);
      await notaFaltaService.salvarItensNotaFalta({
        codigo_customizado: codigoNotaEmEdicao || undefined,
        usuario_id: idUsuarioFinal,
        area: areaEscolhida,
        local: localEscolhido,
        status: statusFinal,
        itens: itensCriacao
      });

      alert(statusFinal === 'Em Andamento' ? 'Nota pausada em andamento!' : 'Nota de Falta salva com sucesso!');
      setPassoCriacao('FECHADO');
      setItensCriacao([]);
      setCodigoNotaEmEdicao(null);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarFinalizacaoCiclo = async () => {
    if (!notaParaFinalizar) return;
    try {
      setSalvando(true);
      await notaFaltaService.finalizarCicloNota(notaParaFinalizar.codigo_customizado);
      alert('Ciclo finalizado com sucesso!');
      setNotaParaFinalizar(null);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao finalizar ciclo: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // 1. TELA CHEIA: FORMULÁRIO DE ITENS
  if (passoCriacao === 'FORM_ITENS') {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#09797a]">
                  Área: {areaEscolhida}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Local: {localEscolhido}
                </span>
              </div>
              <h2 className="text-lg font-black text-[#09797a] uppercase mt-1">
                ADICIONAR ITENS NA NOTA DE FALTA
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPassoCriacao('FECHADO')}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* Painel de Inserção */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Produto</label>
              <input
                type="text"
                placeholder="Bipe o código de barras ou digite parte do nome / código..."
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setProdutoSelecionado(null);
                }}
                className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
              />

              {produtosEncontrados.length > 0 && !produtoSelecionado && (
                <div className="absolute top-18 left-0 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {produtosEncontrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProdutoSelecionado(p);
                        setTermoBusca(`${p.codprod} - ${p.descricao}`);
                        setProdutosEncontrados([]);
                      }}
                      className="w-full text-left p-3 hover:bg-teal-50 flex justify-between items-center text-xs font-bold text-slate-800 uppercase"
                    >
                      <div>
                        <div>{p.codprod} - {p.descricao}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Último Custo: <strong className="text-emerald-700">R$ {Number(p.custoreal || 0).toFixed(2)}</strong> • Un: {p.unidade || 'UN'}
                        </span>
                      </div>
                      <span className="text-[#09797a] text-[10px] font-black">+ Selecionar</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo *</label>
                <select
                  value={tipoMotivo}
                  onChange={(e) => setTipoMotivo(e.target.value as any)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                >
                  <option value="Estoque Baixo">📉 ESTOQUE BAIXO</option>
                  <option value="Estoque Zero">🚫 ESTOQUE ZERO</option>
                </select>
              </div>

              {tipoMotivo === 'Estoque Baixo' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Qtd Restante</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={qtdRestante}
                      onChange={(e) => setQtdRestante(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 text-center"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade</label>
                    <select
                      value={unidadeRestante}
                      onChange={(e) => setUnidadeRestante(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                    >
                      {UNIDADES_OPCOES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={!produtoSelecionado}
              onClick={handleAdicionarItemForm}
              className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              + Adicionar à Lista
            </button>
          </div>

          {/* Listagem Prévia com Último Custo */}
          <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase text-slate-400 block px-1">
              Itens Inseridos ({itensCriacao.length})
            </span>

            {itensCriacao.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                Nenhum produto adicionado.
              </div>
            ) : (
              itensCriacao.map((it) => (
                <div
                  key={it.produto_id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold shadow-sm"
                >
                  <div>
                    <span className="text-[9px] font-mono text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded font-black">
                      {it.codprod}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5">{it.descricao}</h4>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>Motivo: <strong className="text-slate-700">{it.tipo_motivo}</strong></span>
                      <span>•</span>
                      <span>Último Custo: <strong className="text-emerald-700 font-mono">R$ {Number(it.custoreal || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-800 font-black">
                      {it.tipo_motivo === 'Estoque Zero' ? '0 UN' : `${it.quantidade_restante} ${it.unidade_restante}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItensCriacao(itensCriacao.filter((i) => i.produto_id !== it.produto_id))}
                      className="text-red-500 hover:text-red-700 font-black text-sm p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setPassoCriacao('FECHADO')}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando || itensCriacao.length === 0}
              onClick={() => handleSalvarFluxo('Em Andamento')}
              className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-2xl text-xs font-black uppercase transition-all disabled:opacity-40"
            >
              ⏸ Pausar
            </button>
            <button
              type="button"
              disabled={salvando || itensCriacao.length === 0}
              onClick={() => handleSalvarFluxo('Salva')}
              className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Salvando...' : 'Salvar Nota'}
            </button>
          </div>

        </div>
      </div>
    );
  }

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
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">NOTAS DE FALTA</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Controle de Ruptura e Reposição de Estoque
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAreaEscolhida(AREAS_DISPONIVEIS[0]);
              setLocalEscolhido('Geral');
              setItensCriacao([]);
              setCodigoNotaEmEdicao(null);
              setPassoCriacao('MODAL_LOCAL');
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + NOVA NOTA
          </button>
        </div>

        {/* PIPELINE TABS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-3 gap-1 text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaPipeline('EM_ANDAMENTO')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaPipeline === 'EM_ANDAMENTO' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Em Andamento</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">
              {notasAgrupadas.filter((n) => n.status === 'Em Andamento').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaPipeline('SALVAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaPipeline === 'SALVAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Salvas</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">
              {notasAgrupadas.filter((n) => n.status === 'Salva' || n.status === 'Pendente').length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaPipeline('FINALIZADAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaPipeline === 'FINALIZADAS' ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Finalizadas</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">
              {notasAgrupadas.filter((n) => n.status === 'Finalizada').length}
            </span>
          </button>
        </div>

        {/* FILTROS AVANÇADOS */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
              Filtros Avançados
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
                <label className="text-[10px] font-bold text-slate-400 uppercase">Área</label>
                <select
                  value={areaFiltro}
                  onChange={(e) => setAreaFiltro(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                >
                  <option value="TODAS">TODAS</option>
                  {AREAS_DISPONIVEIS.map((a) => (
                    <option key={a} value={a}>{a.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Local</label>
                <select
                  value={localFiltro}
                  onChange={(e) => setLocalFiltro(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase"
                >
                  <option value="TODOS">TODOS</option>
                  {Array.from(new Set([...LOCAIS_FRENTE_DEPOSITO, ...LOCAIS_FUNDO_LOJA])).map((l) => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* CONTADOR E PAGINAÇÃO */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500">
            Total: <strong>{notasFiltradas.length}</strong> notas registradas
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Exibir por pág:</span>
            <select
              value={itensPorPagina}
              onChange={(e) => setItensPorPagina(Number(e.target.value))}
              className="bg-white border border-slate-300 text-xs font-black text-slate-700 rounded-xl px-3 py-1.5 outline-none focus:border-[#09797a] shadow-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* LISTAGEM DOS CARDS */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando notas...</div>
          ) : notasFiltradas.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhuma Nota de Falta nesta visualização.
            </div>
          ) : (
            notasPaginadas.map((grupo: any) => (
              <div
                key={grupo.codigo_customizado}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                      {grupo.codigo_customizado}
                    </span>
                    <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      ÁREA: {grupo.area}
                    </span>
                    <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      LOCAL: {grupo.local}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        grupo.status === 'Finalizada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : grupo.status === 'Em Andamento'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-50 text-[#09797a]'
                      }`}
                    >
                      {grupo.status}
                    </span>
                  </div>

                  <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                    {grupo.itens?.length || 0} PRODUTO(S) APONTADO(S) EM RUPTURA
                  </h3>

                  <div className="text-[10px] text-slate-400 font-medium mt-1">
                    Resp: <strong className="text-slate-600">{grupo.usuario_nome}</strong>, em{' '}
                    <strong>{formatarDataSegura(grupo.data_registro)}</strong>, às{' '}
                    <strong>{grupo.hora_registro?.slice(0, 5) || '00:00'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                  {grupo.status === 'Em Andamento' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAreaEscolhida(grupo.area);
                        setLocalEscolhido(grupo.local);
                        setCodigoNotaEmEdicao(grupo.codigo_customizado);
                        setItensCriacao(
                          (grupo.itens || []).map((it: any) => ({
                            produto_id: it.produto_id,
                            codprod: it.produtos?.codprod,
                            descricao: it.produtos?.descricao,
                            custoreal: Number(it.produtos?.custoreal || 0),
                            tipo_motivo: it.quantidade_restante === 0 ? 'Estoque Zero' : 'Estoque Baixo',
                            quantidade_restante: it.quantidade_restante,
                            unidade_restante: it.unidade_restante || 'UN'
                          }))
                        );
                        setPassoCriacao('FORM_ITENS');
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all"
                    >
                      ▶ Retomar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setNotaParaVerItens(grupo)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Ver Itens
                  </button>

                  <button
                    type="button"
                    onClick={() => gerarPdfNotaFalta(grupo, grupo.itens || [])}
                    className="px-3.5 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all"
                  >
                    📄 PDF
                  </button>

                  {(grupo.status === 'Salva' || grupo.status === 'Pendente') && (
                    <button
                      type="button"
                      onClick={() => setNotaParaFinalizar(grupo)}
                      className="w-9 h-9 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center text-base shadow-sm transition-all active:scale-95"
                      title="Finalizar Ciclo (Itens Pedidos)"
                    >
                      👍
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {notasFiltradas.length > itensPorPagina && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-shrink-0">
            <span className="text-xs font-bold text-slate-500">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                ← Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPaginaAtual(p)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                        paginaAtual === p
                          ? 'bg-[#09797a] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>

              <button
                type="button"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL ETAPA 1: ESCOLHA DA ÁREA E LOCAL */}
      {passoCriacao === 'MODAL_LOCAL' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-[#09797a] uppercase">1. Selecione a Origem da Falta</h3>
              <button
                type="button"
                onClick={() => setPassoCriacao('FECHADO')}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Área *</label>
                <select
                  value={areaEscolhida}
                  onChange={(e) => setAreaEscolhida(e.target.value)}
                  className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-black text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  {AREAS_DISPONIVEIS.map((a) => (
                    <option key={a} value={a}>{a.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Local *</label>
                <select
                  value={localEscolhido}
                  onChange={(e) => setLocalEscolhido(e.target.value)}
                  className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-black text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  {listaLocaisAtuais.map((l) => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPassoCriacao('FECHADO')}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setPassoCriacao('FORM_ITENS')}
                className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-md transition-all active:scale-95"
              >
                Avançar para Itens →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE FINALIZAR CICLO */}
      {notaParaFinalizar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 text-center animate-fadeIn">
            <span className="text-3xl">📦</span>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase">Finalizar Ciclo da Nota</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Os itens desta lista (<strong className="text-slate-800">{notaParaFinalizar.codigo_customizado}</strong>) já foram pedidos?
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNotaParaFinalizar(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={handleConfirmarFinalizacaoCiclo}
                className="flex-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase shadow-md transition-all active:scale-95"
              >
                {salvando ? 'Concluindo...' : 'Sim (Finalizar)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VER ITENS COM ÚLTIMO CUSTO */}
      {notaParaVerItens && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                  {notaParaVerItens.codigo_customizado}
                </span>
                <h3 className="text-sm font-black text-slate-800 uppercase mt-0.5">
                  Itens da Nota de Falta
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotaParaVerItens(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {notaParaVerItens.itens?.map((it: any) => (
                <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">Cód: {it.produtos?.codprod}</span>
                    <h4 className="font-black text-slate-800 uppercase mt-0.5">{it.produtos?.descricao}</h4>
                    <span className="text-[10px] text-slate-500">
                      Último Custo: <strong className="text-emerald-700 font-mono">R$ {Number(it.produtos?.custoreal || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-700">
                    {it.quantidade_restante === 0 ? 'ESTOQUE ZERO' : `${it.quantidade_restante} ${it.unidade_restante || 'UN'}`}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setNotaParaVerItens(null)}
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