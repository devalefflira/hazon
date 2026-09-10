// src/pages/Avarias/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { avariasService } from './services/avariasService';
import RegistrarAvariaModal from './components/RegistrarAvariaModal';
import RegistrarAvariaLote from './components/RegistrarAvariaLote';

interface AvariasProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
  [key: string]: any;
}

const DESTINACOES_OPCOES = ['TODAS', 'Descarte', 'Doação', 'Troca', 'Consumo Interno'];

export default function Avarias({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: AvariasProps) {
  const [avarias, setAvarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Controle de Visualização: 'LISTAGEM' | 'REGISTRAR' | 'LOTE' (Todas em Tela Cheia)
  const [telaAtiva, setTelaAtiva] = useState<'LISTAGEM' | 'REGISTRAR' | 'LOTE'>('LISTAGEM');

  // Filtros Avançados: retraído por padrão
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [motivoSel, setMotivoSel] = useState('TODOS');
  const [destinacaoSel, setDestinacaoSel] = useState('TODAS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Hierarquia Mercadológica: Departamento > Seção > Categoria
  const [departamentoSel, setDepartamentoSel] = useState('TODOS');
  const [secaoSel, setSecaoSel] = useState('TODOS');
  const [categoriaSel, setCategoriaSel] = useState('TODOS');

  // Listas de opções dinâmicas
  const [listaDepartamentos, setListaDepartamentos] = useState<string[]>([]);
  const [secoesMap, setSecoesMap] = useState<Record<string, string[]>>({});
  const [categoriasMap, setCategoriasMap] = useState<Record<string, string[]>>({});

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [lista, opcoesFiltro] = await Promise.all([
        avariasService.listarAvarias(),
        avariasService.buscarOpcoesFiltrosProdutos()
      ]);
      setAvarias(lista);

      const deptosDasAvarias = new Set<string>(opcoesFiltro.departamentos || []);
      lista.forEach((av) => {
        const d = av.produtos?.departamento?.trim();
        if (d && isNaN(Number(d)) && !d.includes('.') && d.length >= 2) {
          deptosDasAvarias.add(d);
        }
      });

      setListaDepartamentos(Array.from(deptosDasAvarias).sort());
      setSecoesMap(opcoesFiltro.secoesPorDepartamento || {});
      setCategoriasMap(opcoesFiltro.categoriasPorSecao || {});
    } catch (err) {
      console.error('Erro ao carregar avarias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const secoesDisponiveis = useMemo(() => {
    if (departamentoSel === 'TODOS') {
      const todas = new Set<string>();
      Object.values(secoesMap).forEach((arr) => arr.forEach((s) => todas.add(s)));
      avarias.forEach((av) => {
        const s = av.produtos?.secao?.trim();
        if (s && isNaN(Number(s)) && !s.includes('.')) todas.add(s);
      });
      return Array.from(todas).sort();
    }
    return secoesMap[departamentoSel] || [];
  }, [departamentoSel, secoesMap, avarias]);

  const categoriasDisponiveis = useMemo(() => {
    if (secaoSel === 'TODOS') {
      const todas = new Set<string>();
      Object.values(categoriasMap).forEach((arr) => arr.forEach((c) => todas.add(c)));
      avarias.forEach((av) => {
        const c = av.produtos?.categoria?.trim();
        if (c && isNaN(Number(c)) && !c.includes('.')) todas.add(c);
      });
      return Array.from(todas).sort();
    }
    return categoriasMap[secaoSel] || [];
  }, [secaoSel, categoriasMap, avarias]);

  const handleMudarDepartamento = (novoDepto: string) => {
    setDepartamentoSel(novoDepto);
    setSecaoSel('TODOS');
    setCategoriaSel('TODOS');
    setPaginaAtual(1);
  };

  const handleMudarSecao = (novaSecao: string) => {
    setSecaoSel(novaSecao);
    setCategoriaSel('TODOS');
    setPaginaAtual(1);
  };

  const handleLimparFiltros = () => {
    setMotivoSel('TODOS');
    setDestinacaoSel('TODAS');
    setDataInicio('');
    setDataFim('');
    setDepartamentoSel('TODOS');
    setSecaoSel('TODOS');
    setCategoriaSel('TODOS');
    setPaginaAtual(1);
  };

  const temFiltroAtivo = useMemo(() => {
    return (
      motivoSel !== 'TODOS' ||
      destinacaoSel !== 'TODAS' ||
      dataInicio !== '' ||
      dataFim !== '' ||
      departamentoSel !== 'TODOS' ||
      secaoSel !== 'TODOS' ||
      categoriaSel !== 'TODOS'
    );
  }, [motivoSel, destinacaoSel, dataInicio, dataFim, departamentoSel, secaoSel, categoriaSel]);

  const avariasFiltradas = useMemo(() => {
    return avarias.filter((av) => {
      const prod = av.produtos || {};

      if (motivoSel !== 'TODOS' && av.motivo_avaria_id !== motivoSel) return false;

      if (destinacaoSel !== 'TODAS') {
        const dest = (av.destinacao || '').toLowerCase();
        if (dest !== destinacaoSel.toLowerCase()) return false;
      }

      const dt = av.data_registro ? av.data_registro.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;

      if (departamentoSel !== 'TODOS') {
        const dProd = (prod.departamento || '').trim().toUpperCase();
        if (dProd !== departamentoSel.toUpperCase()) return false;
      }

      if (secaoSel !== 'TODOS') {
        const sProd = (prod.secao || '').trim().toUpperCase();
        if (sProd !== secaoSel.toUpperCase()) return false;
      }

      if (categoriaSel !== 'TODOS') {
        const cProd = (prod.categoria || '').trim().toUpperCase();
        if (cProd !== categoriaSel.toUpperCase()) return false;
      }

      return true;
    });
  }, [avarias, motivoSel, destinacaoSel, dataInicio, dataFim, departamentoSel, secaoSel, categoriaSel]);

  const totalAvariasCalculado = useMemo(() => {
    if (temFiltroAtivo) {
      return avariasFiltradas.reduce((acc, av) => {
        const dest = (av.destinacao || '').toLowerCase();
        const considerar = destinacaoSel !== 'TODAS'
          ? true
          : dest.includes('descarte') || dest.includes('doação') || dest.includes('doacao');

        if (!considerar) return acc;

        const qtd = Number(av.quantidade || 0);
        const custoUnit = Number(av.preco_custo_na_perda || av.produtos?.custoreal || 0);
        return acc + qtd * custoUnit;
      }, 0);
    }

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    return avarias.reduce((acc, av) => {
      const dest = (av.destinacao || '').toLowerCase();
      const ehDescarteOuDoacao = dest.includes('descarte') || dest.includes('doação') || dest.includes('doacao');

      if (!ehDescarteOuDoacao) return acc;
      if (!av.data_registro) return acc;

      const partesData = av.data_registro.split('T')[0].split('-');
      if (partesData.length < 2) return acc;

      const anoReg = Number(partesData[0]);
      const mesReg = Number(partesData[1]);

      if (anoReg === anoAtual && mesReg === mesAtual) {
        const qtd = Number(av.quantidade || 0);
        const custoUnit = Number(av.preco_custo_na_perda || av.produtos?.custoreal || 0);
        return acc + qtd * custoUnit;
      }

      return acc;
    }, 0);
  }, [avarias, avariasFiltradas, temFiltroAtivo, destinacaoSel]);

  const formatarMoedaBR = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatarDataBR = (dt?: string) => {
    if (!dt) return '-';
    const partes = dt.split('T')[0].split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dt;
  };

  const formatarHora = (hr?: string) => {
    if (!hr) return '';
    return hr.slice(0, 5);
  };

  const totalPaginas = Math.ceil(avariasFiltradas.length / itensPorPagina) || 1;
  const indexInicio = (paginaAtual - 1) * itensPorPagina;
  const avariasPaginadas = avariasFiltradas.slice(indexInicio, indexInicio + itensPorPagina);

  const listaMotivosDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>();
    avarias.forEach((a) => {
      if (a.motivos_avaria?.id && a.motivos_avaria?.descricao) {
        mapa.set(a.motivos_avaria.id, a.motivos_avaria.descricao);
      }
    });
    return Array.from(mapa.entries()).map(([id, desc]) => ({ id, desc }));
  }, [avarias]);

  const idUsuarioAtivo = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  // VISÃO 1: REGISTRO UNITÁRIO EM TELA CHEIA
  if (telaAtiva === 'REGISTRAR') {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          <RegistrarAvariaModal
            onFechar={() => setTelaAtiva('LISTAGEM')}
            onCancelar={() => setTelaAtiva('LISTAGEM')}
            onVoltar={() => setTelaAtiva('LISTAGEM')}
            onSucesso={() => {
              setTelaAtiva('LISTAGEM');
              carregarDados();
            }}
            usuarioLogadoId={idUsuarioAtivo}
          />
        </div>
      </div>
    );
  }

  // VISÃO 2: REGISTRO EM LOTE EM TELA CHEIA
  if (telaAtiva === 'LOTE') {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          <RegistrarAvariaLote
            onVoltar={() => setTelaAtiva('LISTAGEM')}
            onSucesso={() => {
              setTelaAtiva('LISTAGEM');
              carregarDados();
            }}
            usuarioLogadoId={idUsuarioAtivo}
          />
        </div>
      </div>
    );
  }

  // VISÃO PRINCIPAL DA LISTAGEM
  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
        {/* HEADER COM BOTÕES REGISTRAR E EM LOTE */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome || (() => window.history.back())}
              className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none cursor-pointer"
            >
              ←
            </button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">AVARIAS</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Controle de Quebras e Perdas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTelaAtiva('LOTE')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-2xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              + EM LOTE
            </button>

            <button
              type="button"
              onClick={() => setTelaAtiva('REGISTRAR')}
              className="bg-[#09797a] hover:bg-[#075f60] text-white px-3.5 py-2 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              + REGISTRAR
            </button>
          </div>
        </div>

        {/* CONTAINER FILTROS AVANÇADOS (RETRAÍDO POR PADRÃO) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3 shadow-xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                FILTROS AVANÇADOS
              </span>
              {temFiltroAtivo && <span className="w-2 h-2 rounded-full bg-[#09797a]" />}
            </div>

            <div className="flex items-center gap-2">
              {temFiltroAtivo && (
                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="text-[11px] font-black uppercase text-red-600 hover:underline px-1 cursor-pointer"
                >
                  LIMPAR
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                className="w-7 h-7 rounded-xl bg-white border border-slate-300 text-slate-600 font-black text-xs flex items-center justify-center shadow-xs cursor-pointer hover:bg-slate-100"
              >
                {filtrosAbertos ? '−' : '+'}
              </button>
            </div>
          </div>

          {filtrosAbertos && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-200">
              {/* Motivo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">MOTIVO</label>
                <select
                  value={motivoSel}
                  onChange={(e) => {
                    setMotivoSel(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">⚠️ MOTIVO: TODOS</option>
                  {listaMotivosDisponiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.desc.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destinação */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">DESTINAÇÃO</label>
                <select
                  value={destinacaoSel}
                  onChange={(e) => {
                    setDestinacaoSel(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  {DESTINACOES_OPCOES.map((d) => (
                    <option key={d} value={d}>
                      📦 DESTINAÇÃO: {d.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">DATA INICIAL</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-2.5 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">DATA FINAL</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-2.5 font-bold text-slate-800 outline-none focus:border-[#09797a]"
                  />
                </div>
              </div>

              {/* HIERARQUIA 1: DEPARTAMENTO */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#09797a] uppercase tracking-wider">
                  1. DEPARTAMENTO (PRINCIPAL)
                </label>
                <select
                  value={departamentoSel}
                  onChange={(e) => handleMudarDepartamento(e.target.value)}
                  className="w-full h-10 text-xs bg-white border-2 border-[#09797a]/30 rounded-xl px-3 font-black text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">DEPTO: TODOS</option>
                  {listaDepartamentos.map((d) => (
                    <option key={d} value={d}>
                      {d.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* HIERARQUIA 2: SEÇÃO */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  2. SEÇÃO {departamentoSel !== 'TODOS' && `(DE ${departamentoSel})`}
                </label>
                <select
                  value={secaoSel}
                  onChange={(e) => handleMudarSecao(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">SEÇÃO: TODAS</option>
                  {secoesDisponiveis.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* HIERARQUIA 3: CATEGORIA */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  3. CATEGORIA {secaoSel !== 'TODOS' && `(DE ${secaoSel})`}
                </label>
                <select
                  value={categoriaSel}
                  onChange={(e) => {
                    setCategoriaSel(e.target.value);
                    setPaginaAtual(1);
                  }}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">CAT: TODAS</option>
                  {categoriasDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* CARD TOTAL AVARIAS REATIVO */}
        <div className="p-4 bg-red-50/40 border border-red-200/80 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-black text-slate-800 uppercase block tracking-wider">
              TOTAL AVARIAS:
            </span>
            <span className="text-xl sm:text-2xl font-black text-red-700 font-mono tracking-tight">
              R$ {formatarMoedaBR(totalAvariasCalculado)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium text-right uppercase leading-tight">
            {temFiltroAtivo
              ? `${destinacaoSel !== 'TODAS' ? destinacaoSel : 'DESCARTE + DOAÇÃO'} (FILTRADO)`
              : 'MÊS ATUAL: DESCARTE + DOAÇÃO'}
          </span>
        </div>

        {/* CONTROLE DE EXIBIÇÃO POR PÁGINA */}
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-slate-500">
            Total: <strong>{avariasFiltradas.length}</strong> registro(s)
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">EXIBIR POR PÁG:</span>
            <select
              value={itensPorPagina}
              onChange={(e) => {
                setItensPorPagina(Number(e.target.value));
                setPaginaAtual(1);
              }}
              className="bg-white border border-slate-300 text-xs font-black text-slate-700 rounded-xl px-2.5 py-1 outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* LISTAGEM DOS CARDS */}
        <div className="flex-1 overflow-y-auto space-y-2.5">
          {loading ? (
            <div className="text-center py-16 text-slate-400 font-bold text-xs uppercase animate-pulse">
              Carregando avarias...
            </div>
          ) : avariasFiltradas.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhuma avaria encontrada com os filtros selecionados.
            </div>
          ) : (
            avariasPaginadas.map((av) => {
              const prod = av.produtos || {};
              const qtd = Number(av.quantidade || 0);
              const custoUnit = Number(av.preco_custo_na_perda || prod.custoreal || 0);
              const custoTotalPerda = qtd * custoUnit;

              return (
                <div
                  key={av.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col gap-2 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">
                      {av.codigo_customizado || 'AV-S/C'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Cód: {prod.codprod || '-'}
                    </span>
                    {prod.departamento && (
                      <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                        {prod.departamento}
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase leading-snug">
                    {prod.descricao || 'PRODUTO NÃO IDENTIFICADO'}
                  </h3>

                  <div className="text-xs font-bold text-slate-600 flex items-center gap-2 flex-wrap">
                    <span>
                      QTD: <strong className="text-slate-800">{av.quantidade} {prod.unidade || 'UN'}</strong>
                    </span>
                    <span>|</span>
                    <span>
                      MOTIVO: <strong className="text-slate-800">{av.motivos_avaria?.descricao?.toUpperCase() || '-'}</strong>
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500 font-medium text-[11px]">
                      Custo Unit: <strong>R$ {formatarMoedaBR(custoUnit)}</strong>
                    </span>
                    <span className="text-red-700 font-black text-xs">
                      Perda: R$ {formatarMoedaBR(custoTotalPerda)}
                    </span>
                  </div>

                  {av.observacao && (
                    <div className="text-[11px] text-slate-500 italic bg-amber-50/60 border border-amber-200/50 rounded-lg px-2.5 py-1">
                      "{av.observacao}"
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-medium">
                    <div className="flex items-center gap-2">
                      <span>DESTINO: <strong className="text-slate-700 uppercase">{av.destinacao || 'Descarte'}</strong></span>
                      <span>•</span>
                      <span>Resp: <strong className="text-slate-700">{av.usuarios?.nome || 'Operador'}</strong></span>
                    </div>

                    <div className="font-mono text-slate-500 font-bold flex items-center gap-1">
                      <span>📅 {formatarDataBR(av.data_registro)}</span>
                      {av.hora_registro && <span> às {formatarHora(av.hora_registro)}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINAÇÃO */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-shrink-0">
            <span className="text-xs font-bold text-slate-500">
              Página {paginaAtual} de {totalPaginas}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={paginaAtual === 1}
                onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                ← Anterior
              </button>

              <button
                type="button"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}