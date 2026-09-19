// src/pages/Relatorios/index.tsx
import { useState, useEffect } from 'react';
import { relatoriosService } from './services/relatoriosService';
import { gerarRelatorioAvarias } from './utils/generators/gerarRelatorioAvarias';
import { gerarRelatorioConfCega } from './utils/generators/gerarRelatorioConfCega';
import { gerarRelatorioConsumoLoja } from './utils/generators/gerarRelatorioConsumoLoja';
import { gerarRelatorioCotacoes } from './utils/generators/gerarRelatorioCotacoes';
import { gerarRelatorioInventario } from './utils/generators/gerarRelatorioInventario';
import { gerarRelatorioNotasFalta } from './utils/generators/gerarRelatorioNotasFalta';
import { gerarRelatorioOfertas } from './utils/generators/gerarRelatorioOfertas';
import { gerarRelatorioOrcamentos } from './utils/generators/gerarRelatorioOrcamentos';
import { gerarRelatorioPedidos } from './utils/generators/gerarRelatorioPedidos';
import { gerarRelatorioTarefas } from './utils/generators/gerarRelatorioTarefas';
import { gerarRelatorioTemperaturas } from './utils/generators/gerarRelatorioTemperaturas';
import { gerarRelatorioTrocas } from './utils/generators/gerarRelatorioTrocas';
import { gerarRelatorioVencimentos } from './utils/generators/gerarRelatorioVencimentos';

interface RelatoriosProps {
  onVoltarParaHome?: () => void;
  [key: string]: any;
}

type TipoSubmodulo =
  | 'avarias'
  | 'conf-cega'
  | 'consumo-loja'
  | 'cotacoes'
  | 'inventario'
  | 'nota-falta'
  | 'ofertas'
  | 'orcamentos'
  | 'pedidos'
  | 'tarefas'
  | 'temperaturas'
  | 'trocas'
  | 'vencimentos';

