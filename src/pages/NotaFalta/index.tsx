// Arquivo: src/pages/NotaFalta/index.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { notaFaltaService } from './services/notaFaltaService';
import { gerarPdfNotaFalta } from './utils/gerarPdfNotaFalta';

interface NotaFaltaProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

export default function NotaFalta({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: NotaFaltaProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [notas, setNotas] = useState<any[]>([]);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [setores, setSetores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Controle de Tela Cheia (Substitui os modais)
  const [telaNovaNota, setTelaNovaNota] = useState(false);
  const [telaVerDetalhes, setTelaVerDetalhes] = useState<any | null>(null);

  // Filtros Avançados
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [setorSel, setSetorSel] = useState('TODOS');
  const [statusSel, setStatusSel] = useState('TODOS');

  // Form Nova Nota de Falta
  const [setorSelecionadoForm, setSetorSelecionadoForm] = useState('Geral');
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [itensNovaNota, setItensNovaNota] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaNotas, listaMotivos, listaSetores] = await Promise.all([
        notaFaltaService.listarNotasFalta(),
        notaFaltaService.listarMotivosFalta(),
        notaFaltaService.listarSetores()
      ]);
      setNotas(listaNotas);
      setMotivos(listaMotivos);
      setSetores(listaSetores);
    } catch (err: any) {
      console.error('Erro ao carregar dados de Nota de Falta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Autocomplete Inteligente de Produtos (Fragmentos com %)
  useEffect(() => {
    if (!termoBuscaProduto.trim()) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await notaFaltaService.buscarProdutos(termoBuscaProduto);
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
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dataStr;
  };

  // Agrupamento por código de Nota de Falta
  const notasAgrupadas = useMemo(() => {
    const grupos: Record<string, any> = {};

    notas.forEach((item) => {
      const cod = item.codigo_customizado || 'NF-SEM-CODIGO';
      if (!grupos[cod]) {
        grupos[cod] = {
          codigo_customizado: cod,
          setor_nome: item.setor_nome || 'Geral',
          data_registro: item.data_registro,
          hora_registro: item.hora_registro,
          usuario_nome: item.usuarios?.nome || 'Sistema',
          status_cotacao: item.status_cotacao || 'Pendente',
          itens: []
        };
      }
      grupos[cod].itens.push(item);
    });

    return Object.values(grupos);
  }, [notas]);

  // Filtragem
  const notasFiltradas = useMemo(() => {
    return notasAgrupadas.filter((grupo: any) => {
      const dataItem = grupo.data_registro ? grupo.data_registro.split('T')[0] : '';

      if (dataInicio && dataItem < dataInicio) return false;
      if (dataFim && dataItem > dataFim) return false;

      if (setorSel !== 'TODOS' && grupo.setor_nome?.toUpperCase() !== setorSel.toUpperCase()) {
        return false;
      }

      if (statusSel !== 'TODOS' && grupo.status_cotacao !== statusSel) {
        return false;
      }

      return true;
    });
  }, [notasAgrupadas, dataInicio, dataFim, setorSel, statusSel]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [dataInicio, dataFim, setorSel, statusSel, itensPorPagina]);

  const totalPaginas = Math.ceil(notasFiltradas.length / itensPorPagina) || 1;
  const indexInicial = (paginaAtual - 1) * itensPorPagina;
  const notasPaginadas = notasFiltradas.slice(indexInicial, indexInicial + itensPorPagina);

  const handleAdicionarProduto = (prod: any) => {
    if (itensNovaNota.some((i) => i.produto_id === prod.id)) {
      alert('Este produto já foi adicionado na lista.');
      return;
    }

    const motivoPadrao = motivos[0]?.id || '';

    setItensNovaNota((prev) => [
      ...prev,
      {
        produto_id: prod.id,
        codprod: prod.codprod,
        descricao: prod.descricao,
        departamento: prod.departamento || 'GERAL',
        unidade_restante: prod.unidade || 'UN',
        quantidade_restante: 1,
        motivo_falta_id: motivoPadrao
      }
    ]);

    setTermoBuscaProduto('');
    setProdutosEncontrados([]);
  };

  const handleRemoverItem = (prodId: string) => {
    setItensNovaNota((prev) => prev.filter((i) => i.produto_id !== prodId));
  };

  const handleSalvarNovaNota = async () => {
    if (itensNovaNota.length === 0) {
      alert('Adicione ao menos um produto na Nota de Falta.');
      return;
    }

    try {
      setSalvando(true);
      await notaFaltaService.salvarItensNotaFalta({
        usuario_id: idUsuarioFinal,
        setor_nome: setorSelecionadoForm,
        itens: itensNovaNota.map((it) => ({
          produto_id: it.produto_id,
          motivo_falta_id: it.motivo_falta_id,
          quantidade_restante: Number(it.quantidade_restante || 1),
          unidade_restante: it.unidade_restante || 'UN'
        }))
      });

      alert('Nota de Falta registrada com sucesso!');
      setTelaNovaNota(false);
      setItensNovaNota([]);
      setSetorSelecionadoForm('Geral');
      carregarDados();
    } catch (err: any) {
      alert('Erro ao salvar Nota de Falta: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // 1. TELA CHEIA: REGISTRAR NOVA NOTA DE FALTA
  if (telaNovaNota) {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          
          {/* Header Fixo */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTelaNovaNota(false)}
                className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
              >
                ←
              </button>
              <div>
                <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">NOVA NOTA DE FALTA</h1>
                <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                  Registro e Apontamento de Ruptura de Estoque
                </p>
              </div>
            </div>
          </div>

          {/* Seleção de Seção / Setor com a opção GERAL */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              1. Selecione a Seção de Origem
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Seção / Departamento</label>
              <select
                value={setorSelecionadoForm}
                onChange={(e) => setSetorSelecionadoForm(e.target.value)}
                className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-black text-[#09797a] uppercase outline-none focus:border-[#09797a]"
              >
                <option value="Geral">📦 GERAL (MISTURAR ITENS DE DIVERSOS DEPARTAMENTOS)</option>
                {setores
                  .filter((s) => s.nome?.toUpperCase() !== 'GERAL')
                  .map((s) => (
                    <option key={s.id} value={s.nome}>{s.nome.toUpperCase()}</option>
                  ))}
              </select>
            </div>
          </div>

          {/* Busca de Produtos Inteligente */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              2. Adicionar Produtos em Ruptura
            </span>

            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Produto</label>
              <input
                type="text"
                placeholder="Bipe o código de barras ou digite parte do nome / código..."
                value={termoBuscaProduto}
                onChange={(e) => setTermoBuscaProduto(e.target.value)}
                className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
              />

              {produtosEncontrados.length > 0 && (
                <div className="absolute top-18 left-0 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {produtosEncontrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAdicionarProduto(p)}
                      className="w-full text-left p-3 hover:bg-teal-50/60 flex justify-between items-center text-xs font-bold text-slate-800 uppercase transition-all"
                    >
                      <div>
                        <div>{p.codprod} - {p.descricao}</div>
                        <span className="text-[10px] text-slate-400 font-mono">Depto: {p.departamento || '-'} • Un: {p.unidade || 'UN'}</span>
                      </div>
                      <span className="text-[10px] font-black text-[#09797a]">+ Inserir</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de Itens Inseridos */}
          <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase text-slate-400 block px-1">
              Itens na Nota ({itensNovaNota.length})
            </span>

            {itensNovaNota.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs font-bold italic">
                Nenhum produto inserido. Busque o item acima para adicionar à Nota de Falta.
              </div>
            ) : (
              itensNovaNota.map((it, idx) => (
                <div
                  key={it.produto_id}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded font-black">
                        {it.codprod}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">
                        {it.descricao}
                      </h4>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                      Depto: <strong className="text-slate-600">{it.departamento}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Motivo */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Motivo</label>
                      <select
                        value={it.motivo_falta_id}
                        onChange={(e) => {
                          const novo = [...itensNovaNota];
                          novo[idx].motivo_falta_id = e.target.value;
                          setItensNovaNota(novo);
                        }}
                        className="h-9 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 font-bold text-slate-800 uppercase"
                      >
                        {motivos.map((m) => (
                          <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade Restante */}
                    <div className="flex flex-col gap-0.5 w-24">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Qtd Restante</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.quantidade_restante}
                        onWheel={(e) => e.currentTarget.blur()}
                        onChange={(e) => {
                          const novo = [...itensNovaNota];
                          novo[idx].quantidade_restante = e.target.value === '' ? '' : Number(e.target.value);
                          setItensNovaNota(novo);
                        }}
                        className="h-9 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 text-center font-bold text-slate-800"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoverItem(it.produto_id)}
                      className="w-9 h-9 mt-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center transition-all"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé Fixo */}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={() => setTelaNovaNota(false)}
              className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando || itensNovaNota.length === 0}
              onClick={handleSalvarNovaNota}
              className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
            >
              {salvando ? 'Salvando...' : 'Salvar Nota de Falta'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 2. TELA CHEIA: DETALHES DA NOTA DE FALTA
  if (telaVerDetalhes) {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
        <div className="w-full max-w-3xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-6 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
          
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTelaVerDetalhes(null)}
                className="p-2 hover:bg-slate-50 rounded-full text-[#09797a] font-bold text-xl leading-none"
              >
                ←
              </button>
              <div>
                <span className="text-[10px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                  {telaVerDetalhes.codigo_customizado}
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-800 uppercase mt-0.5">
                  DETALHES DA NOTA DE FALTA
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => gerarPdfNotaFalta(telaVerDetalhes, telaVerDetalhes.itens || [])}
              className="bg-[#09797a] hover:bg-[#075f60] text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase shadow-sm"
            >
              📄 Gerar PDF
            </button>
          </div>

          {/* Dados Gerais */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">Seção / Depto</span>
              <span className="text-slate-800">{telaVerDetalhes.setor_nome}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">Data / Hora</span>
              <span className="text-slate-800">{formatarDataSegura(telaVerDetalhes.data_registro)} às {telaVerDetalhes.hora_registro?.slice(0, 5)}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">Responsável</span>
              <span className="text-slate-800">{telaVerDetalhes.usuario_nome}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">Status Cotação</span>
              <span className="text-amber-800">{telaVerDetalhes.status_cotacao}</span>
            </div>
          </div>

          {/* Itens */}
          <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
            <span className="text-[10px] font-black uppercase text-slate-400 block px-1">
              Produtos Registrados ({telaVerDetalhes.itens?.length || 0})
            </span>

            {telaVerDetalhes.itens?.map((it: any) => (
              <div
                key={it.id}
                className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold shadow-sm"
              >
                <div>
                  <span className="text-[9px] font-mono text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded">
                    {it.produtos?.codprod || '-'}
                  </span>
                  <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5">
                    {it.produtos?.descricao || 'Produto'}
                  </h4>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Motivo: <strong className="text-slate-600 uppercase">{it.motivos_falta?.descricao || 'Falta'}</strong>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[9px] text-slate-400 block uppercase">Resta em Estoque</span>
                  <strong className="text-slate-800 text-sm">{it.quantidade_restante} {it.unidade_restante || 'UN'}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTelaVerDetalhes(null)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold uppercase transition-all"
            >
              Voltar à Lista
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 3. TELA PRINCIPAL (LISTAGEM EM CARDS COM FILTROS RETRÁTEIS)
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
            onClick={() => setTelaNovaNota(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + NOVA NOTA
          </button>
        </div>

        {/* FILTROS AVANÇADOS (RETRÁTIL + / -) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 transition-all">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Filtros Avançados
              </span>
              {(dataInicio || dataFim || setorSel !== 'TODOS' || statusSel !== 'TODOS') && (
                <span className="w-2 h-2 rounded-full bg-[#09797a]" title="Filtros aplicados" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {(dataInicio || dataFim || setorSel !== 'TODOS' || statusSel !== 'TODOS') && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicio('');
                    setDataFim('');
                    setSetorSel('TODOS');
                    setStatusSel('TODOS');
                  }}
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

          {filtrosExpandidos && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80">
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

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Seção / Setor</label>
                <select
                  value={setorSel}
                  onChange={(e) => setSetorSel(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODOS</option>
                  <option value="GERAL">GERAL</option>
                  {setores
                    .filter((s) => s.nome?.toUpperCase() !== 'GERAL')
                    .map((s) => (
                      <option key={s.id} value={s.nome}>{s.nome.toUpperCase()}</option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Status Cotação</label>
                <select
                  value={statusSel}
                  onChange={(e) => setStatusSel(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 uppercase outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODOS</option>
                  <option value="Pendente">PENDENTE</option>
                  <option value="Cotado">COTADO</option>
                  <option value="Pedido Gerado">PEDIDO GERADO</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* SELETOR DE QUANTIDADE POR PÁGINA */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-500">
            Total: <strong>{notasFiltradas.length}</strong> notas registradas
          </span>

          <div className="flex items-center gap-2">
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
        </div>

        {/* LISTAGEM DOS CARDS */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando notas...</div>
          ) : notasFiltradas.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
              Nenhuma Nota de Falta encontrada para os filtros selecionados.
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
                      SEÇÃO: {grupo.setor_nome}
                    </span>
                    <span className="text-[9px] font-bold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                      {grupo.status_cotacao}
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
                  <button
                    type="button"
                    onClick={() => setTelaVerDetalhes(grupo)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Ver Itens
                  </button>
                  <button
                    type="button"
                    onClick={() => gerarPdfNotaFalta(grupo, grupo.itens || [])}
                    className="px-3.5 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
                  >
                    📄 PDF
                  </button>
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
    </div>
  );
}