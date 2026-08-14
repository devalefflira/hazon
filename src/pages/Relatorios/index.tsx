// src/pages/Relatorios/index.tsx
import React, { useState } from "react";
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

  const handleVoltar = () => {
    if (onVoltarParaHome) {
      onVoltarParaHome();
    } else {
      window.history.back();
    }
  };

  const handleGerarRelatorio = async () => {
    try {
      setCarregando(true);
      const dtInicioFmt = new Date(dataInicio).toLocaleDateString("pt-BR");
      const dtFimFmt = new Date(dataFim).toLocaleDateString("pt-BR");

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
          const dados = await relatoriosService.buscarAvarias(dataInicio, dataFim);
          gerarRelatorioAvarias(dados, dtInicioFmt, dtFimFmt);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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