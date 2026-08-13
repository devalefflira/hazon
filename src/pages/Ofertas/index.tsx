// Arquivo: src/pages/Ofertas/index.tsx
import { useState, useEffect } from 'react';
import { ofertasService } from './services/ofertasService';
import { gerarPdfOferta } from './utils/gerarPdfOferta';

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

export default function Ofertas({ onVoltarParaHome, usuarioLogado }: OfertasProps) {
  const [ofertas, setOfertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Abas Principais
  const [abaPrincipal, setAbaAtiva] = useState<'CRIADAS' | 'A_PRECIFICAR' | 'CONCLUIDAS'>('CRIADAS');
  // Sub-abas de Criadas
  const [subAbaCriadas, setSubAbaCriadas] = useState<'EM_ANDAMENTO' | 'FINALIZADAS'>('EM_ANDAMENTO');
  // Sub-abas de Concluídas
  const [subAbaConcluidas, setSubAbaConcluidas] = useState<'GERAR_PLACAS' | 'GERAR_RELATORIO'>('GERAR_RELATORIO');

  // Modal: Nova Oferta
  const [modalNovaOferta, setModalNovaOferta] = useState(false);
  const [codigoEdicaoAtual, setCodigoEdicaoAtual] = useState<string | null>(null);
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [itensEmEdicao, setItensEmEdicao] = useState<any[]>([]);

  // Tela de Precificação (A Precificar)
  const [ofertaEmPrecificacao, setOfertaEmPrecificacao] = useState<any | null>(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoOferta, setTipoOferta] = useState(TIPOS_OFERTA_OPCOES[0]);
  const [tipoOfertaCustom, setTipoOfertaCustom] = useState('');
  const [precosOfertaMap, setPrecosOfertaMap] = useState<Record<string, number | ''>>({});

  // Modal de Visualização da Oferta Criada / Finalizada
  const [ofertaVerDetalhes, setOfertaVerDetalhes] = useState<any | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarOfertas = async () => {
    try {
      setLoading(true);
      const dados = await ofertasService.listarOfertas();
      setOfertas(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOfertas();
  }, []);

  // Autocomplete de Produtos
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

  // Salvar Oferta Criada (Pausar ou Finalizar)
  const handleSalvarOfertaCriada = async (statusFinal: 'Em Andamento' | 'Criada Finalizada') => {
    if (itensEmEdicao.length === 0) {
      alert('Adicione ao menos um produto.');
      return;
    }

    try {
      setSalvando(true);
      const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');

      await ofertasService.salvarOferta({
        codigo_customizado: codigoEdicaoAtual,
        usuario_id: userObj?.id,
        status: statusFinal,
        itens: itensEmEdicao
      });

      alert(statusFinal === 'Em Andamento' ? 'Oferta salva em Criadas / Em Andamento!' : 'Oferta enviada para A Precificar!');
      setModalNovaOferta(false);
      setCodigoEdicaoAtual(null);
      setItensEmEdicao([]);
      carregarOfertas();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar oferta.');
    } finally {
      setSalvando(false);
    }
  };

  // Abrir tela de Precificação
  const handleAbrirPrecificacao = (oferta: any) => {
    setOfertaEmPrecificacao(oferta);
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

  // Salvar Precificação (Muda de A Precificar para Concluída)
  const handleSalvarPrecificacao = async () => {
    if (!dataInicio || !dataFim) {
      alert('Informe o período inicial e final da oferta.');
      return;
    }
    if (tipoOferta === 'Data Comemorativa' && !tipoOfertaCustom.trim()) {
      alert('Informe o nome da Data Comemorativa.');
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

  // Filtros de Listagem
  const ofertasEmAndamento = ofertas.filter((o) => o.status === 'Em Andamento');
  const ofertasCriadasFinalizadas = ofertas.filter((o) => o.status === 'Criada Finalizada');
  const ofertasAPrecificar = ofertasCriadasFinalizadas; // A Precificar reflete as criadas finalizadas
  const ofertasConcluidas = ofertas.filter((o) => o.status === 'Concluida');

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
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gestão e Precificação de Campanhas</p>
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

        {/* ABAS PRINCIPAIS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('CRIADAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaPrincipal === 'CRIADAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            CRIADAS
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('A_PRECIFICAR')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaPrincipal === 'A_PRECIFICAR' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            A PRECIFICAR ({ofertasAPrecificar.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('CONCLUIDAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaPrincipal === 'CONCLUIDAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            CONCLUÍDAS ({ofertasConcluidas.length})
          </button>
        </div>

        {/* SUB-ABAS DE CRIADAS */}
        {abaPrincipal === 'CRIADAS' && (
          <div className="flex gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setSubAbaCriadas('EM_ANDAMENTO')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                subAbaCriadas === 'EM_ANDAMENTO' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-50 text-gray-400'
              }`}
            >
              Em Andamento ({ofertasEmAndamento.length})
            </button>
            <button
              type="button"
              onClick={() => setSubAbaCriadas('FINALIZADAS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                subAbaCriadas === 'FINALIZADAS' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-gray-50 text-gray-400'
              }`}
            >
              Finalizadas ({ofertasCriadasFinalizadas.length})
            </button>
          </div>
        )}

        {/* SUB-ABAS DE CONCLUÍDAS */}
        {abaPrincipal === 'CONCLUIDAS' && (
          <div className="flex gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setSubAbaConcluidas('GERAR_RELATORIO')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                subAbaConcluidas === 'GERAR_RELATORIO' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-gray-50 text-gray-400'
              }`}
            >
              Gerar Relatório de Ofertas
            </button>
            <button
              type="button"
              onClick={() => setSubAbaConcluidas('GERAR_PLACAS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                subAbaConcluidas === 'GERAR_PLACAS' ? 'bg-[#09797a] text-white shadow-md' : 'bg-gray-50 text-gray-400'
              }`}
            >
              Gerar Placas
            </button>
          </div>
        )}

        {/* LISTAGEM CONFORME A ABA SELECIONADA */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando ofertas...</div>
          ) : abaPrincipal === 'CRIADAS' && subAbaCriadas === 'EM_ANDAMENTO' ? (
            ofertasEmAndamento.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhuma oferta em andamento.
              </div>
            ) : (
              ofertasEmAndamento.map((ofe) => (
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
                    className="px-3.5 py-1.5 bg-amber-100 text-amber-900 rounded-xl text-xs font-black uppercase"
                  >
                    Continuar
                  </button>
                </div>
              ))
            )
          ) : abaPrincipal === 'CRIADAS' && subAbaCriadas === 'FINALIZADAS' ? (
            ofertasCriadasFinalizadas.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhuma oferta finalizada nesta etapa.
              </div>
            ) : (
              ofertasCriadasFinalizadas.map((ofe) => (
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
                  <button
                    type="button"
                    onClick={() => setOfertaVerDetalhes(ofe)}
                    className="px-3.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-black uppercase"
                  >
                    Ver Itens
                  </button>
                </div>
              ))
            )
          ) : abaPrincipal === 'A_PRECIFICAR' ? (
            ofertasAPrecificar.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhuma oferta pendente de precificação.
              </div>
            ) : (
              ofertasAPrecificar.map((ofe) => (
                <div key={ofe.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                      {ofe.codigo_customizado}
                    </span>
                    <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                      A Precificar | Qtd Itens: {ofe.oferta_itens?.length || 0}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Resp: {ofe.usuarios?.nome || 'SISTEMA'} - {ofe.data_registro}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAbrirPrecificacao(ofe)}
                    className="px-4 py-2 bg-[#09797a] hover:bg-[#075f60] text-white rounded-xl text-xs font-black uppercase shadow-sm"
                  >
                    Precificar
                  </button>
                </div>
              ))
            )
          ) : abaPrincipal === 'CONCLUIDAS' && subAbaConcluidas === 'GERAR_RELATORIO' ? (
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
                      Período: {ofe.data_inicio} até {ofe.data_fim}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Resp: {ofe.usuarios?.nome || 'SISTEMA'} | Qtd Itens: {ofe.oferta_itens?.length || 0}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => gerarPdfOferta(ofe, ofe.oferta_itens || [])}
                    className="px-3.5 py-1.5 bg-[#09797a] text-white rounded-xl text-xs font-black uppercase shadow-sm"
                  >
                    🖨️ PDF
                  </button>
                </div>
              ))
            )
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Gerar Placas será construído em breve conforme solicitado!
            </div>
          )}
        </div>

      </div>

      {/* MODAL: NOVA OFERTA */}
      {modalNovaOferta && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                {codigoEdicaoAtual ? `EDITAR OFERTA ${codigoEdicaoAtual}` : 'NOVA OFERTA'}
              </h3>
              <button type="button" onClick={() => setModalNovaOferta(false)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Data / Hora</span>
                <span className="text-gray-800">{agoraData} às {agoraHora}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Usuário</span>
                <span className="text-gray-800">{nomeUser}</span>
              </div>
            </div>

            {/* BUSCA DE PRODUTO */}
            <div className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Bipe o EAN ou digite o nome/código do produto..."
                value={termoBuscaProduto}
                onChange={(e) => setTermoBuscaProduto(e.target.value)}
                className="flex-1 h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
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

            {/* TABELA DE ITENS ADICIONADOS */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-2 max-h-[35vh]">
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
                        Nenhum produto adicionado.
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
                            className="text-red-500 font-bold px-2 py-1 rounded"
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

            {/* BOTÕES */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setModalNovaOferta(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando || itensEmEdicao.length === 0}
                onClick={() => handleSalvarOfertaCriada('Em Andamento')}
                className="flex-1 py-3 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase"
              >
                Pausar
              </button>
              <button
                type="button"
                disabled={salvando || itensEmEdicao.length === 0}
                onClick={() => handleSalvarOfertaCriada('Criada Finalizada')}
                className="flex-2 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                Finalizar Oferta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA / MODAL DE PRECIFICAÇÃO (A PRECIFICAR) */}
      {ofertaEmPrecificacao && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                PRECIFICAR OFERTA {ofertaEmPrecificacao.codigo_customizado}
              </h3>
              <button type="button" onClick={() => setOfertaEmPrecificacao(null)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Data Inicial *</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Data Final *</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Oferta *</label>
              <select
                value={tipoOferta}
                onChange={(e) => setTipoOferta(e.target.value)}
                className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
              >
                {TIPOS_OFERTA_OPCOES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {tipoOferta === 'Data Comemorativa' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Data Comemorativa *</label>
                <input
                  type="text"
                  placeholder="Ex: Dia dos Pais, Aniversário..."
                  value={tipoOfertaCustom}
                  onChange={(e) => setTipoOfertaCustom(e.target.value)}
                  className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                />
              </div>
            )}

            {/* TABELA DE PRECOS DE OFERTA */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-2xl p-2 max-h-[35vh]">
              <table className="w-full text-left text-xs font-bold">
                <thead className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                  <tr>
                    <th className="p-2">CODPROD</th>
                    <th className="p-2">DESCRIÇÃO</th>
                    <th className="p-2 text-right">CUSTO REAL</th>
                    <th className="p-2 text-right">PVENDA</th>
                    <th className="p-2 text-right w-32">OFERTA (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(ofertaEmPrecificacao.oferta_itens || []).map((item: any) => {
                    const prod = item.produtos || {};
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2 font-mono text-[#09797a]">{prod.codprod}</td>
                        <td className="p-2 uppercase">{prod.descricao}</td>
                        <td className="p-2 text-right font-mono text-gray-500">
                          {(item.preco_custo_real || prod.custoreal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-2 text-right font-mono text-gray-800">
                          {(item.preco_venda_tabela || prod.pvenda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-2 text-right">
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
                            className="w-28 h-9 text-xs bg-emerald-50 border border-emerald-300 px-2 rounded-xl text-right font-mono font-black text-emerald-900"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOfertaEmPrecificacao(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={handleSalvarPrecificacao}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
              >
                Salvar e Concluir Oferta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALHES DE OFERTA CRIADA FINALIZADA */}
      {ofertaVerDetalhes && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">
                ITENS DA OFERTA {ofertaVerDetalhes.codigo_customizado}
              </h3>
              <button type="button" onClick={() => setOfertaVerDetalhes(null)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 max-h-[50vh] pr-1">
              {(ofertaVerDetalhes.oferta_itens || []).map((item: any) => {
                const prod = item.produtos || {};
                return (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold">
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

            <button
              type="button"
              onClick={() => setOfertaVerDetalhes(null)}
              className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}