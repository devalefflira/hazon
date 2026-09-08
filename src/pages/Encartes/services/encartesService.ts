// src/pages/Encartes/services/encartesService.ts
import { supabase } from '../../../lib/supabaseClient';

export interface ProdutoAgrupadoEncarte {
  produto_base_id: string;
  descricao_base: string;
  preco_oferta: number;
  preco_tabela: number;
  unidade: string;
  imagem_url?: string | null;
  variacoes: string[]; // Sabores ou fragrâncias unificadas
}

export const encartesService = {
  // 1. Buscar Ofertas Concluídas para iniciar o fluxo
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

  // 2. Normalizador Inteligente para Agrupar Sabores/Fragrâncias
  extrairNomeBase(descricao: string): string {
    return descricao
      .replace(/\b(morango|uva|abacaxi|limão|limao|laranja|chocolate|baunilha|maracujá|maracuja|coco|manga|banana)\b/gi, '')
      .replace(/\b(lavanda|floral|eucalipto|original|tradicional|active|fresh|sensitive|suave)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  // 3. Processa e Agrupa os Produtos da Oferta
  async prepararItensOfertaParaEncarte(ofertaItens: any[]): Promise<ProdutoAgrupadoEncarte[]> {
    // Busca as imagens cadastradas para todos os produtos da oferta
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

      // Chave de agrupamento: descrição base + preço idêntico
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
      // Registro padrão inicial caso não exista
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

  // 6. Repositório de Imagens dos Produtos
  async associarImagemProduto(produto_id: string, imagem_url: string): Promise<void> {
    const { error } = await supabase
      .from('encartes_produtos_imagens')
      .upsert(
        { produto_id, imagem_url, updated_at: new Date().toISOString() },
        { onConflict: 'produto_id' }
      );
    if (error) throw error;
  },

  // Busca inteligente de produtos para o Repositório (código, código de barras, descrição completa, parcial ou %)
  async buscarProdutosParaRepositorio(termo: string): Promise<any[]> {
    if (!termo.trim()) return [];

    const termoLimpo = termo.trim();
    const palavras = termoLimpo.split(/\s+/).filter(Boolean);

    let query = supabase
      .from('produtos')
      .select('id, codprod, codbarra, descricao, unidade, pvenda, custoreal');

    if (palavras.length === 1) {
      const p = palavras[0].replace(/%/g, '');
      query = query.or(`codprod.ilike.%${p}%,codbarra.ilike.%${p}%,descricao.ilike.%${p}%`);
    } else {
      const pattern = `%${palavras.map(p => p.replace(/%/g, '')).join('%')}%`;
      query = query.ilike('descricao', pattern);
    }

    const { data, error } = await query.limit(25);
    if (error) {
      console.error('Erro ao buscar produtos para o repositório:', error);
      return [];
    }

    return data || [];
  },

  // 7. Encartes Salvos (Em Andamento / Concluídos)
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