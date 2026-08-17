// src/pages/Relatorios/index.tsx
import React, { useState, useEffect } from "react";
import { relatoriosService } from "./services/relatoriosService";
import { gerarRelatorioVencimentos } from "./utils/generators/gerarRelatorioVencimentos";
import { gerarRelatorioInventario } from "./utils/generators/gerarRelatorioInventario";
import { gerarRelatorioNotasFalta } from "./utils/generators/gerarRelatorioNotasFalta";
import { gerarRelatorioCotacoes } from "./utils/generators/gerarRelatorioCotacoes";
import { gerarRelatorioOrcamentos } from "./utils/generators/gerarRelatorioOrcamentos";
import { gerarRelatorioAvarias } from "./utils/generators/gerarRelatorioAvarias";
import { gerarRelatorioTrocas } from "./utils/generators/gerarRelatorioTrocas";
import { gerarRelatorioPedidos } from "./utils/generators/gerarRelatorioPedidos";
import { gerarRelatorioTarefas } from "./utils/generators/gerarRelatorioTarefas";
import { gerarRelatorioConfCega } from "./utils/generators/gerarRelatorioConfCega";
import { gerarRelatorioTemperaturas } from "./utils/generators/gerarRelatorioTemperaturas";
import { gerarRelatorioOfertas } from "./utils/generators/gerarRelatorioOfertas";

interface RelatoriosProps {
  onVoltarParaHome?: () => void;
}

interface SubmoduloOption {
  id: string;
  nome: string;
  icone: string;
}

const SUBMODULOS: SubmoduloOption[] = [
  { id: "vencimentos", nome: "CONTROLE DE VALIDADES", icone: "🛡️" },
  { id: "inventario", nome: "INVENTÁRIO", icone: "📦" },
  { id: "notas_falta", nome: "NOTAS DE FALTA", icone: "⚠️" },
  { id: "cotacoes", nome: "COTAÇÕES", icone: "💬" },
  { id: "orcamentos", nome: "ORÇAMENTOS", icone: "📑" },
  { id: "avarias", nome: "AVARIAS", icone: "❌" },
  { id: "trocas", nome: "TROCAS", icone: "🔄" },
  { id: "pedidos", nome: "PEDIDOS", icone: "🚚" },
  { id: "tarefas", nome: "TAREFAS", icone: "✅" },
  { id: "conf_cega", nome: "CONF. CEGA", icone: "🔍" },
  { id: "temperatura", nome: "TEMPERATURAS", icone: "🌡️" },
  { id: "ofertas", nome: "OFERTAS", icone: "🏷️" },
];

