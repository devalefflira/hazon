// Arquivo: src/pages/Vencimentos/index.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Ellipsis, Flag, Handshake, Repeat, Tag, Trash2, TriangleAlert, X } from 'lucide-react';
import { SeletorProdutoScanner } from '../../components/SeletorProdutoScanner';
import type { ProdutoBusca } from '../../components/SeletorProdutoScanner';
import { useToast } from '../../components/ui/useToast';
import { vencimentosService } from './services/vencimentosService';
import type {
  CicloVencimento,
  NovaAcaoPayload,
  ProdutoVencimento,
  TipoAcaoVencimento,
  VencimentoItem
} from './services/vencimentosService';
import PainelFiltros from './components/PainelFiltros';
import CardCiclo from './components/CardCiclo';
import ModalAcaoVencimento from './components/ModalAcaoVencimento';
import type { AlvoAcao } from './components/ModalAcaoVencimento';
import AbaRelatorios from './components/AbaRelatorios';
import {
  FILTROS_PADRAO,
  ROTULO_ACAO,
  TIPOS_ACAO,
  chaveItem,
  corDias,
  dataLocalISO,
  dentroDoPeriodo,
  formatarDataBR,
  montarOpcoesHierarquia,
  numeroBR,
  produtoAtendeHierarquia,
  sequenciaAcoes,
  textoDias
} from './utils/vencimentosUtils';
import type { FiltrosVencimentos } from './utils/vencimentosUtils';

interface VencimentosProps {
  onVoltarParaHome: () => void;
  usuarioLogado?: any;
  onDirecionarParaAvaria?: (produtoPreDefinido: any) => void;
}

type AbaPrincipal = 'A_VENCER' | 'EM_CURSO' | 'FINALIZADAS' | 'RELATORIOS';
type AbaComFiltro = Exclude<AbaPrincipal, 'RELATORIOS'>;
type SubAbaAVencer = 'CRITICO' | 'ALERTA' | 'NORMAL' | 'VENCIDOS';

interface ModalAcaoEstado {
  tipo: TipoAcaoVencimento;
  alvo: AlvoAcao;
  item?: VencimentoItem;
  ciclo?: CicloVencimento;
}

const ICONE_ACAO: Record<TipoAcaoVencimento, typeof Tag> = {
  Oferta: Tag,
  Troca: Repeat,
  Descarte: Trash2,
  'Negociação': Handshake
};

const DESCRICAO_ACAO: Record<TipoAcaoVencimento, string> = {
  Oferta: 'Reduzir o preço na loja para girar antes do vencimento',
  Troca: 'Devolver ao fornecedor em troca de produto novo',
  Descarte: 'Retirar de venda e registrar a perda com justificativa',
  'Negociação': 'Rebaixa de custo, bonificação ou verba do fornecedor'
};

const chaveDoItem = (i: VencimentoItem) => chaveItem(i.origem, i.id);

const valorOuReserva = (atual: number | null | undefined, reserva: number) =>
  atual !== null && atual !== undefined && Number(atual) > 0 ? Number(atual) : reserva;

