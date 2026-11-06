// src/pages/Vencimentos/services/vencimentosService.ts
import { supabase } from '../../../lib/supabaseClient';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export type OrigemVencimento = 'Vencimentos' | 'Inventário' | 'Conf. Cega';
export type TipoAcaoVencimento = 'Oferta' | 'Troca' | 'Descarte' | 'Negociação';
export type StatusCicloVencimento = 'Em Curso' | 'Finalizado';

export interface ProdutoVencimento {
  id: string;
  codprod: string;
  descricao: string;
  codbarra?: string | null;
  unidade?: string | null;
  custoreal?: number | null;
  pvenda?: number | null;
  departamento?: string | null;
  secao?: string | null;
  categoria?: string | null;
}

export interface VencimentoItem {
  id: string;
  codigo_customizado?: string;
  produto_id: string;
  lote: string;
  data_validade: string;
  quantidade: number;
  origem: OrigemVencimento;
  diasParaVencer: number;
  statusLeitura?: 'Visto' | 'Pendente';
  visualizadoPor?: string;
  visualizadoEm?: string;
  usuarioNome?: string;
  dataHoraRegistro?: string;
  produtos?: ProdutoVencimento;
  usuarios?: {
    id: string;
    nome: string;
  };
}

export interface AcaoVencimento {
  id: string;
  ciclo_id: string;
  tipo: TipoAcaoVencimento;
  quantidade: number | null;
  preco_custo: number | null;
  preco_venda: number | null;
  margem_atual_pct: number | null;
  preco_oferta: number | null;
  margem_oferta_pct: number | null;
  validade_oferta: string | null;
  fornecedor_id: string | null;
  fornecedorNome: string | null;
  modalidade_negociacao: string | null;
  novo_custo: number | null;
  valor_negociado: number | null;
  justificativa: string | null;
  observacao: string | null;
  usuarioNome: string;
  created_at: string;
}

export interface CicloVencimento {
  id: string;
  codigo_customizado: string;
  origem: OrigemVencimento;
  item_origem_id: string;
  produto_id: string;
  lote: string;
  data_validade: string;
  quantidade: number;
  custo_unitario: number;
  preco_venda: number;
  status: StatusCicloVencimento;
  iniciado_em: string;
  iniciadoPorNome: string;
  finalizado_em: string | null;
  finalizadoPorNome: string | null;
  desfecho: string | null;
  observacao_final: string | null;
  diasParaVencer: number;
  produtos?: ProdutoVencimento;
  acoes: AcaoVencimento[];
}

export interface NovaAcaoPayload {
  tipo: TipoAcaoVencimento;
  quantidade?: number | null;
  preco_custo?: number | null;
  preco_venda?: number | null;
  margem_atual_pct?: number | null;
  preco_oferta?: number | null;
  margem_oferta_pct?: number | null;
  validade_oferta?: string | null;
  fornecedor_id?: string | null;
  modalidade_negociacao?: string | null;
  novo_custo?: number | null;
  valor_negociado?: number | null;
  justificativa?: string | null;
  observacao?: string | null;
}

export interface FornecedorOpcao {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
}

const CAMPOS_PRODUTO = 'id, codprod, descricao, codbarra, unidade, custoreal, pvenda, departamento, secao, categoria';

