// src/pages/Trocas/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { trocasService } from './services/trocasService';
import { gerarPdfRelatorioTroca } from './utils/gerarPdfTrocas';

interface TrocasProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

type PipelineTab = 'ITENS' | 'AGRUPAR' | 'NEGOCIAR' | 'FINALIZADAS';

export default function Trocas({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: TrocasProps) {
  const idUsuarioFinal = usuarioLogadoId || usuarioLogado?.id || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;

  const [itens, setItens] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<PipelineTab>('ITENS');

  // Filtros Globais / Aba Itens
  const [toggleFornecedor, setToggleFornecedor] = useState<'TODOS' | 'COM_FORNECEDOR' | 'SEM_FORNECEDOR'>('TODOS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Filtro de Busca de Fornecedor (CNPJ, Razão Social, Fantasia - % ou parte)
  const [termoBuscaFornecedor, setTermoBuscaFornecedor] = useState('');

  // Modais de Ação
  const [modalAtribuirFornecedor, setModalAtribuirFornecedor] = useState<any | null>(null);
  const [termoBuscaModalForn, setTermoBuscaModalForn] = useState('');
  const [fornecedorSelecionadoModal, setFornecedorSelecionadoModal] = useState<string>('');

  const [modalNegociacao, setModalNegociacao] = useState<{ fornecedorNome: string; itens: any[] } | null>(null);
  const [textoNegociacao, setTextoNegociacao] = useState('');
  const [salvandoNegociacao, setSalvandoNegociacao] = useState(false);

  const [modalConfirmarRecebimento, setModalConfirmarRecebimento] = useState<{ fornecedorNome: string; itens: any[] } | null>(null);
  const [salvandoRecebimento, setSalvandoRecebimento] = useState(false);

  const [modalVerItensGrupo, setModalVerItensGrupo] = useState<{ titulo: string; itens: any[] } | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listaItens, listaForn] = await Promise.all([
        trocasService.listarItensTroca(),
        trocasService.listarFornecedores()
      ]);
      setItens(listaItens);
      setFornecedores(listaForn);
    } catch (err: any) {
      console.error('Erro ao carregar dados de trocas:', err);
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
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
  };

  // Função auxiliar de match de fornecedor com suporte a % e múltiplas palavras
  const matchFornecedor = (fornNome: string, cnpj?: string, termo?: string) => {
    if (!termo || !termo.trim()) return true;
    const palavras = termo.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const textoBase = `${fornNome || ''} ${cnpj || ''}`.toLowerCase();
    return palavras.every((p) => textoBase.includes(p.replace(/%/g, '')));
  };

  // --- FILTRAGEM ABA 1: ITENS ---
  const itensFiltradosAba1 = useMemo(() => {
    return itens.filter((it) => {
      if (it.troca_realizada) return false;

      const temForn = it.fornecedor_id !== null && it.fornecedor_nome !== 'Não Identificado';
      if (toggleFornecedor === 'COM_FORNECEDOR' && !temForn) return false;
      if (toggleFornecedor === 'SEM_FORNECEDOR' && temForn) return false;

      const dt = it.data_coleta ? it.data_coleta.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;

      if (termoBuscaFornecedor.trim()) {
        const fornObj = fornecedores.find((f) => f.id === it.fornecedor_id);
        if (!matchFornecedor(it.fornecedor_nome, fornObj?.cnpj, termoBuscaFornecedor)) {
          return false;
        }
      }

      return true;
    });
  }, [itens, toggleFornecedor, dataInicio, dataFim, termoBuscaFornecedor, fornecedores]);

  // --- AGRUPAMENTO ABA 2: AGRUPAR POR FORNECEDOR E SOMAR MESMO ITEM ---
  const gruposAba2 = useMemo(() => {
    const itensComForn = itens.filter((it) => !it.troca_realizada && it.fornecedor_id && it.fornecedor_nome !== 'Não Identificado');
    const mapa = new Map<string, { fornecedor_id: string; fornecedor_nome: string; cnpj: string; itensAgrupados: any[]; avaria_ids: string[] }>();

    itensComForn.forEach((it) => {
      const dt = it.data_coleta ? it.data_coleta.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return;
      if (dataFim && dt > dataFim) return;

      const fornObj = fornecedores.find((f) => f.id === it.fornecedor_id);
      if (!matchFornecedor(it.fornecedor_nome, fornObj?.cnpj, termoBuscaFornecedor)) return;

      if (!mapa.has(it.fornecedor_id)) {
        mapa.set(it.fornecedor_id, {
          fornecedor_id: it.fornecedor_id,
          fornecedor_nome: it.fornecedor_nome,
          cnpj: fornObj?.cnpj || '',
          itensAgrupados: [],
          avaria_ids: []
        });
      }

      const grupo = mapa.get(it.fornecedor_id)!;
      grupo.avaria_ids.push(it.avaria_id);

      const prodExistente = grupo.itensAgrupados.find((p) => p.produto_id === it.produto_id);
      if (prodExistente) {
        prodExistente.quantidade += it.quantidade;
      } else {
        grupo.itensAgrupados.push({
          produto_id: it.produto_id,
          codprod: it.codprod,
          descricao_produto: it.descricao_produto,
          unidade: it.unidade,
          custoreal: it.custoreal,
          quantidade: it.quantidade
        });
      }
    });

    return Array.from(mapa.values());
  }, [itens, dataInicio, dataFim, termoBuscaFornecedor, fornecedores]);

  // --- AGRUPAMENTO ABA 3: NEGOCIAR ---
  const gruposAba3 = useMemo(() => {
    const itensEmNegociacao = itens.filter(
      (it) => !it.troca_realizada && (it.status === 'Enviado' || it.status === 'Aguardando' || it.status === 'Negociado')
    );

    const mapa = new Map<string, { fornecedor_id: string; fornecedor_nome: string; cnpj: string; status: string; anotacoes: string; itensAgrupados: any[]; avaria_ids: string[] }>();

    itensEmNegociacao.forEach((it) => {
      const dt = it.data_coleta ? it.data_coleta.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return;
      if (dataFim && dt > dataFim) return;

      const fornObj = fornecedores.find((f) => f.id === it.fornecedor_id);
      if (!matchFornecedor(it.fornecedor_nome, fornObj?.cnpj, termoBuscaFornecedor)) return;

      const key = `${it.fornecedor_id || 'sem-forn'}_${it.status}`;

      if (!mapa.has(key)) {
        mapa.set(key, {
          fornecedor_id: it.fornecedor_id,
          fornecedor_nome: it.fornecedor_nome,
          cnpj: fornObj?.cnpj || '',
          status: it.status,
          anotacoes: it.anotacoes,
          itensAgrupados: [],
          avaria_ids: []
        });
      }

      const grupo = mapa.get(key)!;
      grupo.avaria_ids.push(it.avaria_id);

      const prodExistente = grupo.itensAgrupados.find((p) => p.produto_id === it.produto_id);
      if (prodExistente) {
        prodExistente.quantidade += it.quantidade;
      } else {
        grupo.itensAgrupados.push({
          produto_id: it.produto_id,
          codprod: it.codprod,
          descricao_produto: it.descricao_produto,
          unidade: it.unidade,
          custoreal: it.custoreal,
          quantidade: it.quantidade
        });
      }
    });

    return Array.from(mapa.values());
  }, [itens, dataInicio, dataFim, termoBuscaFornecedor, fornecedores]);

  // --- AGRUPAMENTO ABA 4: FINALIZADAS ---
  const gruposAba4 = useMemo(() => {
    const itensFinalizados = itens.filter((it) => it.troca_realizada);
    const mapa = new Map<string, { fornecedor_id: string; fornecedor_nome: string; cnpj: string; recebido_por_nome: string; recebido_data: string; recebido_hora: string; anotacoes: string; itensAgrupados: any[]; avaria_ids: string[] }>();

    itensFinalizados.forEach((it) => {
      const dt = it.recebido_data ? it.recebido_data.split('T')[0] : '';
      if (dataInicio && dt < dataInicio) return;
      if (dataFim && dt > dataFim) return;

      const fornObj = fornecedores.find((f) => f.id === it.fornecedor_id);
      if (!matchFornecedor(it.fornecedor_nome, fornObj?.cnpj, termoBuscaFornecedor)) return;

      const key = `${it.fornecedor_id}_${it.recebido_data}_${it.recebido_hora}`;

      if (!mapa.has(key)) {
        mapa.set(key, {
          fornecedor_id: it.fornecedor_id,
          fornecedor_nome: it.fornecedor_nome,
          cnpj: fornObj?.cnpj || '',
          recebido_por_nome: it.recebido_por_nome || 'Sistema',
          recebido_data: it.recebido_data,
          recebido_hora: it.recebido_hora,
          anotacoes: it.anotacoes,
          itensAgrupados: [],
          avaria_ids: []
        });
      }

      const grupo = mapa.get(key)!;
      grupo.avaria_ids.push(it.avaria_id);

      const prodExistente = grupo.itensAgrupados.find((p) => p.produto_id === it.produto_id);
      if (prodExistente) {
        prodExistente.quantidade += it.quantidade;
      } else {
        grupo.itensAgrupados.push({
          produto_id: it.produto_id,
          codprod: it.codprod,
          descricao_produto: it.descricao_produto,
          unidade: it.unidade,
          custoreal: it.custoreal,
          quantidade: it.quantidade
        });
      }
    });

    return Array.from(mapa.values());
  }, [itens, dataInicio, dataFim, termoBuscaFornecedor, fornecedores]);

  // Ações
  const handleSalvarFornecedor = async () => {
    if (!modalAtribuirFornecedor) return;
    try {
      await trocasService.atribuirFornecedor(modalAtribuirFornecedor.avaria_id, fornecedorSelecionadoModal);
      setModalAtribuirFornecedor(null);
      setTermoBuscaModalForn('');
      carregarDados();
    } catch (err: any) {
      alert('Erro ao atribuir fornecedor: ' + err.message);
    }
  };

  const handleEnviarParaNegociar = async (avariaIds: string[]) => {
    try {
      await trocasService.enviarParaNegociar(avariaIds);
      alert('Itens enviados para o Pipeline de Negociação!');
      carregarDados();
      setAbaAtiva('NEGOCIAR');
    } catch (err: any) {
      alert('Erro ao enviar para negociar: ' + err.message);
    }
  };

  const handleSalvarNegociacaoFeita = async () => {
    if (!modalNegociacao) return;
    try {
      setSalvandoNegociacao(true);
      const avariaIds = modalNegociacao.itens.map((i) => i.avaria_id);
      await trocasService.atualizarStatusNegociacao(avariaIds, 'Negociado', textoNegociacao);
      alert('Negociação registrada com sucesso!');
      setModalNegociacao(null);
      setTextoNegociacao('');
      carregarDados();
    } catch (err: any) {
      alert('Erro ao registrar negociação: ' + err.message);
    } finally {
      setSalvandoNegociacao(false);
    }
  };

  const handleConfirmarRecebimentoFinal = async () => {
    if (!modalConfirmarRecebimento) return;
    try {
      setSalvandoRecebimento(true);
      const avariaIds = modalConfirmarRecebimento.itens.map((i) => i.avaria_id);
      await trocasService.confirmarRecebimento(avariaIds, idUsuarioFinal);
      alert('Recebimento confirmado! Ciclo finalizado.');
      setModalConfirmarRecebimento(null);
      carregarDados();
      setAbaAtiva('FINALIZADAS');
    } catch (err: any) {
      alert('Erro ao confirmar recebimento: ' + err.message);
    } finally {
      setSalvandoRecebimento(false);
    }
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
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">CONTROLE DE TROCAS</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Gestão de Devoluções e Reposições com Fornecedores
              </p>
            </div>
          </div>
        </div>

        {/* 4 PIPELINES / ABAS */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('ITENS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'ITENS' ? 'bg-[#09797a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>1. Itens</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {itens.filter((i) => !i.troca_realizada).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('AGRUPAR')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'AGRUPAR' ? 'bg-[#09797a] text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Agrupar</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {gruposAba2.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('NEGOCIAR')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'NEGOCIAR' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>3. Negociar</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {gruposAba3.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('FINALIZADAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'FINALIZADAS' ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>4. Finalizadas</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
              {gruposAba4.length}
            </span>
          </button>
        </div>

        {/* ÁREA DE FILTROS COM BUSCA INTELIGENTE POR FORNECEDOR */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
            {/* Campo de Busca Inteligente de Fornecedor (CNPJ, Razão, Fantasia - % ou parte) */}
            <div className="flex flex-col gap-1 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Fornecedor (CNPJ / Nome / %)</label>
              <input
                type="text"
                placeholder="Digite o CNPJ ou nome do fornecedor..."
                value={termoBuscaFornecedor}
                onChange={(e) => setTermoBuscaFornecedor(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:border-[#09797a]"
              />
            </div>

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
          </div>

          {/* Toggle de Vínculo apenas na Aba 1 */}
          {abaAtiva === 'ITENS' && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70">
              <span className="text-[10px] font-black uppercase text-slate-400">Filtrar Vínculo:</span>
              <div className="flex bg-white border border-slate-200 p-1 rounded-xl gap-1 text-[10px] font-black">
                <button
                  type="button"
                  onClick={() => setToggleFornecedor('TODOS')}
                  className={`px-3 py-1 rounded-lg uppercase transition-all ${
                    toggleFornecedor === 'TODOS' ? 'bg-[#09797a] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setToggleFornecedor('COM_FORNECEDOR')}
                  className={`px-3 py-1 rounded-lg uppercase transition-all ${
                    toggleFornecedor === 'COM_FORNECEDOR' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Com Fornecedor
                </button>
                <button
                  type="button"
                  onClick={() => setToggleFornecedor('SEM_FORNECEDOR')}
                  className={`px-3 py-1 rounded-lg uppercase transition-all ${
                    toggleFornecedor === 'SEM_FORNECEDOR' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sem Fornecedor
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL DAS ABAS */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold text-xs uppercase">Carregando dados de trocas...</div>
          ) : (
            <>
              {/* ABA 1: LISTAGEM INDIVIDUAL DE ITENS */}
              {abaAtiva === 'ITENS' && (
                itensFiltradosAba1.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                    Nenhum item de troca encontrado para os filtros selecionados.
                  </div>
                ) : (
                  itensFiltradosAba1.map((it) => (
                    <div
                      key={it.avaria_id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-mono font-black text-red-700 bg-red-100 px-2 py-0.5 rounded">
                            {it.codigo_customizado || 'AV'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            Cód: {it.codprod || '-'}
                          </span>
                        </div>

                        <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase mt-1 leading-snug">
                          {it.descricao_produto}
                        </h3>

                        <div className="text-[11px] text-slate-500 font-semibold mt-1">
                          QTD AVARIADA: <strong className="text-slate-800">{it.quantidade} {it.unidade}</strong> &nbsp;|&nbsp;
                          COLETA: <strong className="text-slate-700">{formatarDataSegura(it.data_coleta)}</strong>
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          Fornecedor: <strong className={it.fornecedor_nome === 'Não Identificado' ? 'text-rose-600 font-black' : 'text-[#09797a] font-black'}>
                            {it.fornecedor_nome}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setModalAtribuirFornecedor(it);
                            setFornecedorSelecionadoModal(it.fornecedor_id || '');
                            setTermoBuscaModalForn('');
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-[#09797a] hover:text-white text-slate-700 rounded-xl text-xs font-black uppercase transition-all shadow-sm active:scale-95"
                        >
                          {it.fornecedor_nome === 'Não Identificado' ? 'Identificar Fornecedor' : 'Alterar Fornecedor'}
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ABA 2: AGRUPAR POR FORNECEDOR E SOMAR MESMO ITEM */}
              {abaAtiva === 'AGRUPAR' && (
                gruposAba2.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                    Nenhum fornecedor com itens vinculados aguardando agrupamento.
                  </div>
                ) : (
                  gruposAba2.map((grupo) => (
                    <div
                      key={grupo.fornecedor_id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase bg-teal-50 text-[#09797a] px-2 py-0.5 rounded">
                            FORNECEDOR
                          </span>
                          {grupo.cnpj && (
                            <span className="text-[10px] font-mono text-slate-400">
                              CNPJ: {grupo.cnpj}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-sm text-slate-800 uppercase mt-1 leading-snug">
                          {grupo.fornecedor_nome}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Total: <strong>{grupo.itensAgrupados.length}</strong> produtos distintos somados (<strong>{grupo.avaria_ids.length}</strong> registros de avaria)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setModalVerItensGrupo({ titulo: grupo.fornecedor_nome, itens: grupo.itensAgrupados })}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                        >
                          Ver Lista
                        </button>

                        <button
                          type="button"
                          onClick={() => gerarPdfRelatorioTroca(grupo.fornecedor_nome, grupo.itensAgrupados)}
                          className="px-3 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm transition-all"
                        >
                          📄 PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEnviarParaNegociar(grupo.avaria_ids)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
                        >
                          Enviar p/ Negociar →
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ABA 3: NEGOCIAR (STATUS E / A / N) */}
              {abaAtiva === 'NEGOCIAR' && (
                gruposAba3.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                    Nenhuma negociação em andamento.
                  </div>
                ) : (
                  gruposAba3.map((grupo, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm text-slate-800 uppercase leading-snug">
                            {grupo.fornecedor_nome}
                          </h3>
                          {grupo.cnpj && (
                            <span className="text-[10px] font-mono text-slate-400">
                              CNPJ: {grupo.cnpj}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                              grupo.status === 'Enviado'
                                ? 'bg-blue-100 text-blue-800'
                                : grupo.status === 'Aguardando'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {grupo.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          <strong>{grupo.itensAgrupados.length}</strong> produtos somados
                        </p>

                        {grupo.anotacoes && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            Negociação: {grupo.anotacoes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        {/* Botões de Status E / A / N */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                          <button
                            type="button"
                            onClick={() => trocasService.atualizarStatusNegociacao(grupo.avaria_ids, 'Enviado').then(carregarDados)}
                            className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                              grupo.status === 'Enviado' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-blue-50'
                            }`}
                            title="Enviado (E)"
                          >
                            E
                          </button>

                          <button
                            type="button"
                            onClick={() => trocasService.atualizarStatusNegociacao(grupo.avaria_ids, 'Aguardando').then(carregarDados)}
                            className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                              grupo.status === 'Aguardando' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-amber-50'
                            }`}
                            title="Aguardando (A)"
                          >
                            A
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalNegociacao({
                                fornecedorNome: grupo.fornecedor_nome,
                                itens: grupo.itensAgrupados.map((it: any) => ({ ...it, avaria_id: grupo.avaria_ids[0] }))
                              });
                              setTextoNegociacao(grupo.anotacoes || '');
                            }}
                            className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${
                              grupo.status === 'Negociado' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-emerald-50'
                            }`}
                            title="Negociado (N)"
                          >
                            N
                          </button>
                        </div>

                        {/* Botão de Recebimento (Joinha) */}
                        <button
                          type="button"
                          onClick={() => {
                            setModalConfirmarRecebimento({
                              fornecedorNome: grupo.fornecedor_nome,
                              itens: grupo.itensAgrupados.map((it: any, i: number) => ({ ...it, avaria_id: grupo.avaria_ids[i] || grupo.avaria_ids[0] }))
                            });
                          }}
                          className="w-9 h-9 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl flex items-center justify-center text-base shadow-sm transition-all active:scale-95"
                          title="Confirmar Recebimento / Finalizar"
                        >
                          👍
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ABA 4: FINALIZADAS */}
              {abaAtiva === 'FINALIZADAS' && (
                gruposAba4.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                    Nenhuma troca finalizada até o momento.
                  </div>
                ) : (
                  gruposAba4.map((grupo, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            RECEBIDO / CONCLUÍDO
                          </span>
                          {grupo.cnpj && (
                            <span className="text-[10px] font-mono text-slate-400">
                              CNPJ: {grupo.cnpj}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-sm text-slate-800 uppercase mt-1 leading-snug">
                          {grupo.fornecedor_nome}
                        </h3>

                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          <strong>{grupo.itensAgrupados.length}</strong> produtos repostos/trocados
                        </p>

                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Recebido por: <strong className="text-slate-600">{grupo.recebido_por_nome}</strong> em{' '}
                          <strong>{formatarDataSegura(grupo.recebido_data)}</strong> às <strong>{grupo.recebido_hora?.slice(0, 5)}</strong>
                        </div>

                        {grupo.anotacoes && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            Histórico: {grupo.anotacoes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setModalVerItensGrupo({ titulo: `Recebido: ${grupo.fornecedor_nome}`, itens: grupo.itensAgrupados })}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-all"
                        >
                          Ver Itens
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}
            </>
          )}
        </div>

      </div>

      {/* MODAL 1: ATRIBUIR FORNECEDOR COM BUSCA INTELIGENTE */}
      {modalAtribuirFornecedor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-[#09797a] uppercase">Identificar Fornecedor</h3>
              <button
                type="button"
                onClick={() => setModalAtribuirFornecedor(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl uppercase">
              {modalAtribuirFornecedor.codprod} - {modalAtribuirFornecedor.descricao_produto}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar Fornecedor (CNPJ ou Nome)</label>
              <input
                type="text"
                placeholder="Digite para filtrar a lista..."
                value={termoBuscaModalForn}
                onChange={(e) => setTermoBuscaModalForn(e.target.value)}
                className="w-full h-10 text-xs bg-white border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
              />

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {fornecedores
                  .filter((f) => matchFornecedor(f.nome_fantasia || f.razao_social, f.cnpj, termoBuscaModalForn))
                  .map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFornecedorSelecionadoModal(f.id)}
                      className={`w-full text-left p-2.5 text-xs font-bold flex flex-col uppercase transition-all ${
                        fornecedorSelecionadoModal === f.id ? 'bg-teal-100/70 text-[#09797a]' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{f.nome_fantasia || f.razao_social}</span>
                      <span className="text-[9px] font-mono text-slate-400">CNPJ: {f.cnpj || 'Não informado'}</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAtribuirFornecedor(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarFornecedor}
                className="flex-2 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95"
              >
                Salvar Fornecedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NEGOCIAÇÃO FEITA (N) */}
      {modalNegociacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700">Status Negociado (N)</span>
                <h3 className="text-sm font-black text-slate-800 uppercase">{modalNegociacao.fornecedorNome}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNegociacao(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Descreva como foi a negociação (ex: Bonificação, troca física, abatimento em duplicata) *
              </label>
              <textarea
                rows={3}
                required
                value={textoNegociacao}
                onChange={(e) => setTextoNegociacao(e.target.value)}
                placeholder="Detalhes acordados com o fornecedor..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 resize-none outline-none focus:bg-white focus:border-[#09797a]"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNegociacao(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoNegociacao || !textoNegociacao.trim()}
                onClick={handleSalvarNegociacaoFeita}
                className="flex-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95 disabled:opacity-40"
              >
                {salvandoNegociacao ? 'Salvando...' : 'Salvar Negociação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRMAR RECEBIMENTO (JOINHA) */}
      {modalConfirmarRecebimento && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <span className="text-[10px] font-black uppercase text-[#09797a]">Confirmação de Recebimento</span>
                <h3 className="text-sm font-black text-slate-800 uppercase">{modalConfirmarRecebimento.fornecedorNome}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConfirmarRecebimento(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-bold text-slate-600">
              Confirma o recebimento dos itens abaixo pelo fornecedor?
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-48 border border-slate-200 p-2 rounded-xl bg-slate-50">
              {modalConfirmarRecebimento.itens.map((it, idx) => (
                <div key={idx} className="p-2 bg-white border border-slate-200 rounded-lg flex justify-between items-center text-xs font-bold">
                  <span className="uppercase text-slate-800">{it.descricao_produto}</span>
                  <span className="font-mono text-emerald-800">{it.quantidade} {it.unidade}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfirmarRecebimento(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoRecebimento}
                onClick={handleConfirmarRecebimentoFinal}
                className="flex-2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase shadow-md active:scale-95 disabled:opacity-40"
              >
                {salvandoRecebimento ? 'Confirmando...' : 'Sim, Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VER LISTA / ITENS DO GRUPO */}
      {modalVerItensGrupo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 max-h-[85vh] animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase">{modalVerItensGrupo.titulo}</h3>
              <button
                type="button"
                onClick={() => setModalVerItensGrupo(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {modalVerItensGrupo.itens.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">Cód: {it.codprod}</span>
                    <h4 className="text-xs font-black text-slate-800 uppercase mt-0.5">{it.descricao_produto}</h4>
                  </div>
                  <div className="text-right font-mono text-slate-800 text-sm">
                    {it.quantidade} {it.unidade}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setModalVerItensGrupo(null)}
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