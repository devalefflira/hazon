// Arquivo: src/pages/Produtos/services/produtosService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { ProdutoDTO, CriarProdutoPayload, FiltrosProdutos, ClassificacaoProduto } from '../types/produtos.types';

export const produtosService = {
  async listarProdutos(page = 0, limit = 50, filtros?: FiltrosProdutos): Promise<{ data: ProdutoDTO[]; count: number }> {
    let query = supabase
      .from('produtos')
      .select('*', { count: 'exact' });

    if (filtros?.termo) {
      query = query.or(`descricao.ilike.%${filtros.termo}%,codbarra.ilike.%${filtros.termo}%,codprod.ilike.%${filtros.termo}%`);
    }

    if (filtros?.setorId) {
      query = query.eq('departamento', filtros.setorId);
    }

    if (filtros?.departamento) {
      query = query.eq('departamento', filtros.departamento);
    }

    if (filtros?.secao) {
      query = query.eq('secao', filtros.secao);
    }

    if (filtros?.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }

    const start = page * limit;
    const end = start + limit - 1;

    const { data, count, error } = await query
      .order('descricao', { ascending: true })
      .range(start, end);

    if (error) throw error;

    // Normalização completa de todos os aliases para o estado da aplicação
    const dataTratada: ProdutoDTO[] = (data || []).map((p: any) => {
      const eanCalculado = String(p.codbarra || p.codigo_barras || p.codprod || '');
      const setorCalculado = String(p.departamento || p.secao || p.categoria || 'GERAL');

      return {
        ...p,
        codbarra: eanCalculado,
        codigo_barras: eanCalculado,
        ean: eanCalculado,            // Garante string pura (corrige erro index.tsx)
        setor: setorCalculado,        // Garante string pura (corrige erro index.tsx)
        subsetor: p.secao || '',
        setor_id: p.departamento || null,
        subsetor_id: p.secao || null,
        unidade_medida_id: p.unidade || 'UN'
      };
    });

    return { data: dataTratada, count: count || 0 };
  },

  // Lista as combinações distintas de Departamento / Seção / Categoria já cadastradas
  // (lê em páginas de 1000 linhas, que é o limite padrão do Supabase por requisição)
  async listarClassificacoes(): Promise<ClassificacaoProduto[]> {
    const PAGINA = 1000;
    const distintos = new Map<string, ClassificacaoProduto>();

    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from('produtos')
        .select('departamento, secao, categoria')
        .order('id', { ascending: true })
        .range(inicio, inicio + PAGINA - 1);

      if (error) throw error;

      const linhas = (data || []) as ClassificacaoProduto[];

      for (const linha of linhas) {
        const chave = `${linha.departamento ?? ''}|${linha.secao ?? ''}|${linha.categoria ?? ''}`;
        if (!distintos.has(chave)) {
          distintos.set(chave, {
            departamento: linha.departamento ?? null,
            secao: linha.secao ?? null,
            categoria: linha.categoria ?? null
          });
        }
      }

      if (linhas.length < PAGINA) break;
    }

    return Array.from(distintos.values());
  },

  async cadastrarProduto(payload: CriarProdutoPayload): Promise<void> {
    // Normalização de entrada (traduz qualquer propriedade legada enviada pelos formulários)
    const códigoBarraFinal = payload.codbarra || payload.codigo_barras || payload.ean || null;
    const codigoProdFinal = payload.codprod || String(Date.now());
    const unidadeFinal = payload.unidade || payload.unidade_medida_id || 'UN';
    const departamentoFinal = payload.departamento || payload.setor_id || payload.setor || null;
    const secaoFinal = payload.secao || payload.subsetor_id || payload.subsetor || null;

    const { error } = await supabase
      .from('produtos')
      .insert([{
        codprod: String(codigoProdFinal).trim(),
        descricao: String(payload.descricao).trim().toUpperCase(),
        codbarra: códigoBarraFinal ? String(códigoBarraFinal).trim() : null,
        unidade: String(unidadeFinal).trim().toUpperCase(),
        custoreal: Number(payload.custoreal) || 0,
        pvenda: Number(payload.pvenda) || 0,
        departamento: departamentoFinal ? String(departamentoFinal).trim().toUpperCase() : null,
        secao: secaoFinal ? String(secaoFinal).trim().toUpperCase() : null,
        categoria: payload.categoria ? String(payload.categoria).trim().toUpperCase() : null
      }]);

    if (error) throw error;
  },

  async salvarProduto(payload: CriarProdutoPayload): Promise<void> {
    return this.cadastrarProduto(payload);
  },

  async importarMassaProdutos(produtos: CriarProdutoPayload[]): Promise<void> {
    const payloadFormatado = produtos.map(p => {
      const códigoBarraFinal = p.codbarra || p.codigo_barras || p.ean || null;
      const departamentoFinal = p.departamento || p.setor_id || p.setor || null;
      const secaoFinal = p.secao || p.subsetor_id || p.subsetor || null;

      return {
        codprod: String(p.codprod || Date.now()).trim(),
        descricao: String(p.descricao).trim().toUpperCase(),
        codbarra: códigoBarraFinal ? String(códigoBarraFinal).trim() : null,
        unidade: p.unidade || p.unidade_medida_id ? String(p.unidade || p.unidade_medida_id).trim().toUpperCase() : 'UN',
        custoreal: Number(p.custoreal) || 0,
        pvenda: Number(p.pvenda) || 0,
        departamento: departamentoFinal ? String(departamentoFinal).trim().toUpperCase() : null,
        secao: secaoFinal ? String(secaoFinal).trim().toUpperCase() : null,
        categoria: p.categoria ? String(p.categoria).trim().toUpperCase() : null
      };
    });

    const { error } = await supabase
      .from('produtos')
      .upsert(payloadFormatado, { onConflict: 'codprod' });

    if (error) throw error;
  }
};
