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

  // Dados carregados
  const [encartes, setEncartes] = useState<any[]>([]);
  const [ofertasConcluidas, setOfertasConcluidas] = useState<any[]>([]);
  const [temas, setTemas] = useState<any[]>([]);
  const [configEmpresa, setConfigEmpresa] = useState<any>({});

  // Visualizador e Exportador de Imagem do Encarte
  const [imagemEncarteGerada, setImagemEncarteGerada] = useState<string | null>(null);
  const [encarteVisualizacao, setEncarteVisualizacao] = useState<any | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);

  // Repositório de Produtos
  const [termoBuscaProd, setTermoBuscaProd] = useState('');
  const [produtosRepo, setProdutosRepo] = useState<any[]>([]);
  const [produtoRepoSel, setProdutoRepoSel] = useState<any | null>(null);
  const [urlImagemRepo, setUrlImagemRepo] = useState('');

  // Fluxo de Montagem do Encarte (Passo a Passo)
  const [modalNovoEncarte, setModalNovoEncarte] = useState(false);
  const [passoFluxo, setPassoFluxo] = useState<1 | 2 | 3>(1);
  const [ofertaSelecionada, setOfertaSelecionada] = useState<any | null>(null);
  const [templateSelecionado, setTemplateSelecionado] = useState<any | null>(null);
  const [itensProcessadosGrade, setItensProcessadosGrade] = useState<ProdutoAgrupadoEncarte[]>([]);
  const [tituloEncarte, setTituloEncarte] = useState('');

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
      const [listaEncartes, listaOfertas, listaTemas, conf] = await Promise.all([
        encartesService.listarEncartes(),
        encartesService.listarOfertasConcluidas(),
        encartesService.listarTemasComTemplates(),
        encartesService.obterConfigEmpresa()
      ]);
      setEncartes(listaEncartes);
      setOfertasConcluidas(listaOfertas);
      setTemas(listaTemas);
      setConfigEmpresa(conf || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosGerais();
  }, []);

  // Busca Inteligente: código, código de barras ou descrição
  useEffect(() => {
    if (!termoBuscaProd.trim() || produtoRepoSel) {
      setProdutosRepo([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resultado = await encartesService.buscarProdutosParaRepositorio(termoBuscaProd);
        setProdutosRepo(resultado);
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [termoBuscaProd, produtoRepoSel]);

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
        config_aplicada_json: configEmpresa
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

  // Visualizar / Exportar Imagem Real do Encarte
  const handleVisualizarEncarte = async (enc: any) => {
    try {
      setGerandoImagem(true);
      setEncarteVisualizacao(enc);
      const dataUrl = await gerarImagemEncarteCanvas({
        titulo: enc.titulo || 'OFERTAS',
        produtos: enc.dados_produtos_json || [],
        templateUrl: enc.encartes_templates?.imagem_fundo_url || null,
        configEmpresa: enc.config_aplicada_json || configEmpresa
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

          {/* 7. ABA REPOSITÓRIO DE PRODUTOS */}
          {abaAtiva === 'REPOSITORIO' && (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col gap-3">
              <span className="text-xs font-black uppercase text-slate-500">
                Vincular Imagem Oficial ao Produto
              </span>

              <div className="relative flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Cód. Sistema, Código de Barras (EAN) ou Nome (% para curinga)..."
                  value={termoBuscaProd}
                  onChange={(e) => {
                    setTermoBuscaProd(e.target.value);
                    setProdutoRepoSel(null);
                  }}
                  className="w-full h-11 text-xs bg-white border border-slate-300 rounded-2xl px-3 font-bold text-slate-800 focus:border-[#09797a] outline-none"
                />

                {produtosRepo.length > 0 && !produtoRepoSel && (
                  <div className="absolute top-12 left-0 right-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {produtosRepo.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProdutoRepoSel(p);
                          setTermoBuscaProd(`${p.codprod} - ${p.descricao}`);
                          setProdutosRepo([]);
                        }}
                        className="w-full text-left p-3 hover:bg-teal-50 flex justify-between items-center text-xs font-bold text-slate-800 uppercase"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate">{p.codprod} - {p.descricao}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            EAN: {p.codbarra || 'Sem EAN'} • UN: {p.unidade || 'UN'}
                          </span>
                        </div>
                        <span className="text-[#09797a] font-black whitespace-nowrap">+ Selecionar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {produtoRepoSel && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 mt-2">
                  <div className="w-28 h-28 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                    {urlImagemRepo ? (
                      <img src={urlImagemRepo} alt="Preview" className="h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase text-center px-1">Sem imagem</span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        CÓD: {produtoRepoSel.codprod} • EAN: {produtoRepoSel.codbarra || '-'}
                      </span>
                      <h4 className="font-black text-xs uppercase text-slate-800">{produtoRepoSel.descricao}</h4>
                    </div>

                    <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer text-center">
                      Escolher Foto do Produto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setUrlImagemRepo(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={!urlImagemRepo}
                      onClick={async () => {
                        await encartesService.associarImagemProduto(produtoRepoSel.id, urlImagemRepo);
                        alert('Imagem associada com sucesso ao produto!');
                        setProdutoRepoSel(null);
                        setTermoBuscaProd('');
                        setUrlImagemRepo('');
                      }}
                      className="bg-[#09797a] hover:bg-[#075f60] text-white py-2 rounded-xl text-xs font-black uppercase shadow-xs disabled:opacity-40 active:scale-95 transition-all"
                    >
                      Salvar no Repositório
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

            {/* PASSO 1: SELEÇÃO DA OFERTA CONCLUÍDA */}
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

            {/* PASSO 2: SELEÇÃO DO TEMA E TEMPLATE */}
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

            {/* PASSO 3: GRADE AUTOMÁTICA UNIFICADA POR FAMÍLIA/SABORES */}
            {passoFluxo === 3 && (
              <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs font-bold text-emerald-900">
                  <span>Grade inteligente montada: <strong>{itensProcessadosGrade.length} produtos consolidados</strong></span>
                  <span className="text-[10px] text-emerald-700 font-mono">Sabores/Fragrâncias Unificadas</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {itensProcessadosGrade.map((prod, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                      <div className="h-28 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                        {prod.imagem_url ? (
                          <img src={prod.imagem_url} alt={prod.descricao_base} className="h-full object-contain" />
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center px-2">
                            Sem Foto (Cadastrar no Repositório)
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-black text-xs uppercase text-slate-800 leading-snug">
                          {prod.descricao_base}
                        </h4>
                        {prod.variacoes.length > 1 && (
                          <span className="text-[9px] font-black text-[#09797a] block uppercase mt-0.5">
                            Sabores / Tipos ({prod.variacoes.length})
                          </span>
                        )}
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs text-slate-400 line-through block">
                          R$ {prod.preco_tabela.toFixed(2)}
                        </span>
                        <span className="text-base font-black text-emerald-700">
                          R$ {prod.preco_oferta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSalvarEncarteAtual('Em Andamento')}
                    className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-2xl text-xs font-black uppercase transition-all"
                  >
                    Salvar em Andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSalvarEncarteAtual('Concluído')}
                    className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
                  >
                    Finalizar e Concluir Encarte
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