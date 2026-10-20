// Arquivo: src/pages/Produtos/index.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { produtosService } from './services/produtosService';
import { ImportarProdutosModal } from './components/ImportarProdutosModal';
import { SeletorProdutoScanner } from '../../components/SeletorProdutoScanner';
import type { ProdutoBusca } from '../../components/SeletorProdutoScanner';
import type { ProdutoDTO, ClassificacaoProduto } from './types/produtos.types';

interface ProdutosProps {
  onVoltarParaHome: () => void;
}

const classeSelectFiltro =
  'w-full h-11 text-xs bg-gray-50 border border-gray-200 px-3 rounded-2xl focus:outline-none focus:border-[#09797a] font-bold text-gray-700 uppercase';

// Margem sobre o preço de venda: (PV - Custo) / PV
// Ex.: custo 6,00 com margem de 25% => PV = 6,00 / 0,75 = 8,00 => (8,00 - 6,00) / 8,00 = 25%
function calcularMargem(custo: number | null | undefined, venda: number | null | undefined): number | null {
  const precoVenda = Number(venda) || 0;
  if (precoVenda <= 0) return null;
  const precoCusto = Number(custo) || 0;
  return ((precoVenda - precoCusto) / precoVenda) * 100;
}

function formatarMoeda(valor: number | null | undefined): string {
  return `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function valoresUnicos(lista: (string | null | undefined)[]): string[] {
  const filtrados = lista.filter((v): v is string => !!v);
  return Array.from(new Set(filtrados)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export default function Produtos({ onVoltarParaHome }: ProdutosProps) {
  const [produtos, setProdutos] = useState<ProdutoDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [termoDebounced, setTermoDebounced] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [secao, setSecao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [classificacoes, setClassificacoes] = useState<ClassificacaoProduto[]>([]);
  const [versaoBusca, setVersaoBusca] = useState(0); // Usado para reiniciar o seletor de busca ao limpar filtros
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const requisicaoAtual = useRef(0);

  // Aguarda a digitação/bipagem estabilizar antes de consultar o banco
  useEffect(() => {
    const timer = setTimeout(() => setTermoDebounced(termoBusca.trim()), 300);
    return () => clearTimeout(timer);
  }, [termoBusca]);

  const carregarProdutos = useCallback(async () => {
    const requisicao = ++requisicaoAtual.current;
    try {
      setLoading(true);
      const response = await produtosService.listarProdutos(0, 100, {
        termo: termoDebounced,
        departamento,
        secao,
        categoria
      });
      if (requisicao !== requisicaoAtual.current) return; // Descarta respostas antigas
      setProdutos(response.data);
      setTotal(response.count);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar listagem de produtos.');
    } finally {
      if (requisicao === requisicaoAtual.current) setLoading(false);
    }
  }, [termoDebounced, departamento, secao, categoria]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  useEffect(() => {
    produtosService
      .listarClassificacoes()
      .then(setClassificacoes)
      .catch((err) => console.error('Erro ao carregar departamentos/seções/categorias:', err));
  }, []);

  // Opções dos filtros em cascata: Departamento > Seção > Categoria
  const departamentos = useMemo(
    () => valoresUnicos(classificacoes.map((c) => c.departamento)),
    [classificacoes]
  );

  const secoes = useMemo(
    () => valoresUnicos(
      classificacoes
        .filter((c) => !departamento || c.departamento === departamento)
        .map((c) => c.secao)
    ),
    [classificacoes, departamento]
  );

  const categorias = useMemo(
    () => valoresUnicos(
      classificacoes
        .filter((c) => (!departamento || c.departamento === departamento) && (!secao || c.secao === secao))
        .map((c) => c.categoria)
    ),
    [classificacoes, departamento, secao]
  );

  const alterarDepartamento = (valor: string) => {
    setDepartamento(valor);
    setSecao('');
    setCategoria('');
  };

  const alterarSecao = (valor: string) => {
    setSecao(valor);
    setCategoria('');
  };

  // Ao bipar/escolher um produto no seletor, a listagem mostra esse produto
  const handleSelecionarProduto = (produto: ProdutoBusca) => {
    setTermoBusca(produto.codbarra || produto.codprod);
  };

  const filtrosAtivos = Boolean(termoBusca || departamento || secao || categoria);

  const limparFiltros = () => {
    setTermoBusca('');
    setDepartamento('');
    setSecao('');
    setCategoria('');
    setVersaoBusca((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-4xl shadow-xl px-4 sm:px-5 py-5 sm:py-6 flex flex-col gap-4 min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)]">

        {/* HEADER DA PÁGINA */}
        <div className="flex flex-wrap justify-between items-center gap-3 w-full border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="p-2 hover:bg-gray-50 rounded-full text-[#09797a] font-bold text-xl leading-none shrink-0"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="text-[#09797a] font-black text-lg sm:text-xl leading-none uppercase">Cadastro de Produtos</h1>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-wide">Gestão do Catálogo de Mercadorias e Preços</p>
            </div>
          </div>

          {/* BOTÃO DE IMPORTAÇÃO */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setModalImportarAberto(true)}
              className="w-full sm:w-auto justify-center bg-[#09797a] hover:bg-[#075f60] text-white px-4 py-3 sm:py-2.5 rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              📥 Importar em Massa
            </button>
          </div>
        </div>

        {/* PESQUISA: DESCRIÇÃO (COMPLETA/PARCIAL), CODPROD, EAN OU BIPAGEM PELA CÂMERA */}
        <div className="w-full">
          <SeletorProdutoScanner
            key={versaoBusca}
            tituloCard="PESQUISA / BIPAGEM"
            placeholder="Descrição, código do sistema ou código de barras..."
            onSelecionarProduto={handleSelecionarProduto}
            onTermoChange={setTermoBusca}
          />
        </div>

        {/* FILTROS: DEPARTAMENTO, SEÇÃO E CATEGORIA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={departamento}
            onChange={(e) => alterarDepartamento(e.target.value)}
            className={classeSelectFiltro}
          >
            <option value="">Todos os departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={secao}
            onChange={(e) => alterarSecao(e.target.value)}
            className={classeSelectFiltro}
          >
            <option value="">Todas as seções</option>
            {secoes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className={classeSelectFiltro}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* RESUMO DA LISTAGEM E LIMPEZA DE FILTROS */}
        <div className="flex justify-between items-center text-[11px] font-bold text-gray-400">
          <span>
            {loading ? 'Atualizando listagem...' : `Exibindo ${produtos.length} de ${total} produto(s)`}
          </span>
          {filtrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-[#09797a] font-black uppercase hover:underline py-1"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* LISTAGEM EM CARDS (CELULAR, TABLET E DESKTOP) */}
        <div className="flex-1">
          {loading ? (
            <p className="text-center py-10 text-gray-400 font-bold uppercase tracking-wider text-xs">
              Carregando Catálogo de Produtos...
            </p>
          ) : produtos.length === 0 ? (
            <p className="text-center py-10 text-gray-400 font-bold uppercase tracking-wider text-xs">
              Nenhum produto cadastrado ou encontrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtos.map((p) => {
                const margem = calcularMargem(p.custoreal, p.pvenda);
                const classeMargem =
                  margem === null
                    ? 'bg-gray-100 text-gray-400'
                    : margem < 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-emerald-50 text-[#09797a]';

                const classificacao = [p.departamento || 'GERAL', p.secao, p.categoria]
                  .filter(Boolean)
                  .join(' › ');

                return (
                  <article
                    key={p.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3"
                  >
                    {/* Cabeçalho do card: código, descrição e unidade */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-block text-[10px] font-mono font-black text-[#09797a] bg-teal-50 px-2 py-0.5 rounded-lg">
                          COD {p.codprod}
                        </span>
                        <h3 className="mt-1.5 text-sm font-black text-gray-800 uppercase leading-snug break-words">
                          {p.descricao}
                        </h3>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5 break-all">
                          EAN: {p.codbarra || p.codigo_barras || 'SEM EAN'}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">
                        {p.unidade || 'UN'}
                      </span>
                    </div>

                    {/* Classificação */}
                    <p className="text-[10px] text-gray-500 uppercase break-words">{classificacao}</p>

                    {/* Valores: custo, venda e margem */}
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-gray-400">Custo Real</span>
                        <span className="font-mono font-bold text-sm text-gray-700">{formatarMoeda(p.custoreal)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-gray-400">P. Venda</span>
                        <span className="font-mono font-black text-sm text-emerald-700">{formatarMoeda(p.pvenda)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-gray-400">Margem</span>
                        <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${classeMargem}`}>
                          {margem === null
                            ? '—'
                            : `${margem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL FLUTUANTE DE IMPORTAÇÃO EM MASSA */}
      {modalImportarAberto && (
        <ImportarProdutosModal
          onSucesso={carregarProdutos}
          onFechar={() => setModalImportarAberto(false)}
        />
      )}
    </div>
  );
}
