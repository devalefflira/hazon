// src/pages/Avarias/index.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { avariasService } from './services/avariasService';
import type { AvariaRecord } from './types/avarias.types';
import RegistrarAvariaModal from './components/RegistrarAvariaModal';

interface AvariasProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

export default function Avarias({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: AvariasProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [avarias, setAvarias] = useState<AvariaRecord[]>([]);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalRegistroAberto, setModalRegistroAberto] = useState(false);

  // Controle de acordeão de filtros (Padrão: retraído)
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Filtros
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [motivoSel, setMotivoSel] = useState<string>('TODOS');
  const [destinacaoSel, setDestinacaoSel] = useState<string>('TODAS');
  const [departamentoSel, setDepartamentoSel] = useState<string>('TODOS');
  const [secaoSel, setSecaoSel] = useState<string>('TODOS');
  const [categoriaSel, setCategoriaSel] = useState<string>('TODOS');

  // Opções para os Selects
  const [opcoesDepartamentos, setOpcoesDepartamentos] = useState<string[]>([]);
  const [opcoesSecoes, setOpcoesSecoes] = useState<string[]>([]);
  const [opcoesCategorias, setOpcoesCategorias] = useState<string[]>([]);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(10);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaAvarias, listaMotivos, opcoesFiltros] = await Promise.all([
        avariasService.listarAvarias(),
        avariasService.listarMotivosAvaria(),
        avariasService.buscarOpcoesFiltrosProdutos()
      ]);
      setAvarias(listaAvarias);
      setMotivos(listaMotivos);
      setOpcoesDepartamentos(opcoesFiltros.departamentos as string[]);
      setOpcoesSecoes(opcoesFiltros.secoes as string[]);
      setOpcoesCategorias(opcoesFiltros.categorias as string[]);
    } catch (err: any) {
      console.error('Erro ao carregar avarias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const formatarDataSegura = (dataStr?: string) => {
    if (!dataStr) return '-';
    const partes = dataStr.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dataStr;
  };

  // Mês Atual Padrão
  const [primeiroDiaMesAtual, hojeFormatado] = useMemo(() => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return [`${ano}-${mes}-01`, `${ano}-${mes}-${dia}`];
  }, []);

  // Filtragem da Lista de Cards
  const avariasFiltradas = useMemo(() => {
    return avarias.filter((item: AvariaRecord) => {
      const dataItem = item.data_registro ? item.data_registro.split('T')[0] : '';

      if (dataInicio && dataItem < dataInicio) return false;
      if (dataFim && dataItem > dataFim) return false;

      if (motivoSel !== 'TODOS' && item.motivos_avaria?.descricao !== motivoSel) return false;
      if (destinacaoSel !== 'TODAS' && item.destinacao !== destinacaoSel) return false;
      if (departamentoSel !== 'TODOS' && item.produtos?.departamento !== departamentoSel) return false;
      if (secaoSel !== 'TODOS' && item.produtos?.secao !== secaoSel) return false;
      if (categoriaSel !== 'TODOS' && item.produtos?.categoria !== categoriaSel) return false;

      return true;
    });
  }, [avarias, dataInicio, dataFim, motivoSel, destinacaoSel, departamentoSel, secaoSel, categoriaSel]);

  // TOTAL PREJUÍZO: DESCARTE + DOAÇÃO (Exclui TROCA e CONSUMO INTERNO)
  const totalPrejuizo = useMemo(() => {
    return avarias.reduce((acc, a) => {
      const dest = (a.destinacao || '').toLowerCase();
      
      // Permite apenas DESCARTE e DOAÇÃO
      const isDescarteOuDoacao = dest.includes('descarte') || dest.includes('doação') || dest.includes('doacao');
      if (!isDescarteOuDoacao) return acc;

      const dataItem = a.data_registro ? a.data_registro.split('T')[0] : '';

      // Filtro manual ou padrão mês atual
      if (dataInicio || dataFim) {
        if (dataInicio && dataItem < dataInicio) return acc;
        if (dataFim && dataItem > dataFim) return acc;
      } else {
        if (dataItem < primeiroDiaMesAtual || dataItem > hojeFormatado) return acc;
      }

      if (motivoSel !== 'TODOS' && a.motivos_avaria?.descricao !== motivoSel) return acc;
      if (destinacaoSel !== 'TODAS' && a.destinacao !== destinacaoSel) return acc;
      if (departamentoSel !== 'TODOS' && a.produtos?.departamento !== departamentoSel) return acc;
      if (secaoSel !== 'TODOS' && a.produtos?.secao !== secaoSel) return acc;
      if (categoriaSel !== 'TODOS' && a.produtos?.categoria !== categoriaSel) return acc;

      const qtd = Number(a.quantidade || 0);
      const custo = Number(a.preco_custo_na_perda || 0);
      return acc + qtd * custo;
    }, 0);
  }, [
    avarias,
    dataInicio,
    dataFim,
    primeiroDiaMesAtual,
    hojeFormatado,
    motivoSel,
    destinacaoSel,
    departamentoSel,
    secaoSel,
    categoriaSel
  ]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [dataInicio, dataFim, motivoSel, destinacaoSel, departamentoSel, secaoSel, categoriaSel, itensPorPagina]);

  const totalPaginas = Math.ceil(avariasFiltradas.length / itensPorPagina) || 1;
  const indexInicial = (paginaAtual - 1) * itensPorPagina;
  const avariasPaginadas = avariasFiltradas.slice(indexInicial, indexInicial + itensPorPagina);

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setMotivoSel('TODOS');
    setDestinacaoSel('TODAS');
    setDepartamentoSel('TODOS');
    setSecaoSel('TODOS');
    setCategoriaSel('TODOS');
  };

  const temFiltroAtivo =
    Boolean(dataInicio) ||
    Boolean(dataFim) ||
    motivoSel !== 'TODOS' ||
    destinacaoSel !== 'TODAS' ||
    departamentoSel !== 'TODOS' ||
    secaoSel !== 'TODOS' ||
    categoriaSel !== 'TODOS';

  const handleSalvarNovaAvaria = async (dados: any) => {
    await avariasService.registrarAvaria({
      ...dados,
      usuario_id: idUsuarioFinal
    });
    setModalRegistroAberto(false);
    await carregarDados();
  };

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
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">AVARIAS</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">Controle de Quebras e Perdas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalRegistroAberto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + REGISTRAR
          </button>
        </div>

        {/* PAINEL DE FILTROS AVANÇADOS (RETRÁTIL) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 transition-all">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Filtros Avançados
              </span>
              {temFiltroAtivo && (
                <span className="w-2 h-2 rounded-full bg-[#09797a]" title="Filtros aplicados" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="text-[10px] font-bold text-red-600 hover:underline uppercase mr-1"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltrosExpandidos((prev) => !prev)}
                className="w-7 h-7 rounded-xl bg-white border border-slate-300 text-[#09797a] font-black text-sm flex items-center justify-center shadow-sm hover:bg-slate-100 transition-all"
                title={filtrosExpandidos ? 'Recolher Filtros' : 'Expandir Filtros'}
              >
                {filtrosExpandidos ? '−' : '+'}
              </button>
            </div>
          </div>

          {/* CAMPOS EXPANSÍVEIS */}
          {filtrosExpandidos && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200/80 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo</label>
                  <select
                    value={motivoSel}
                    onChange={(e) => setMotivoSel(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                  >
                    <option value="TODOS">⚠️ MOTIVO: TODOS</option>
                    {motivos.map((m) => (
                      <option key={m.id} value={m.descricao}>{m.descricao.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Destinação</label>
                  <select
                    value={destinacaoSel}
                    onChange={(e) => setDestinacaoSel(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                  >
                    <option value="TODAS">📦 DESTINAÇÃO: TODAS</option>
                    <option value="Descarte">DESCARTE</option>
                    <option value="Troca">TROCA FORNECEDOR</option>
                    <option value="Consumo Interno">CONSUMO INTERNO</option>
                    <option value="Doação">DOAÇÃO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data Inicial</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data Final</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
                  <select
                    value={departamentoSel}
                    onChange={(e) => setDepartamentoSel(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                  >
                    <option value="TODOS">DEPTO: TODOS</option>
                    {opcoesDepartamentos.map((dep) => (
                      <option key={dep} value={dep}>{dep.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Seção</label>
                  <select
                    value={secaoSel}
                    onChange={(e) => setSecaoSel(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                  >
                    <option value="TODOS">SEÇÃO: TODAS</option>
                    {opcoesSecoes.map((sec) => (
                      <option key={sec} value={sec}>{sec.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                  <select
                    value={categoriaSel}
                    onChange={(e) => setCategoriaSel(e.target.value)}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                  >
                    <option value="TODOS">CAT: TODAS</option>
                    {opcoesCategorias.map((cat) => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD TOTALIZADOR DO PREJUÍZO (DESCARTE + DOAÇÃO) */}
        <div className="bg-red-50/70 border border-red-200 px-4 py-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-red-900 uppercase">Total Prejuízo:</span>
            <span className="font-mono text-base sm:text-lg font-black text-red-600">
              - {totalPrejuizo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {!dataInicio && !dataFim ? '(MÊS ATUAL: DESCARTE + DOAÇÃO)' : `(${avariasFiltradas.length} ITENS)`}
          </span>
        </div>

        {/* EXIBIR POR PÁG */}
        <div className="flex items-center justify-end gap-2 px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Exibir por pág:</span>
          <select
            value={itensPorPagina}
            onChange={(e) => setItensPorPagina(Number(e.target.value))}
            className="bg-white border border-slate-300 text-xs font-black text-slate-700 rounded-xl px-3 py-1.5 outline-none focus:border-[#09797a] shadow-sm cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* LISTAGEM DOS CARDS COM OBSERVAÇÃO ANTES DO VALOR */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando avarias...</div>
          ) : avariasFiltradas.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhuma avaria encontrada para os filtros selecionados.
            </div>
          ) : (
            avariasPaginadas.map((av: AvariaRecord) => {
              const valorPerda = Number(av.quantidade || 0) * Number(av.preco_custo_na_perda || 0);

              return (
                <div
                  key={av.id}
                  className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {av.codigo_customizado || 'AV'}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Cód: {av.produtos?.codprod || '-'}
                      </span>
                    </div>

                    <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                      {av.produtos?.descricao || 'PRODUTO NÃO IDENTIFICADO'}
                    </h3>

                    <div className="text-[11px] text-slate-500 font-semibold mt-1">
                      QTD: <strong className="text-slate-800">{av.quantidade} {av.produtos?.unidade || 'UN'}</strong> &nbsp;|&nbsp;
                      MOTIVO: <strong className="text-slate-800 uppercase">{av.motivos_avaria?.descricao || 'AVARIA'}</strong>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        DESTINO: {av.destinacao || 'DESCARTE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Resp: <strong className="text-slate-600">{av.usuarios?.nome || 'Sistema'}</strong>
                      </span>
                    </div>

                    {/* OBSERVAÇÃO ANTES DO VALOR */}
                    {av.observacao && (
                      <div className="text-[10px] text-slate-500 italic mt-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                        Obs: {av.observacao}
                      </div>
                    )}
                  </div>

                  {/* BLOCO DE VALOR, DATA E HORA */}
                  <div className="text-right flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between items-end">
                    <span className="text-sm font-black text-red-600 font-mono">
                      - R$ {valorPerda.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                      {formatarDataSegura(av.data_registro)} às {av.hora_registro?.slice(0, 5) || '00:00'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {avariasFiltradas.length > itensPorPagina && (
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
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-xs text-slate-400 px-1">...</span>
                      )}
                      <button
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
                    </React.Fragment>
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

      {/* MODAL REGISTRAR AVARIA */}
      {modalRegistroAberto && (
        <RegistrarAvariaModal
          motivos={motivos}
          onCancelar={() => setModalRegistroAberto(false)}
          onSalvar={handleSalvarNovaAvaria}
        />
      )}
    </div>
  );
}