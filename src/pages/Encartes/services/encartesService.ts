// src/pages/Encartes/services/encartesService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface ProdutoAgrupadoEncarte {
  produto_base_id: string;
  descricao_base: string;
  preco_oferta: number;
  preco_tabela: number;
  unidade: string;
  imagem_url?: string | null;
  variacoes: string[];
}

export interface FiltrosRepositorio {
  tipo: 'COM_IMAGEM' | 'SEM_IMAGEM';
  termo?: string;
  departamento?: string;
  secao?: string;
  pagina: number;
  itensPorPagina: number;
}

export const encartesService = {
  // 1. Buscar Ofertas Concluídas
  async listarOfertasConcluidas(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ofertas_mestre')
      .select(`
        id,
        codigo_customizado,
        tipo_oferta,
        tipo_oferta_customizado,
        data_inicio,
        data_fim,
        oferta_itens (
          id,
          produto_id,
          preco_oferta,
          preco_venda_tabela,
          produtos (
            id,
            codprod,
            descricao,
            unidade
          )
        )
      `)
      .eq('status', 'Concluida')
      .order('data_fim', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 2. Normalizador para Sabores/Fragrâncias
  extrairNomeBase(descricao: string): string {
    if (!descricao) return 'PRODUTO';

    // Remove siglas operacionais de atacado e hortifrúti
    let limpo = descricao
      .replace(/\b(kg|flv|agranel|granel|pct|pcte|pacote|cx|caixa|und|unid|unidade|bd|bandeja|acg)\b/gi, '')
      .replace(/[\/\\#,+()$~%.'":*?<>{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Se após limpar sobrar vazio, mantém a descrição original
    return limpo || descricao.trim();
  },

  // 3. Processar Itens para Encarte
  async prepararItensOfertaParaEncarte(ofertaItens: any[]): Promise<ProdutoAgrupadoEncarte[]> {
    const produtosIds = ofertaItens.map((it) => it.produto_id);
    const { data: imagensData } = await supabase
      .from('encartes_produtos_imagens')
      .select('produto_id, imagem_url')
      .in('produto_id', produtosIds);

    const imagensMap = new Map<string, string>();
    (imagensData || []).forEach((img: any) => {
      imagensMap.set(img.produto_id, img.imagem_url);
    });

    const mapaAgrupado = new Map<string, ProdutoAgrupadoEncarte>();

    ofertaItens.forEach((it) => {
      const descCompleta = it.produtos?.descricao || 'Produto';
      const descBase = this.extrairNomeBase(descCompleta);
      const preco = Number(it.preco_oferta || it.produtos?.pvenda || 0);
      const chave = `${descBase.toLowerCase()}_${preco.toFixed(2)}`;

      if (!mapaAgrupado.has(chave)) {
        mapaAgrupado.set(chave, {
          produto_base_id: it.produto_id,
          descricao_base: descBase,
          preco_oferta: preco,
          preco_tabela: Number(it.preco_venda_tabela || it.produtos?.pvenda || 0),
          unidade: it.produtos?.unidade || 'UN',
          imagem_url: imagensMap.get(it.produto_id) || null,
          variacoes: [descCompleta]
        });
      } else {
        const itemExistente = mapaAgrupado.get(chave)!;
        if (!itemExistente.variacoes.includes(descCompleta)) {
          itemExistente.variacoes.push(descCompleta);
        }
        if (!itemExistente.imagem_url && imagensMap.has(it.produto_id)) {
          itemExistente.imagem_url = imagensMap.get(it.produto_id);
        }
      }
    });

    return Array.from(mapaAgrupado.values());
  },

  // 4. Temas e Templates
  async listarTemasComTemplates(): Promise<any[]> {
    const { data, error } = await supabase
      .from('encartes_temas')
      .select(`
        id,
        nome,
        categoria,
        encartes_templates (
          id,
          nome,
          imagem_fundo_url,
          cor_predominante
        )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async criarTema(nome: string): Promise<any> {
    const { data, error } = await supabase
      .from('encartes_temas')
      .insert([{ nome }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cadastrarTemplate(payload: { tema_id: string; nome: string; imagem_fundo_url: string; cor_predominante?: string }): Promise<void> {
    const { error } = await supabase.from('encartes_templates').insert([payload]);
    if (error) throw error;
  },

  // 5. Configuração da Empresa
  async obterConfigEmpresa(): Promise<any> {
    const { data, error } = await supabase
      .from('encartes_config_empresa')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const { data: novo } = await supabase
        .from('encartes_config_empresa')
        .insert([{}])
        .select()
        .single();
      return novo;
    }
    return data;
  },

  async salvarConfigEmpresa(config: any): Promise<void> {
    const { error } = await supabase
      .from('encartes_config_empresa')
      .upsert({ id: config.id, ...config, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  // 6. Repositório de Imagens: Salvar e Excluir
  async associarImagemProduto(produto_id: string, imagem_url: string): Promise<void> {
    const { error } = await supabase
      .from('encartes_produtos_imagens')
      .upsert(
        { produto_id, imagem_url, updated_at: new Date().toISOString() },
        { onConflict: 'produto_id' }
      );
    if (error) throw error;
  },

  async removerImagemProduto(produto_id: string): Promise<void> {
    const { error } = await supabase
      .from('encartes_produtos_imagens')
      .delete()
      .eq('produto_id', produto_id);
    if (error) throw error;
  },

  // 7. Buscar Departamentos e Seções únicos
  async buscarFiltrosDepartamentosSecoes(): Promise<{ departamentos: string[]; secoes: string[] }> {
    const { data } = await supabase
      .from('produtos')
      .select('departamento, secao');

    const deps = new Set<string>();
    const secs = new Set<string>();

    (data || []).forEach((p: any) => {
      if (p.departamento) deps.add(p.departamento);
      if (p.secao) secs.add(p.secao);
    });

    return {
      departamentos: Array.from(deps).sort(),
      secoes: Array.from(secs).sort()
    };
  },

  // 8. Listar Repositório com Paginação e Filtros
  async listarRepositorioPaginado(filtros: FiltrosRepositorio): Promise<{ itens: any[]; total: number }> {
    // Busca todas as imagens associadas
    const { data: todasImagens, error: errImg } = await supabase
      .from('encartes_produtos_imagens')
      .select('produto_id, imagem_url');

    if (errImg) throw errImg;

    const mapaImagens = new Map<string, string>();
    (todasImagens || []).forEach((img: any) => mapaImagens.set(img.produto_id, img.imagem_url));
    const idsComImagem = Array.from(mapaImagens.keys());

    let query = supabase
      .from('produtos')
      .select('id, codprod, codbarra, descricao, unidade, departamento, secao', { count: 'exact' });

    // Filtra IDs conforme sub-aba
    if (filtros.tipo === 'COM_IMAGEM') {
      if (idsComImagem.length === 0) return { itens: [], total: 0 };
      query = query.in('id', idsComImagem);
    } else {
      if (idsComImagem.length > 0) {
        // IDs que não possuem imagem
        query = query.not('id', 'in', `(${idsComImagem.join(',')})`);
      }
    }

    // Filtros de Departamento e Seção
    if (filtros.departamento && filtros.departamento !== 'TODOS') {
      query = query.eq('departamento', filtros.departamento);
    }
    if (filtros.secao && filtros.secao !== 'TODOS') {
      query = query.eq('secao', filtros.secao);
    }

    // Busca por termo (cód sistema, cód barras, descrição ou %)
    if (filtros.termo && filtros.termo.trim()) {
      const termoLimpo = filtros.termo.trim();
      const palavras = termoLimpo.split(/\s+/).filter(Boolean);

      if (palavras.length === 1) {
        const p = palavras[0].replace(/%/g, '');
        query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
      } else {
        const pattern = `%${palavras.map((p) => p.replace(/%/g, '')).join('%')}%`;
        query = query.ilike('descricao', pattern);
      }
    }

    // Paginação
    const inicio = (filtros.pagina - 1) * filtros.itensPorPagina;
    const fim = inicio + filtros.itensPorPagina - 1;

    query = query.order('descricao', { ascending: true }).range(inicio, fim);

    const { data, count, error } = await query;
    if (error) throw error;

    const itensCompletos = (data || []).map((prod: any) => ({
      ...prod,
      imagem_url: mapaImagens.get(prod.id) || null
    }));

    return {
      itens: itensCompletos,
      total: count || 0
    };
  },

  // 9. Encartes Salvos
  async listarEncartes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('encartes_mestre')
      .select(`
        *,
        encartes_templates ( id, nome, imagem_fundo_url ),
        ofertas_mestre ( id, codigo_customizado, tipo_oferta )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async salvarEncarte(payload: {
    id?: string;
    codigo_customizado?: string;
    oferta_id?: string;
    template_id?: string;
    titulo: string;
    status: 'Em Andamento' | 'Concluído';
    dados_produtos_json: any;
    config_aplicada_json: any;
  }): Promise<void> {
    const cod = payload.codigo_customizado || `ENC-${Math.floor(100000 + Math.random() * 900000)}`;
    const { error } = await supabase
      .from('encartes_mestre')
      .upsert({
        ...payload,
        codigo_customizado: cod,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }
};