const Relatorios: React.FC<RelatoriosProps> = ({ onVoltarParaHome }) => {
  const hoje = new Date().toISOString().split("T")[0];
  const [submodulo, setSubmodulo] = useState<string>("vencimentos");
  const [dataInicio, setDataInicio] = useState<string>(hoje);
  const [dataFim, setDataFim] = useState<string>(hoje);
  const [carregando, setCarregando] = useState<boolean>(false);

  // Filtros específicos para Avarias (Padrão: TODOS)
  const [departamentoSel, setDepartamentoSel] = useState<string>("TODOS");
  const [secaoSel, setSecaoSel] = useState<string>("TODOS");
  const [categoriaSel, setCategoriaSel] = useState<string>("TODOS");

  // Opções dinâmicas carregadas da base
  const [opcoesDepartamentos, setOpcoesDepartamentos] = useState<string[]>([]);
  const [opcoesSecoes, setOpcoesSecoes] = useState<string[]>([]);
  const [opcoesCategorias, setOpcoesCategorias] = useState<string[]>([]);

  useEffect(() => {
    async function carregarFiltros() {
      try {
        const { departamentos, secoes, categorias } =
          await relatoriosService.buscarOpcoesFiltrosProdutos();
        setOpcoesDepartamentos(departamentos as string[]);
        setOpcoesSecoes(secoes as string[]);
        setOpcoesCategorias(categorias as string[]);
      } catch (err) {
        console.error("Erro ao carregar opções de filtros:", err);
      }
    }
    carregarFiltros();
  }, []);

  const handleVoltar = () => {
    if (onVoltarParaHome) {
      onVoltarParaHome();
    } else {
      window.history.back();
    }
  };

  const formatarDataFiltro = (dt: string) => {
    if (!dt) return "";
    const partes = dt.split("-");
    if (partes.length === 3) {
      const [ano, mes, dia] = partes;
      return `${dia}/${mes}/${ano}`;
    }
    return dt;
  };

  const handleGerarRelatorio = async () => {
    try {
      setCarregando(true);
      const dtInicioFmt = formatarDataFiltro(dataInicio);
      const dtFimFmt = formatarDataFiltro(dataFim);

      switch (submodulo) {
        case "vencimentos": {
          const dados = await relatoriosService.buscarVencimentos(dataInicio, dataFim);
          gerarRelatorioVencimentos(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "inventario": {
          const dados = await relatoriosService.buscarInventarios(dataInicio, dataFim);
          gerarRelatorioInventario(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "notas_falta": {
          const dados = await relatoriosService.buscarNotasFalta(dataInicio, dataFim);
          gerarRelatorioNotasFalta(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "cotacoes": {
          const dados = await relatoriosService.buscarCotacoes(dataInicio, dataFim);
          gerarRelatorioCotacoes(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "orcamentos": {
          const dados = await relatoriosService.buscarOrcamentos(dataInicio, dataFim);
          gerarRelatorioOrcamentos(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "avarias": {
          const dados = await relatoriosService.buscarAvarias(dataInicio, dataFim, {
            departamento: departamentoSel,
            secao: secaoSel,
            categoria: categoriaSel,
          });

          if (!dados || dados.length === 0) {
            alert("Nenhum registro de avaria encontrado para os filtros selecionados.");
            return;
          }

          gerarRelatorioAvarias(dados, dtInicioFmt, dtFimFmt, {
            departamento: departamentoSel,
            secao: secaoSel,
            categoria: categoriaSel,
          });
          break;
        }
        case "trocas": {
          const dados = await relatoriosService.buscarTrocas(dataInicio, dataFim);
          gerarRelatorioTrocas(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "pedidos": {
          const dados = await relatoriosService.buscarPedidos(dataInicio, dataFim);
          gerarRelatorioPedidos(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "tarefas": {
          const dados = await relatoriosService.buscarTarefas(dataInicio, dataFim);
          gerarRelatorioTarefas(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "conf_cega": {
          const dados = await relatoriosService.buscarConferencias(dataInicio, dataFim);
          gerarRelatorioConfCega(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "temperatura": {
          const dados = await relatoriosService.buscarTemperaturas(dataInicio, dataFim);
          gerarRelatorioTemperaturas(dados, dtInicioFmt, dtFimFmt);
          break;
        }
        case "ofertas": {
          const dados = await relatoriosService.buscarOfertas(dataInicio, dataFim);
          gerarRelatorioOfertas(dados, dtInicioFmt, dtFimFmt);
          break;
        }
      }
    } catch (err: any) {
      alert("Erro ao buscar dados do relatório: " + (err.message || "Erro inesperado"));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleVoltar}
            className="p-2 hover:bg-slate-100 rounded-full text-teal-800 transition"
            title="Voltar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-teal-900 uppercase">
              Relatórios Gerenciais
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Suporte à Auditoria e Tomada de Decisão
            </p>
          </div>
        </div>

        {/* Card Formulário */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6">
          {/* Linha 1: Submódulo e Período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Seletor do Módulo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Selecione o Submódulo Analítico
              </label>
              <select
                value={submodulo}
                onChange={(e) => setSubmodulo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                {SUBMODULOS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.icone} {opt.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Linha 2: Filtros Condicionais de Avarias (Departamento, Seção e Categoria) */}
          {submodulo === "avarias" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-4 border-t border-slate-200">
              {/* Departamento */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Departamento
                </label>
                <select
                  value={departamentoSel}
                  onChange={(e) => setDepartamentoSel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS</option>
                  {opcoesDepartamentos.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seção */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Seção
                </label>
                <select
                  value={secaoSel}
                  onChange={(e) => setSecaoSel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS</option>
                  {opcoesSecoes.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Categoria
                </label>
                <select
                  value={categoriaSel}
                  onChange={(e) => setCategoriaSel(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS</option>
                  {opcoesCategorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Botão de Ação */}
          <button
            onClick={handleGerarRelatorio}
            disabled={carregando}
            className="w-full bg-teal-800 hover:bg-teal-900 active:scale-[0.99] text-white font-bold py-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 tracking-wider text-sm uppercase disabled:opacity-50"
          >
            {carregando ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Processando Relatório...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Gerar Relatório A4
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;