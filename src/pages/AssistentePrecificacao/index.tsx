// src/pages/AssistentePrecificacao/index.tsx
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { precificacaoService } from './services/precificacaoService';
import { decodificarArquivoCsv, interpretarCsvPrecificacao } from './utils/parserCsvPrecificacao';
import { PARAMETROS_PADRAO, analisarItem, margemRealPct } from './utils/motorAnalise';
import type { EntradaAnalise } from './utils/motorAnalise';
import { gerarPdfAjustesPrecos } from './utils/gerarPdfAjustesPrecos';
import type {
  AjusteAplicado,
  AlertaAnalise,
  ItemPrecificacaoRegistro,
  LotePrecificacao,
  ParametrosAnalise,
  ResultadoImportacaoCsv,
  SeveridadeAlerta,
  StatusAnalise
} from './types/precificacao.types';

interface AssistentePrecificacaoProps {
  onVoltarParaHome?: () => void;
  usuarioLogado?: any;
  usuarioLogadoId?: string;
}

type Etapa = 'IMPORTACAO' | 'PERIODO' | 'ANALISE';
type AbaAnalise = 'ITENS' | 'SUGESTOES';

const STATUS_OPCOES: StatusAnalise[] = ['Crítico', 'Atenção', 'OK', 'Sem cadastro', 'Fora do período', 'Pendente'];
const OPCOES_TAMANHO_PAGINA = [20, 30, 50, 100, 200, 300];
const TAMANHO_PAGINA_PADRAO = 20;

const CLASSE_STATUS: Record<StatusAnalise, string> = {
  'Crítico': 'bg-rose-100 text-rose-700 border-rose-200',
  'Atenção': 'bg-amber-100 text-amber-700 border-amber-200',
  'OK': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Sem cadastro': 'bg-slate-200 text-slate-700 border-slate-300',
  'Fora do período': 'bg-slate-100 text-slate-500 border-slate-200',
  'Pendente': 'bg-sky-100 text-sky-700 border-sky-200'
};

const BORDA_STATUS: Record<StatusAnalise, string> = {
  'Crítico': 'border-l-rose-500',
  'Atenção': 'border-l-amber-400',
  'OK': 'border-l-emerald-500',
  'Sem cadastro': 'border-l-slate-400',
  'Fora do período': 'border-l-slate-300',
  'Pendente': 'border-l-sky-400'
};

const CLASSE_ALERTA: Record<SeveridadeAlerta, string> = {
  critico: 'bg-rose-50 text-rose-700 border-rose-200',
  atencao: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-slate-50 text-slate-600 border-slate-200'
};

const ORDEM_SEVERIDADE: Record<SeveridadeAlerta, number> = { critico: 0, atencao: 1, info: 2 };

const soData = (valor: string | null | undefined): string | null => (valor ? valor.slice(0, 10) : null);
const dataBr = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-');
const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percentual = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : `${valor.toFixed(1).replace('.', ',')}%`;

const alertasDoItem = (item: ItemPrecificacaoRegistro): AlertaAnalise[] =>
  [...(item.alertas ?? [])].sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);

const paraEntrada = (r: ItemPrecificacaoRegistro): EntradaAnalise => ({
  codbarra: r.codbarra ?? '',
  dataAlteracao: soData(r.data_alteracao_preco),
  dataUltimaEntrada: soData(r.data_ultima_entrada),
  custoAtual: Number(r.custo_atual),
  custoPenultimo: Number(r.custo_penultimo),
  custoAntepenultimo: Number(r.custo_antepenultimo),
  precoVenda: Number(r.preco_venda),
  margemCadastroPct: r.margem_cadastro_pct === null || r.margem_cadastro_pct === undefined ? null : Number(r.margem_cadastro_pct)
});

/** Indica que o custo atual merece conferência antes de qualquer ajuste de preço. */
const exigeRevisaoCusto = (r: ItemPrecificacaoRegistro): boolean =>
  alertasDoItem(r).some((a) => a.codigo === 'entrada-errada' || a.codigo === 'custo-zerado');

const motivoDoItem = (r: ItemPrecificacaoRegistro): string =>
  alertasDoItem(r)
    .filter((a) => a.severidade !== 'info')
    .map((a) => a.mensagem)
    .join('; ');