export default function Relatorios(props: RelatoriosProps) {
  const { onVoltarParaHome } = props;

  const hoje = new Date().toISOString().split('T')[0];
  const [submodulo, setSubmodulo] = useState<TipoSubmodulo>('avarias');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);

  // Filtros Mercadológicos
  const [departamento, setDepartamento] = useState('TODOS');
  const [secao, setSecao] = useState('TODOS');
  const [categoria, setCategoria] = useState('TODOS');

  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [secoes, setSecoes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);

  // Filtro de Produto Específico (Avarias)
  const [termoBuscaProduto, setTermoBuscaProduto] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any | null>(null);

  const [gerando, setGerando] = useState(false);

  // Carregar opções de filtros mercadológicos
  useEffect(() => {
    async function carregarOpcoes() {
      try {
        const { departamentos: deps, secoes: secs, categorias: cats } =
          await relatoriosService.buscarOpcoesFiltrosProdutos();
        setDepartamentos(deps);
        setSecoes(secs);
        setCategorias(cats);
      } catch (err) {
        console.error('Erro ao carregar opções de filtros:', err);
      }
    }
    carregarOpcoes();
  }, []);

  // Busca preditiva de produto para Avarias
  const handleBuscarProduto = async (termo: string) => {
    setTermoBuscaProduto(termo);
    if (!termo.trim()) {
      setProdutosEncontrados([]);
      return;
    }
    try {
      const prods = await relatoriosService.buscarProdutos(termo);
      setProdutosEncontrados(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelecionarProduto = (p: any) => {
    setProdutoSelecionado(p);
    setTermoBuscaProduto(`${p.codprod} - ${p.descricao}`);
    setProdutosEncontrados([]);
  };

  const handleLimparProduto = () => {
    setProdutoSelecionado(null);
    setTermoBuscaProduto('');
    setProdutosEncontrados([]);
  };

  // Gerar PDF do submódulo selecionado
  const handleGerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      alert('Selecione as datas inicial e final.');
      return;
    }

    try {
      setGerando(true);

      switch (submodulo) {
        case 'avarias': {
          const dados = await relatoriosService.buscarAvarias(dataInicio, dataFim, {
            departamento: departamento !== 'TODOS' ? departamento : undefined,
            secao: secao !== 'TODOS' ? secao : undefined,
            categoria: categoria !== 'TODOS' ? categoria : undefined,
            produtoId: produtoSelecionado?.id
          });
          if (dados.length === 0) {
            alert('Nenhum registro de avaria encontrado para os filtros selecionados.');
            return;
          }
          await gerarRelatorioAvarias(dados, dataInicio, dataFim, {
            departamento,
            secao,
            categoria
          });
          break;
        }

        case 'conf-cega': {
          const dados = await relatoriosService.buscarConferencias(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioConfCega(dados, dataInicio, dataFim);
          break;
        }

        case 'consumo-loja': {
          const dados = await relatoriosService.buscarDadosConsumoLoja(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioConsumoLoja(dados, dataInicio, dataFim);
          break;
        }

        case 'cotacoes': {
          const dados = await relatoriosService.buscarCotacoes(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioCotacoes(dados, dataInicio, dataFim);
          break;
        }

        case 'inventario': {
          const dados = await relatoriosService.buscarInventarios(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioInventario(dados, dataInicio, dataFim);
          break;
        }

        case 'nota-falta': {
          const dados = await relatoriosService.buscarNotasFalta(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioNotasFalta(dados, dataInicio, dataFim);
          break;
        }

        case 'ofertas': {
          const dados = await relatoriosService.buscarOfertas(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioOfertas(dados, dataInicio, dataFim);
          break;
        }

        case 'orcamentos': {
          const dados = await relatoriosService.buscarOrcamentos(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioOrcamentos(dados, dataInicio, dataFim);
          break;
        }

        case 'pedidos': {
          const dados = await relatoriosService.buscarPedidos(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioPedidos(dados, dataInicio, dataFim);
          break;
        }

        case 'tarefas': {
          const dados = await relatoriosService.buscarTarefas(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioTarefas(dados, dataInicio, dataFim);
          break;
        }

        case 'temperaturas': {
          const dados = await relatoriosService.buscarTemperaturas(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioTemperaturas(dados, dataInicio, dataFim);
          break;
        }

        case 'trocas': {
          const dados = await relatoriosService.buscarTrocas(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioTrocas(dados, dataInicio, dataFim);
          break;
        }

        case 'vencimentos': {
          const dados = await relatoriosService.buscarVencimentos(dataInicio, dataFim);
          if (dados.length === 0) return alert('Nenhum registro encontrado.');
          await gerarRelatorioVencimentos(dados, dataInicio, dataFim);
          break;
        }

        default:
          alert('Submódulo ainda não parametrizado para geração.');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao emitir relatório: ${err.message}`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-4xl shadow-xl p-5 sm:p-8 flex flex-col gap-6">
        
        {/* Topo */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          {onVoltarParaHome && (
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-lg font-black text-teal-950 uppercase tracking-tight">
              Relatórios Gerenciais
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Suporte à Auditoria e Tomada de Decisão
            </p>
          </div>
        </div>

        {/* Card de Filtros */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-4">
          
          {/* Submódulo */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
              Selecione o Submódulo Analítico
            </label>
            <select
              value={submodulo}
              onChange={(e) => {
                setSubmodulo(e.target.value as TipoSubmodulo);
                handleLimparProduto();
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-[#09797a]"
            >
              <option value="avarias">❌ Avarias</option>
              <option value="consumo-loja">🛒 Consumo Loja</option>
              <option value="vencimentos">🕒 Vencimentos</option>
              <option value="trocas">🔄 Trocas com Fornecedores</option>
              <option value="inventario">📦 Inventário</option>
              <option value="nota-falta">📄 Nota de Falta</option>
              <option value="cotacoes">🏷️ Cotações</option>
              <option value="pedidos">🚚 Pedidos</option>
              <option value="conf-cega">📦 Conferência Cega</option>
              <option value="orcamentos">💰 Orçamentos</option>
              <option value="ofertas">📢 Ofertas</option>
              <option value="temperaturas">❄️ Temperaturas</option>
              <option value="tarefas">📋 Tarefas</option>
            </select>
          </div>

          {/* Período de Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
              />
            </div>
          </div>

          {/* FILTRO DE PRODUTO ESPECÍFICO (EXCLUSIVO DE AVARIAS) */}
          {submodulo === 'avarias' && (
            <div className="relative animate-fadeIn border-t border-slate-200/60 pt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase text-slate-600 block">
                  Filtrar por Item Específico (Opcional)
                </label>
                {produtoSelecionado && (
                  <button
                    type="button"
                    onClick={handleLimparProduto}
                    className="text-[10px] font-black text-rose-600 uppercase hover:underline cursor-pointer"
                  >
                    Limpar Item
                  </button>
                )}
              </div>

              <input
                type="text"
                value={termoBuscaProduto}
                onChange={(e) => handleBuscarProduto(e.target.value)}
                placeholder="Busque por código, barras, descrição completa ou %"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#09797a]"
              />

              {produtosEncontrados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto z-30 flex flex-col">
                  {produtosEncontrados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelecionarProduto(p)}
                      className="p-2.5 text-left border-b border-slate-100 hover:bg-teal-50 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-black text-slate-800 uppercase block">
                          {p.descricao}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Cód: {p.codprod} {p.codbarra ? `| Barras: ${p.codbarra}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                        {p.unidade || 'UN'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filtros Mercadológicos (Exibidos em Avarias) */}
          {submodulo === 'avarias' && (
            <div className="flex flex-col gap-3 border-t border-slate-200/60 pt-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Departamento
                </label>
                <select
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODOS</option>
                  {departamentos.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Seção
                </label>
                <select
                  disabled={departamento === 'TODOS'}
                  value={secao}
                  onChange={(e) => setSecao(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50 focus:outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODAS</option>
                  {secoes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Categoria
                </label>
                <select
                  disabled={secao === 'TODOS'}
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50 focus:outline-none focus:border-[#09797a]"
                >
                  <option value="TODOS">TODAS</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botão de Geração */}
          <button
            type="button"
            disabled={gerando}
            onClick={handleGerarRelatorio}
            className="w-full mt-2 py-3 bg-[#09797a] hover:bg-[#075f60] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-teal-900/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>📄</span>
            <span>{gerando ? 'Compilando Dados...' : 'Gerar Relatório A4'}</span>
          </button>

        </div>

      </div>
    </div>
  );
}