// src/pages/Dashboard/index.tsx
import { useState, useEffect } from 'react';
import { dashboardService } from './services/dashboardService';
import type { FiltroPeriodo, DashboardDadosCompletos } from './types/dashboard.types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardProps {
  onVoltarParaHome: () => void;
}

const CORES_PALETA = ['#09797a', '#0284c7', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

export default function Dashboard({ onVoltarParaHome }: DashboardProps) {
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('mes_atual');
  const [dados, setDados] = useState<DashboardDadosCompletos | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarDashboard = async () => {
    try {
      setCarregando(true);
      const res = await dashboardService.carregarDados(periodo);
      setDados(res);
    } catch (err) {
      console.error('Erro ao carregar Dashboard:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDashboard();
  }, [periodo]);

  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-6xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-6">
        
        {/* CABEÇALHO */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVoltarParaHome}
              className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Voltar"
            >
              ←
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Painel de Indicadores
              </h1>
              <p className="text-xs text-slate-400 font-bold">
                Métricas Financeiras, Perdas e Eficiência Operacional
              </p>
            </div>
          </div>

          {/* SELETOR DE PERÍODO */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            {(['hoje', '7d', '30d', 'mes_atual'] as FiltroPeriodo[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPeriodo(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                  periodo === f ? 'bg-white text-[#09797a] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f === 'hoje' ? 'Hoje' : f === '7d' ? '7 Dias' : f === '30d' ? '30 Dias' : 'Mês Atual'}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <div className="py-20 text-center text-xs font-black uppercase text-[#09797a] animate-pulse">
            Compilando inteligência de dados...
          </div>
        ) : dados ? (
          <>
            {/* CARDS DE KPIS EXECUTIVOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-rose-700">Perdas por Avaria</span>
                <span className="text-xl sm:text-2xl font-black text-rose-900 mt-1">
                  {formatarMoeda(dados.kpis.totalAvariasValor)}
                </span>
                <span className="text-[10px] text-rose-600 font-bold mt-1">
                  {dados.kpis.totalAvariasQtd} unidades descartadas
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-amber-800">Consumo Interno</span>
                <span className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  {formatarMoeda(dados.kpis.totalConsumoValor)}
                </span>
                <span className="text-[10px] text-amber-700 font-bold mt-1">
                  {dados.kpis.totalConsumoItens} itens requisitados
                </span>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-3xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-teal-800">Risco de Vencimento</span>
                <span className="text-xl sm:text-2xl font-black text-[#09797a] mt-1">
                  {dados.kpis.itensRiscoVencimento} lotes
                </span>
                <span className="text-[10px] text-teal-700 font-bold mt-1">Vencendo nos próx. 30 dias</span>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-indigo-700">Cadeia de Frio</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-950 mt-1">
                  {dados.kpis.taxaConformidadeTemperatura}%
                </span>
                <span className="text-[10px] text-indigo-600 font-bold mt-1">Conformidade térmica</span>
              </div>
            </div>

            {/* SEÇÃO GRÁFICA PRINCIPAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* GRÁFICO 1: PERDAS POR MOTIVO */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800">Origem das Perdas (Avarias)</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Impacto em R$ acumulado</span>
                </div>
                <div className="h-64 w-full">
                  {dados.avariasPorMotivo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.avariasPorMotivo} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="motivo" type="category" width={110} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), 'Perda']} />
                        <Bar dataKey="valor" fill="#ef4444" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      Sem avarias registradas no período.
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICO 2: CONSUMO POR DEPARTAMENTO */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800">Consumo Interno por Setor</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Despesas operacionais internas</span>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  {dados.consumoPorDepartamento.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dados.consumoPorDepartamento}
                          dataKey="valor"
                          nameKey="departamento"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {dados.consumoPorDepartamento.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CORES_PALETA[index % CORES_PALETA.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), 'Gasto']} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400 font-bold">
                      Sem consumo registrado no período.
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICO 3: TEMPO MÉDIO DE RECEBIMENTO */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800">SLA Médio por Etapa de Recebimento</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Tempo médio gasto em minutos</span>
                </div>
                <div className="h-64 w-full">
                  {dados.recebimentoPorFase.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.recebimentoPorFase} margin={{ left: -20, right: 10 }}>
                        <XAxis dataKey="fase" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip formatter={(value: any) => [`${value} min`, 'Média']} />
                        <Bar dataKey="tempoMedioMinutos" fill="#09797a" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      Sem histórico de etapas finalizadas no período.
                    </div>
                  )}
                </div>
              </div>

              {/* GRÁFICO 4: COMPETITIVIDADE DE PREÇOS (HAZON VS CONCORRENTE) */}
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800">Competitividade de Preços de Venda</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Hazon vs. Concorrente</span>
                </div>
                <div className="h-64 w-full">
                  {dados.comparativoPrecos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.comparativoPrecos} margin={{ left: -10, right: 10 }}>
                        <XAxis dataKey="produto" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip formatter={(value: any) => [formatarMoeda(Number(value)), 'Preço']} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="precoHazon" name="Hazon" fill="#09797a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="precoConcorrente" name="Concorrente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                      Sem pesquisas comparativas de preço registradas.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}