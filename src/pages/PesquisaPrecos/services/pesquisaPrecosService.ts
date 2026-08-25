// src/pages/PesquisaPrecos/services/pesquisaPrecosService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface Concorrente {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  created_at?: string;
}

export interface PesquisaItemForm {
  produto_id: string;
  codprod: string;
  descricao: string;
  preco_custo: number;
  preco_venda: number;
  preco_concorrente: number;
}

export const pesquisaPrecosService = {
  // --- CONCORRENTES ---
  async listarConcorrentes(): Promise<Concorrente[]> {
    const { data, error } = await supabase
      .from('pesquisa_precos_concorrentes')
      .select('*')
      .order('nome_fantasia', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async cadastrarConcorrente(payload: { razao_social: string; nome_fantasia: string }): Promise<void> {
    const { error } = await supabase
      .from('pesquisa_precos_concorrentes')
      .insert([payload]);

    if (error) throw error;
  },

  // --- BUSCA INTELIGENTE DE PRODUTOS ---
  async buscarProdutos(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const palavras = termo.trim().split(/\s+/).filter(Boolean);
    let query = supabase
      .from('produtos')
      .select('id, codprod, descricao, codbarra, custoreal, pvenda, departamento');

    if (palavras.length === 1) {
      const p = palavras[0];
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else {
      const pattern = `%${palavras.join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data || [];
  },

  // --- PESQUISAS DE PREÇOS ---
  async listarPesquisas(): Promise<any[]> {
    const { data, error } = await supabase
      .from('pesquisa_precos_mestre')
      .select(`
        *,
        usuarios ( id, nome ),
        pesquisa_precos_concorrentes ( id, razao_social, nome_fantasia ),
        pesquisa_precos_itens (
          id,
          produto_id,
          preco_custo,
          preco_venda,
          preco_concorrente,
          produtos (
            id,
            codprod,
            descricao,
            unidade
          )
        )
      `)
      .order('data_registro', { ascending: false })
      .order('hora_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async salvarPesquisa(payload: {
    id?: string;
    usuario_id: string;
    concorrente_id: string;
    origem: string;
    categoria_pesquisa: string;
    itens: PesquisaItemForm[];
  }): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let mestreId = payload.id;

    if (mestreId) {
      // Atualização
      const { error: errUpdate } = await supabase
        .from('pesquisa_precos_mestre')
        .update({
          concorrente_id: payload.concorrente_id,
          origem: payload.origem,
          categoria_pesquisa: payload.categoria_pesquisa,
          updated_at: agora.toISOString()
        })
        .eq('id', mestreId);

      if (errUpdate) throw errUpdate;

      // Deleta itens antigos para reinserir
      await supabase.from('pesquisa_precos_itens').delete().eq('pesquisa_mestre_id', mestreId);
    } else {
      // Novo registro
      const codigoCustom = `PP-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: novoMestre, error: errInsert } = await supabase
        .from('pesquisa_precos_mestre')
        .insert([
          {
            codigo_customizado: codigoCustom,
            usuario_id: payload.usuario_id,
            concorrente_id: payload.concorrente_id,
            origem: payload.origem,
            categoria_pesquisa: payload.categoria_pesquisa,
            data_registro: dataAtual,
            hora_registro: horaAtual
          }
        ])
        .select('id')
        .single();

      if (errInsert) throw errInsert;
      mestreId = novoMestre.id;
    }

    // Inserção dos itens
    const payloadItens = payload.itens.map((it) => ({
      pesquisa_mestre_id: mestreId,
      produto_id: it.produto_id,
      preco_custo: it.preco_custo,
      preco_venda: it.preco_venda,
      preco_concorrente: it.preco_concorrente
    }));

    const { error: errItens } = await supabase
      .from('pesquisa_precos_itens')
      .insert(payloadItens);

    if (errItens) throw errItens;
  },

  // Marcar como enviado para ofertas
  async marcarEnviadoParaOfertas(pesquisaMestreId: string): Promise<void> {
    const { error } = await supabase
      .from('pesquisa_precos_mestre')
      .update({ enviado_para_ofertas: true })
      .eq('id', pesquisaMestreId);

    if (error) throw error;
  },

  // Sincronizar itens perdedores com o módulo de Ofertas
  async sincronizarComOfertas(pesquisa: any, itensPerdedores: any[]): Promise<void> {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const codigoOferta = `OFT-PESQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: ofertaMestre, error: errMestre } = await supabase
      .from('ofertas_mestre')
      .insert([
        {
          codigo_customizado: codigoOferta,
          usuario_id: pesquisa.usuario_id,
          tipo_oferta: 'Campanha',
          tipo_oferta_customizado: `Pesquisa vs ${pesquisa.pesquisa_precos_concorrentes?.nome_fantasia || 'Concorrente'}`,
          status: 'Em Andamento',
          data_inicio: dataAtual,
          data_registro: dataAtual,
          hora_registro: horaAtual
        }
      ])
      .select('id')
      .single();

    if (errMestre) throw errMestre;

    const itensPayload = itensPerdedores.map((it) => ({
      oferta_mestre_id: ofertaMestre.id,
      produto_id: it.produto_id,
      preco_custo_real: Number(it.preco_custo || 0),
      preco_venda_tabela: Number(it.preco_venda || 0),
      // Sugere o preço concorrente como preco de oferta base
      preco_oferta: Number(it.preco_concorrente || 0)
    }));

    const { error: errItens } = await supabase
      .from('oferta_itens')
      .insert(itensPayload);

    if (errItens) throw errItens;
  }
};