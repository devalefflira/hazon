// src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRecord, FiltrosAvariaPayload, NovaAvariaPayload } from '../types/avarias.types';
import { dispararNotificacaoTelegram } from '../../../services/telegramNotificationService';

export const avariasService = {
  // 1. Listar registros de Avarias com dados de produto e usuário
  async listarAvarias(filtros?: FiltrosAvariaPayload): Promise<AvariaRecord[]> {
    let query = supabase
      .from('avarias')
      .select(`
        *,
        produtos (
          id,
          codprod,
          descricao,
          codbarra,
          unidade,
          custoreal,
          pvenda,
          departamento,
          secao,
          categoria
        ),
        motivos_avaria (
          id,
          descricao
        ),
        usuarios (
          id,
          nome
        )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (filtros?.motivo_id) {
      query = query.eq('motivo_avaria_id', filtros.motivo_id);
    }

    if (filtros?.destinacao) {
      query = query.eq('destinacao', filtros.destinacao);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar avarias:', error);
      throw error;
    }

    return (data || []) as AvariaRecord[];
  },

  // 2. Listar Motivos de Avaria
  async listarMotivosAvaria(): Promise<any[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Buscar opções únicas e mapeamentos em cascata de Departamentos, Seções e Categorias
  async buscarOpcoesFiltrosProdutos(): Promise<{
    departamentos: string[];
    secoes: string[];
    categorias: string[];
    secoesPorDepartamento: Record<string, string[]>;
    categoriasPorSecao: Record<string, string[]>;
  }> {
    const { data, error } = await supabase
      .from('produtos')
      .select('departamento, secao, categoria');

    if (error) {
      console.error('Erro ao buscar opções de filtros:', error);
      throw error;
    }

    const ehValido = (txt: any): boolean => {
      if (!txt || typeof txt !== 'string') return false;
      const t = txt.trim();
      return t.length >= 2 && isNaN(Number(t)) && !t.includes('.');
    };

    const deptosSet = new Set<string>();
    const secoesSet = new Set<string>();
    const catsSet = new Set<string>();

    const secoesPorDep: Record<string, Set<string>> = {};
    const catsPorSec: Record<string, Set<string>> = {};

    (data || []).forEach((p: any) => {
      const dep = p.departamento?.trim();
      const sec = p.secao?.trim();
      const cat = p.categoria?.trim();

      if (ehValido(dep)) {
        deptosSet.add(dep);
        if (!secoesPorDep[dep]) secoesPorDep[dep] = new Set();
        if (ehValido(sec)) {
          secoesPorDep[dep].add(sec);
        }
      }

      if (ehValido(sec)) {
        secoesSet.add(sec);
        if (!catsPorSec[sec]) catsPorSec[sec] = new Set();
        if (ehValido(cat)) {
          catsPorSec[sec].add(cat);
        }
      }

      if (ehValido(cat)) {
        catsSet.add(cat);
      }
    });

    const secoesPorDepartamento: Record<string, string[]> = {};
    Object.keys(secoesPorDep).forEach((k) => {
      secoesPorDepartamento[k] = Array.from(secoesPorDep[k]).sort();
    });

    const categoriasPorSecao: Record<string, string[]> = {};
    Object.keys(catsPorSec).forEach((k) => {
      categoriasPorSecao[k] = Array.from(catsPorSec[k]).sort();
    });

    return {
      departamentos: Array.from(deptosSet).sort(),
      secoes: Array.from(secoesSet).sort(),
      categorias: Array.from(catsSet).sort(),
      secoesPorDepartamento,
      categoriasPorSecao
    };
  },

  // 4. Buscar produtos por autocomplete (código, barras ou descrição com %)
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, unidade, custoreal, pvenda, departamento, secao, categoria');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }

    return data || [];
  },

  // 5. Registrar Nova Avaria (+ Notificação Telegram + Integração Consumo Loja)
  async registrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    const codigoCustom = `AV${Math.floor(1000 + Math.random() * 9000)}`;
    
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let motivoIdFinal = payload.motivo_avaria_id;
    let motivoDescricao = 'AVARIA (GERAL)';

    const { data: motivoBanco } = await supabase
      .from('motivos_avaria')
      .select('id, descricao')
      .eq('id', payload.motivo_avaria_id)
      .maybeSingle();

    if (motivoBanco) {
      motivoIdFinal = motivoBanco.id;
      motivoDescricao = motivoBanco.descricao;
    } else if (motivoIdFinal.startsWith('m')) {
      const { data: motivoPrimeiro } = await supabase
        .from('motivos_avaria')
        .select('id, descricao')
        .limit(1)
        .single();
      if (motivoPrimeiro) {
        motivoIdFinal = motivoPrimeiro.id;
        motivoDescricao = motivoPrimeiro.descricao;
      }
    }

    const [prodRes, userRes] = await Promise.all([
      supabase.from('produtos').select('codprod, descricao, unidade, departamento').eq('id', payload.produto_id).single(),
      payload.usuario_id ? supabase.from('usuarios').select('nome').eq('id', payload.usuario_id).single() : Promise.resolve({ data: null })
    ]);

    const prodInfo = prodRes.data;
    const nomeUsuario = userRes.data?.nome || 'Operador';

    const objetoInsert: Record<string, any> = {
      codigo_customizado: codigoCustom,
      produto_id: payload.produto_id,
      motivo_avaria_id: motivoIdFinal,
      quantidade: payload.quantidade,
      preco_custo_na_perda: payload.preco_custo_na_perda,
      destinacao: payload.destinacao,
      observacao: payload.observacao || null,
      usuario_id: payload.usuario_id || null,
      data_registro: dataAtual,
      hora_registro: horaAtual
    };

    const { error: errorAvaria } = await supabase
      .from('avarias')
      .insert([objetoInsert]);

    if (errorAvaria) {
      console.error('Erro ao registrar avaria:', errorAvaria);
      throw errorAvaria;
    }

    // Disparo Telegram Unitário
    const valorPerdaTotal = Number(payload.quantidade || 0) * Number(payload.preco_custo_na_perda || 0);
    const mensagemTelegram = `🚨 <b>AVARIA REGISTRADA</b>\n\n` +
      `<b>Código:</b> <code>#${codigoCustom}</code>\n` +
      `<b>Produto:</b> ${prodInfo?.descricao || 'NÃO IDENTIFICADO'}\n` +
      `<b>Cód. Sistema:</b> ${prodInfo?.codprod || '-'} | <b>Depto:</b> ${prodInfo?.departamento || 'GERAL'}\n` +
      `<b>Quantidade:</b> ${payload.quantidade} ${prodInfo?.unidade || 'UN'}\n` +
      `<b>Custo Unitário:</b> R$ ${Number(payload.preco_custo_na_perda || 0).toFixed(2).replace('.', ',')}\n` +
      `<b>Perda Total:</b> <code>R$ ${valorPerdaTotal.toFixed(2).replace('.', ',')}</code>\n` +
      `<b>Motivo:</b> ${motivoDescricao.toUpperCase()}\n` +
      `<b>Destino:</b> ${payload.destinacao.toUpperCase()}\n` +
      `<b>Responsável:</b> ${nomeUsuario}\n` +
      (payload.observacao ? `📝 <i>"${payload.observacao}"</i>\n` : '');

    dispararNotificacaoTelegram({
      mensagemHtml: mensagemTelegram,
      textoBotao: '🔗 Abrir Módulo de Avarias',
      urlBotao: '/?tela=avarias'
    }).catch((e) => console.error('Erro silencioso telegram:', e));

    // Se o destino for "Consumo Interno", gera a cópia trackeada no Consumo Loja
    const destFormatada = (payload.destinacao || '').toLowerCase();
    if (destFormatada.includes('consumo')) {
      try {
        const codigoConsumo = `CSM-AV-${Math.floor(100000 + Math.random() * 900000)}`;

        const { data: mestreConsumo, error: errMestre } = await supabase
          .from('consumo_loja_mestre')
          .insert([
            {
              codigo_customizado: codigoConsumo,
              usuario_id: payload.usuario_id,
              data_registro: dataAtual,
              hora_registro: horaAtual,
              valor_total: valorPerdaTotal,
              observacao: `Origem Avaria (${codigoCustom}) - ${payload.observacao || 'Destino Consumo Interno'}`
            }
          ])
          .select('id')
          .single();

        if (!errMestre && mestreConsumo) {
          await supabase.from('consumo_loja_itens').insert([
            {
              consumo_mestre_id: mestreConsumo.id,
              produto_id: payload.produto_id,
              quantidade: payload.quantidade,
              unidade_medida: prodInfo?.unidade || 'UN',
              local: 'Consumo Interno (Avaria)',
              departamento: prodInfo?.departamento || 'Geral',
              custo_unitario: payload.preco_custo_na_perda,
              valor_total_item: valorPerdaTotal,
              observacao: `Trackeado via Avaria ${codigoCustom}`
            }
          ]);
        }
      } catch (errIntegracao) {
        console.error('Erro ao sincronizar com Consumo Loja:', errIntegracao);
      }
    }
  },

  async cadastrarAvaria(payload: NovaAvariaPayload): Promise<void> {
    return this.registrarAvaria(payload);
  },

  // 6. Registrar Múltiplas Avarias em Lote (+ Notificação Telegram Consolidada)
  async registrarAvariasEmLote(payload: {
    motivo_avaria_id: string;
    destinacao: string;
    observacao?: string;
    usuario_id?: string;
    itens: Array<{
      produto_id: string;
      codprod?: string;
      descricao?: string;
      quantidade: number;
      preco_custo_na_perda: number;
      unidade?: string;
      departamento?: string;
    }>;
  }): Promise<void> {
    if (!payload.itens || payload.itens.length === 0) {
      throw new Error('Nenhum item adicionado ao lote.');
    }

    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let motivoIdFinal = payload.motivo_avaria_id;
    let motivoDescricao = 'AVARIA (GERAL)';

    const { data: motivoBanco } = await supabase
      .from('motivos_avaria')
      .select('id, descricao')
      .eq('id', payload.motivo_avaria_id)
      .maybeSingle();

    if (motivoBanco) {
      motivoIdFinal = motivoBanco.id;
      motivoDescricao = motivoBanco.descricao;
    }

    const { data: userData } = payload.usuario_id
      ? await supabase.from('usuarios').select('nome').eq('id', payload.usuario_id).single()
      : { data: null };
    const nomeUsuario = userData?.nome || 'Operador';

    const registrosAvaria = payload.itens.map((it) => ({
      codigo_customizado: `AV${Math.floor(1000 + Math.random() * 9000)}`,
      produto_id: it.produto_id,
      motivo_avaria_id: motivoIdFinal,
      quantidade: it.quantidade,
      preco_custo_na_perda: it.preco_custo_na_perda,
      destinacao: payload.destinacao,
      observacao: payload.observacao ? `[Lote] ${payload.observacao}` : '[Lançamento em Lote]',
      usuario_id: payload.usuario_id || null,
      data_registro: dataAtual,
      hora_registro: horaAtual
    }));

    const { error: errorAvarias } = await supabase
      .from('avarias')
      .insert(registrosAvaria);

    if (errorAvarias) {
      console.error('Erro ao gravar lote de avarias:', errorAvarias);
      throw errorAvarias;
    }

    // Disparo Telegram Lote
    const valorTotalLote = payload.itens.reduce(
      (acc, it) => acc + Number(it.quantidade || 0) * Number(it.preco_custo_na_perda || 0),
      0
    );
    const totalItensQtd = payload.itens.reduce((acc, it) => acc + Number(it.quantidade || 0), 0);

    const linhasItens = payload.itens.slice(0, 8).map((it) => {
      const subtotal = Number(it.quantidade || 0) * Number(it.preco_custo_na_perda || 0);
      return `• <b>${it.descricao || 'Item'}</b>: ${it.quantidade} ${it.unidade || 'UN'} (R$ ${subtotal.toFixed(2).replace('.', ',')})`;
    }).join('\n');

    const excesso = payload.itens.length > 8 ? `\n<i>... e mais ${payload.itens.length - 8} produto(s)</i>` : '';

    const mensagemTelegramLote = `📦 <b>LANÇAMENTO DE AVARIAS EM LOTE</b>\n\n` +
      `<b>Total de Produtos:</b> ${payload.itens.length} itens\n` +
      `<b>Volume Físico:</b> ${totalItensQtd.toFixed(1)} unidades/kg\n` +
      `<b>Perda Total Acumulada:</b> <code>R$ ${valorTotalLote.toFixed(2).replace('.', ',')}</code>\n` +
      `<b>Motivo Unificado:</b> ${motivoDescricao.toUpperCase()}\n` +
      `<b>Destinação:</b> ${payload.destinacao.toUpperCase()}\n` +
      `<b>Responsável:</b> ${nomeUsuario}\n\n` +
      `<b>Resumo dos Itens:</b>\n${linhasItens}${excesso}\n` +
      (payload.observacao ? `\n📝 <i>"${payload.observacao}"</i>` : '');

    dispararNotificacaoTelegram({
      mensagemHtml: mensagemTelegramLote,
      textoBotao: '🔗 Conferir Avarias no ERP',
      urlBotao: '/?tela=avarias'
    }).catch((e) => console.error('Erro silencioso telegram lote:', e));

    // Se a destinação for "Consumo Interno", sincroniza os itens no Consumo Loja
    const destFormatada = (payload.destinacao || '').toLowerCase();
    if (destFormatada.includes('consumo')) {
      try {
        const codigoConsumo = `CSM-LOT-${Math.floor(100000 + Math.random() * 900000)}`;

        const { data: mestreConsumo, error: errMestre } = await supabase
          .from('consumo_loja_mestre')
          .insert([
            {
              codigo_customizado: codigoConsumo,
              usuario_id: payload.usuario_id,
              data_registro: dataAtual,
              hora_registro: horaAtual,
              valor_total: valorTotalLote,
              observacao: `Origem Avaria em Lote (${registrosAvaria.length} itens) - ${payload.observacao || ''}`
            }
          ])
          .select('id')
          .single();

        if (!errMestre && mestreConsumo) {
          const itensConsumo = payload.itens.map((it) => ({
            consumo_mestre_id: mestreConsumo.id,
            produto_id: it.produto_id,
            quantidade: it.quantidade,
            unidade_medida: it.unidade || 'UN',
            local: 'Consumo Interno (Avaria em Lote)',
            departamento: it.departamento || 'Geral',
            custo_unitario: it.preco_custo_na_perda,
            valor_total_item: Number(it.quantidade || 0) * Number(it.preco_custo_na_perda || 0),
            observacao: 'Trackeado via Avaria em Lote'
          }));

          await supabase.from('consumo_loja_itens').insert(itensConsumo);
        }
      } catch (errSync) {
        console.error('Erro ao sincronizar consumo em lote:', errSync);
      }
    }
  }
};