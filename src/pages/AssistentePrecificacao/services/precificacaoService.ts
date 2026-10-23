// src/pages/AssistentePrecificacao/services/precificacaoService.ts
import { supabase } from '../../../lib/supabaseClient';
import type {
  AjusteAplicado,
  ItemImportado,
  ItemPrecificacaoRegistro,
  LotePrecificacao,
  ParametrosAnalise,
  ProdutoCadastro
} from '../types/precificacao.types';

const TAMANHO_LOTE_ESCRITA = 500;
const TAMANHO_LOTE_CONSULTA = 200;
const PAGINA_LEITURA = 1000;

const dividirEmBlocos = <T,>(lista: T[], tamanho: number): T[][] => {
  const blocos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) blocos.push(lista.slice(i, i + tamanho));
  return blocos;
};

export const precificacaoService = {
  /** Busca no cadastro de produtos os códigos informados. Retorna um mapa por codprod. */
  async buscarProdutosPorCodigo(codigos: string[]): Promise<Map<string, ProdutoCadastro>> {
    const mapa = new Map<string, ProdutoCadastro>();
    const unicos = Array.from(new Set(codigos.filter(Boolean)));

    for (const bloco of dividirEmBlocos(unicos, TAMANHO_LOTE_CONSULTA)) {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, codprod, custoreal, pvenda')
        .in('codprod', bloco);

      if (error) throw error;
      (data || []).forEach((p: any) => {
        mapa.set(String(p.codprod), {
          id: p.id,
          codprod: String(p.codprod),
          custoreal: Number(p.custoreal || 0),
          pvenda: Number(p.pvenda || 0)
        });
      });
    }

    return mapa;
  },

  async criarLote(payload: {
    usuario_id: string;
    arquivo_nome: string;
    periodo_inicio: string;
    periodo_fim: string;
    total_itens: number;
    parametros: ParametrosAnalise;
  }): Promise<LotePrecificacao> {
    const codigo = `APR-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data, error } = await supabase
      .from('precificacao_lotes')
      .insert([{ codigo_customizado: codigo, status: 'Importado', ...payload }])
      .select('*')
      .single();

    if (error) throw error;
    return data as LotePrecificacao;
  },

  async atualizarLote(loteId: string, patch: Partial<Pick<LotePrecificacao, 'total_ajustes_sugeridos' | 'parametros' | 'status'>>): Promise<void> {
    const { error } = await supabase
      .from('precificacao_lotes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', loteId);

    if (error) throw error;
  },

  async inserirItens(loteId: string, itens: ItemImportado[], produtos: Map<string, ProdutoCadastro>, periodo: { inicio: string; fim: string }): Promise<void> {
    const linhas = itens.map((it) => ({
      lote_id: loteId,
      produto_id: produtos.get(it.codprod)?.id ?? null,
      codprod: it.codprod,
      descricao: it.descricao,
      codbarra: it.codbarra || null,
      unidade: it.unidade || null,
      embalagem: it.embalagem || null,
      data_alteracao_preco: it.dataAlteracao,
      custo_atual: it.custoAtual,
      custo_penultimo: it.custoPenultimo,
      custo_antepenultimo: it.custoAntepenultimo,
      preco_venda: it.precoVenda,
      margem_cadastro_pct: it.margemCadastroPct,
      margem_calculada_pct: it.margemCalculadaPct,
      cod_fornecedor: it.codFornecedor || null,
      nome_fornecedor: it.nomeFornecedor || null,
      data_ultima_entrada: it.dataUltimaEntrada,
      numero_nota: it.numeroNota || null,
      dentro_periodo: !it.dataAlteracao || (it.dataAlteracao >= periodo.inicio && it.dataAlteracao <= periodo.fim),
      analisado: false,
      status: 'Pendente',
      alertas: [],
      precisa_ajuste: false
    }));

    for (const bloco of dividirEmBlocos(linhas, TAMANHO_LOTE_ESCRITA)) {
      const { error } = await supabase.from('precificacao_itens').insert(bloco);
      if (error) throw error;
    }
  },

  /** Lê todos os itens do lote, paginando para não ser cortado pelo limite do PostgREST. */
  async listarItens(loteId: string): Promise<ItemPrecificacaoRegistro[]> {
    const todos: ItemPrecificacaoRegistro[] = [];
    let inicio = 0;

    while (true) {
      const { data, error } = await supabase
        .from('precificacao_itens')
        .select('*')
        .eq('lote_id', loteId)
        .order('descricao', { ascending: true })
        .order('id', { ascending: true })
        .range(inicio, inicio + PAGINA_LEITURA - 1);

      if (error) throw error;
      const pagina = (data || []) as ItemPrecificacaoRegistro[];
      todos.push(...pagina);
      if (pagina.length < PAGINA_LEITURA) break;
      inicio += PAGINA_LEITURA;
    }

    return todos;
  },

  /** Grava o resultado da análise de cada item do lote. */
  async salvarResultadosAnalise(atualizacoes: Array<{ id: string } & Partial<ItemPrecificacaoRegistro>>): Promise<void> {
    for (const bloco of dividirEmBlocos(atualizacoes, 25)) {
      await Promise.all(
        bloco.map(async ({ id, ...campos }) => {
          const { error } = await supabase.from('precificacao_itens').update(campos).eq('id', id);
          if (error) throw error;
        })
      );
    }
  },

  /** Atualiza o preço de venda no cadastro de produtos e registra o histórico do ajuste. */
  async aplicarAjustes(ajustes: AjusteAplicado[]): Promise<void> {
    for (const aj of ajustes) {
      const { error: errProduto } = await supabase
        .from('produtos')
        .update({ pvenda: aj.preco_novo, updated_at: new Date().toISOString() })
        .eq('id', aj.produto_id);
      if (errProduto) throw errProduto;
    }

    for (const bloco of dividirEmBlocos(ajustes, TAMANHO_LOTE_ESCRITA)) {
      const { error } = await supabase.from('precificacao_ajustes').insert(bloco);
      if (error) throw error;
    }
  }
};