export default function Vencimentos({
  onVoltarParaHome,
  usuarioLogado,
  onDirecionarParaAvaria
}: VencimentosProps) {
  const { mostrarAviso } = useToast();

  const [itens, setItens] = useState<VencimentoItem[]>([]);
  const [ciclos, setCiclos] = useState<CicloVencimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [ciclosIndisponiveis, setCiclosIndisponiveis] = useState(false);

  // Abas
  const [abaPrincipal, setAbaPrincipal] = useState<AbaPrincipal>('A_VENCER');
  const [subAbaAVencer, setSubAbaAVencer] = useState<SubAbaAVencer>('CRITICO');
  const [filtrosPorAba, setFiltrosPorAba] = useState<Record<AbaComFiltro, FiltrosVencimentos>>({
    A_VENCER: { ...FILTROS_PADRAO },
    EM_CURSO: { ...FILTROS_PADRAO },
    FINALIZADAS: { ...FILTROS_PADRAO }
  });

  // Seleção (A Vencer) e Mais Ações
  const [itemSelecionado, setItemSelecionado] = useState<string | null>(null);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [modalAcao, setModalAcao] = useState<ModalAcaoEstado | null>(null);
  const [salvandoAcao, setSalvandoAcao] = useState(false);

  // Ações em Curso / Finalizadas
  const [historicoAberto, setHistoricoAberto] = useState<Record<string, boolean>>({});
  const [cicloDestacado, setCicloDestacado] = useState<string | null>(null);
  const [cicloFinalizar, setCicloFinalizar] = useState<CicloVencimento | null>(null);
  const [observacaoFinal, setObservacaoFinal] = useState('');
  const [finalizando, setFinalizando] = useState(false);

  // Modal Novo Controle
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoBusca | null>(null);
  const [lote, setLote] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [salvando, setSalvando] = useState(false);

  const obterUsuarioId = (): string | undefined => {
    const userObj = usuarioLogado || JSON.parse(localStorage.getItem('hazon_user') || '{}');
    return userObj?.id;
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const [resItens, resCiclos] = await Promise.allSettled([
      vencimentosService.listarTodosVencimentos(),
      vencimentosService.listarCiclos()
    ]);

    if (resItens.status === 'fulfilled') setItens(resItens.value);
    else console.error('Erro ao carregar vencimentos:', resItens.reason);

    if (resCiclos.status === 'fulfilled') {
      setCiclos(resCiclos.value);
      setCiclosIndisponiveis(false);
    } else {
      console.error('Erro ao carregar ciclos de ação:', resCiclos.reason);
      setCiclosIndisponiveis(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Destaca e rola até o ciclo aberto a partir da aba A Vencer
  useEffect(() => {
    if (!cicloDestacado || abaPrincipal !== 'EM_CURSO') return;
    const t = setTimeout(() => {
      document.getElementById(`ciclo-${cicloDestacado}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    const limpar = setTimeout(() => setCicloDestacado(null), 4000);
    return () => {
      clearTimeout(t);
      clearTimeout(limpar);
    };
  }, [cicloDestacado, abaPrincipal]);

  // Cálculo automático de dias para vencer no modal
  const calcularDiasModal = () => {
    if (!dataValidade) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVal = new Date(dataValidade + 'T00:00:00');
    const difTempo = dataVal.getTime() - hoje.getTime();
    return Math.ceil(difTempo / (1000 * 60 * 60 * 24));
  };

  const diasModal = calcularDiasModal();

  const fecharModalNovo = () => {
    setModalNovoAberto(false);
    setProdutoSelecionado(null);
    setLote('');
    setDataValidade('');
    setQuantidade(1);
  };

  const handleSalvarNovo = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      mostrarAviso('Selecione um produto.', 'aviso');
      return;
    }
    if (!dataValidade) {
      mostrarAviso('Informe a data de validade.', 'aviso');
      return;
    }

    try {
      setSalvando(true);
      await vencimentosService.salvarControle({
        produto_id: produtoSelecionado.id,
        lote: lote.trim(),
        data_validade: dataValidade,
        quantidade: Number(quantidade || 1),
        usuario_id: obterUsuarioId()
      });

      mostrarAviso('Controle de vencimento registrado com sucesso!', 'sucesso');
      fecharModalNovo();
      carregarDados();
    } catch (err) {
      console.error(err);
      mostrarAviso('Erro ao salvar controle de vencimento.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  // ---------- Derivações ----------

  const cicloPorChave = useMemo(() => {
    const mapa: Record<string, CicloVencimento | undefined> = {};
    ciclos.forEach((c) => {
      mapa[chaveItem(c.origem, c.item_origem_id)] = c;
    });
    return mapa;
  }, [ciclos]);

  // Itens ainda não finalizados (os finalizados vivem na aba Ações Finalizadas)
  const itensAtivos = useMemo(
    () => itens.filter((i) => cicloPorChave[chaveDoItem(i)]?.status !== 'Finalizado'),
    [itens, cicloPorChave]
  );

  const cicloEmCursoPorChave = useMemo(() => {
    const mapa: Record<string, CicloVencimento | undefined> = {};
    ciclos.forEach((c) => {
      if (c.status === 'Em Curso') mapa[chaveItem(c.origem, c.item_origem_id)] = c;
    });
    return mapa;
  }, [ciclos]);

  const filtrosAVencer = filtrosPorAba.A_VENCER;
  const itensAVencerFiltrados = useMemo(
    () =>
      itensAtivos.filter((i) => {
        if (!dentroDoPeriodo(i.data_validade, filtrosAVencer.dataInicio, filtrosAVencer.dataFim)) return false;
        if (!produtoAtendeHierarquia(i.produtos, filtrosAVencer)) return false;
        const temAcao = !!cicloEmCursoPorChave[chaveDoItem(i)];
        if (filtrosAVencer.statusAcao === 'COM_ACAO' && !temAcao) return false;
        if (filtrosAVencer.statusAcao === 'SEM_ACAO' && temAcao) return false;
        return true;
      }),
    [itensAtivos, filtrosAVencer, cicloEmCursoPorChave]
  );

  const itensCriticos = itensAVencerFiltrados.filter((i) => i.diasParaVencer >= 0 && i.diasParaVencer <= 30);
  const itensAlerta = itensAVencerFiltrados.filter((i) => i.diasParaVencer >= 31 && i.diasParaVencer <= 45);
  const itensNormais = itensAVencerFiltrados.filter((i) => i.diasParaVencer >= 46);
  const itensVencidos = itensAVencerFiltrados.filter((i) => i.diasParaVencer < 0);

  const listaAVencer =
    subAbaAVencer === 'CRITICO' ? itensCriticos
    : subAbaAVencer === 'ALERTA' ? itensAlerta
    : subAbaAVencer === 'NORMAL' ? itensNormais
    : itensVencidos;

  const ciclosEmCurso = useMemo(() => ciclos.filter((c) => c.status === 'Em Curso'), [ciclos]);
  const ciclosFinalizados = useMemo(() => ciclos.filter((c) => c.status === 'Finalizado'), [ciclos]);

  const filtrarCiclos = (lista: CicloVencimento[], f: FiltrosVencimentos, dataRef: (c: CicloVencimento) => string) =>
    lista.filter((c) => {
      if (!dentroDoPeriodo(dataRef(c), f.dataInicio, f.dataFim)) return false;
      if (!produtoAtendeHierarquia(c.produtos, f)) return false;
      if (f.tipoAcao !== 'TODOS' && !c.acoes.some((a) => a.tipo === f.tipoAcao)) return false;
      return true;
    });

  const ciclosEmCursoFiltrados = filtrarCiclos(ciclosEmCurso, filtrosPorAba.EM_CURSO, (c) => dataLocalISO(c.iniciado_em))
    .sort((a, b) => a.diasParaVencer - b.diasParaVencer);

  const ciclosFinalizadosFiltrados = filtrarCiclos(ciclosFinalizados, filtrosPorAba.FINALIZADAS, (c) => dataLocalISO(c.finalizado_em))
    .sort((a, b) => new Date(b.finalizado_em || 0).getTime() - new Date(a.finalizado_em || 0).getTime());

  const abaFiltro: AbaComFiltro | null = abaPrincipal === 'RELATORIOS' ? null : abaPrincipal;
  const filtrosAtuais = abaFiltro ? filtrosPorAba[abaFiltro] : FILTROS_PADRAO;

  const opcoesHierarquia = useMemo(() => {
    const produtos: (ProdutoVencimento | undefined)[] =
      abaPrincipal === 'A_VENCER' ? itensAtivos.map((i) => i.produtos)
      : abaPrincipal === 'EM_CURSO' ? ciclosEmCurso.map((c) => c.produtos)
      : ciclosFinalizados.map((c) => c.produtos);
    return montarOpcoesHierarquia(produtos, filtrosAtuais.departamento, filtrosAtuais.secao);
  }, [abaPrincipal, itensAtivos, ciclosEmCurso, ciclosFinalizados, filtrosAtuais.departamento, filtrosAtuais.secao]);

  const itemSelecionadoObj = itemSelecionado ? itensAtivos.find((i) => chaveDoItem(i) === itemSelecionado) || null : null;

  // ---------- Ações ----------

  const trocarAba = (aba: AbaPrincipal) => {
    setAbaPrincipal(aba);
    setItemSelecionado(null);
  };

  const abrirCicloEmCurso = (ciclo: CicloVencimento) => {
    setFiltrosPorAba((prev) => ({ ...prev, EM_CURSO: { ...FILTROS_PADRAO } }));
    setHistoricoAberto((prev) => ({ ...prev, [ciclo.id]: true }));
    setCicloDestacado(ciclo.id);
    trocarAba('EM_CURSO');
  };

  const abrirAcaoParaItem = (tipo: TipoAcaoVencimento, item: VencimentoItem) => {
    setMenuAcoesAberto(false);
    setModalAcao({
      tipo,
      item,
      alvo: {
        codigo: item.codigo_customizado || 'VEN',
        produto: item.produtos,
        lote: item.lote,
        quantidade: item.quantidade,
        data_validade: item.data_validade,
        custo: Number(item.produtos?.custoreal || 0),
        venda: Number(item.produtos?.pvenda || 0),
        acoesAnteriores: []
      }
    });
  };

  const abrirAcaoParaCiclo = (tipo: TipoAcaoVencimento, ciclo: CicloVencimento) => {
    setModalAcao({
      tipo,
      ciclo,
      alvo: {
        codigo: ciclo.codigo_customizado,
        produto: ciclo.produtos,
        lote: ciclo.lote,
        quantidade: ciclo.quantidade,
        data_validade: ciclo.data_validade,
        custo: valorOuReserva(ciclo.produtos?.custoreal, ciclo.custo_unitario),
        venda: valorOuReserva(ciclo.produtos?.pvenda, ciclo.preco_venda),
        acoesAnteriores: ciclo.acoes
      }
    });
  };

  const handleSalvarAcao = async (payload: NovaAcaoPayload, extras: { registrarAvaria: boolean }) => {
    if (!modalAcao) return;
    const { ciclo, item, alvo } = modalAcao;

    try {
      setSalvandoAcao(true);
      const usuarioId = obterUsuarioId();

      if (ciclo) {
        await vencimentosService.registrarAcao(ciclo.id, payload, usuarioId);
        mostrarAviso(`${ROTULO_ACAO[payload.tipo]} registrada no histórico.`, 'sucesso');
      } else if (item) {
        await vencimentosService.registrarPrimeiraAcao(item, payload, usuarioId);
        mostrarAviso(`${ROTULO_ACAO[payload.tipo]} registrada. Acompanhe o item em "Ações em Curso".`, 'sucesso');
      }

      setModalAcao(null);
      setItemSelecionado(null);
      await carregarDados();

      if (extras.registrarAvaria && onDirecionarParaAvaria && alvo.produto) {
        onDirecionarParaAvaria({
          produto: alvo.produto,
          quantidade: payload.quantidade ?? alvo.quantidade
        });
      }
    } catch (err: any) {
      console.error('Erro ao registrar ação de vencimento:', err);
      mostrarAviso('Erro ao registrar ação: ' + (err?.message || 'tente novamente.'), 'erro');
    } finally {
      setSalvandoAcao(false);
    }
  };

  const handleConfirmarFinalizacao = async () => {
    if (!cicloFinalizar) return;
    try {
      setFinalizando(true);
      await vencimentosService.finalizarCiclo(
        cicloFinalizar.id,
        sequenciaAcoes(cicloFinalizar.acoes),
        observacaoFinal,
        obterUsuarioId()
      );
      mostrarAviso('Ciclo finalizado e movido para "Ações Finalizadas".', 'sucesso');
      setCicloFinalizar(null);
      setObservacaoFinal('');
      await carregarDados();
    } catch (err: any) {
      console.error('Erro ao finalizar ciclo:', err);
      mostrarAviso('Erro ao finalizar ciclo: ' + (err?.message || 'tente novamente.'), 'erro');
    } finally {
      setFinalizando(false);
    }
  };

  const handleReabrir = async (ciclo: CicloVencimento) => {
    if (!window.confirm(`Reabrir o ciclo ${ciclo.codigo_customizado}? Ele voltará para "Ações em Curso".`)) return;
    try {
      await vencimentosService.reabrirCiclo(ciclo.id);
      mostrarAviso('Ciclo reaberto.', 'sucesso');
      await carregarDados();
    } catch (err: any) {
      mostrarAviso('Erro ao reabrir ciclo: ' + (err?.message || ''), 'erro');
    }
  };

  const alternarHistorico = (id: string) =>
    setHistoricoAberto((prev) => ({ ...prev, [id]: !prev[id] }));

  const atualizarFiltros = (f: FiltrosVencimentos) => {
    if (!abaFiltro) return;
    setFiltrosPorAba((prev) => ({ ...prev, [abaFiltro]: f }));
    setItemSelecionado(null);
  };

  // ---------- Render ----------

  const botaoAba = (aba: AbaPrincipal, rotulo: string, total?: number) => (
    <button
      type="button"
      onClick={() => trocarAba(aba)}
      className={`py-2.5 px-2 rounded-xl uppercase transition-all whitespace-nowrap ${
        abaPrincipal === aba ? 'bg-[#09797a] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {rotulo}{total !== undefined ? ` (${total})` : ''}
    </button>
  );

  const chipSubAba = (valor: SubAbaAVencer, rotulo: string, total: number, ativo: string, ponto: string) => (
    <button
      type="button"
      onClick={() => {
        setSubAbaAVencer(valor);
        setItemSelecionado(null);
      }}
      className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 shrink-0 ${
        subAbaAVencer === valor ? `${ativo} border shadow-sm` : 'bg-gray-50 text-gray-400'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${ponto}`}></span>
      {rotulo} ({total})
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-24 sm:pb-4 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-3xl bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col gap-4 min-h-[calc(100vh-32px)]">

        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onVoltarParaHome} className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none">←</button>
            <div>
              <h1 className="text-[#09797a] font-black text-xl leading-none uppercase">VENCIMENTOS</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Monitoramento de Validades e Lotes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalNovoAberto(true)}
            className="bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
          >
            + Inserir Controle
          </button>
        </div>

        {/* ABAS PRINCIPAIS */}
        <div className="bg-gray-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 text-[11px] font-black">
          {botaoAba('A_VENCER', 'A Vencer', itensAtivos.length)}
          {botaoAba('EM_CURSO', 'Ações em Curso', ciclosEmCurso.length)}
          {botaoAba('FINALIZADAS', 'Finalizadas', ciclosFinalizados.length)}
          {botaoAba('RELATORIOS', 'Relatórios')}
        </div>

        {ciclosIndisponiveis && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-3.5 py-2.5 text-[11px] font-bold">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            Não foi possível carregar os ciclos de ação. Verifique se a migration de vencimentos (ciclos e ações) foi aplicada no banco.
          </div>
        )}

        {/* FILTROS */}
        {abaFiltro && (
          <PainelFiltros
            filtros={filtrosAtuais}
            onChange={atualizarFiltros}
            opcoes={opcoesHierarquia}
            rotuloPeriodo={abaFiltro === 'A_VENCER' ? 'Vencimento' : abaFiltro === 'EM_CURSO' ? 'Início' : 'Finalização'}
            mostrarStatusAcao={abaFiltro === 'A_VENCER'}
            mostrarTipoAcao={abaFiltro !== 'A_VENCER'}
          />
        )}

        {/* SUB-ABAS A VENCER */}
        {abaPrincipal === 'A_VENCER' && (
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chipSubAba('CRITICO', '≤ 30 Dias', itensCriticos.length, 'bg-red-100 text-red-700 border-red-300', 'bg-red-500')}
            {chipSubAba('ALERTA', '31 a 45 Dias', itensAlerta.length, 'bg-amber-100 text-amber-800 border-amber-300', 'bg-amber-500')}
            {chipSubAba('NORMAL', '≥ 46 Dias', itensNormais.length, 'bg-emerald-100 text-emerald-800 border-emerald-300', 'bg-emerald-500')}
            {chipSubAba('VENCIDOS', 'Vencidos', itensVencidos.length, 'bg-slate-800 text-white border-slate-800', 'bg-slate-400')}
          </div>
        )}

        {/* CONTEÚDO */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-xs font-bold text-gray-400 uppercase">Carregando validades...</div>
          ) : abaPrincipal === 'A_VENCER' ? (
            listaAVencer.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhum produto encontrado nesta categoria de vencimento.
              </div>
            ) : (
              listaAVencer.map((item: VencimentoItem) => {
                const prod = item.produtos;
                const chave = chaveDoItem(item);
                const selecionado = itemSelecionado === chave;
                const cicloAtivo = cicloEmCursoPorChave[chave];

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={chave}
                    onClick={() => setItemSelecionado(selecionado ? null : chave)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setItemSelecionado(selecionado ? null : chave);
                      }
                    }}
                    className={`cursor-pointer text-left p-3.5 bg-gray-50 border rounded-2xl flex flex-col gap-3 transition-all ${
                      selecionado
                        ? 'border-[#09797a] ring-2 ring-[#09797a]/20 bg-teal-50/20'
                        : 'border-gray-200 hover:bg-emerald-50/20'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-3 w-full">
                    <span
                      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selecionado ? 'border-[#09797a]' : 'border-gray-300'
                      }`}
                    >
                      {selecionado && <span className="w-2 h-2 rounded-full bg-[#09797a]" />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded uppercase">
                          {item.codigo_customizado || 'VEN'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-400">
                          Cód: {prod?.codprod || 'N/A'}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          item.origem === 'Inventário' ? 'bg-purple-100 text-purple-700' :
                          item.origem === 'Conf. Cega' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          Origem: {item.origem}
                        </span>
                        {cicloAtivo && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-amber-100 text-amber-800">
                            Em ação: {sequenciaAcoes(cicloAtivo.acoes)}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
                        {prod?.descricao || 'PRODUTO NÃO ENCONTRADO'}
                      </h4>

                      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase mt-1 flex-wrap">
                        <span>LOTE: <strong className="text-gray-800">{item.lote}</strong></span>
                        <span>QTD: <strong className="text-gray-800">{numeroBR(item.quantidade)} {prod?.unidade || 'UN'}</strong></span>
                        <span>VALIDADE: <strong className="text-gray-800">{formatarDataBR(item.data_validade)}</strong></span>
                      </div>

                      <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1 font-bold flex-wrap">
                        <span>👤 {item.usuarioNome || 'SISTEMA'},</span>
                        <span>{item.dataHoraRegistro}</span>
                      </div>
                    </div>

                    <span className={`text-xs font-black text-right shrink-0 ${item.diasParaVencer <= 0 ? 'text-red-600' : corDias(item.diasParaVencer)}`}>
                      {textoDias(item.diasParaVencer)}
                    </span>
                    </div>

                    {/* AÇÃO DO ITEM SELECIONADO (dentro do próprio card) */}
                    {selecionado && (
                      <div
                        className="flex justify-center pt-3 border-t border-[#09797a]/15"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {cicloAtivo ? (
                          <button
                            type="button"
                            onClick={() => abrirCicloEmCurso(cicloAtivo)}
                            className="w-full sm:w-auto sm:min-w-64 bg-[#09797a] hover:bg-[#075f60] text-white text-xs font-black uppercase px-5 py-3 rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Flag className="w-4 h-4" /> Ver em Ações em Curso
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={ciclosIndisponiveis}
                            onClick={() => setMenuAcoesAberto(true)}
                            className="w-full sm:w-auto sm:min-w-64 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-40 text-white text-xs font-black uppercase px-5 py-3 rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Ellipsis className="w-4 h-4" /> Mais Ações
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : abaPrincipal === 'EM_CURSO' ? (
            ciclosEmCursoFiltrados.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhuma ação em curso. Selecione um item em "A Vencer" e use "Mais Ações" para iniciar.
              </div>
            ) : (
              ciclosEmCursoFiltrados.map((c) => (
                <CardCiclo
                  key={c.id}
                  ciclo={c}
                  expandido={!!historicoAberto[c.id]}
                  destacado={cicloDestacado === c.id}
                  onAlternarHistorico={() => alternarHistorico(c.id)}
                  onAcao={(tipo) => abrirAcaoParaCiclo(tipo, c)}
                  onFinalizar={() => {
                    setObservacaoFinal('');
                    setCicloFinalizar(c);
                  }}
                />
              ))
            )
          ) : abaPrincipal === 'FINALIZADAS' ? (
            ciclosFinalizadosFiltrados.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center text-xs font-bold text-gray-400 italic">
                Nenhum ciclo finalizado no filtro selecionado.
              </div>
            ) : (
              ciclosFinalizadosFiltrados.map((c) => (
                <CardCiclo
                  key={c.id}
                  ciclo={c}
                  expandido={!!historicoAberto[c.id]}
                  onAlternarHistorico={() => alternarHistorico(c.id)}
                  onReabrir={() => handleReabrir(c)}
                />
              ))
            )
          ) : (
            <AbaRelatorios
              itensAtivos={itensAtivos}
              ciclos={ciclos}
              cicloPorChave={cicloEmCursoPorChave}
              chave={chaveDoItem}
              onAviso={mostrarAviso}
            />
          )}
        </div>

      </div>

      {/* MENU MAIS AÇÕES */}
      {menuAcoesAberto && itemSelecionadoObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 select-none" onClick={() => setMenuAcoesAberto(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div className="min-w-0">
                <h3 className="text-[#09797a] font-black text-sm uppercase">Mais Ações</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase truncate">{itemSelecionadoObj.produtos?.descricao}</p>
              </div>
              <button type="button" onClick={() => setMenuAcoesAberto(false)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {TIPOS_ACAO.map((tipo) => {
              const Icone = ICONE_ACAO[tipo];
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => abrirAcaoParaItem(tipo, itemSelecionadoObj)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 hover:border-[#09797a] hover:bg-teal-50/40 text-left transition-all active:scale-[0.99]"
                >
                  <span className="w-10 h-10 rounded-xl bg-[#09797a]/10 text-[#09797a] flex items-center justify-center shrink-0">
                    <Icone className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-gray-800 uppercase">{ROTULO_ACAO[tipo]}</span>
                    <span className="block text-[10px] font-bold text-gray-500">{DESCRICAO_ACAO[tipo]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DA AÇÃO (Oferta / Troca / Descarte / Negociação) */}
      {modalAcao && (
        <ModalAcaoVencimento
          tipo={modalAcao.tipo}
          alvo={modalAcao.alvo}
          salvando={salvandoAcao}
          permitirAvaria={!!onDirecionarParaAvaria}
          onCancelar={() => setModalAcao(null)}
          onSalvar={handleSalvarAcao}
        />
      )}

      {/* MODAL FINALIZAR CICLO */}
      {cicloFinalizar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-sm uppercase flex items-center gap-2">
                <Flag className="w-4 h-4" /> Finalizar Ciclo
              </h3>
              <button type="button" onClick={() => setCicloFinalizar(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-50 border border-gray-200 rounded-2xl p-3">
              <div className="text-[9px] font-mono font-black text-[#09797a]">{cicloFinalizar.codigo_customizado}</div>
              <div className="text-xs font-black text-gray-800 uppercase">{cicloFinalizar.produtos?.descricao}</div>
              <div className="text-[10px] font-bold text-gray-500 mt-1">
                Desfecho: <strong className="text-gray-800">{sequenciaAcoes(cicloFinalizar.acoes)}</strong> • {cicloFinalizar.acoes.length} ação(ões)
              </div>
            </div>
            <p className="text-[11px] font-bold text-gray-500">
              O item sai de "A Vencer" e "Ações em Curso" e vai para "Ações Finalizadas" com todo o histórico.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Observação final</label>
              <textarea
                rows={3}
                value={observacaoFinal}
                placeholder="Opcional – ex.: lote zerado na gôndola"
                onChange={(e) => setObservacaoFinal(e.target.value)}
                className="w-full text-xs bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl font-bold text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#09797a]/30"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCicloFinalizar(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={finalizando}
                onClick={handleConfirmarFinalizacao}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {finalizando ? 'Finalizando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSERIR NOVO CONTROLE */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 select-none">
          <form onSubmit={handleSalvarNovo} className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="text-[#09797a] font-black text-base uppercase">INSERIR CONTROLE DE VENCIMENTO</h3>
              <button type="button" onClick={fecharModalNovo} className="text-gray-400 font-bold text-base">✕</button>
            </div>

            <div className="overflow-y-auto flex flex-col gap-3 pr-1 flex-1">
              {/* PRODUTO (bipagem por câmera ou busca) */}
              <SeletorProdutoScanner
                onSelecionarProduto={(p) => setProdutoSelecionado(p)}
                onTermoChange={(termo) => {
                  if (produtoSelecionado && termo !== `${produtoSelecionado.codprod} - ${produtoSelecionado.descricao}`) {
                    setProdutoSelecionado(null);
                  }
                }}
                tituloCard="PRODUTO *"
                placeholder="Bipe o EAN ou busque por descrição/código..."
                selecionarAoEnter
                autoFocus
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Lote</label>
                  <input
                    type="text"
                    placeholder="Ex: LT-2026/01"
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 uppercase"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Quantidade</label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    required
                    value={quantidade}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuantidade(val === '' ? '' : Number(val));
                    }}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={dataValidade}
                    onChange={(e) => setDataValidade(e.target.value)}
                    className="w-full h-10 text-xs bg-gray-50 border border-gray-200 px-3 rounded-xl font-bold text-gray-800"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Dias para Vencer</label>
                  <div className={`w-full h-10 rounded-xl flex items-center justify-center text-xs font-black border ${
                    diasModal === null ? 'bg-gray-100 text-gray-400 border-gray-200' :
                    diasModal < 0 ? 'bg-red-100 text-red-700 border-red-300' :
                    diasModal <= 30 ? 'bg-red-50 text-red-600 border-red-200' :
                    diasModal <= 45 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {diasModal === null ? 'Aguardando Data' : diasModal < 0 ? `Vencido (${Math.abs(diasModal)} d)` : `${diasModal} dias`}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={fecharModalNovo}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando || !produtoSelecionado || !dataValidade}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