function formatarDataHora(dataIsoOrDateString?: string): string {
  if (!dataIsoOrDateString) return 'Data não informada';
  const data = new Date(dataIsoOrDateString);
  if (isNaN(data.getTime())) return dataIsoOrDateString;

  const dataFmt = data.toLocaleDateString('pt-BR');
  const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${dataFmt}, às ${horaFmt}`;
}

function calcularDiasParaVencer(dataValidade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataVal = new Date(dataValidade + 'T00:00:00');
  return Math.ceil((dataVal.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function numeroOuNulo(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return isNaN(n) ? null : n;
}

function mapearAcao(a: any): AcaoVencimento {
  const forn = a.fornecedores || null;
  return {
    id: a.id,
    ciclo_id: a.ciclo_id,
    tipo: a.tipo,
    quantidade: numeroOuNulo(a.quantidade),
    preco_custo: numeroOuNulo(a.preco_custo),
    preco_venda: numeroOuNulo(a.preco_venda),
    margem_atual_pct: numeroOuNulo(a.margem_atual_pct),
    preco_oferta: numeroOuNulo(a.preco_oferta),
    margem_oferta_pct: numeroOuNulo(a.margem_oferta_pct),
    validade_oferta: a.validade_oferta || null,
    fornecedor_id: a.fornecedor_id || null,
    fornecedorNome: forn ? forn.nome_fantasia || forn.razao_social : null,
    modalidade_negociacao: a.modalidade_negociacao || null,
    novo_custo: numeroOuNulo(a.novo_custo),
    valor_negociado: numeroOuNulo(a.valor_negociado),
    justificativa: a.justificativa || null,
    observacao: a.observacao || null,
    usuarioNome: a.usuarios?.nome || 'SISTEMA',
    created_at: a.created_at
  };
}

function mapearCiclo(c: any): CicloVencimento {
  const acoes: AcaoVencimento[] = (c.vencimentos_acoes || [])
    .map(mapearAcao)
    .sort((x: AcaoVencimento, y: AcaoVencimento) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());

  return {
    id: c.id,
    codigo_customizado: c.codigo_customizado,
    origem: c.origem,
    item_origem_id: c.item_origem_id,
    produto_id: c.produto_id,
    lote: c.lote || 'S/L',
    data_validade: c.data_validade,
    quantidade: Number(c.quantidade || 0),
    custo_unitario: Number(c.custo_unitario || 0),
    preco_venda: Number(c.preco_venda || 0),
    status: c.status,
    iniciado_em: c.iniciado_em,
    iniciadoPorNome: c.iniciador?.nome || 'SISTEMA',
    finalizado_em: c.finalizado_em || null,
    finalizadoPorNome: c.finalizador?.nome || null,
    desfecho: c.desfecho || null,
    observacao_final: c.observacao_final || null,
    diasParaVencer: calcularDiasParaVencer(c.data_validade),
    produtos: c.produtos || undefined,
    acoes
  };
}

const SELECT_CICLO = `
  id, codigo_customizado, origem, item_origem_id, produto_id, lote, data_validade, quantidade,
  custo_unitario, preco_venda, status, iniciado_em, finalizado_em, desfecho, observacao_final,
  produtos ( ${CAMPOS_PRODUTO} ),
  iniciador:usuarios!vencimentos_ciclos_iniciado_por_fkey ( nome ),
  finalizador:usuarios!vencimentos_ciclos_finalizado_por_fkey ( nome ),
  vencimentos_acoes ( *, usuarios ( nome ), fornecedores ( nome_fantasia, razao_social ) )
`;

export const vencimentosService = {
  // 1. Buscar produtos para autocomplete
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const pattern = termo.trim().replace(/\s+/g, '%').replace(/%+/g, '%');

    const { data, error } = await supabase
      .from('produtos')
      .select(CAMPOS_PRODUTO)
      .or(`codbarra.ilike.%${pattern}%,codprod.ilike.%${pattern}%,descricao.ilike.%${pattern}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Salvar Novo Registro Manual de Vencimento + Notificação Telegram
  async salvarControle(payload: {
    produto_id: string;
    lote?: string;
    data_validade: string;
    quantidade?: number;
    usuario_id?: string;
  }): Promise<void> {
    const codigoCustom = `VEN-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: itemInserido, error } = await supabase
      .from('vencimentos_controle')
      .insert([{
        codigo_customizado: codigoCustom,
        produto_id: payload.produto_id,
        lote: payload.lote || 'NÃO INFORMADO',
        data_validade: payload.data_validade,
        quantidade: payload.quantidade || 1,
        origem: 'Vencimentos',
        usuario_id: payload.usuario_id || null
      }])
      // Colunas explícitas: usuarios.senha_hash não é legível por authenticated (SQL 07),
      // e pedir usuarios(*) faz o PostgREST recusar (403) e desfazer o insert.
      .select(`id, codigo_customizado, produtos ( ${CAMPOS_PRODUTO} ), usuarios ( id, nome )`)
      .single();

    if (error) {
      console.error('Erro ao salvar vencimento no banco:', error);
      throw error;
    }

    // Disparo Telegram
    try {
      const prod = itemInserido?.produtos || {};
      const operador = itemInserido?.usuarios?.nome || 'Operador';

      const diffDias = calcularDiasParaVencer(payload.data_validade);

      const formatarData = (dt: string) => {
        const p = dt.split('-');
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dt;
      };

      let nivelRisco = '🟡 Atenção (Monitoramento)';
      if (diffDias <= 0) {
        nivelRisco = '🚨 PRODUTO VENCIDO (Recolher Imediatamente)';
      } else if (diffDias <= 3) {
        nivelRisco = `🔴 CRÍTICO (${diffDias} dia(s) restante(s))`;
      } else {
        nivelRisco = `🟡 Atenção (${diffDias} dias restantes)`;
      }

      const descProd = (prod?.descricao || 'PRODUTO')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .toUpperCase();

      const mensagem =
        `⏰ <b>ALERTA DE VALIDADE REGISTRADA</b>\n\n` +
        `<b>Status:</b> ${nivelRisco}\n` +
        `<b>Código:</b> <code>#${codigoCustom}</code>\n` +
        `<b>Produto:</b> ${descProd}\n` +
        `<b>Cód. Sistema:</b> ${prod?.codprod || '-'} | <b>Depto:</b> ${prod?.departamento || 'GERAL'}\n` +
        `<b>Lote:</b> ${payload.lote || 'NÃO INFORMADO'}\n` +
        `<b>Quantidade Auditada:</b> ${payload.quantidade || 1} ${prod?.unidade || 'UN'}\n` +
        `<b>Data de Vencimento:</b> <code>${formatarData(payload.data_validade)}</code>\n` +
        `<b>Auditado por:</b> ${operador}\n`;

      console.log('Enviando mensagem ao Telegram:', mensagem);

      const enviado = await dispararNotificacaoTelegram({
        mensagemHtml: mensagem,
        textoBotao: '🛡️ Abrir Controle de Vencimentos',
        urlBotao: '/?tela=vencimentos'
      });

      console.log('Resposta do disparo Telegram:', enviado);
    } catch (errNotif) {
      console.error('Erro ao processar notificação de vencimento:', errNotif);
    }
  },

  // 3. Marcar notificação como VISTO pelo usuário
  async marcarComoVisto(itemId: string, usuarioId: string): Promise<void> {
    if (!itemId || !usuarioId) return;

    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    await supabase
      .from('notificacoes_leituras')
      .upsert({
        item_id: String(itemId),
        usuario_id: usuarioId,
        data_visualizacao: dataAtual,
        hora_visualizacao: horaAtual,
        visto_em: agora.toISOString()
      }, { onConflict: 'item_id,usuario_id' });
  },

  // 4. Listar e Agregar Registros (Vencimentos + Inventário + Conf. Cega)
  async listarTodosVencimentos(usuarioId?: string): Promise<VencimentoItem[]> {
    // 4.1. Busca leituras registradas
    const { data: leituras } = await supabase
      .from('notificacoes_leituras')
      .select('item_id, usuario_id, data_visualizacao, hora_visualizacao, usuarios ( nome )');

    const mapaLeituras: Record<string, any> = {};
    (leituras || []).forEach((l: any) => {
      mapaLeituras[`${l.item_id}_${l.usuario_id}`] = l;
      mapaLeituras[l.item_id] = l;
    });

    // 4.2. Busca da tabela manual
    const { data: dadosManuais } = await supabase
      .from('vencimentos_controle')
      .select(`
        id, codigo_customizado, produto_id, lote, data_validade, quantidade, origem, created_at,
        produtos ( ${CAMPOS_PRODUTO} ),
        usuarios ( id, nome )
      `);

    // 4.3. Busca do módulo de Inventário
    const { data: dadosInventario } = await supabase
      .from('inventario_itens')
      .select(`
        id, produto_id, lote, data_validade, quantidade_contabilizada,
        inventarios ( id, created_at, data_registro, hora_registro, usuarios ( id, nome ) ),
        produtos ( ${CAMPOS_PRODUTO} )
      `)
      .not('data_validade', 'is', null);

    // 4.4. Busca do módulo de Conferência Cega
    const { data: dadosConfCega } = await supabase
      .from('conferencia_itens')
      .select(`
        id, produto_id, lote, data_validade, quantidade_contada, created_at,
        conferencias_mestre ( id, created_at, data_conferencia, hora_conferencia, usuarios ( id, nome ) ),
        produtos ( ${CAMPOS_PRODUTO} )
      `)
      .not('data_validade', 'is', null);

    const listaUnificada: VencimentoItem[] = [];

    // Processa Manuais
    (dadosManuais || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dias = calcularDiasParaVencer(item.data_validade);

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: item.codigo_customizado,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade || 1),
        origem: 'Vencimentos',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: item.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(item.created_at),
        produtos: item.produtos,
        usuarios: item.usuarios
      });
    });

    // Processa Inventário
    (dadosInventario || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dias = calcularDiasParaVencer(item.data_validade);

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      const inv = item.inventarios || {};
      const dataHoraRef = inv.created_at || (inv.data_registro ? `${inv.data_registro}T${inv.hora_registro || '00:00:00'}` : undefined);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: `INV-${String(item.id).slice(0, 4).toUpperCase()}`,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade_contabilizada || 1),
        origem: 'Inventário',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: inv.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(dataHoraRef),
        produtos: item.produtos
      });
    });

    // Processa Conferência Cega
    (dadosConfCega || []).forEach((item: any) => {
      if (!item.data_validade) return;
      const dias = calcularDiasParaVencer(item.data_validade);

      const chaveLeitura = usuarioId ? `${item.id}_${usuarioId}` : item.id;
      const leituraReg = mapaLeituras[chaveLeitura] || (usuarioId ? mapaLeituras[item.id] : null);

      const conf = item.conferencias_mestre || {};
      const dataHoraRef = item.created_at || conf.created_at || (conf.data_conferencia ? `${conf.data_conferencia}T${conf.hora_conferencia || '00:00:00'}` : undefined);

      listaUnificada.push({
        id: item.id,
        codigo_customizado: `CEG-${String(item.id).slice(0, 4).toUpperCase()}`,
        produto_id: item.produto_id,
        lote: item.lote || 'S/L',
        data_validade: item.data_validade,
        quantidade: Number(item.quantidade_contada || 1),
        origem: 'Conf. Cega',
        diasParaVencer: dias,
        statusLeitura: leituraReg ? 'Visto' : 'Pendente',
        visualizadoPor: leituraReg?.usuarios?.nome,
        visualizadoEm: leituraReg ? `${leituraReg.data_visualizacao} às ${leituraReg.hora_visualizacao}` : undefined,
        usuarioNome: conf.usuarios?.nome || 'SISTEMA',
        dataHoraRegistro: formatarDataHora(dataHoraRef),
        produtos: item.produtos
      });
    });

    return listaUnificada.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
  },

  // 5. Listar ciclos de ação (em curso e finalizados) com histórico completo
  async listarCiclos(): Promise<CicloVencimento[]> {
    const { data, error } = await supabase
      .from('vencimentos_ciclos')
      .select(SELECT_CICLO)
      .order('iniciado_em', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapearCiclo);
  },

  // 6. Buscar fornecedores (Troca / Negociação)
  async buscarFornecedores(termo: string): Promise<FornecedorOpcao[]> {
    const t = termo.trim();
    let query = supabase
      .from('fornecedores')
      .select('id, nome_fantasia, razao_social, cnpj')
      .order('nome_fantasia', { ascending: true })
      .limit(15);

    if (t) {
      const pattern = t.replace(/\s+/g, '%');
      query = query.or(`nome_fantasia.ilike.%${pattern}%,razao_social.ilike.%${pattern}%,cnpj.ilike.%${pattern}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as FornecedorOpcao[];
  },

  // 7. Primeira ação de um item: abre o ciclo (se ainda não existir) e grava a ação
  async registrarPrimeiraAcao(item: VencimentoItem, acao: NovaAcaoPayload, usuarioId?: string): Promise<string> {
    const { data: existente, error: errBusca } = await supabase
      .from('vencimentos_ciclos')
      .select('id, status')
      .eq('origem', item.origem)
      .eq('item_origem_id', item.id)
      .maybeSingle();

    if (errBusca) throw errBusca;

    if (existente) {
      if (existente.status === 'Finalizado') {
        throw new Error('O ciclo deste item já foi finalizado.');
      }
      await vencimentosService.registrarAcao(existente.id, acao, usuarioId);
      return existente.id;
    }

    const prod = item.produtos;
    const { data: ciclo, error: errCiclo } = await supabase
      .from('vencimentos_ciclos')
      .insert({
        codigo_customizado: `VCL-${Date.now().toString(36).toUpperCase()}`,
        origem: item.origem,
        item_origem_id: item.id,
        produto_id: item.produto_id,
        lote: item.lote,
        data_validade: item.data_validade,
        quantidade: item.quantidade,
        custo_unitario: Number(prod?.custoreal || 0),
        preco_venda: Number(prod?.pvenda || 0),
        status: 'Em Curso',
        iniciado_por: usuarioId || null
      })
      .select('id')
      .single();

    if (errCiclo) throw errCiclo;

    try {
      await vencimentosService.registrarAcao(ciclo.id, acao, usuarioId);
    } catch (errAcao) {
      // Não deixa ciclo órfão (sem nenhuma ação) caso a ação falhe
      await supabase.from('vencimentos_ciclos').delete().eq('id', ciclo.id);
      throw errAcao;
    }

    return ciclo.id;
  },

  // 8. Ações seguintes (a partir da aba Ações em Curso)
  async registrarAcao(cicloId: string, acao: NovaAcaoPayload, usuarioId?: string): Promise<void> {
    const { error } = await supabase.from('vencimentos_acoes').insert({
      ciclo_id: cicloId,
      tipo: acao.tipo,
      quantidade: acao.quantidade ?? null,
      preco_custo: acao.preco_custo ?? null,
      preco_venda: acao.preco_venda ?? null,
      margem_atual_pct: acao.margem_atual_pct ?? null,
      preco_oferta: acao.preco_oferta ?? null,
      margem_oferta_pct: acao.margem_oferta_pct ?? null,
      validade_oferta: acao.validade_oferta || null,
      fornecedor_id: acao.fornecedor_id || null,
      modalidade_negociacao: acao.modalidade_negociacao || null,
      novo_custo: acao.novo_custo ?? null,
      valor_negociado: acao.valor_negociado ?? null,
      justificativa: acao.justificativa?.trim() || null,
      observacao: acao.observacao?.trim() || null,
      usuario_id: usuarioId || null
    });

    if (error) throw error;

    await supabase
      .from('vencimentos_ciclos')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', cicloId);
  },

  // 9. Finalizar ciclo: move para Ações Finalizadas levando todo o histórico
  async finalizarCiclo(cicloId: string, desfecho: string, observacaoFinal: string, usuarioId?: string): Promise<void> {
    const agora = new Date().toISOString();
    const { error } = await supabase
      .from('vencimentos_ciclos')
      .update({
        status: 'Finalizado',
        finalizado_por: usuarioId || null,
        finalizado_em: agora,
        desfecho,
        observacao_final: observacaoFinal.trim() || null,
        updated_at: agora
      })
      .eq('id', cicloId)
      .eq('status', 'Em Curso');

    if (error) throw error;
  },

  // 10. Reabrir ciclo finalizado por engano (volta para Ações em Curso)
  async reabrirCiclo(cicloId: string): Promise<void> {
    const { error } = await supabase
      .from('vencimentos_ciclos')
      .update({
        status: 'Em Curso',
        finalizado_por: null,
        finalizado_em: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', cicloId);

    if (error) throw error;
  }
};
