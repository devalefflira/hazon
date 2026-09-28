// src/pages/Dashboard/types/dashboard.types.ts

export type FiltroPeriodo = 'hoje' | '7d' | '30d' | 'mes_atual';

export interface DashboardKPIs {
  totalAvariasValor: number;
  totalAvariasQtd: number;
  totalConsumoValor: number;
  totalConsumoItens: number;
  itensRiscoVencimento: number;
  taxaConformidadeTemperatura: number;
  tempoMedioRecebimentoMinutos: number;
  tarefasPendentes: number;
}

export interface AvariaPorMotivo {
  motivo: string;
  valor: number;
  quantidade: number;
}

export interface ConsumoPorDepartamento {
  departamento: string;
  valor: number;
}

export interface RecebimentoPorFase {
  fase: string;
  tempoMedioMinutos: number;
}

export interface ComparativoPrecos {
  produto: string;
  precoHazon: number;
  precoConcorrente: number;
}

export interface DashboardDadosCompletos {
  kpis: DashboardKPIs;
  avariasPorMotivo: AvariaPorMotivo[];
  consumoPorDepartamento: ConsumoPorDepartamento[];
  recebimentoPorFase: RecebimentoPorFase[];
  comparativoPrecos: ComparativoPrecos[];
}