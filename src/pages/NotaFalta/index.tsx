// Arquivo: src/pages/NotaFalta/index.tsx
import { useState, useEffect } from 'react';
import { notaFaltaService } from './services/notaFaltaService';
import { gerarPdfNotaFalta } from './utils/gerarPdfNotaFalta';

interface NotaFaltaProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
}

const SECOES_OPCOES = [
  'Cereais', 'Enlatados', 'Massas', 'Laticínios', 'Bebidas',
  'Limpeza', 'Higiene Pessoal', 'Perfumaria', 'Frios',
  'Hortifruti', 'Açougue', 'Padaria', 'Bazar', 'Pet/Agro Depósito'
];

export default function NotaFalta({ onVoltarParaHome, usuarioLogado }: NotaFaltaProps) {
  const [notasRaw, setNotasRaw] = useState<any[]>([]);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'PENDENTES' | 'CONCLUIDAS'>('PENDENTES');

  // Modal 1: Identificação Inicial
  const [mostrarModalInicio, setMostrarModalInicio] = useState(false);
  const [secaoSelecionada, setSecaoSelecionada] = useState(SECOES_OPCOES[0]);

  // Modal 2: Adicionar / Editar Itens da Nota
  const [emEdicaoNota, setEmEdicaoNota] = useState(false);
  const [codigoLoteAtual, setCodigoLoteAtual] = useState<string | null>(null);
  const [nomeResponsavelAtual, setNomeResponsavelAtual] = useState('');
  const [itensEmLote, setItensEmLote] = useState<any[]>([]);

  // Campos do formulário do item individual
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);
  const [motivoId, setMotivoId] = useState('');
  const [qtdRestante, setQtdRestante] = useState<number | ''>(1);
  const [unidade, setUnidade] = useState<string>('UN');
  const [salvando, setSalvando] = useState(false);

  // Modal de Resumo (Exclusivo para Concluídas)
  const [loteDetalhe, setLoteDetalhe] = useState<any | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dadosNotas, dadosMotivos] = await Promise.all([
        notaFaltaService.listarNotasFalta(),
        notaFaltaService.listarMotivosFalta()
      ]);
      setNotasRaw(dadosNotas);
      setMotivos(dadosMotivos);
      if (dadosMotivos.length > 0) setMotivoId(dadosMotivos[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Busca autocomplete de produtos
  useEffect(() => {
    if (!termoBuscaProduto.trim() || produtoSelecionado) {
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
  }, [termoBuscaProduto, produtoSelecionado]);

  // Identifica se o motivo selecionado é "Estoque Zero"
  const motivoSelecionadoObj = motivos.find((m) => m.id === motivoId);
  const isEstoqueZero = motivoSelecionadoObj?.descricao?.toUpperCase().includes('ESTOQUE ZERO');

  // Abrir Modal de Nova Falta
  const handleAbrirNovaFalta = () => {
    setCodigoLoteAtual(null);
    setItensEmLote([]);
    setMostrarModalInicio(true);
  };

  const handleIniciarNovaFalta = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLogado = usuarioLogado?.nome || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.nome || 'RESPONSÁVEL';
    setNomeResponsavelAtual(nomeLogado);
    setMostrarModalInicio(false);
    setCodigoLoteAtual(null);
    setEmEdicaoNota(true);
    setItensEmLote([]);
  };

  const handleAdicionarItemNaLista = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      alert('Selecione um produto.');
      return;
    }

    // Se for Estoque Zero, zera a quantidade e usa 'UN'
    const finalQtd = isEstoqueZero ? 0 : Number(qtdRestante || 0);
    const finalUnidade = isEstoqueZero ? 'UN' : unidade;

    const novoItem = {
      temp_id: Math.random().toString(),
      produto: produtoSelecionado,
      produto_id: produtoSelecionado.id,
      motivo_falta_id: motivoId,
      motivo_descricao: motivoSelecionadoObj?.descricao || 'NÃO INFORMADO',
      quantidade_restante: finalQtd,
      unidade_restante: finalUnidade
    };

    setItensEmLote((prev) => [...prev, novoItem]);

    setProdutoSelecionado(null);
    setTermoBuscaProduto('');
    setQtdRestante(1);
    setUnidade('UN');
  };

  const handleRemoverItemLote = (tempId: string) => {
    setItensEmLote((prev) => prev.filter((i) => i.temp_id !== tempId));
  };

  const handlePersistirLote = async (statusFinal: 'Pendente' | 'Concluida') => {
    if (itensEmLote.length === 0) {
      alert('Adicione ao menos um item para salvar ou pausar a nota.');
      return;
    }

    try {
      setSalvando(true);
      const usuarioObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');
      const usuarioIdFinal = usuarioObj?.id;
      const respNomeFinal = nomeResponsavelAtual || usuarioObj?.nome || 'RESPONSÁVEL';

      await notaFaltaService.salvarLoteNotasFalta({
        codigo_customizado: codigoLoteAtual,
        responsavel_nome: respNomeFinal,
        secao_nome: secaoSelecionada,
        usuario_id: usuarioIdFinal,
        status: statusFinal,
        itens: itensEmLote.map((i) => ({
          produto_id: i.produto_id,
          motivo_falta_id: i.motivo_falta_id,
          quantidade_restante: i.quantidade_restante,
          unidade_restante: i.unidade_restante
        }))
      });

      alert(
        statusFinal === 'Pendente'
          ? `Nota de falta da seção ${secaoSelecionada} pausada e salva na aba Pendentes!`
          : `Nota de falta da seção ${secaoSelecionada} concluída com sucesso!`
      );

      setEmEdicaoNota(false);
      setCodigoLoteAtual(null);
      setItensEmLote([]);
      carregarDados();
    } catch (err) {
      console.error(err);
      alert('Erro ao processar a nota de falta.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelarLote = () => {
    if (confirm('Deseja cancelar o preenchimento desta nota? Os itens desta sessão serão descartados.')) {
      setEmEdicaoNota(false);
      setCodigoLoteAtual(null);
      setItensEmLote([]);
    }
  };

  const handleClicarNoCard = (lote: any) => {
    if (abaAtiva === 'PENDENTES') {
      setNomeResponsavelAtual(lote.responsavel_nome || 'RESPONSÁVEL');
      setSecaoSelecionada(lote.secao_nome || SECOES_OPCOES[0]);
      setCodigoLoteAtual(lote.codigo);
      setItensEmLote(
        lote.itens.map((item: any) => ({
          temp_id: item.id || Math.random().toString(),
          produto: item.produtos || { id: item.produto_id, descricao: 'PRODUTO' },
          produto_id: item.produto_id,
          motivo_falta_id: item.motivo_falta_id,
          motivo_descricao: item.motivos_falta?.descricao || 'NÃO INFORMADO',
          quantidade_restante: item.quantidade_restante,
          unidade_restante: item.unidade_restante || 'UN'
        }))
      );
      setEmEdicaoNota(true);
    } else {
      setLoteDetalhe(lote);
    }
  };

  // Agrupamento por código customizado
  const lotesAgrupados = Object.values(
    notasRaw.reduce((acc: Record<string, any>, item: any) => {
      const chave = item.codigo_customizado || item.id;
      if (!acc[chave]) {
        acc[chave] = {
          codigo: chave,
          created_at: item.created_at,
          data_registro: item.data_registro,
          hora_registro: item.hora_registro,
          responsavel_nome: item.usuarios?.nome || 'RESPONSÁVEL',
          secao_nome: item.setor_nome || 'GERAL',
          status: item.status_cotacao || 'Pendente',
          itens: []
        };
      }
      acc[chave].itens.push(item);
      return acc;
    }, {})
  );

  const lotesPendentes = lotesAgrupados.filter(
    (l) => l.status === 'Pendente' || l.status === 'Pausada' || l.status === 'EM_ANDAMENTO'
  );
  const lotesConcluidos = lotesAgrupados.filter(
    (l) => l.status === 'Concluida' || l.status === 'CONCLUIDA'
  );

  const listaExibida = abaAtiva === 'PENDENTES' ? lotesPendentes : lotesConcluidos;

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">NOTA DE FALTA</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Registro de Rupturas de Estoque</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAbrirNovaFalta}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            📝 Registrar Nova Falta
          </button>
        </div>

        {/* ABAS */}
        <div className="bg-gray-100 p-1 rounded-2xl flex text-xs font-black">
          <button
            type="button"
            onClick={() => setAbaAtiva('PENDENTES')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'PENDENTES' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            PENDENTES ({lotesPendentes.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('CONCLUIDAS')}
            className={`flex-1 py-2.5 rounded-xl uppercase transition-all ${abaAtiva === 'CONCLUIDAS' ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400'}`}
          >
            CONCLUÍDAS ({lotesConcluidos.length})
          </button>
        </div>

        {/* LISTAGEM DE NOTAS */}
        <div className="flex-1 flex flex-col gap-2">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando notas...</div>
          ) : listaExibida.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
              Nenhuma nota de falta registrada nesta aba.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {listaExibida.map((lote) => {
                const dataFmt = lote.data_registro
                  ? new Date(lote.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')
                  : new Date(lote.created_at).toLocaleDateString('pt-BR');

                return (
                  <div
                    key={lote.codigo}
                    onClick={() => handleClicarNoCard(lote)}
                    className="p-3.5 bg-gray-50 hover:bg-emerald-50/40 border border-gray-200 rounded-2xl flex justify-between items-center cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md uppercase">
                          {lote.codigo}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-gray-400">
                          {dataFmt} às {lote.hora_registro || ''}
                        </span>
                      </div>
                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                        Resp: {lote.responsavel_nome} | Seção: {lote.secao_nome}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">
                        Qtd de Itens: <strong className="text-[#09797a]">{lote.itens.length}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                        abaAtiva === 'PENDENTES' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {abaAtiva === 'PENDENTES' ? 'Continuar' : 'Ver Detalhes'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: SELEÇÃO DA SEÇÃO */}
      {mostrarModalInicio && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <form onSubmit={handleIniciarNovaFalta} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">INICIAR NOTA DE FALTA</h3>
              <button type="button" onClick={() => setMostrarModalInicio(false)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Informe sua Seção</label>
              <select
                value={secaoSelecionada}
                onChange={(e) => setSecaoSelecionada(e.target.value)}
                className="w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase focus:outline-none focus:border-[#09797a]"
              >
                {SECOES_OPCOES.map((sec) => (
                  <option key={sec} value={sec}>{sec.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-3 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all mt-2"
            >
              Iniciar Nota de Falta
            </button>
          </form>
        </div>
      )}

      {/* MODAL 2: EDIÇÃO DE ITENS DA NOTA */}
      {emEdicaoNota && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div>
                <h3 className="text-[#09797a] font-black text-base uppercase">REGISTRAR RUPTURA DE ESTOQUE</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Resp: {nomeResponsavelAtual} | Seção: {secaoSelecionada}</p>
              </div>
              <button type="button" onClick={() => handlePersistirLote('Pendente')} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            {/* FORMULÁRIO DO ITEM */}
            <form onSubmit={handleAdicionarItemNaLista} className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex flex-col gap-3">
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Buscar Produto (Codprod, EAN ou Nome)</label>
                <input
                  type="text"
                  value={termoBuscaProduto}
                  onChange={(e) => {
                    setTermoBuscaProduto(e.target.value);
                    setProdutoSelecionado(null);
                  }}
                  placeholder="Bipe o EAN ou digite o termo..."
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                />

                {produtosEncontrados.length > 0 && !produtoSelecionado && (
                  <div className="absolute top-15 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-40 overflow-y-auto z-20 divide-y divide-gray-100">
                    {produtosEncontrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setProdutoSelecionado(p);
                          setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
                          setProdutosEncontrados([]);
                        }}
                        className="w-full text-left p-3 hover:bg-emerald-50/50 flex flex-col text-xs font-bold text-gray-800 uppercase"
                      >
                        <span>{p.codprod} - {p.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Motivo da Ruptura</label>
                <select
                  value={motivoId}
                  onChange={(e) => setMotivoId(e.target.value)}
                  className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                >
                  {motivos.map((m) => (
                    <option key={m.id} value={m.id}>{m.descricao.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* OCULTA QUANTIDADE E TIPO DE UNIDADE CASO O MOTIVO SEJA "ESTOQUE ZERO" */}
              {!isEstoqueZero && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Qtd Ainda Restante</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={qtdRestante}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQtdRestante(val === '' ? '' : Number(val));
                      }}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Tipo de Unidade</label>
                    <select
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      className="w-full h-10 text-xs bg-white border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center uppercase"
                    >
                      <option value="UN">UN - Unidade</option>
                      <option value="CX">CX - Caixa</option>
                      <option value="FD">FD - Fardo</option>
                      <option value="KG">KG - Quilo</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!produtoSelecionado}
                className="w-full bg-[#09797a] hover:bg-[#075f60] text-white py-2.5 rounded-2xl text-xs font-black uppercase shadow-md transition-all disabled:opacity-40"
              >
                + Adicionar Item na Nota
              </button>
            </form>

            {/* LISTA DE ITENS INCLUÍDOS */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 max-h-[30vh] pr-1">
              <span className="text-[10px] font-black text-gray-400 uppercase px-1">Itens Adicionados ({itensEmLote.length})</span>
              {itensEmLote.length === 0 ? (
                <div className="border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400 italic rounded-2xl">
                  Nenhum item adicionado ainda.
                </div>
              ) : (
                itensEmLote.map((item) => (
                  <div key={item.temp_id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold">
                    <div>
                      <h4 className="text-gray-800 uppercase">{item.produto.descricao}</h4>
                      <p className="text-[10px] text-gray-400">Motivo: {item.motivo_descricao}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#09797a] font-mono bg-emerald-100 px-2 py-1 rounded-lg">
                        {item.quantidade_restante} {item.unidade_restante}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverItemLote(item.temp_id)}
                        className="text-red-500 font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-3 border-t border-gray-100 flex gap-2">
              <button
                type="button"
                onClick={handleCancelarLote}
                className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-black uppercase"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvando || itensEmLote.length === 0}
                onClick={() => handlePersistirLote('Pendente')}
                className="flex-1 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-2xl text-xs font-black uppercase disabled:opacity-40"
              >
                Pausar
              </button>

              <button
                type="button"
                disabled={salvando || itensEmLote.length === 0}
                onClick={() => handlePersistirLote('Concluida')}
                className="flex-2 py-3 bg-[#09797a] text-white hover:bg-[#075f60] rounded-2xl text-xs font-black uppercase shadow-md disabled:opacity-40"
              >
                Salvar Nota
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE RESUMO (EXCLUSIVO PARA CONCLUÍDAS) */}
      {loteDetalhe && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase">Detalhes da Nota de Falta</span>
                <h3 className="text-[#09797a] font-black text-base uppercase">{loteDetalhe.codigo}</h3>
              </div>
              <button type="button" onClick={() => setLoteDetalhe(null)} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl grid grid-cols-2 gap-2 text-xs font-bold">
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Responsável</span>
                <span className="text-gray-800">{loteDetalhe.responsavel_nome}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Seção / Setor</span>
                <span className="text-gray-800">{loteDetalhe.secao_nome}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Data/Hora</span>
                <span className="text-gray-800">{loteDetalhe.data_registro} às {loteDetalhe.hora_registro}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-gray-400 block uppercase">Total de Itens</span>
                <span className="text-gray-800">{loteDetalhe.itens.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 max-h-[40vh]">
              <span className="text-[10px] font-black text-gray-400 uppercase px-1">Itens Gravados</span>
              {loteDetalhe.itens.map((item: any) => {
                const prod = item.produtos || {};
                const motivo = item.motivos_falta?.descricao || 'NÃO INFORMADO';
                return (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center text-xs font-bold">
                    <div>
                      <h4 className="text-gray-800 uppercase">{prod.descricao || 'PRODUTO NÃO ENCONTRADO'}</h4>
                      <p className="text-[10px] text-gray-400">Motivo: {motivo}</p>
                    </div>
                    <div className="text-right font-mono font-black text-xs text-[#09797a] bg-emerald-100 px-2 py-1 rounded-lg">
                      {item.quantidade_restante} {item.unidade_restante || 'UN'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setLoteDetalhe(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => gerarPdfNotaFalta(loteDetalhe, loteDetalhe.itens)}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all"
              >
                🖨️ Exportar Nota PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}