/** Lista de números de página com reticências, para não estourar a barra em muitas páginas. */
function listaPaginas(atual: number, total: number): Array<number | '...'> {
  const paginas: Array<number | '...'> = [];
  const inicio = Math.max(1, atual - 2);
  const fim = Math.min(total, atual + 2);
  if (inicio > 1) {
    paginas.push(1);
    if (inicio > 2) paginas.push('...');
  }
  for (let p = inicio; p <= fim; p++) paginas.push(p);
  if (fim < total) {
    if (fim < total - 1) paginas.push('...');
    paginas.push(total);
  }
  return paginas;
}

interface BarraPaginacaoProps {
  total: number;
  pagina: number;
  tamanho: number;
  onPagina: (pagina: number) => void;
  onTamanho: (tamanho: number) => void;
}

function BarraPaginacao({ total, pagina, tamanho, onPagina, onTamanho }: BarraPaginacaoProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Math.min(pagina, totalPaginas);
  const inicio = total === 0 ? 0 : (atual - 1) * tamanho + 1;
  const fim = Math.min(atual * tamanho, total);
  const base = 'min-w-[36px] h-9 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
        <span className="font-bold">Exibir</span>
        <select
          value={tamanho}
          onChange={(e) => onTamanho(Number(e.target.value))}
          className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
        >
          {OPCOES_TAMANHO_PAGINA.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="text-slate-400">por página • {inicio}–{fim} de {total}</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={atual <= 1}
          onClick={() => onPagina(atual - 1)}
          className={`${base} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          ‹ Anterior
        </button>
        {listaPaginas(atual, totalPaginas).map((p, idx) =>
          p === '...' ? (
            <span key={`reticencias-${idx}`} className="px-2 text-slate-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPagina(p)}
              className={`${base} ${p === atual ? 'bg-[#09797a] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={atual >= totalPaginas}
          onClick={() => onPagina(atual + 1)}
          className={`${base} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          Próxima ›
        </button>
      </div>
    </div>
  );
}

function Metrica({ rotulo, valor, classe = 'text-slate-800', destaque = false }: { rotulo: string; valor: string; classe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-2.5 ${destaque ? 'bg-teal-50 border border-teal-100' : 'bg-slate-50'}`}>
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{rotulo}</span>
      <span className={`block mt-0.5 text-sm font-black font-mono ${classe}`}>{valor}</span>
    </div>
  );
}

interface CardItemProps {
  item: ItemPrecificacaoRegistro;
  parametros: ParametrosAnalise;
}

function CardItem({ item, parametros }: CardItemProps) {
  const custo = Number(item.custo_atual);
  const margem = item.margem_real_pct === null || item.margem_real_pct === undefined ? null : Number(item.margem_real_pct);
  const varUltimo = item.variacao_ultimo_pct === null || item.variacao_ultimo_pct === undefined ? null : Number(item.variacao_ultimo_pct);
  const varPenultimo = item.variacao_penultimo_pct === null || item.variacao_penultimo_pct === undefined ? null : Number(item.variacao_penultimo_pct);

  const corVariacao = (v: number | null): string => {
    if (v === null || Math.abs(v) < parametros.limiarAtencaoPct) return 'text-slate-800';
    return Math.abs(v) >= parametros.limiarCriticoPct ? 'text-rose-600' : 'text-amber-600';
  };
  const corMargem =
    margem === null ? 'text-slate-800' : margem < parametros.margemMetaPct - 0.5 ? 'text-rose-600' : 'text-emerald-700';
  const alertas = alertasDoItem(item);

  return (
    <article className={`bg-white rounded-3xl border border-slate-200 border-l-4 ${BORDA_STATUS[item.status]} shadow-sm hover:shadow-md transition-all p-4 flex flex-col gap-3`}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{item.codprod}</span>
            <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${CLASSE_STATUS[item.status]}`}>{item.status}</span>
          </div>
          <h3 className="mt-2 text-sm font-black text-slate-800 leading-snug break-words">{item.descricao}</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            EAN {item.codbarra || '—'} • {item.unidade || 'UN'}
            {item.embalagem ? ` • ${item.embalagem}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Preço sugerido</span>
          <span className="text-lg font-black text-[#09797a] font-mono">{moeda(item.preco_sugerido)}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metrica rotulo="Custo atual" valor={moeda(custo)} destaque />
        <Metrica rotulo="Penúltimo" valor={moeda(Number(item.custo_penultimo))} />
        <Metrica rotulo="Antepenúltimo" valor={moeda(Number(item.custo_antepenultimo))} />
        <Metrica rotulo="Var. último" valor={percentual(varUltimo)} classe={corVariacao(varUltimo)} />
        <Metrica rotulo="Preço de venda" valor={moeda(Number(item.preco_venda))} />
        <Metrica rotulo="Margem real" valor={percentual(margem)} classe={corMargem} />
        <Metrica rotulo="Meta" valor={percentual(parametros.margemMetaPct)} />
        <Metrica rotulo="Var. penúltimo" valor={percentual(varPenultimo)} classe={corVariacao(varPenultimo)} />
      </div>

      <footer className="flex flex-col gap-2">
        <p className="text-[11px] text-slate-500">
          Fornecedor: <strong className="text-slate-700">{item.nome_fornecedor || '-'}</strong>
          {item.cod_fornecedor ? ` (${item.cod_fornecedor})` : ''} • Última entrada: {dataBr(item.data_ultima_entrada)}
          {item.numero_nota ? ` • NF ${item.numero_nota}` : ''}
        </p>
        {alertas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {alertas.map((a, idx) => (
              <span key={`${a.codigo}-${idx}`} className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border ${CLASSE_ALERTA[a.severidade]}`}>
                {a.mensagem}
              </span>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
}

interface CardSugestaoProps {
  item: ItemPrecificacaoRegistro;
  selecionado: boolean;
  aplicado: boolean;
  revisar: boolean;
  precoNovoTexto: string;
  margemNova: number | null;
  onToggle: (valor: boolean) => void;
  onPrecoChange: (texto: string) => void;
}

function CardSugestao({ item, selecionado, aplicado, revisar, precoNovoTexto, margemNova, onToggle, onPrecoChange }: CardSugestaoProps) {
  const custo = Number(item.custo_atual);
  const motivo = motivoDoItem(item);

  return (
    <article
      className={`rounded-3xl border border-slate-200 border-l-4 shadow-sm p-4 flex flex-col gap-3 transition-all ${
        aplicado ? 'bg-emerald-50/60 border-l-emerald-500' : revisar ? 'bg-white border-l-rose-500' : 'bg-white border-l-[#09797a]'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selecionado}
          disabled={aplicado}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 w-5 h-5 accent-[#09797a] shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{item.codprod}</span>
            {revisar && (
              <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-200 rounded-full px-2 py-0.5">REVISAR CUSTO</span>
            )}
            {aplicado && (
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">APLICADO</span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-black text-slate-800 leading-snug break-words">{item.descricao}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metrica rotulo="Custo" valor={moeda(custo)} />
        <Metrica rotulo="Preço atual" valor={moeda(Number(item.preco_venda))} />
        <Metrica rotulo="Margem atual" valor={percentual(item.margem_real_pct === null ? null : Number(item.margem_real_pct))} />
        <Metrica rotulo="Margem nova" valor={percentual(margemNova)} classe="text-emerald-700" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Preço novo (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            disabled={aplicado}
            value={precoNovoTexto}
            onChange={(e) => onPrecoChange(e.target.value)}
            className="w-full sm:w-40 p-3 rounded-2xl border border-slate-200 text-right font-mono font-black text-[#09797a] disabled:bg-slate-100"
          />
        </label>
        {motivo && <p className="flex-1 text-[11px] text-slate-500">{motivo}</p>}
      </div>
    </article>
  );
}

export default function AssistentePrecificacao({ onVoltarParaHome, usuarioLogado, usuarioLogadoId }: AssistentePrecificacaoProps) {
  const idUsuario = usuarioLogadoId || usuarioLogado?.id || '';

  const [etapa, setEtapa] = useState<Etapa>('IMPORTACAO');
  const [abaAtiva, setAbaAtiva] = useState<AbaAnalise>('ITENS');

  const [arquivoNome, setArquivoNome] = useState('');
  const [importacao, setImportacao] = useState<ResultadoImportacaoCsv | null>(null);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [importando, setImportando] = useState(false);

  const [lote, setLote] = useState<LotePrecificacao | null>(null);
  const [itens, setItens] = useState<ItemPrecificacaoRegistro[]>([]);
  const [parametros, setParametros] = useState<ParametrosAnalise>(PARAMETROS_PADRAO);
  const [analisando, setAnalisando] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  const [tamanhoPagina, setTamanhoPagina] = useState<number>(TAMANHO_PAGINA_PADRAO);
  const [paginaItens, setPaginaItens] = useState(1);
  const [paginaSugestoes, setPaginaSugestoes] = useState(1);

  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [precosNovos, setPrecosNovos] = useState<Record<string, string>>({});
  const [aplicadosIds, setAplicadosIds] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const contagemStatus = useMemo(() => {
    const contagem: Record<string, number> = {};
    itens.forEach((i) => {
      contagem[i.status] = (contagem[i.status] ?? 0) + 1;
    });
    return contagem;
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtroStatus !== 'TODOS' && i.status !== filtroStatus) return false;
      if (!termo) return true;
      return (
        i.codprod.toLowerCase().includes(termo) ||
        i.descricao.toLowerCase().includes(termo) ||
        (i.codbarra ?? '').includes(termo)
      );
    });
  }, [itens, busca, filtroStatus]);

  const sugestoes = useMemo(
    () => itens.filter((i) => i.precisa_ajuste && Number(i.preco_sugerido ?? 0) > 0),
    [itens]
  );

  // Paginação: a página atual é limitada ao total disponível (evita página vazia após filtrar)
  const totalPaginasItens = Math.max(1, Math.ceil(itensFiltrados.length / tamanhoPagina));
  const paginaItensAtual = Math.min(paginaItens, totalPaginasItens);
  const itensPagina = useMemo(
    () => itensFiltrados.slice((paginaItensAtual - 1) * tamanhoPagina, paginaItensAtual * tamanhoPagina),
    [itensFiltrados, paginaItensAtual, tamanhoPagina]
  );

  const totalPaginasSugestoes = Math.max(1, Math.ceil(sugestoes.length / tamanhoPagina));
  const paginaSugestoesAtual = Math.min(paginaSugestoes, totalPaginasSugestoes);
  const sugestoesPagina = useMemo(
    () => sugestoes.slice((paginaSugestoesAtual - 1) * tamanhoPagina, paginaSugestoesAtual * tamanhoPagina),
    [sugestoes, paginaSugestoesAtual, tamanhoPagina]
  );

  const analiseRodada = lote !== null && itens.some((i) => i.analisado);

  const precoNovoDe = (i: ItemPrecificacaoRegistro): number => {
    const texto = precosNovos[i.id];
    if (texto !== undefined && texto.trim() !== '') return Number(texto.replace(',', '.'));
    return Number(i.preco_sugerido ?? 0);
  };

  const montarAjustes = (lista: ItemPrecificacaoRegistro[]): AjusteAplicado[] =>
    lista
      .filter((i) => i.produto_id)
      .map((i) => {
        const custo = Number(i.custo_atual);
        const anterior = Number(i.preco_venda);
        const novo = precoNovoDe(i);
        return {
          lote_id: i.lote_id,
          item_id: i.id,
          produto_id: i.produto_id as string,
          codprod: i.codprod,
          descricao: i.descricao,
          preco_anterior: anterior,
          preco_novo: novo,
          custo_considerado: custo,
          margem_anterior_pct: margemRealPct(custo, anterior),
          margem_nova_pct: margemRealPct(custo, novo),
          motivo: motivoDoItem(i),
          usuario_id: idUsuario
        };
      });

  // ----- Etapa 1: leitura do arquivo -----
  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    try {
      const buffer = await arquivo.arrayBuffer();
      const resultado = interpretarCsvPrecificacao(decodificarArquivoCsv(buffer));
      if (resultado.itens.length === 0) {
        setErro(resultado.erros[0] ?? 'Nenhum item válido foi encontrado no arquivo.');
        return;
      }
      setArquivoNome(arquivo.name);
      setImportacao(resultado);
      setPeriodoInicio(resultado.dataMinima ?? '');
      setPeriodoFim(resultado.dataMaxima ?? '');
      setErro(null);
      setMensagem(null);
      setEtapa('PERIODO');
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ler o arquivo. Verifique se é o CSV exportado do ERP.');
    }
  };

  // ----- Etapa 2: período + importação no banco -----
  const confirmarImportacao = async () => {
    if (!importacao) return;
    if (!idUsuario) {
      setErro('Usuário não identificado. Faça login novamente.');
      return;
    }
    if (!periodoInicio || !periodoFim || periodoInicio > periodoFim) {
      setErro('Informe um período válido: a data inicial deve ser menor ou igual à final.');
      return;
    }

    try {
      setImportando(true);
      setErro(null);
      const periodo = { inicio: periodoInicio, fim: periodoFim };

      const produtos = await precificacaoService.buscarProdutosPorCodigo(importacao.itens.map((i) => i.codprod));
      const novoLote = await precificacaoService.criarLote({
        usuario_id: idUsuario,
        arquivo_nome: arquivoNome,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        total_itens: importacao.itens.length,
        parametros
      });
      await precificacaoService.inserirItens(novoLote.id, importacao.itens, produtos, periodo);
      const registros = await precificacaoService.listarItens(novoLote.id);

      setLote(novoLote);
      setItens(registros);
      setSelecionados({});
      setPrecosNovos({});
      setAplicadosIds(new Set());
      setPaginaItens(1);
      setPaginaSugestoes(1);
      setAbaAtiva('ITENS');
      setMensagem(`${importacao.itens.length} itens importados. Confira a lista e clique em "Rodar análise".`);
      setEtapa('ANALISE');
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar a importação. Tente novamente.');
    } finally {
      setImportando(false);
    }
  };

  const novaImportacao = () => {
    setEtapa('IMPORTACAO');
    setImportacao(null);
    setLote(null);
    setItens([]);
    setArquivoNome('');
    setErro(null);
    setMensagem(null);
    setSelecionados({});
    setPrecosNovos({});
    setAplicadosIds(new Set());
    setPaginaItens(1);
    setPaginaSugestoes(1);
  };

  // ----- Etapa 3: análise -----
  const rodarAnalise = async () => {
    if (!lote || itens.length === 0) return;

    try {
      setAnalisando(true);
      setErro(null);
      const periodo = { inicio: lote.periodo_inicio, fim: lote.periodo_fim };
      const produtos = await precificacaoService.buscarProdutosPorCodigo(itens.map((i) => i.codprod));

      const atualizacoes = itens.map((reg) => {
        const produto = produtos.get(reg.codprod) ?? null;
        const r = analisarItem(paraEntrada(reg), produto, parametros, periodo);
        return {
          id: reg.id,
          produto_id: produto ? produto.id : reg.produto_id,
          analisado: true,
          status: r.status,
          alertas: r.alertas,
          variacao_ultimo_pct: r.variacaoUltimoPct,
          variacao_penultimo_pct: r.variacaoPenultimoPct,
          margem_real_pct: r.margemRealPct,
          margem_meta_pct: parametros.margemMetaPct,
          preco_sugerido: r.precoSugerido,
          precisa_ajuste: r.precisaAjuste,
          dentro_periodo: r.status !== 'Fora do período'
        };
      });

      await precificacaoService.salvarResultadosAnalise(atualizacoes);

      const porId = new Map(atualizacoes.map((a) => [a.id, a] as const));
      const novos = itens.map((i) => {
        const atual = porId.get(i.id);
        return atual ? ({ ...i, ...atual } as ItemPrecificacaoRegistro) : i;
      });

      const qtdAjustes = novos.filter((i) => i.precisa_ajuste && Number(i.preco_sugerido ?? 0) > 0).length;
      await precificacaoService.atualizarLote(lote.id, {
        total_ajustes_sugeridos: qtdAjustes,
        parametros,
        status: 'Analisado'
      });

      const selecaoInicial: Record<string, boolean> = {};
      novos.forEach((i) => {
        if (i.precisa_ajuste && Number(i.preco_sugerido ?? 0) > 0 && !exigeRevisaoCusto(i)) {
          selecaoInicial[i.id] = true;
        }
      });

      setItens(novos);
      setLote({ ...lote, total_ajustes_sugeridos: qtdAjustes, parametros, status: 'Analisado' });
      setSelecionados(selecaoInicial);
      setPrecosNovos({});
      setAplicadosIds(new Set());
      setPaginaItens(1);
      setPaginaSugestoes(1);
      setMensagem(`Análise concluída: ${qtdAjustes} item(ns) com sugestão de ajuste.`);
    } catch (err) {
      console.error(err);
      setErro('Erro ao rodar a análise. Tente novamente.');
    } finally {
      setAnalisando(false);
    }
  };

  // ----- Etapa 4: sugestões, aplicação e PDF -----
  const alternarSelecao = (id: string, valor: boolean) => {
    setSelecionados((prev) => ({ ...prev, [id]: valor }));
  };

  const alternarTodos = (valor: boolean) => {
    const proximo: Record<string, boolean> = {};
    sugestoes.forEach((i) => {
      if (!aplicadosIds.has(i.id)) proximo[i.id] = valor;
    });
    setSelecionados(proximo);
  };

  const gerarPdfSelecionados = () => {
    if (!lote) return;
    const lista = sugestoes.filter((i) => selecionados[i.id] && !aplicadosIds.has(i.id));
    if (lista.length === 0) {
      setErro('Selecione ao menos um item para gerar o PDF.');
      return;
    }
    setErro(null);
    gerarPdfAjustesPrecos(montarAjustes(lista), {
      codigoLote: lote.codigo_customizado,
      periodoInicio: lote.periodo_inicio,
      periodoFim: lote.periodo_fim,
      margemMetaPct: parametros.margemMetaPct
    });
  };

  const aplicarSelecionados = async () => {
    if (!lote) return;
    const escolhidos = sugestoes.filter((i) => selecionados[i.id] && !aplicadosIds.has(i.id));
    if (escolhidos.length === 0) {
      setErro('Selecione ao menos um item para aplicar.');
      return;
    }
    if (escolhidos.some((i) => !(precoNovoDe(i) > 0))) {
      setErro('Há preço(s) novo(s) inválido(s). Ajuste os valores antes de aplicar.');
      return;
    }
    if (!window.confirm(`Aplicar ${escolhidos.length} ajuste(s) de preço no cadastro de produtos?`)) return;

    try {
      setAplicando(true);
      setErro(null);

      const ajustes = montarAjustes(escolhidos);
      await precificacaoService.aplicarAjustes(ajustes);

      const novoPorId = new Map(escolhidos.map((i) => [i.id, precoNovoDe(i)] as const));
      await precificacaoService.salvarResultadosAnalise(
        escolhidos.map((i) => {
          const novo = novoPorId.get(i.id) ?? 0;
          return {
            id: i.id,
            preco_venda: novo,
            margem_real_pct: margemRealPct(Number(i.custo_atual), novo),
            precisa_ajuste: false
          };
        })
      );
      await precificacaoService.atualizarLote(lote.id, { status: 'Ajustes aplicados' });

      setItens((prev) =>
        prev.map((i) => {
          if (!novoPorId.has(i.id)) return i;
          const novo = novoPorId.get(i.id) ?? 0;
          return {
            ...i,
            preco_venda: novo,
            margem_real_pct: margemRealPct(Number(i.custo_atual), novo),
            precisa_ajuste: false
          };
        })
      );
      setAplicadosIds((prev) => new Set([...prev, ...escolhidos.map((i) => i.id)]));
      setSelecionados({});
      setLote({ ...lote, status: 'Ajustes aplicados' });

      gerarPdfAjustesPrecos(ajustes, {
        codigoLote: lote.codigo_customizado,
        periodoInicio: lote.periodo_inicio,
        periodoFim: lote.periodo_fim,
        margemMetaPct: parametros.margemMetaPct
      });
      setMensagem(`${escolhidos.length} ajuste(s) aplicado(s) no cadastro. PDF gerado.`);
    } catch (err) {
      console.error(err);
      setErro('Erro ao aplicar os ajustes. Nenhum dado foi alterado além do que já aparece como aplicado.');
    } finally {
      setAplicando(false);
    }
  };

  const atualizarParametro = (campo: keyof ParametrosAnalise, valor: string) => {
    const numero = Number(valor.replace(',', '.'));
    setParametros((prev) => ({ ...prev, [campo]: Number.isFinite(numero) ? numero : 0 }));
  };

  const alterarBusca = (valor: string) => {
    setBusca(valor);
    setPaginaItens(1);
  };

  const alterarFiltroStatus = (valor: string) => {
    setFiltroStatus(valor);
    setPaginaItens(1);
  };

  const alterarTamanhoPagina = (valor: number) => {
    setTamanhoPagina(valor);
    setPaginaItens(1);
    setPaginaSugestoes(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto font-sans select-none">
      <div className="max-w-6xl mx-auto p-3 sm:p-6 flex flex-col gap-4 pb-16">

        {/* CABEÇALHO */}
        <header className="bg-white rounded-3xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onVoltarParaHome && (
              <button
                type="button"
                onClick={onVoltarParaHome}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 active:scale-95 transition-all"
                title="Voltar para a Home"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-[#09797a] font-black text-base uppercase">Assistente de Precificação</h1>
              <p className="text-[11px] text-slate-500 font-medium">Análise de custos, margens e sugestões de preço</p>
            </div>
          </div>
          {lote && (
            <span className="text-[11px] font-bold text-slate-600 bg-teal-50 border border-teal-200 rounded-2xl px-3 py-2">
              Lote {lote.codigo_customizado} • Período {dataBr(lote.periodo_inicio)} a {dataBr(lote.periodo_fim)}
            </span>
          )}
        </header>

        {erro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3">{erro}</div>
        )}
        {mensagem && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl p-3">
            {mensagem}
          </div>
        )}

        {/* ETAPA 1: IMPORTAÇÃO */}
        {etapa === 'IMPORTACAO' && (
          <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">1. Importar arquivo de precificação</h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecione o CSV exportado do ERP (modelo PRECIFICACOES). Aceita codificação UTF-8 ou Windows-1252.
              </p>
            </div>
            <label className="border-2 border-dashed border-[#09797a]/40 hover:border-[#09797a] bg-teal-50/40 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
              <span className="text-3xl mb-2">📁</span>
              <span className="text-xs font-bold text-slate-700">
                Clique para selecionar o <span className="text-[#09797a] font-black">.CSV</span>
              </span>
              <input type="file" accept=".csv,.txt" onChange={lerArquivo} className="hidden" />
            </label>
          </section>
        )}

        {/* ETAPA 2: PERÍODO */}
        {etapa === 'PERIODO' && importacao && (
          <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">2. Período da análise</h2>
              <p className="text-xs text-slate-500 mt-1">
                Arquivo <strong>{arquivoNome}</strong>: {importacao.itens.length} item(ns) lido(s)
                {importacao.erros.length > 0 && `, ${importacao.erros.length} linha(s) com erro`}.
              </p>
            </div>

            {importacao.erros.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-800 max-h-28 overflow-y-auto">
                {importacao.erros.slice(0, 20).map((e, idx) => (
                  <p key={idx}>{e}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Data inicial</span>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Data final</span>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={novaImportacao}
                className="px-5 py-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importando}
                onClick={confirmarImportacao}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
              >
                {importando ? 'Importando...' : 'Confirmar período e importar'}
              </button>
            </div>
          </section>
        )}

        {/* ETAPA 3: LISTAGEM E ANÁLISE */}
        {etapa === 'ANALISE' && lote && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('ITENS')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${
                  abaAtiva === 'ITENS' ? 'bg-[#09797a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Itens e análise ({itens.length})
              </button>
              <button
                type="button"
                onClick={() => setAbaAtiva('SUGESTOES')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${
                  abaAtiva === 'SUGESTOES' ? 'bg-[#09797a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Sugestões de ajuste ({sugestoes.length})
              </button>
              <button
                type="button"
                onClick={novaImportacao}
                className="ml-auto px-4 py-2.5 rounded-2xl text-xs font-bold bg-white text-slate-600 border border-slate-200 active:scale-95 transition-all"
              >
                Nova importação
              </button>
            </div>

            {abaAtiva === 'ITENS' && (
              <section className="flex flex-col gap-4">
                {/* PARÂMETROS */}
                <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Margem meta (%)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={String(parametros.margemMetaPct).replace('.', ',')}
                        onChange={(e) => atualizarParametro('margemMetaPct', e.target.value)}
                        className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Alerta de variação (%)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={String(parametros.limiarAtencaoPct).replace('.', ',')}
                        onChange={(e) => atualizarParametro('limiarAtencaoPct', e.target.value)}
                        className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Entrada errada a partir de (%)</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={String(parametros.limiarCriticoPct).replace('.', ',')}
                        onChange={(e) => atualizarParametro('limiarCriticoPct', e.target.value)}
                        className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={analisando}
                      onClick={rodarAnalise}
                      className="p-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                    >
                      {analisando ? 'Analisando...' : analiseRodada ? 'Rodar análise novamente' : 'Rodar análise'}
                    </button>
                  </div>

                  {analiseRodada && (
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPCOES.filter((s) => contagemStatus[s]).map((s) => (
                        <span key={s} className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${CLASSE_STATUS[s]}`}>
                          {s}: {contagemStatus[s]}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => alterarBusca(e.target.value)}
                      placeholder="Buscar por código, descrição ou EAN"
                      className="sm:col-span-2 p-3 rounded-2xl border border-slate-200 text-sm"
                    />
                    <select
                      value={filtroStatus}
                      onChange={(e) => alterarFiltroStatus(e.target.value)}
                      className="p-3 rounded-2xl border border-slate-200 text-sm font-bold"
                    >
                      <option value="TODOS">Todos os status</option>
                      {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <BarraPaginacao
                  total={itensFiltrados.length}
                  pagina={paginaItensAtual}
                  tamanho={tamanhoPagina}
                  onPagina={setPaginaItens}
                  onTamanho={alterarTamanhoPagina}
                />

                {itensPagina.length === 0 && (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
                    Nenhum item encontrado.
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {itensPagina.map((i) => (
                    <CardItem key={i.id} item={i} parametros={parametros} />
                  ))}
                </div>

                <BarraPaginacao
                  total={itensFiltrados.length}
                  pagina={paginaItensAtual}
                  tamanho={tamanhoPagina}
                  onPagina={setPaginaItens}
                  onTamanho={alterarTamanhoPagina}
                />

                <p className="text-[10px] text-slate-400">
                  Margem real = (preço de venda − custo) ÷ preço de venda. Preço sugerido = custo ÷ (1 − margem meta), truncado em centavos.
                  Alterar os parâmetros exige rodar a análise novamente.
                </p>
              </section>
            )}

            {abaAtiva === 'SUGESTOES' && (
              <section className="flex flex-col gap-4">
                {!analiseRodada && (
                  <div className="bg-white rounded-3xl shadow-sm p-5 text-xs font-bold text-slate-500">
                    Rode a análise na aba anterior para gerar as sugestões.
                  </div>
                )}
                {analiseRodada && sugestoes.length === 0 && (
                  <div className="bg-white rounded-3xl shadow-sm p-5 text-xs font-bold text-emerald-700">
                    Nenhum item precisa de ajuste de preço com os parâmetros atuais.
                  </div>
                )}

                {analiseRodada && sugestoes.length > 0 && (
                  <>
                    <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3">
                      <p className="text-xs text-slate-500">
                        Itens com venda abaixo do custo ou margem abaixo da meta. Itens marcados como
                        <strong> revisar custo</strong> têm variação suspeita e vêm desmarcados: confira a entrada antes de aplicar.
                        O preço novo pode ser editado em cada card.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => alternarTodos(true)}
                          className="px-3 py-2 rounded-2xl text-[11px] font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all"
                        >
                          Selecionar todos ({sugestoes.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarTodos(false)}
                          className="px-3 py-2 rounded-2xl text-[11px] font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all"
                        >
                          Limpar seleção
                        </button>
                      </div>
                    </div>

                    <BarraPaginacao
                      total={sugestoes.length}
                      pagina={paginaSugestoesAtual}
                      tamanho={tamanhoPagina}
                      onPagina={setPaginaSugestoes}
                      onTamanho={alterarTamanhoPagina}
                    />

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {sugestoesPagina.map((i) => {
                        const novo = precoNovoDe(i);
                        return (
                          <CardSugestao
                            key={i.id}
                            item={i}
                            selecionado={!!selecionados[i.id]}
                            aplicado={aplicadosIds.has(i.id)}
                            revisar={exigeRevisaoCusto(i)}
                            precoNovoTexto={precosNovos[i.id] ?? Number(i.preco_sugerido ?? 0).toFixed(2).replace('.', ',')}
                            margemNova={margemRealPct(Number(i.custo_atual), novo)}
                            onToggle={(valor) => alternarSelecao(i.id, valor)}
                            onPrecoChange={(texto) => setPrecosNovos((prev) => ({ ...prev, [i.id]: texto }))}
                          />
                        );
                      })}
                    </div>

                    <BarraPaginacao
                      total={sugestoes.length}
                      pagina={paginaSugestoesAtual}
                      tamanho={tamanhoPagina}
                      onPagina={setPaginaSugestoes}
                      onTamanho={alterarTamanhoPagina}
                    />

                    <div className="bg-white rounded-3xl shadow-sm p-4 flex flex-wrap justify-end gap-2 sticky bottom-3">
                      <button
                        type="button"
                        onClick={gerarPdfSelecionados}
                        className="px-5 py-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-700 active:scale-95 transition-all"
                      >
                        Gerar PDF dos selecionados
                      </button>
                      <button
                        type="button"
                        disabled={aplicando}
                        onClick={aplicarSelecionados}
                        className="px-6 py-3 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
                      >
                        {aplicando ? 'Aplicando...' : 'Aplicar selecionados e gerar PDF'}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
