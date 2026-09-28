// src/pages/Dashboard/services/dashboardService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { 
  FiltroPeriodo, 
  DashboardDadosCompletos,
  AvariaPorMotivo,
  ConsumoPorDepartamento,
  RecebimentoPorFase,
  ComparativoPrecos
} from '../types/dashboard.types';

export const dashboardService = {
  obterIntervaloDatas(filtro: FiltroPeriodo): { dataInicio: string; dataFim: string } {
    const hoje = new Date();
    const formatar = (d: Date) => d.toISOString().split('T')[0];

    const dataFim = formatar(hoje);
    let dataInicio = dataFim;

    if (filtro === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dataInicio = formatar(d);
    } else if (filtro === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dataInicio = formatar(d);
    } else if (filtro === 'mes_atual') {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataInicio = formatar(d);
    }

    return { dataInicio, dataFim };
  },

  async carregarDados(filtro: FiltroPeriodo): Promise<DashboardDadosCompletos> {
    const { dataInicio, dataFim } = this.obterIntervaloDatas(filtro);

    // 1. KPIs & Avarias
    const { data: avariasData } = await supabase
      .from('avarias')
      .select('quantidade, preco_custo_na_perda, motivo_avaria_id, motivos_avaria(descricao)')
      .gte('data_registro', dataInicio)
      .lte('data_registro', dataFim);

    let totalAvariasValor = 0;
    let totalAvariasQtd = 0;
    const mapaMotivos: Record<string, { valor: number; qtd: number }> = {};

    (avariasData || []).forEach((av: any) => {
      const valor = Number(av.preco_custo_na_perda || 0) * Number(av.quantidade || 0);
      const qtd = Number(av.quantidade || 0);
      totalAvariasValor += valor;
      totalAvariasQtd += qtd;

      const descMotivo = av.motivos_avaria?.descricao || 'Outros';
      if (!mapaMotivos[descMotivo]) {
        mapaMotivos[descMotivo] = { valor: 0, qtd: 0 };
      }
      mapaMotivos[descMotivo].valor += valor;
      mapaMotivos[descMotivo].qtd += qtd;
    });

    const avariasPorMotivo: AvariaPorMotivo[] = Object.entries(mapaMotivos).map(
      ([motivo, dados]) => ({
        motivo,
        valor: Number(dados.valor.toFixed(2)),
        quantidade: dados.qtd
      })
    ).sort((a, b) => b.valor - a.valor);

    // 2. Consumo Loja
    const { data: consumoData } = await supabase
      .from('consumo_loja_itens')
      .select('valor_total_item, departamento, quantidade')
      .gte('created_at', `${dataInicio}T00:00:00Z`)
      .lte('created_at', `${dataFim}T23:59:59Z`);

    let totalConsumoValor = 0;
    let totalConsumoItens = 0;
    const mapaDepartamentos: Record<string, number> = {};

    (consumoData || []).forEach((c: any) => {
      const v = Number(c.valor_total_item || 0);
      totalConsumoValor += v;
      totalConsumoItens += Number(c.quantidade || 0);

      const dpto = c.departamento || 'Loja Geral';
      mapaDepartamentos[dpto] = (mapaDepartamentos[dpto] || 0) + v;
    });

    const consumoPorDepartamento: ConsumoPorDepartamento[] = Object.entries(mapaDepartamentos).map(
      ([departamento, valor]) => ({
        departamento,
        valor: Number(valor.toFixed(2))
      })
    ).sort((a, b) => b.valor - a.valor);

    // 3. Vencimentos em Risco (próximos 30 dias)
    const dataLimiteVencimento = new Date();
    dataLimiteVencimento.setDate(dataLimiteVencimento.getDate() + 30);
    const { count: vencimentosCount } = await supabase
      .from('vencimentos_controle')
      .select('id', { count: 'exact', head: true })
      .lte('data_validade', dataLimiteVencimento.toISOString().split('T')[0]);

    // 4. Temperaturas - Taxa de Conformidade
    const { data: afericoes } = await supabase
      .from('temperatura_afericoes')
      .select('status_resultado')
      .gte('data_registro', dataInicio)
      .lte('data_registro', dataFim);

    let conformes = 0;
    const totalAfericoes = afericoes?.length || 0;
    (afericoes || []).forEach((af: any) => {
      if (af.status_resultado === 'Conforme') conformes++;
    });
    const taxaConformidadeTemperatura = totalAfericoes > 0 ? (conformes / totalAfericoes) * 100 : 100;

    // 5. Tempo Médio por Fase de Recebimento
    const { data: fasesData } = await supabase
      .from('recebimento_fases')
      .select('ordem_fase, nome_fase, iniciado_em, finalizado_em')
      .eq('status', 'Finalizado')
      .gte('created_at', `${dataInicio}T00:00:00Z`);

    const mapaFases: Record<string, { somaMinutos: number; contagem: number }> = {};
    let somaTotalMinutos = 0;
    let totalFasesCalculadas = 0;

    (fasesData || []).forEach((f: any) => {
      if (f.iniciado_em && f.finalizado_em) {
        const diffMs = new Date(f.finalizado_em).getTime() - new Date(f.iniciado_em).getTime();
        const diffMin = Math.max(1, Math.round(diffMs / 60000));
        const nome = f.nome_fase;

        if (!mapaFases[nome]) {
          mapaFases[nome] = { somaMinutos: 0, contagem: 0 };
        }
        mapaFases[nome].somaMinutos += diffMin;
        mapaFases[nome].contagem += 1;
        somaTotalMinutos += diffMin;
        totalFasesCalculadas += 1;
      }
    });

    const recebimentoPorFase: RecebimentoPorFase[] = Object.entries(mapaFases).map(
      ([fase, item]) => ({
        fase,
        tempoMedioMinutos: Math.round(item.somaMinutos / item.contagem)
      })
    );

    const tempoMedioRecebimentoMinutos = totalFasesCalculadas > 0
      ? Math.round(somaTotalMinutos / totalFasesCalculadas)
      : 0;

    // 6. Tarefas Pendentes
    const { count: tarefasCount } = await supabase
      .from('tarefas_mestre')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pendentes');

    // 7. Pesquisa de Preços Comparativa (Top 5 itens pesquisados)
    const { data: itensPesquisa } = await supabase
      .from('pesquisa_precos_itens')
      .select('preco_venda, preco_concorrente, produtos(descricao)')
      .limit(6);

    const comparativoPrecos: ComparativoPrecos[] = (itensPesquisa || []).map((p: any) => ({
      produto: (p.produtos?.descricao || 'Produto').slice(0, 18),
      precoHazon: Number(p.preco_venda || 0),
      precoConcorrente: Number(p.preco_concorrente || 0)
    }));

    return {
      kpis: {
        totalAvariasValor,
        totalAvariasQtd,
        totalConsumoValor,
        totalConsumoItens,
        itensRiscoVencimento: vencimentosCount || 0,
        taxaConformidadeTemperatura: Math.round(taxaConformidadeTemperatura),
        tempoMedioRecebimentoMinutos,
        tarefasPendentes: tarefasCount || 0
      },
      avariasPorMotivo,
      consumoPorDepartamento,
      recebimentoPorFase,
      comparativoPrecos
    };
  }
};