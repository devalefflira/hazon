// src/pages/Encartes/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { encartesService, type ProdutoAgrupadoEncarte } from './services/encartesService';
import { gerarImagemEncarteCanvas } from './utils/geradorEncarteCanvas';

interface EncartesProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
}

type TabEncartes = 
  | 'EM_ANDAMENTO' 
  | 'CONCLUIDOS' 
  | 'TEMPLATES' 
  | 'LOGO' 
  | 'DADOS_EMPRESA' 
  | 'FONTES' 
  | 'REPOSITORIO';

const FONTES_DISPONIVEIS = [
  'Montserrat',
  'Open Sans',
  'Fira Sans Condensed',
  'Roboto',
  'Oswald'
];

export default function Encartes({ onVoltarParaHome, usuarioLogado }: EncartesProps) {
  const [abaAtiva, setAbaAtiva] = useState<TabEncartes>('CONCLUIDOS');
  const [loading, setLoading] = useState(false);

  const nomeUsuario = usuarioLogado?.nome || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.nome || 'Operador';

  // Dados gerais
  const [encartes, setEncartes] = useState<any[]>([]);
  const [ofertasConcluidas, setOfertasConcluidas] = useState<any[]>([]);
  const [temas, setTemas] = useState<any[]>([]);
  const [configEmpresa, setConfigEmpresa] = useState<any>({});

  // Sub-abas do Repositório
  const [subAbaRepo, setSubAbaRepo] = useState<'COM_IMAGEM' | 'SEM_IMAGEM'>('COM_IMAGEM');
  const [termoBuscaRepo, setTermoBuscaRepo] = useState('');
  const [filtroDeptoRepo, setFiltroDeptoRepo] = useState('TODOS');
  const [filtroSecaoRepo, setFiltroSecaoRepo] = useState('TODOS');
  const [opcoesDepartamentos, setOpcoesDepartamentos] = useState<string[]>([]);
  const [opcoesSecoes, setOpcoesSecoes] = useState<string[]>([]);
  const [produtosPaginadosRepo, setProdutosPaginadosRepo] = useState<any[]>([]);
  const [totalItensRepo, setTotalItensRepo] = useState(0);
  const [paginaRepo, setPaginaRepo] = useState(1);
  const ITENS_POR_PAGINA_REPO = 10;
  const [carregandoRepo, setCarregandoRepo] = useState(false);

  // Visualizador e Exportador de Imagem do Encarte
  const [imagemEncarteGerada, setImagemEncarteGerada] = useState<string | null>(null);
  const [encarteVisualizacao, setEncarteVisualizacao] = useState<any | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);

  // Fluxo de Montagem do Encarte (Passo a Passo)
  const [modalNovoEncarte, setModalNovoEncarte] = useState(false);
  const [passoFluxo, setPassoFluxo] = useState<1 | 2 | 3>(1);
  const [ofertaSelecionada, setOfertaSelecionada] = useState<any | null>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<any | null>(null);
  const [itensProcessadosGrade, setItensProcessadosGrade] = useState<ProdutoAgrupadoEncarte[]>([]);
  const [tituloEncarte, setTituloEncarte] = useState('');

  // Personalização Visual do Encarte
  const [corFundoQuadroBranco, setCorFundoQuadroBranco] = useState('#ffffff');
  const [corFundoInfo, setCorFundoInfo] = useState('#fff000');
  const [corTextoDescricao, setCorTextoDescricao] = useState('#1e293b');
  const [corTextoPreco, setCorTextoPreco] = useState('#000000');
  const [corTextoUnidade, setCorTextoUnidade] = useState('#334155');
  const [pesoDescricao, setPesoDescricao] = useState('bold');
  const [pesoPreco, setPesoPreco] = useState('900');
  const [pesoUnidade, setPesoUnidade] = useState('bold');
  const [fonteFamilia, setFonteFamilia] = useState('Montserrat');

  // Formulário de Tema / Template
  const [modalCriarTema, setModalCriarTema] = useState(false);
  const [nomeNovoTema, setNomeNovoTema] = useState('');
  const [modalNovoTemplate, setModalNovoTemplate] = useState(false);
  const [temaDestinoTemplate, setTemaDestinoTemplate] = useState<string>('');
  const [nomeNovoTemplate, setNomeNovoTemplate] = useState('');
  const [urlNovoTemplate, setUrlNovoTemplate] = useState('');

  const carregarDadosGerais = async () => {
    try {
      setLoading(true);
      const [listaEncartes, listaOfertas, listaTemas, conf, opcoesFiltros] = await Promise.all([
        encartesService.listarEncartes(),
        encartesService.listarOfertasConcluidas(),
        encartesService.listarTemasComTemplates(),
        encartesService.obterConfigEmpresa(),
        encartesService.buscarFiltrosDepartamentosSecoes()
      ]);
      setEncartes(listaEncartes);
      setOfertasConcluidas(listaOfertas);
      setTemas(listaTemas);
      setConfigEmpresa(conf || {});
      setOpcoesDepartamentos(opcoesFiltros.departamentos);
      setOpcoesSecoes(opcoesFiltros.secoes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosGerais();
  }, []);

  const carregarProdutosRepositorio = async () => {
    try {
      setCarregandoRepo(true);
      const res = await encartesService.listarRepositorioPaginado({
        tipo: subAbaRepo,
        termo: termoBuscaRepo,
        departamento: filtroDeptoRepo,
        secao: filtroSecaoRepo,
        pagina: paginaRepo,
        itensPorPagina: ITENS_POR_PAGINA_REPO
      });
      setProdutosPaginadosRepo(res.itens);
      setTotalItensRepo(res.total);
    } catch (err) {
      console.error('Erro ao carregar repositório:', err);
    } finally {
      setCarregandoRepo(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'REPOSITORIO') {
      const timer = setTimeout(() => {
        carregarProdutosRepositorio();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [abaAtiva, subAbaRepo, termoBuscaRepo, filtroDeptoRepo, filtroSecaoRepo, paginaRepo]);

  const handleMudarSubAbaRepo = (tipo: 'COM_IMAGEM' | 'SEM_IMAGEM') => {
    setSubAbaRepo(tipo);
    setPaginaRepo(1);
    setFiltroDeptoRepo('TODOS');
    setFiltroSecaoRepo('TODOS');
    setTermoBuscaRepo('');
  };

  const handleUploadFotoProduto = (produtoId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const urlBase64 = ev.target?.result as string;
      try {
        await encartesService.associarImagemProduto(produtoId, urlBase64);
        await carregarProdutosRepositorio();
      } catch (err: any) {
        alert('Erro ao salvar imagem: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExcluirFotoProduto = async (produtoId: string, descricao: string) => {
    if (!confirm(`Deseja remover a foto do produto "${descricao}"? Ele será movido para a aba "Sem Imagem".`)) return;
    try {
      await encartesService.removerImagemProduto(produtoId);
      await carregarProdutosRepositorio();
    } catch (err: any) {
      alert('Erro ao excluir foto: ' + err.message);
    }
  };

  const totalPaginasRepo = Math.ceil(totalItensRepo / ITENS_POR_PAGINA_REPO) || 1;

  const handleSelecionarOfertaParaEncarte = async (ofe: any) => {
    setOfertaSelecionada(ofe);
    setTituloEncarte(ofe.tipo_oferta === 'Data Comemorativa' ? ofe.tipo_oferta_customizado : ofe.tipo_oferta);
    setPassoFluxo(2);
  };

  const handleSelecionarTemplateParaEncarte = async (tmpl: any) => {
    setTemplateSelecionado(tmpl);
    setLoading(true);
    try {
      const produtosGrade = await encartesService.prepararItensOfertaParaEncarte(
        ofertaSelecionada.oferta_itens || []
      );
      setItensProcessadosGrade(produtosGrade);
      setPassoFluxo(3);
    } catch (err: any) {
      alert('Erro ao processar grade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEncarteAtual = async (status: 'Em Andamento' | 'Concluído') => {
    try {
      await encartesService.salvarEncarte({
        oferta_id: ofertaSelecionada.id,
        template_id: templateSelecionado.id,
        titulo: tituloEncarte,
        status,
        dados_produtos_json: itensProcessadosGrade,
        config_aplicada_json: {
          ...configEmpresa,
          estilosPersonalizados: {
            corFundoQuadroBranco,
            corFundoInfo,
            corTextoDescricao,
            corTextoPreco,
            corTextoUnidade,
            pesoDescricao,
            pesoPreco,
            pesoUnidade,
            fonteFamilia
          }
        }
      });
      alert(status === 'Concluído' ? 'Encarte concluído com sucesso!' : 'Encarte salvo em andamento!');
      setModalNovoEncarte(false);
      setPassoFluxo(1);
      carregarDadosGerais();
      setAbaAtiva(status === 'Concluído' ? 'CONCLUIDOS' : 'EM_ANDAMENTO');
    } catch (err: any) {
      alert('Erro ao salvar encarte: ' + err.message);
    }
  };

  const formatarDataBR = (dt?: string) => {
    if (!dt) return '';
    const partes = dt.split('T')[0].split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dt;
  };

  const handleGerarEAbrirNovaAba = async () => {
    setLoading(true);
    try {
      const textoValidade = (ofertaSelecionada?.data_inicio && ofertaSelecionada?.data_fim)
        ? `Ofertas Válidas de ${formatarDataBR(ofertaSelecionada.data_inicio)} até ${formatarDataBR(ofertaSelecionada.data_fim)}`
        : '';

      const dataUrl = await gerarImagemEncarteCanvas({
        titulo: tituloEncarte,
        periodoOferta: textoValidade,
        produtos: itensProcessadosGrade,
        templateUrl: templateSelecionado?.imagem_fundo_url || null,
        configEmpresa,
        estilosPersonalizados: {
          corFundoQuadroBranco,
          corFundoInfo,
          corTextoDescricao,
          corTextoPreco,
          corTextoUnidade,
          pesoDescricao,
          pesoPreco,
          pesoUnidade,
          fonteFamilia
        }
      });

      const novaAba = window.open();
      if (novaAba) {
        novaAba.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${tituloEncarte || 'Encarte'} - Hazon ERP</title>
              <style>
                body {
                  margin: 0;
                  background: #0f172a;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                img {
                  max-height: 96vh;
                  max-width: 96vw;
                  object-fit: contain;
                  border-radius: 12px;
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="Encarte Gerado" />
            </body>
          </html>
        `);
        novaAba.document.close();
      } else {
        alert('Permita pop-ups no navegador para abrir o encarte em uma nova aba.');
      }
    } catch (err: any) {
      alert('Erro ao gerar encarte: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualizarEncarte = async (enc: any) => {
    try {
      setGerandoImagem(true);
      setEncarteVisualizacao(enc);
      const estilos = enc.config_aplicada_json?.estilosPersonalizados;
      
      const ofe = enc.ofertas_mestre;
      const textoValidade = (ofe?.data_inicio && ofe?.data_fim)
        ? `Ofertas Válidas de ${formatarDataBR(ofe.data_inicio)} até ${formatarDataBR(ofe.data_fim)}`
        : '';

      const dataUrl = await gerarImagemEncarteCanvas({
        titulo: enc.titulo || 'OFERTAS',
        periodoOferta: textoValidade,
        produtos: enc.dados_produtos_json || [],
        templateUrl: enc.encartes_templates?.imagem_fundo_url || null,
        configEmpresa: enc.config_aplicada_json || configEmpresa,
        estilosPersonalizados: estilos
      });
      setImagemEncarteGerada(dataUrl);
    } catch (err: any) {
      alert('Erro ao renderizar imagem do encarte: ' + err.message);
    } finally {
      setGerandoImagem(false);
    }
  };

  const handleDownloadImagem = () => {
    if (!imagemEncarteGerada || !encarteVisualizacao) return;
    const a = document.createElement('a');
    a.href = imagemEncarteGerada;
    a.download = `Encarte_${encarteVisualizacao.codigo_customizado || 'Hazon'}.png`;
    a.click();
  };

  const encartesEmAndamento = useMemo(() => encartes.filter((e) => e.status === 'Em Andamento'), [encartes]);
  const encartesConcluidos = useMemo(() => encartes.filter((e) => e.status === 'Concluído'), [encartes]);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-4 min-h-[calc(100vh-24px)]">
        
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
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">ENCARTES</h1>
              <p className="text-[11px] text-slate-400 font-bold mt-1 tracking-wide">
                Geração de Cartazes e Encartes Automáticos • Operador: <strong className="text-slate-600">{nomeUsuario}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPassoFluxo(1);
              setModalNovoEncarte(true);
            }}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + NOVO ENCARTE
          </button>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 overflow-x-auto text-xs font-black scrollbar-none">
          {[
            { id: 'CONCLUIDOS', label: 'Concluídos', count: encartesConcluidos.length },
            { id: 'EM_ANDAMENTO', label: 'Em Andamento', count: encartesEmAndamento.length },
            { id: 'TEMPLATES', label: 'Temas & Templates' },
            { id: 'LOGO', label: 'Logo' },
            { id: 'DADOS_EMPRESA', label: 'Dados da Empresa' },
            { id: 'FONTES', label: 'Fontes' },
            { id: 'REPOSITORIO', label: 'Repositório' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAbaAtiva(tab.id as TabEncartes)}
              className={`px-3.5 py-2.5 rounded-xl uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${
                abaAtiva === tab.id
                  ? 'bg-[#09797a] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="text-center py-4 text-xs font-bold text-teal-700 animate-pulse uppercase">
              Carregando dados...
            </div>
          )}

          {/* 1. ABA CONCLUÍDOS */}
          {abaAtiva === 'CONCLUIDOS' && (
            <div className="space-y-3">
              {encartesConcluidos.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                  Nenhum encarte concluído ainda. Clique em "+ NOVO ENCARTE" para criar o primeiro.
                </div>
              ) : (
                encartesConcluidos.map((enc) => (
                  <div key={enc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded uppercase">
                          {enc.codigo_customizado}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          Template: {enc.encartes_templates?.nome || 'Padrão'}
                        </span>
                      </div>
                      <h4 className="font-black text-sm text-slate-800 uppercase mt-1">{enc.titulo}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {enc.dados_produtos_json?.length || 0} produtos na grade
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={gerandoImagem}
                      onClick={() => handleVisualizarEncarte(enc)}
                      className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95 transition-all disabled:opacity-40"
                    >
                      {gerandoImagem && encarteVisualizacao?.id === enc.id ? 'Gerando...' : 'Ver / Exportar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. ABA EM ANDAMENTO */}
          {abaAtiva === 'EM_ANDAMENTO' && (
            <div className="space-y-3">
              {encartesEmAndamento.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                  Nenhum encarte em andamento.
                </div>
              ) : (
                encartesEmAndamento.map((enc) => (
                  <div key={enc.id} className="p-4 bg-slate-50 border border-amber-200 rounded-2xl flex justify-between items-center shadow-xs">
                    <div>
                      <span className="text-[9px] font-mono font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase">
                        {enc.codigo_customizado}
                      </span>
                      <h4 className="font-black text-sm text-slate-800 uppercase mt-1">{enc.titulo}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Pausado em andamento</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItensProcessadosGrade(enc.dados_produtos_json || []);
                        setTituloEncarte(enc.titulo);
                        setPassoFluxo(3);
                        setModalNovoEncarte(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase shadow-xs active:scale-95"
                    >
                      ▶ Continuar
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. ABA TEMAS & TEMPLATES */}
          {abaAtiva === 'TEMPLATES' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase text-slate-500">Temas e Modelos Visuais</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCriarTema(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase"
                  >
                    + Novo Tema
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (temas.length === 0) return alert('Crie um tema primeiro!');
                      setTemaDestinoTemplate(temas[0].id);
                      setModalNovoTemplate(true);
                    }}
                    className="px-3 py-1.5 bg-[#09797a] text-white rounded-xl text-xs font-black uppercase shadow-xs"
                  >
                    + Novo Template
                  </button>
                </div>
              </div>

              {temas.map((t) => (
                <div key={t.id} className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-black text-xs uppercase text-slate-800 tracking-wide">{t.nome}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{t.encartes_templates?.length || 0} templates</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(t.encartes_templates || []).map((tmpl: any) => (
                      <div key={tmpl.id} className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col gap-2 shadow-xs">
                        <div className="h-28 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                          <img src={tmpl.imagem_fundo_url} alt={tmpl.nome} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase truncate">{tmpl.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. ABA LOGO */}
          {abaAtiva === 'LOGO' && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 text-center">
              <span className="text-xs font-black uppercase text-slate-500">Logo Oficial para os Encartes</span>
              
              <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-3 overflow-hidden shadow-sm">
                {configEmpresa.logo_url ? (
                  <img src={configEmpresa.logo_url} alt="Logo" className="max-h-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-slate-400 uppercase">Nenhuma logo carregada</span>
                )}
              </div>

              <label className="bg-[#09797a] hover:bg-[#075f60] text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase cursor-pointer shadow-md active:scale-95 transition-all">
                Carregar Imagem da Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const novaUrl = ev.target?.result as string;
                        const novaConf = { ...configEmpresa, logo_url: novaUrl };
                        setConfigEmpresa(novaConf);
                        await encartesService.salvarConfigEmpresa(novaConf);
                        alert('Logo atualizada!');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* 5. ABA DADOS DA EMPRESA */}
          {abaAtiva === 'DADOS_EMPRESA' && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col gap-3">
              <span className="text-xs font-black uppercase text-slate-500">
                Selecione as Informações Visíveis no Rodapé / Cabeçalho do Encarte
              </span>

              {[
                { keyMostrar: 'mostrar_nome_empresa', keyTexto: 'nome_empresa', label: 'Nome da Empresa' },
                { keyMostrar: 'mostrar_telefone', keyTexto: 'telefone', label: 'Telefone' },
                { keyMostrar: 'mostrar_whatsapp', keyTexto: 'whatsapp', label: 'WhatsApp' },
                { keyMostrar: 'mostrar_slogan', keyTexto: 'slogan', label: 'Slogan' },
                { keyMostrar: 'mostrar_formas_pagamento', keyTexto: 'formas_pagamento', label: 'Formas de Pagamento' },
                { keyMostrar: 'mostrar_endereco', keyTexto: 'endereco', label: 'Endereço da Loja' },
                { keyMostrar: 'mostrar_instagram', keyTexto: 'instagram', label: 'Instagram' },
                { keyMostrar: 'mostrar_facebook', keyTexto: 'facebook', label: 'Facebook' },
                { keyMostrar: 'mostrar_website', keyTexto: 'website', label: 'Website' }
              ].map((campo) => (
                <div key={campo.keyMostrar} className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(configEmpresa[campo.keyMostrar])}
                      onChange={(e) => {
                        const nova = { ...configEmpresa, [campo.keyMostrar]: e.target.checked };
                        setConfigEmpresa(nova);
                        encartesService.salvarConfigEmpresa(nova);
                      }}
                      className="w-5 h-5 text-[#09797a] rounded border-slate-300 focus:ring-[#09797a] cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-800 uppercase">{campo.label}</span>
                  </div>

                  <input
                    type="text"
                    value={configEmpresa[campo.keyTexto] || ''}
                    placeholder={`Informe ${campo.label.toLowerCase()}...`}
                    onChange={(e) => setConfigEmpresa({ ...configEmpresa, [campo.keyTexto]: e.target.value })}
                    onBlur={() => encartesService.salvarConfigEmpresa(configEmpresa)}
                    className="w-full sm:w-80 h-9 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 font-bold text-slate-800"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 6. ABA FONTES */}
          {abaAtiva === 'FONTES' && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col gap-4">
              <span className="text-xs font-black uppercase text-slate-500">Tipografia do Encarte</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-2 shadow-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fonte dos Preços e Destaques</label>
                  <select
                    value={configEmpresa.fonte_preco || 'Montserrat'}
                    onChange={(e) => {
                      const nova = { ...configEmpresa, fonte_preco: e.target.value };
                      setConfigEmpresa(nova);
                      encartesService.salvarConfigEmpresa(nova);
                    }}
                    className="h-10 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 font-black text-slate-800 uppercase"
                  >
                    {FONTES_DISPONIVEIS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-2 shadow-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fonte dos Títulos dos Produtos</label>
                  <select
                    value={configEmpresa.fonte_titulo || 'Montserrat'}
                    onChange={(e) => {
                      const nova = { ...configEmpresa, fonte_titulo: e.target.value };
                      setConfigEmpresa(nova);
                      encartesService.salvarConfigEmpresa(nova);
                    }}
                    className="h-10 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 font-black text-slate-800 uppercase"
                  >
                    {FONTES_DISPONIVEIS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 7. ABA REPOSITÓRIO DE PRODUTOS COM SUB-ABAS, FILTROS E PAGINAÇÃO */}
          {abaAtiva === 'REPOSITORIO' && (
            <div className="flex flex-col gap-3">
              
              {/* Seletor de Sub-Abas: Com Imagem vs Sem Imagem */}
              <div className="bg-slate-50 border border-slate-200 p-1.5 rounded-2xl grid grid-cols-2 gap-1 text-xs font-black">
                <button
                  type="button"
                  onClick={() => handleMudarSubAbaRepo('COM_IMAGEM')}
                  className={`py-2 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
                    subAbaRepo === 'COM_IMAGEM'
                      ? 'bg-[#09797a] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>📷 Com Imagem</span>
                  {subAbaRepo === 'COM_IMAGEM' && (
                    <span className="text-[10px] bg-black/15 px-2 py-0.2 rounded-full font-mono">
                      {totalItensRepo}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleMudarSubAbaRepo('SEM_IMAGEM')}
                  className={`py-2 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
                    subAbaRepo === 'SEM_IMAGEM'
                      ? 'bg-[#09797a] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>🚫 Sem Imagem</span>
                  {subAbaRepo === 'SEM_IMAGEM' && (
                    <span className="text-[10px] bg-black/15 px-2 py-0.2 rounded-full font-mono">
                      {totalItensRepo}
                    </span>
                  )}
                </button>
              </div>

              {/* Barra de Busca Universal */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cód. Sistema, Código de Barras (EAN) ou Nome (% para curinga)..."
                  value={termoBuscaRepo}
                  onChange={(e) => {
                    setTermoBuscaRepo(e.target.value);
                    setPaginaRepo(1);
                  }}
                  className="w-full h-11 text-xs bg-white border border-slate-300 rounded-2xl px-3 font-bold text-slate-800 focus:border-[#09797a] outline-none shadow-xs"
                />
              </div>

              {/* Filtros de Departamento e Seção (Exibidos em Com Imagem) */}
              {subAbaRepo === 'COM_IMAGEM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
                    <select
                      value={filtroDeptoRepo}
                      onChange={(e) => {
                        setFiltroDeptoRepo(e.target.value);
                        setPaginaRepo(1);
                      }}
                      className="h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-slate-800 uppercase"
                    >
                      <option value="TODOS">TODOS OS DEPARTAMENTOS</option>
                      {opcoesDepartamentos.map((d) => (
                        <option key={d} value={d}>{d.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Seção</label>
                    <select
                      value={filtroSecaoRepo}
                      onChange={(e) => {
                        setFiltroSecaoRepo(e.target.value);
                        setPaginaRepo(1);
                      }}
                      className="h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-slate-800 uppercase"
                    >
                      <option value="TODOS">TODAS AS SEÇÕES</option>
                      {opcoesSecoes.map((s) => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Totalizador */}
              <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-bold text-slate-500">
                  Total: <strong>{totalItensRepo}</strong> produto(s) {subAbaRepo === 'COM_IMAGEM' ? 'com imagem vinculada' : 'sem imagem'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  10 por página (2 colunas)
                </span>
              </div>

              {/* Grade de 2 Colunas (10 itens por página) */}
              {carregandoRepo ? (
                <div className="text-center py-16 text-slate-400 font-bold text-xs uppercase animate-pulse">
                  Carregando produtos do repositório...
                </div>
              ) : produtosPaginadosRepo.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs font-bold italic">
                  Nenhum produto encontrado nesta categoria de repositório.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {produtosPaginadosRepo.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex gap-3 shadow-xs hover:border-slate-300 transition-all"
                    >
                      {/* Foto ou Espaço Vazio */}
                      <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 flex-shrink-0 relative">
                        {prod.imagem_url ? (
                          <img src={prod.imagem_url} alt={prod.descricao} className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-[9px] font-black text-slate-400 uppercase text-center px-1">
                            Sem Imagem
                          </span>
                        )}
                      </div>

                      {/* Dados e Botões de Ação */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-1.5 py-0.5 rounded">
                            {prod.codprod}
                          </span>
                          <h4 className="font-black text-xs uppercase text-slate-800 mt-1 leading-snug truncate" title={prod.descricao}>
                            {prod.descricao}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                            EAN: {prod.codbarra || 'Sem EAN'} • UN: {prod.unidade || 'UN'}
                          </span>
                        </div>

                        {/* Botões do Card */}
                        <div className="flex items-center gap-1.5 pt-2">
                          <label className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-lg cursor-pointer text-center transition-all">
                            {prod.imagem_url ? 'Trocar Foto' : '+ Adicionar Foto'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadFotoProduto(prod.id, file);
                              }}
                              className="hidden"
                            />
                          </label>

                          {prod.imagem_url && (
                            <button
                              type="button"
                              onClick={() => handleExcluirFotoProduto(prod.id, prod.descricao)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-black transition-all"
                              title="Excluir imagem do produto"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paginação do Repositório */}
              {totalPaginasRepo > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-shrink-0">
                  <span className="text-xs font-bold text-slate-500">
                    Página {paginaRepo} de {totalPaginasRepo}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={paginaRepo === 1}
                      onClick={() => setPaginaRepo((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      ← Anterior
                    </button>

                    <span className="text-xs font-black px-2 text-[#09797a]">
                      {paginaRepo}
                    </span>

                    <button
                      type="button"
                      disabled={paginaRepo === totalPaginasRepo}
                      onClick={() => setPaginaRepo((prev) => Math.min(totalPaginasRepo, prev + 1))}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Próxima →
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* MODAL VISUALIZADOR DE IMAGEM DO ENCARTE */}
      {imagemEncarteGerada && encarteVisualizacao && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 select-none">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div>
                <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded">
                  {encarteVisualizacao.codigo_customizado}
                </span>
                <h3 className="font-black text-xs uppercase text-slate-800 mt-1">{encarteVisualizacao.titulo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setImagemEncarteGerada(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 bg-slate-100 flex items-center justify-center">
              <img
                src={imagemEncarteGerada}
                alt="Encarte Alta Resolução"
                className="max-h-[68vh] object-contain rounded-xl shadow-md"
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setImagemEncarteGerada(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDownloadImagem}
                className="flex-2 py-2.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>💾</span>
                <span>Baixar Imagem PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DO FLUXO COMPLETO DE CRIAÇÃO DO ENCARTE */}
      {modalNovoEncarte && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 select-none">
          <div className="w-full max-w-3xl bg-white rounded-3xl sm:rounded-4xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-hidden">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-shrink-0">
              <div>
                <span className="text-[10px] font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded uppercase">
                  Passo {passoFluxo} de 3
                </span>
                <h3 className="font-black text-base uppercase text-slate-800 mt-1">
                  {passoFluxo === 1 && '1. Selecione a Oferta Concluída'}
                  {passoFluxo === 2 && '2. Escolha o Tema e o Template'}
                  {passoFluxo === 3 && `3. Grade de Produtos - ${tituloEncarte}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoEncarte(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* PASSO 1 */}
            {passoFluxo === 1 && (
              <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
                {ofertasConcluidas.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold italic">
                    Nenhuma oferta concluída disponível no módulo de Ofertas.
                  </div>
                ) : (
                  ofertasConcluidas.map((ofe) => (
                    <div
                      key={ofe.id}
                      onClick={() => handleSelecionarOfertaParaEncarte(ofe)}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#09797a] hover:bg-teal-50/30 transition-all shadow-xs"
                    >
                      <div>
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded uppercase">
                          {ofe.codigo_customizado}
                        </span>
                        <h4 className="font-black text-xs text-slate-800 uppercase mt-1">
                          {ofe.tipo_oferta === 'Data Comemorativa' ? ofe.tipo_oferta_customizado : ofe.tipo_oferta}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ofe.oferta_itens?.length || 0} produtos na campanha
                        </span>
                      </div>
                      <span className="text-[#09797a] font-black text-sm">→</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PASSO 2 */}
            {passoFluxo === 2 && (
              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {temas.map((t) => (
                  <div key={t.id} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col gap-2">
                    <span className="font-black text-xs uppercase text-slate-700">{t.nome}</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {(t.encartes_templates || []).map((tmpl: any) => (
                        <div
                          key={tmpl.id}
                          onClick={() => handleSelecionarTemplateParaEncarte(tmpl)}
                          className="bg-white border-2 border-slate-200 rounded-xl p-2 cursor-pointer hover:border-[#09797a] flex flex-col gap-1.5 shadow-xs transition-all"
                        >
                          <div className="h-20 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                            <img src={tmpl.imagem_fundo_url} alt={tmpl.nome} className="h-full w-full object-cover" />
                          </div>
                          <span className="text-[10px] font-black text-slate-800 uppercase truncate">{tmpl.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PASSO 3 */}
            {passoFluxo === 3 && (
              <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
                
                {/* Customização de Cores e Fontes */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Personalização Visual dos Quadros e Textos
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Fundo Foto (Superior)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={corFundoQuadroBranco}
                          onChange={(e) => setCorFundoQuadroBranco(e.target.value)}
                          className="w-10 h-9 rounded-xl cursor-pointer bg-white border border-slate-300 p-1"
                        />
                        <span className="font-mono text-xs font-bold text-slate-600">{corFundoQuadroBranco}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Fundo Texto (Inferior)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={corFundoInfo}
                          onChange={(e) => setCorFundoInfo(e.target.value)}
                          className="w-10 h-9 rounded-xl cursor-pointer bg-white border border-slate-300 p-1"
                        />
                        <span className="font-mono text-xs font-bold text-slate-600">{corFundoInfo}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Família da Fonte</label>
                      <select
                        value={fonteFamilia}
                        onChange={(e) => setFonteFamilia(e.target.value)}
                        className="h-9 bg-white border border-slate-300 rounded-xl px-2 font-bold uppercase text-xs"
                      >
                        {FONTES_DISPONIVEIS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Cor da Descrição</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={corTextoDescricao}
                          onChange={(e) => setCorTextoDescricao(e.target.value)}
                          className="w-10 h-9 rounded-xl cursor-pointer bg-white border border-slate-300 p-1"
                        />
                        <span className="font-mono text-xs font-bold text-slate-600">{corTextoDescricao}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Peso (Descrição)</label>
                      <select
                        value={pesoDescricao}
                        onChange={(e) => setPesoDescricao(e.target.value)}
                        className="h-9 bg-white border border-slate-300 rounded-xl px-2 font-bold uppercase text-xs"
                      >
                        <option value="normal">Regular</option>
                        <option value="bold">Bold</option>
                        <option value="800">ExtraBold</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Cor do Preço</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={corTextoPreco}
                          onChange={(e) => setCorTextoPreco(e.target.value)}
                          className="w-10 h-9 rounded-xl cursor-pointer bg-white border border-slate-300 p-1"
                        />
                        <span className="font-mono text-xs font-bold text-slate-600">{corTextoPreco}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Peso (Preço)</label>
                      <select
                        value={pesoPreco}
                        onChange={(e) => setPesoPreco(e.target.value)}
                        className="h-9 bg-white border border-slate-300 rounded-xl px-2 font-bold uppercase text-xs"
                      >
                        <option value="bold">Bold</option>
                        <option value="800">ExtraBold</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Cor da Unidade</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={corTextoUnidade}
                          onChange={(e) => setCorTextoUnidade(e.target.value)}
                          className="w-10 h-9 rounded-xl cursor-pointer bg-white border border-slate-300 p-1"
                        />
                        <span className="font-mono text-xs font-bold text-slate-600">{corTextoUnidade}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="font-bold text-slate-500 uppercase text-[10px]">Peso (Unidade)</label>
                      <select
                        value={pesoUnidade}
                        onChange={(e) => setPesoUnidade(e.target.value)}
                        className="h-9 bg-white border border-slate-300 rounded-xl px-2 font-bold uppercase text-xs"
                      >
                        <option value="normal">Regular</option>
                        <option value="bold">Bold</option>
                        <option value="800">ExtraBold</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Grade */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs font-bold text-emerald-900">
                  <span>Grade montada: <strong>{itensProcessadosGrade.length} produtos consolidados</strong></span>
                  <span className="text-[10px] text-emerald-700 font-mono">Layout Feirinha BV (4x4)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {itensProcessadosGrade.map((prod, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                      <div
                        style={{ backgroundColor: corFundoQuadroBranco }}
                        className="h-24 flex items-center justify-center p-2 border-b border-slate-100"
                      >
                        {prod.imagem_url ? (
                          <img src={prod.imagem_url} alt={prod.descricao_base} className="h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Sem Foto</span>
                        )}
                      </div>

                      <div
                        style={{ backgroundColor: corFundoInfo }}
                        className="p-2 flex flex-col justify-between flex-1 gap-1"
                      >
                        <span
                          style={{ color: corTextoDescricao, fontWeight: pesoDescricao as any, fontFamily: fonteFamilia }}
                          className="text-[11px] uppercase truncate block leading-tight"
                        >
                          {prod.descricao_base}
                        </span>

                        <div className="flex items-baseline gap-1">
                          <span
                            style={{ color: corTextoPreco, fontWeight: pesoPreco as any, fontFamily: fonteFamilia }}
                            className="text-sm font-black"
                          >
                            R$ {prod.preco_oferta.toFixed(2).replace('.', ',')}
                          </span>
                          <span
                            style={{ color: corTextoUnidade, fontWeight: pesoUnidade as any, fontFamily: fonteFamilia }}
                            className="text-[10px]"
                          >
                            /{(prod.unidade || 'UN').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleSalvarEncarteAtual('Em Andamento')}
                    className="flex-1 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-2xl text-xs font-black uppercase transition-all"
                  >
                    Salvar em Andamento
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSalvarEncarteAtual('Concluído')}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase transition-all"
                  >
                    Salvar Concluído
                  </button>

                  <button
                    type="button"
                    onClick={handleGerarEAbrirNovaAba}
                    className="flex-2 py-3.5 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🚀</span>
                    <span>Gerar Encarte (Nova Aba)</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL CRIAR TEMA */}
      {modalCriarTema && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-black text-xs uppercase text-[#09797a]">Novo Tema de Encarte</h3>
            <input
              type="text"
              placeholder="Ex: Semana do Consumidor, Dia das Mães..."
              value={nomeNovoTema}
              onChange={(e) => setNomeNovoTema(e.target.value)}
              className="w-full h-10 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalCriarTema(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!nomeNovoTema.trim()) return alert('Informe o nome do tema.');
                  await encartesService.criarTema(nomeNovoTema.trim());
                  setNomeNovoTema('');
                  setModalCriarTema(false);
                  carregarDadosGerais();
                }}
                className="flex-1 py-2 bg-[#09797a] text-white rounded-xl text-xs font-black uppercase"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO TEMPLATE */}
      {modalNovoTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="font-black text-xs uppercase text-[#09797a]">Novo Template Visual</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tema *</label>
              <select
                value={temaDestinoTemplate}
                onChange={(e) => setTemaDestinoTemplate(e.target.value)}
                className="w-full h-10 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 font-bold text-slate-800 uppercase"
              >
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Template *</label>
              <input
                type="text"
                placeholder="Ex: Fundo Amarelo Ofertaço"
                value={nomeNovoTemplate}
                onChange={(e) => setNomeNovoTemplate(e.target.value)}
                className="w-full h-10 text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 font-bold text-slate-800"
              />
            </div>

            <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold uppercase cursor-pointer text-center">
              Carregar Fundo (PNG/JPG)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setUrlNovoTemplate(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>

            {urlNovoTemplate && (
              <div className="h-20 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={urlNovoTemplate} alt="Preview" className="h-full object-contain" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalNovoTemplate(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!nomeNovoTemplate.trim() || !urlNovoTemplate) return alert('Preencha os campos e carregue a imagem.');
                  await encartesService.cadastrarTemplate({
                    tema_id: temaDestinoTemplate,
                    nome: nomeNovoTemplate.trim(),
                    imagem_fundo_url: urlNovoTemplate
                  });
                  setNomeNovoTemplate('');
                  setUrlNovoTemplate('');
                  setModalNovoTemplate(false);
                  carregarDadosGerais();
                }}
                className="flex-1 py-2 bg-[#09797a] text-white rounded-xl text-xs font-black uppercase"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}