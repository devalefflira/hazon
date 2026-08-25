// src/pages/Ofertas/index.tsx
import { useState, useEffect } from 'react';
import { ofertasService } from './services/ofertasService';
import { gerarPdfOferta } from './utils/gerarPdfOferta';
import { gerarPdfPlacas } from './utils/gerarPdfPlacas';

interface OfertasProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
}

const TIPOS_OFERTA_OPCOES = [
  'Oferta da Semana',
  'Quarta Verde',
  'Final de Semana',
  'Data Comemorativa'
];

type AbaPrincipalOfertas = 'SUGERIDAS' | 'REVISAR_APROVAR' | 'PRECIFICAR' | 'CONCLUIDAS';

export default function Ofertas({ onVoltarParaHome, usuarioLogado }: OfertasProps) {
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [sugestoesPesquisa, setSugestoesPesquisa] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 4 Fases Principais
  const [abaPrincipal, setAbaAtiva] = useState<AbaPrincipalOfertas>('SUGERIDAS');
  const [subAbaConcluidas, setSubAbaConcluidas] = useState<'GERAR_RELATORIO' | 'GERAR_PLACAS'>('GERAR_RELATORIO');

  // Sub-abas de Gerar Placas
  const [subAbaPlacas, setSubAbaPlacas] = useState<'LAYOUT' | 'GERAR'>('LAYOUT');

  // Gerenciamento de Layout
  const [layoutsDisponiveis, setLayoutsDisponiveis] = useState<any[]>([
    { id: 'lay-1', nome: 'Modelo Padrão BV Distribuidora', placasPorPagina: 2, imagemUrl: null }
  ]);
  const [layoutSelecionado, setLayoutSelecionado] = useState<any>(layoutsDisponiveis[0]);
  const [placasPorPaginaConfig, setPlacasPorPaginaConfig] = useState<number>(2);

  // Seleção de Oferta para Gerar Placas
  const [ofertaParaPlaca, setOfertaParaPlaca] = useState<any | null>(null);

  // Modal: Nova Oferta / Edição na Lista Sugerida
  const [modalNovaOferta, setModalNovaOferta] = useState(false);
  const [codigoEdicaoAtual, setCodigoEdicaoAtual] = useState<string | null>(null);
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [itensEmEdicao, setItensEmEdicao] = useState<any[]>([]);

  // Modal: Revisar / Aprovar
  const [ofertaEmRevisao, setOfertaEmRevisao] = useState<any | null>(null);
  const [itensRevisaoSelecionados, setItensRevisaoSelecionados] = useState<string[]>([]);

  // Precificação (Fluxo em 2 Passos)
  const [ofertaEmPrecificacao, setOfertaEmPrecificacao] = useState<any | null>(null);
  const [passoPrecificacao, setPassoPrecificacao] = useState<1 | 2>(1);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoOferta, setTipoOferta] = useState(TIPOS_OFERTA_OPCOES[0]);
  const [tipoOfertaCustom, setTipoOfertaCustom] = useState('');
  const [precosOfertaMap, setPrecosOfertaMap] = useState<Record<string, number | ''>>({});

  // Modal: Ver Detalhes
  const [ofertaVerDetalhes, setOfertaVerDetalhes] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarOfertas = async () => {
    try {
      setLoading(true);
      const [dados, itensPesquisa] = await Promise.all([
        ofertasService.listarOfertas(),
        ofertasService.buscarSugestoesPesquisaPreco?.() || []
      ]);
      setOfertas(dados);
      setSugestoesPesquisa(itensPesquisa || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOfertas();
  }, []);

  const handleImportarLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const novoLayout = {
          id: `lay-${Date.now()}`,
          nome: file.name.replace(/\.[^/.]+$/, ''),
          placasPorPagina: 2,
          imagemUrl: event.target?.result as string
        };
        setLayoutsDisponiveis((prev) => [...prev, novoLayout]);
        setLayoutSelecionado(novoLayout);
        alert('Layout de placa carregado com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!termoBuscaProduto.trim()) {
      setProdutosEncontrados([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await ofertasService.buscarProdutos(termoBuscaProduto);
        setProdutosEncontrados(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBuscaProduto]);

  const handleAdicionarProduto = (prod: any) => {
    if (itensEmEdicao.some((i) => i.produto_id === prod.id)) {
      alert('Produto já adicionado nesta oferta.');
      return;
    }

    const novo = {
      temp_id: Math.random().toString(),
      produto_id: prod.id,
      codprod: prod.codprod,
      descricao: prod.descricao,
      preco_custo_real: Number(prod.custoreal || 0),
      preco_venda_tabela: Number(prod.pvenda || 0)
    };

    setItensEmEdicao((prev) => [...prev, novo]);
    setTermoBuscaProduto('');
    setProdutosEncontrados([]);
  };

  const handleRemoverProduto = (tempId: string) => {
    setItensEmEdicao((prev) => prev.filter((i) => i.temp_id !== tempId));
  };

  const handleSalvarOfertaSugerida = async (avancarParaRevisao = false) => {
    if (itensEmEdicao.length === 0) {
      alert('Adicione ao menos um produto.');
      return;
    }

    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');
      const statusFinal = avancarParaRevisao ? 'Revisar/Aprovar' : 'Lista Sugerida';

      await ofertasService.salvarOferta({
        codigo_customizado: codigoEdicaoAtual,
        usuario_id: userObj?.id,
        status: statusFinal,
        itens: itensEmEdicao
      });

      alert(avancarParaRevisao ? 'Oferta enviada para Revisar/Aprovar!' : 'Oferta salva na Lista Sugerida!');
      setModalNovaOferta(false);
      setCodigoEdicaoAtual(null);
      setItensEmEdicao([]);
      carregarOfertas();
      if (avancarParaRevisao) {
        setAbaAtiva('REVISAR_APROVAR');
      } else {
        setAbaAtiva('SUGERIDAS');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar oferta.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirRevisao = (oferta: any) => {
    setOfertaEmRevisao(oferta);
    const todosIds = (oferta.oferta_itens || []).map((it: any) => it.id);
    setItensRevisaoSelecionados(todosIds);
  };

  const toggleItemRevisao = (id: string) => {
    setItensRevisaoSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleVoltarParaListaSugerida = async () => {
    if (!ofertaEmRevisao) return;
    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');

      const itensFinais = (ofertaEmRevisao.oferta_itens || [])
        .filter((it: any) => itensRevisaoSelecionados.includes(it.id))
        .map((item: any) => ({
          produto_id: item.produto_id,
          preco_custo_real: item.preco_custo_real,
          preco_venda_tabela: item.preco_venda_tabela,
          preco_oferta: item.preco_oferta || 0
        }));

      await ofertasService.salvarOferta({
        codigo_customizado: ofertaEmRevisao.codigo_customizado,
        usuario_id: userObj?.id,
        status: 'Lista Sugerida',
        itens: itensFinais
      });

      alert('Oferta retornada para a Lista Sugerida!');
      setOfertaEmRevisao(null);
      carregarOfertas();
      setAbaAtiva('SUGERIDAS');
    } catch (err) {
      console.error(err);
      alert('Erro ao retornar para Lista Sugerida.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAprovarParaPrecificar = async () => {
    if (!ofertaEmRevisao) return;
    if (itensRevisaoSelecionados.length === 0) {
      alert('Selecione ao menos um produto para aprovar.');
      return;
    }

    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');

      const itensFinais = (ofertaEmRevisao.oferta_itens || [])
        .filter((it: any) => itensRevisaoSelecionados.includes(it.id))
        .map((item: any) => ({
          produto_id: item.produto_id,
          preco_custo_real: item.preco_custo_real,
          preco_venda_tabela: item.preco_venda_tabela,
          preco_oferta: item.preco_oferta || 0
        }));

      await ofertasService.salvarOferta({
        codigo_customizado: ofertaEmRevisao.codigo_customizado,
        usuario_id: userObj?.id,
        status: 'Precificar',
        itens: itensFinais
      });

      alert('Oferta aprovada com sucesso! Prossiga com a precificação.');
      setOfertaEmRevisao(null);
      carregarOfertas();
      setAbaAtiva('PRECIFICAR');
    } catch (err) {
      console.error(err);
      alert('Erro ao aprovar oferta.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAbrirPrecificacao = (oferta: any) => {
    setOfertaEmPrecificacao(oferta);
    setPassoPrecificacao(1); // Sempre inicia no Passo 1 (Datas e Tipo de Oferta)
    setDataInicio(oferta.data_inicio || '');
    setDataFim(oferta.data_fim || '');
    setTipoOferta(oferta.tipo_oferta || TIPOS_OFERTA_OPCOES[0]);
    setTipoOfertaCustom(oferta.tipo_oferta_customizado || '');

    const mapInicial: Record<string, number | ''> = {};
    (oferta.oferta_itens || []).forEach((item: any) => {
      mapInicial[item.id] = item.preco_oferta > 0 ? item.preco_oferta : '';
    });
    setPrecosOfertaMap(mapInicial);
  };

  const handleSalvarPrecificacao = async () => {
    if (!dataInicio || !dataFim) {
      alert('Informe o período inicial e final da oferta.');
      setPassoPrecificacao(1);
      return;
    }

    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');

      const itensFinais = (ofertaEmPrecificacao.oferta_itens || []).map((item: any) => ({
        produto_id: item.produto_id,
        preco_custo_real: item.preco_custo_real,
        preco_venda_tabela: item.preco_venda_tabela,
        preco_oferta: Number(precosOfertaMap[item.id] || 0)
      }));

      await ofertasService.salvarOferta({
        codigo_customizado: ofertaEmPrecificacao.codigo_customizado,
        usuario_id: userObj?.id,
        status: 'Concluida',
        tipo_oferta: tipoOferta,
        tipo_oferta_customizado: tipoOferta === 'Data Comemorativa' ? tipoOfertaCustom.trim() : '',
        data_inicio: dataInicio,
        data_fim: dataFim,
        itens: itensFinais
      });

      alert('Oferta precificada e concluída com sucesso!');
      setOfertaEmPrecificacao(null);
      carregarOfertas();
      setAbaAtiva('CONCLUIDAS');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar precificação.');
    } finally {
      setSalvando(false);
    }
  };

  const handleIncluirItemPesquisaNaOferta = (item: any) => {
    setCodigoEdicaoAtual(null);
    setItensEmEdicao([
      {
        temp_id: Math.random().toString(),
        produto_id: item.produto_id,
        codprod: item.codprod,
        descricao: item.descricao,
        preco_custo_real: item.preco_custo,
        preco_venda_tabela: item.preco_venda_atual,
        preco_oferta: item.preco_sugerido_oferta
      }
    ]);
    setModalNovaOferta(true);
  };

  const ofertasSugeridas = ofertas.filter((o) => o.status === 'Lista Sugerida' || o.status === 'Em Andamento');
  const ofertasRevisarAprovar = ofertas.filter((o) => o.status === 'Revisar/Aprovar' || o.status === 'Criada Finalizada');
  const ofertasPrecificar = ofertas.filter((o) => o.status === 'Precificar');
  const ofertasConcluidas = ofertas.filter((o) => o.status === 'Concluida');

  const formatarDataBR = (dt: string) => {
    if (!dt) return 'N/I';
    const partes = dt.split('T')[0].split('-');
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dt;
  };

  const agoraData = new Date().toLocaleDateString('pt-BR');
  const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nomeUser = usuarioLogado?.nome || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.nome || 'USUÁRIO';

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">

        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">OFERTAS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Fluxo de Sugestão, Revisão, Precificação e Placas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCodigoEdicaoAtual(null);
              setItensEmEdicao([]);
              setModalNovaOferta(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Nova Oferta
          </button>
        </div>

        {/* 4 ABAS PRINCIPAIS */}
        <div className="bg-gray-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('SUGERIDAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${abaPrincipal === 'SUGERIDAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <span>LISTA SUGERIDA</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">{ofertasSugeridas.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('REVISAR_APROVAR')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${abaPrincipal === 'REVISAR_APROVAR' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <span>REVISAR / APROVAR</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">{ofertasRevisarAprovar.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('PRECIFICAR')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${abaPrincipal === 'PRECIFICAR' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <span>PRECIFICAR</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">{ofertasPrecificar.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('CONCLUIDAS')}
            className={`py-2.5 rounded-xl uppercase transition-all flex items-center justify-center gap-1.5 ${abaPrincipal === 'CONCLUIDAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <span>CONCLUÍDAS</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full">{ofertasConcluidas.length}</span>
          </button>
        </div>

        {/* SUB-ABAS DE CONCLUÍDAS */}
        {abaPrincipal === 'CONCLUIDAS' && (
          <div className="flex gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setSubAbaConcluidas('GERAR_RELATORIO')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${subAbaConcluidas === 'GERAR_RELATORIO' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-gray-50 text-gray-400'
                }`}
            >
              Gerar Relatório de Ofertas
            </button>
            <button
              type="button"
              onClick={() => setSubAbaConcluidas('GERAR_PLACAS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${subAbaConcluidas === 'GERAR_PLACAS' ? 'bg-[#09797a] text-white shadow-md' : 'bg-gray-50 text-gray-400'
                }`}
            >
              Gerar Placas
            </button>
          </div>
        )}

        {/* LISTAGENS / CONTEÚDO */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando ofertas...</div>
          ) : (
            <>
              {/* ABA 1: LISTA SUGERIDA */}
              {abaPrincipal === 'SUGERIDAS' && (
                <div className="flex flex-col gap-3">
                  {/* Itens sugeridos vindos de Pesquisa de Preços */}
                  {sugestoesPesquisa.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider px-1">
                        ⚡ Oportunidades Concorrenciais (Pesquisa de Preços)
                      </span>
                      {sugestoesPesquisa.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-2xl flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 shadow-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                                ORIGEM: PESQUISA ({item.codigo_pesquisa})
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                vs {item.concorrente_nome}
                              </span>
                            </div>

                            <h4 className="font-black text-xs text-slate-800 uppercase mt-1 leading-snug">
                              {item.codprod} - {item.descricao}
                            </h4>

                            <div className="text-[10px] text-slate-500 font-mono mt-1 flex gap-3 flex-wrap">
                              <span>Preço Atual: <strong className="line-through text-red-600">R$ {item.preco_venda_atual.toFixed(2)}</strong></span>
                              <span>Concorrente: <strong className="text-slate-800">R$ {item.preco_concorrente.toFixed(2)}</strong></span>
                              <span>Oferta Sugerida: <strong className="text-emerald-700 font-bold">R$ {item.preco_sugerido_oferta.toFixed(2)}</strong></span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleIncluirItemPesquisaNaOferta(item)}
                            className="px-3 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-xs transition-all active:scale-95"
                          >
                            + Incluir na Oferta
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campanhas salvas na Lista Sugerida */}
                  {ofertasSugeridas.length === 0 && sugestoesPesquisa.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                      Nenhuma oferta na Lista Sugerida. Clique em "+ Nova Oferta" para começar.
                    </div>
                  ) : (
                    ofertasSugeridas.map((ofe) => (
                      <div key={ofe.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                            {ofe.codigo_customizado}
                          </span>
                          <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                            Resp: {ofe.usuarios?.nome || 'SISTEMA'} | Qtd Itens: {ofe.oferta_itens?.length || 0}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {ofe.data_registro} às {ofe.hora_registro}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCodigoEdicaoAtual(ofe.codigo_customizado);
                              setItensEmEdicao(
                                (ofe.oferta_itens || []).map((item: any) => ({
                                  temp_id: item.id || Math.random().toString(),
                                  produto_id: item.produto_id,
                                  codprod: item.produtos?.codprod,
                                  descricao: item.produtos?.descricao,
                                  preco_custo_real: item.preco_custo_real,
                                  preco_venda_tabela: item.preco_venda_tabela
                                }))
                              );
                              setModalNovaOferta(true);
                            }}
                            className="px-3.5 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-xl text-xs font-black uppercase transition-all"
                          >
                            Editar / Adicionar Itens
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ABA 2: REVISAR / APROVAR */}
              {abaPrincipal === 'REVISAR_APROVAR' && (
                ofertasRevisarAprovar.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                    Nenhuma oferta aguardando revisão e aprovação.
                  </div>
                ) : (
                  ofertasRevisarAprovar.map((ofe) => (
                    <div key={ofe.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase">
                          {ofe.codigo_customizado}
                        </span>
                        <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                          Revisão Pendente | Qtd Itens: {ofe.oferta_itens?.length || 0}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Resp: {ofe.usuarios?.nome || 'SISTEMA'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAbrirRevisao(ofe)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
                      >
                        Revisar / Aprovar
                      </button>
                    </div>
                  ))
                )
              )}

              {/* ABA 3: PRECIFICAR */}
              {abaPrincipal === 'PRECIFICAR' && (
                ofertasPrecificar.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                    Nenhuma oferta aguardando precificação.
                  </div>
                ) : (
                  ofertasPrecificar.map((ofe) => (
                    <div key={ofe.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                          {ofe.codigo_customizado}
                        </span>
                        <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                          Aguardando Precificação | Qtd Itens: {ofe.oferta_itens?.length || 0}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Resp: {ofe.usuarios?.nome || 'SISTEMA'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAbrirPrecificacao(ofe)}
                        className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
                      >
                        Precificar
                      </button>
                    </div>
                  ))
                )
              )}

              {/* ABA 4: CONCLUÍDAS - GERAR RELATÓRIO */}
              {abaPrincipal === 'CONCLUIDAS' && subAbaConcluidas === 'GERAR_RELATORIO' && (
                ofertasConcluidas.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                    Nenhuma oferta concluída ainda.
                  </div>
                ) : (
                  ofertasConcluidas.map((ofe) => (
                    <div key={ofe.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                            {ofe.codigo_customizado}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                            {ofe.tipo_oferta === 'Data Comemorativa' ? ofe.tipo_oferta_customizado : ofe.tipo_oferta}
                          </span>
                        </div>
                        <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                          Período da Oferta: de {formatarDataBR(ofe.data_inicio)} até {formatarDataBR(ofe.data_fim)}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono">
                          Resp: {ofe.usuarios?.nome || 'SISTEMA'} | Qtd Itens: {ofe.oferta_itens?.length || 0}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => gerarPdfOferta(ofe, ofe.oferta_itens || [], 'COMPLETO')}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-black uppercase transition-all"
                          title="Relatório com Custo, Tabela e Oferta"
                        >
                          📄 Completo
                        </button>
                        <button
                          type="button"
                          onClick={() => gerarPdfOferta(ofe, ofe.oferta_itens || [], 'ENCARTE')}
                          className="px-3 py-1.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 transition-all"
                          title="Relatório simplificado apenas com Descrição e Preço de Oferta"
                        >
                          🎨 Encarte
                        </button>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* ABA 4: CONCLUÍDAS - GERAR PLACAS */}
              {abaPrincipal === 'CONCLUIDAS' && subAbaConcluidas === 'GERAR_PLACAS' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-1 rounded-2xl flex text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setSubAbaPlacas('LAYOUT')}
                      className={`flex-1 py-2 rounded-xl uppercase transition-all ${subAbaPlacas === 'LAYOUT' ? 'bg-[#09797a] text-white shadow-md' : 'text-emerald-800'
                        }`}
                    >
                      1. Layout da Placa
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubAbaPlacas('GERAR')}
                      className={`flex-1 py-2 rounded-xl uppercase transition-all ${subAbaPlacas === 'GERAR' ? 'bg-[#09797a] text-white shadow-md' : 'text-emerald-800'
                        }`}
                    >
                      2. Gerar Impressão
                    </button>
                  </div>

                  {subAbaPlacas === 'LAYOUT' && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-700 uppercase">Layouts Cadastrados</span>
                        <label className="bg-[#09797a] hover:bg-[#075f60] text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer transition-all shadow-sm">
                          + Importar Layout (PNG/JPG)
                          <input type="file" accept="image/*" onChange={handleImportarLayout} className="hidden" />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-1">
                        {layoutsDisponiveis.map((lay) => (
                          <div
                            key={lay.id}
                            onClick={() => setLayoutSelecionado(lay)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col gap-2 transition-all ${layoutSelecionado?.id === lay.id ? 'border-[#09797a] bg-emerald-50/50' : 'border-gray-200 bg-white'
                              }`}
                          >
                            <div className="h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                              {lay.imagemUrl ? (
                                <img src={lay.imagemUrl} alt={lay.nome} className="h-full object-contain" />
                              ) : (
                                <span className="text-[10px] font-black text-gray-400 text-center px-2 uppercase">
                                  Template Modelo BV (2 por página)
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center text-xs font-black">
                              <span className="text-gray-800 uppercase truncate">{lay.nome}</span>
                              {layoutSelecionado?.id === lay.id && <span className="text-[#09797a]">✓ Ativo</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSubAbaPlacas('GERAR')}
                        className="w-full bg-[#09797a] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md mt-2"
                      >
                        Avançar para Gerar Impressão →
                      </button>
                    </div>
                  )}

                  {subAbaPlacas === 'GERAR' && (
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
                      <div className="bg-white border border-emerald-200 p-3 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-800">
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase">Layout Selecionado</span>
                          <span>{layoutSelecionado?.nome || 'Padrão'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubAbaPlacas('LAYOUT')}
                          className="text-[#09797a] text-[10px] uppercase underline font-black"
                        >
                          Alterar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Selecione a Oferta Concluída</label>
                          <select
                            value={ofertaParaPlaca?.id || ''}
                            onChange={(e) => {
                              const encont = ofertasConcluidas.find((o) => o.id === e.target.value);
                              setOfertaParaPlaca(encont || null);
                            }}
                            className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                          >
                            <option value="">Selecione...</option>
                            {ofertasConcluidas.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.codigo_customizado} - {o.tipo_oferta} ({o.oferta_itens?.length || 0} itens)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Placas Por Página A4</label>
                          <select
                            value={placasPorPaginaConfig}
                            onChange={(e) => setPlacasPorPaginaConfig(Number(e.target.value))}
                            className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                          >
                            <option value={1}>1 Placa por Folha (A4 Inteira)</option>
                            <option value={2}>2 Placas por Folha (Meia A4 - Padrão)</option>
                            <option value={4}>4 Placas por Folha (Quarto A4)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!ofertaParaPlaca}
                        onClick={() =>
                          gerarPdfPlacas(
                            ofertaParaPlaca,
                            ofertaParaPlaca.oferta_itens || [],
                            layoutSelecionado?.imagemUrl,
                            placasPorPaginaConfig
                          )
                        }
                        className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3.5 rounded-2xl text-xs font-black uppercase shadow-md disabled:opacity-40 mt-2"
                      >
                        🖨️ Gerar PDF de Placas de Oferta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: NOVA OFERTA / EDIÇÃO DE ITENS (JANELA CHEIA NO MOBILE / MODAL DESKTOP) */}
      {modalNovaOferta && (
        <div className="fixed inset-0 z-50 bg-white sm:bg-black/70 sm:flex sm:justify-center sm:items-center sm:p-4 select-none overflow-y-auto">
          <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 flex justify-between items-center flex-shrink-0">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                {codigoEdicaoAtual ? `EDITAR LISTA SUGERIDA (${codigoEdicaoAtual})` : 'NOVA OFERTA - LISTA SUGERIDA'}
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaOferta(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="overflow-y-auto flex flex-col gap-3 p-4 sm:p-6 flex-1 bg-slate-50/40">
              <div className="bg-white border border-gray-200 p-3.5 rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold shadow-sm">
                <div>
                  <span className="text-[9px] font-black text-gray-400 block uppercase">Data / Hora</span>
                  <span className="text-gray-800">{agoraData} às {agoraHora}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 block uppercase">Usuário</span>
                  <span className="text-gray-800">{nomeUser}</span>
                </div>
              </div>

              <div className="flex gap-2 relative">
                <input
                  type="text"
                  placeholder="Bipe o EAN ou digite o nome/código do produto..."
                  value={termoBuscaProduto}
                  onChange={(e) => setTermoBuscaProduto(e.target.value)}
                  className="flex-1 h-11 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 focus:border-[#09797a]"
                />

                {produtosEncontrados.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-gray-100">
                    {produtosEncontrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAdicionarProduto(p)}
                        className="w-full text-left p-3 hover:bg-emerald-50/50 flex justify-between items-center text-xs font-bold text-gray-800 uppercase"
                      >
                        <span>{p.codprod} - {p.descricao}</span>
                        <span className="text-[#09797a] font-mono">+ Adicionar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-2 bg-white shadow-sm">
                <table className="w-full text-left text-xs font-bold">
                  <thead className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                    <tr>
                      <th className="p-2">CODPROD</th>
                      <th className="p-2">DESCRIÇÃO</th>
                      <th className="p-2 text-right">CUSTO REAL</th>
                      <th className="p-2 text-right">PVENDA</th>
                      <th className="p-2 text-center">AÇÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensEmEdicao.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400 italic text-xs">
                          Nenhum produto adicionado à lista.
                        </td>
                      </tr>
                    ) : (
                      itensEmEdicao.map((item) => (
                        <tr key={item.temp_id} className="hover:bg-gray-50">
                          <td className="p-2 font-mono text-[#09797a]">{item.codprod}</td>
                          <td className="p-2 uppercase">{item.descricao}</td>
                          <td className="p-2 text-right font-mono text-gray-500">
                            {item.preco_custo_real.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2 text-right font-mono text-gray-800">
                            {item.preco_venda_tabela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoverProduto(item.temp_id)}
                              className="text-red-500 font-bold px-2 py-1 rounded hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Sticky */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalNovaOferta(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando || itensEmEdicao.length === 0}
                onClick={() => handleSalvarOfertaSugerida(false)}
                className="flex-1 py-3 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase transition-all"
              >
                Salvar na Lista
              </button>
              <button
                type="button"
                disabled={salvando || itensEmEdicao.length === 0}
                onClick={() => handleSalvarOfertaSugerida(true)}
                className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                Seguir para Revisar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVISAR / APROVAR (JANELA CHEIA NO MOBILE / MODAL DESKTOP) */}
      {ofertaEmRevisao && (
        <div className="fixed inset-0 z-50 bg-white sm:bg-black/70 sm:flex sm:justify-center sm:items-center sm:p-4 select-none overflow-y-auto">
          <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 flex justify-between items-center flex-shrink-0">
              <div>
                <span className="text-[10px] uppercase font-black text-amber-700">Fase de Revisão</span>
                <h3 className="text-[#09797a] font-black text-base uppercase">
                  REVISAR / APROVAR OFERTA {ofertaEmRevisao.codigo_customizado}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOfertaEmRevisao(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="overflow-y-auto flex flex-col gap-3 p-4 sm:p-6 flex-1 bg-slate-50/40">
              <div className="flex justify-between items-center text-xs font-bold text-gray-600 bg-white border border-gray-200 p-3 rounded-2xl shadow-sm">
                <span>Selecione os produtos para aprovar:</span>
                <button
                  type="button"
                  onClick={() => {
                    const todosIds = (ofertaEmRevisao.oferta_itens || []).map((it: any) => it.id);
                    if (itensRevisaoSelecionados.length === todosIds.length) {
                      setItensRevisaoSelecionados([]);
                    } else {
                      setItensRevisaoSelecionados(todosIds);
                    }
                  }}
                  className="text-[#09797a] underline font-black text-[11px] uppercase"
                >
                  {itensRevisaoSelecionados.length === (ofertaEmRevisao.oferta_itens || []).length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-2 bg-white shadow-sm">
                <table className="w-full text-left text-xs font-bold">
                  <thead className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                    <tr>
                      <th className="p-2 text-center w-10">OK</th>
                      <th className="p-2">CODPROD</th>
                      <th className="p-2">DESCRIÇÃO</th>
                      <th className="p-2 text-right">CUSTO REAL</th>
                      <th className="p-2 text-right">PVENDA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(ofertaEmRevisao.oferta_itens || []).map((item: any) => {
                      const prod = item.produtos || {};
                      const isChecked = itensRevisaoSelecionados.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleItemRevisao(item.id)}
                          className={`cursor-pointer transition-all ${isChecked ? 'bg-emerald-50/60' : 'hover:bg-gray-50 opacity-60'}`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => { }}
                              className="w-4 h-4 text-[#09797a] rounded border-gray-300 pointer-events-none"
                            />
                          </td>
                          <td className="p-2 font-mono text-[#09797a]">{prod.codprod}</td>
                          <td className="p-2 uppercase">{prod.descricao}</td>
                          <td className="p-2 text-right font-mono text-gray-500">
                            {(item.preco_custo_real || prod.custoreal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-2 text-right font-mono text-gray-800">
                            {(item.preco_venda_tabela || prod.pvenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Sticky */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setOfertaEmRevisao(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-200 transition-all"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={handleVoltarParaListaSugerida}
                className="flex-1 py-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl text-xs font-black uppercase transition-all"
              >
                ← Revisar (Voltar)
              </button>
              <button
                type="button"
                disabled={salvando || itensRevisaoSelecionados.length === 0}
                onClick={handleAprovarParaPrecificar}
                className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                Aprovar ({itensRevisaoSelecionados.length}) e Precificar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLUXO DE PRECIFICAÇÃO EM 2 PASSOS (JANELA CHEIA CORRIGIDA PARA MOBILE) */}
      {ofertaEmPrecificacao && (
        <div className="fixed inset-0 z-50 bg-white sm:bg-black/70 sm:flex sm:justify-center sm:items-center sm:p-4 select-none overflow-hidden">
          <div className="w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-3xl bg-white sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100 h-[100dvh]">

            {/* Header Fixo */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 sm:px-6 flex justify-between items-center flex-shrink-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#09797a]">
                    Passo {passoPrecificacao} de 2
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    {passoPrecificacao === 1 ? 'Período & Campanha' : 'Preços dos Produtos'}
                  </span>
                </div>
                <h3 className="text-[#09797a] font-black text-base uppercase mt-0.5">
                  PRECIFICAR OFERTA {ofertaEmPrecificacao.codigo_customizado}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOfertaEmPrecificacao(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* PASSO 1: DATAS E TIPO */}
            {passoPrecificacao === 1 && (
              <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-50/40 flex flex-col justify-center min-h-0">
                <div className="bg-white border border-gray-200 p-4 sm:p-6 rounded-3xl shadow-sm flex flex-col gap-4">
                  <span className="text-xs font-black uppercase text-gray-700 border-b border-gray-100 pb-2">
                    1. Defina o Período e Tipo da Campanha
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data Inicial *</label>
                      <input
                        type="date"
                        required
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 focus:bg-white focus:border-[#09797a]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data Final *</label>
                      <input
                        type="date"
                        required
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 focus:bg-white focus:border-[#09797a]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Tipo de Oferta *</label>
                    <select
                      value={tipoOferta}
                      onChange={(e) => setTipoOferta(e.target.value)}
                      className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase focus:bg-white focus:border-[#09797a]"
                    >
                      {TIPOS_OFERTA_OPCOES.map((t) => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {tipoOferta === 'Data Comemorativa' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Nome da Data Comemorativa *</label>
                      <input
                        type="text"
                        placeholder="Ex: Dia dos Pais, Aniversário, Black Friday..."
                        value={tipoOfertaCustom}
                        onChange={(e) => setTipoOfertaCustom(e.target.value)}
                        className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase focus:bg-white focus:border-[#09797a]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 2: TABELA COM ROLAGEM INDEPENDENTE FLUIDA */}
            {passoPrecificacao === 2 && (
              <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-white p-2 sm:p-4">
                <div className="w-full border border-gray-100 rounded-2xl overflow-hidden shadow-sm pb-24">
                  <table className="w-full text-left text-xs font-bold border-collapse">
                    <thead className="bg-slate-50 text-[10px] text-gray-400 uppercase border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-left w-2/5">DESCRIÇÃO</th>
                        <th className="p-3 text-center whitespace-nowrap">CUSTO REAL</th>
                        <th className="p-3 text-center whitespace-nowrap">PVENDA</th>
                        <th className="p-3 text-right whitespace-nowrap w-28 sm:w-32">OFERTA (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(ofertaEmPrecificacao.oferta_itens || []).map((item: any) => {
                        const prod = item.produtos || {};
                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/30">
                            <td className="p-3">
                              <span className="uppercase text-gray-800 font-black block leading-tight text-xs">
                                {prod.descricao || 'PRODUTO'}
                              </span>
                            </td>

                            <td className="p-3 text-center font-mono text-gray-500 whitespace-nowrap text-xs">
                              {(item.preco_custo_real || prod.custoreal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>

                            <td className="p-3 text-center font-mono text-gray-800 whitespace-nowrap text-xs">
                              {(item.preco_venda_tabela || prod.pvenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>

                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="0.00"
                                value={precosOfertaMap[item.id] ?? ''}
                                onWheel={(e) => e.currentTarget.blur()}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPrecosOfertaMap((prev) => ({
                                    ...prev,
                                    [item.id]: val === '' ? '' : Number(val)
                                  }));
                                }}
                                className="w-full h-10 text-sm bg-emerald-50/70 border border-emerald-300 focus:border-[#09797a] focus:bg-white px-2 rounded-2xl text-right font-mono font-black text-emerald-900 outline-none transition-all"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Fixo */}
            <div className="bg-white border-t border-gray-100 p-4 flex gap-2 flex-shrink-0 z-20">
              {passoPrecificacao === 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOfertaEmPrecificacao(null)}
                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!dataInicio || !dataFim) {
                        alert('Informe as datas de início e fim da oferta.');
                        return;
                      }
                      if (tipoOferta === 'Data Comemorativa' && !tipoOfertaCustom.trim()) {
                        alert('Informe o nome da data comemorativa.');
                        return;
                      }
                      setPassoPrecificacao(2);
                    }}
                    className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
                  >
                    Avançar para Precificar Produtos →
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPassoPrecificacao(1)}
                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase hover:bg-gray-200 transition-all"
                  >
                    ← Voltar Datas
                  </button>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={handleSalvarPrecificacao}
                    className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
                  >
                    {salvando ? 'Salvando...' : 'Salvar e Concluir Oferta'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: VER DETALHES DE OFERTA (JANELA CHEIA NO MOBILE / MODAL DESKTOP) */}
      {ofertaVerDetalhes && (
        <div className="fixed inset-0 z-50 bg-white sm:bg-black/70 sm:flex sm:justify-center sm:items-center sm:p-4 select-none overflow-y-auto">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-white sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-gray-100">

            {/* Header Sticky */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 flex justify-between items-center flex-shrink-0">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                ITENS DA OFERTA {ofertaVerDetalhes.codigo_customizado}
              </h3>
              <button
                type="button"
                onClick={() => setOfertaVerDetalhes(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="overflow-y-auto flex flex-col gap-2 p-4 sm:p-6 flex-1 bg-slate-50/40">
              {(ofertaVerDetalhes.oferta_itens || []).map((item: any) => {
                const prod = item.produtos || {};
                return (
                  <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold shadow-sm">
                    <div>
                      <span className="text-[9px] font-mono text-[#09797a] bg-[#09797a]/10 px-1.5 py-0.5 rounded">
                        Cód: {prod.codprod}
                      </span>
                      <h4 className="text-gray-800 uppercase mt-0.5">{prod.descricao}</h4>
                    </div>
                    <div className="text-right font-mono text-gray-500">
                      Tabela: {(item.preco_venda_tabela || prod.pvenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Sticky */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 p-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setOfertaVerDetalhes(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-xs font-bold uppercase transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}