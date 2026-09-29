// src/pages/RupturaGondola/services/rupturaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { RupturaAuditoria, RupturaItem, ErpEntradaImportacao, ErpEntradaMercadoria } from '../types/ruptura.types';

export const rupturaService = {
  async listarAuditorias(): Promise<RupturaAuditoria[]> {
    const { data, error } = await supabase
      .from('rupturas_auditorias')
      .select('*, usuarios(nome)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((a: any) => ({
      ...a,
      usuario_nome: a.usuarios?.nome || 'Operador'
    }));
  },

  async criarAuditoria(dados: {
    usuario_id: string;
    departamento: string;
    secao: string;
    categoria: string;
    rua_corredor?: string;
    classe_produto?: string;
    observacao?: string;
  }): Promise<RupturaAuditoria> {
    const codigo = `RUP-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data, error } = await supabase
      .from('rupturas_auditorias')
      .insert({
        codigo_customizado: codigo,
        usuario_id: dados.usuario_id,
        setor_nome: dados.departamento,
        departamento: dados.departamento,
        secao: dados.secao,
        categoria: dados.categoria,
        rua_corredor: dados.rua_corredor,
        classe_produto: dados.classe_produto,
        observacao: dados.observacao,
        status: 'Em Andamento'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async obterAuditoriaPorId(id: string): Promise<RupturaAuditoria | null> {
    const { data, error } = await supabase
      .from('rupturas_auditorias')
      .select('*, usuarios(nome)')
      .eq('id', id)
      .single();

    if (error) return null;
    return {
      ...data,
      usuario_nome: data.usuarios?.nome || 'Operador'
    };
  },

  async listarItensAuditoria(auditoriaId: string): Promise<RupturaItem[]> {
    const { data, error } = await supabase
      .from('ruptura_itens')
      .select('*, produtos(codprod, descricao, codbarra, pvenda)')
      .eq('auditoria_id', auditoriaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((i: any) => ({
      ...i,
      produto: i.produtos
    }));
  },

  async verificarEntradaErp(codprod: string, codbarra?: string): Promise<{ teveEntrada: boolean; entrada?: ErpEntradaMercadoria }> {
    let query = supabase.from('erp_entradas_mercadorias').select('*');

    if (codbarra && codbarra.trim() !== '') {
      query = query.or(`codprod.eq.${codprod},codbarra.eq.${codbarra}`);
    } else {
      query = query.eq('codprod', codprod);
    }

    const { data } = await query.limit(1);

    if (data && data.length > 0) {
      return { teveEntrada: true, entrada: data[0] };
    }
    return { teveEntrada: false };
  },

  async registrarItemAuditoria(dados: {
    auditoria_id: string;
    produto_id: string;
    codprod: string;
    codbarra?: string;
    tem_estoque_gondola: boolean;
    motivo_ruptura?: string;
    preco_gondola?: number;
  }): Promise<void> {
    const { teveEntrada } = await this.verificarEntradaErp(dados.codprod, dados.codbarra);

    let tipoRuptura: 'OPERACIONAL' | 'COMERCIAL' | 'SEM_RUPTURA' = 'SEM_RUPTURA';
    if (!dados.tem_estoque_gondola) {
      tipoRuptura = teveEntrada ? 'OPERACIONAL' : 'COMERCIAL';
    }

    const { error } = await supabase
      .from('ruptura_itens')
      .insert({
        auditoria_id: dados.auditoria_id,
        produto_id: dados.produto_id,
        tem_estoque_gondola: dados.tem_estoque_gondola,
        motivo_ruptura: dados.motivo_ruptura || (dados.tem_estoque_gondola ? null : 'Não Abastecido'),
        preco_gondola: dados.preco_gondola || 0,
        teve_entrada_erp: teveEntrada,
        tipo_ruptura: tipoRuptura
      });

    if (error) throw error;

    // Atualiza contadores mestre
    const { data: itens } = await supabase
      .from('ruptura_itens')
      .select('tem_estoque_gondola')
      .eq('auditoria_id', dados.auditoria_id);

    const totalItens = itens?.length || 0;
    const totalRupturas = itens?.filter((i) => !i.tem_estoque_gondola).length || 0;

    await supabase
      .from('rupturas_auditorias')
      .update({
        total_itens_auditados: totalItens,
        total_rupturas: totalRupturas,
        updated_at: new Date().toISOString()
      })
      .eq('id', dados.auditoria_id);
  },

  async finalizarAuditoria(auditoriaId: string): Promise<void> {
    const { error } = await supabase
      .from('rupturas_auditorias')
      .update({
        status: 'Concluída',
        updated_at: new Date().toISOString()
      })
      .eq('id', auditoriaId);

    if (error) throw error;
  },

  async listarUltimasImportacoes(): Promise<ErpEntradaImportacao[]> {
    const { data, error } = await supabase
      .from('erp_entradas_importacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  },

  // Retorna a árvore única de departamentos, seções e categorias existentes no banco para popular os selects
  async carregarArvoreCategoriasErp(): Promise<{
    departamentos: string[];
    secoesPorDepto: Record<string, string[]>;
    categoriasPorSecao: Record<string, string[]>;
  }> {
    const { data } = await supabase
      .from('erp_entradas_mercadorias')
      .select('departamento, secao, categoria');

    const departamentosSet = new Set<string>();
    const secoesPorDepto: Record<string, Set<string>> = {};
    const categoriasPorSecao: Record<string, Set<string>> = {};

    (data || []).forEach((row: any) => {
      const dep = (row.departamento || '').trim();
      const sec = (row.secao || '').trim();
      const cat = (row.categoria || '').trim();

      if (dep) {
        departamentosSet.add(dep);
        if (!secoesPorDepto[dep]) secoesPorDepto[dep] = new Set<string>();
        if (sec) secoesPorDepto[dep].add(sec);
      }

      if (sec) {
        if (!categoriasPorSecao[sec]) categoriasPorSecao[sec] = new Set<string>();
        if (cat) categoriasPorSecao[sec].add(cat);
      }
    });

    const formatObj = (src: Record<string, Set<string>>) => {
      const res: Record<string, string[]> = {};
      for (const k in src) res[k] = Array.from(src[k]).sort();
      return res;
    };

    return {
      departamentos: Array.from(departamentosSet).sort(),
      secoesPorDepto: formatObj(secoesPorDepto),
      categoriasPorSecao: formatObj(categoriasPorSecao)
    };
  },

  async importarCsvEntradas(dados: {
    usuarioId: string;
    nomeArquivo: string;
    linhas: any[];
  }): Promise<{ totalImportados: number; periodo: string }> {
    if (dados.linhas.length === 0) throw new Error('Arquivo CSV vazio ou sem linhas válidas.');

    const parseDataBr = (dStr: string) => {
      if (!dStr) return new Date().toISOString().split('T')[0];
      const partes = dStr.trim().split('/');
      if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
      return dStr;
    };

    const primeiraLinha = dados.linhas[0];
    const dataInicio = parseDataBr(primeiraLinha['Data Inicial Entradas'] || primeiraLinha['Data Inicial'] || '');
    const dataFim = parseDataBr(primeiraLinha['Data Final Entradas'] || primeiraLinha['Data Final'] || '');

    const { data: imp, error: errImp } = await supabase
      .from('erp_entradas_importacoes')
      .insert({
        usuario_id: dados.usuarioId,
        nome_arquivo: dados.nomeArquivo,
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        total_registros: dados.linhas.length
      })
      .select()
      .single();

    if (errImp) throw errImp;

    const formatados = dados.linhas.map((row) => ({
      importacao_id: imp.id,
      data_inicial: parseDataBr(row['Data Inicial Entradas'] || row['Data Inicial'] || ''),
      data_final: parseDataBr(row['Data Final Entradas'] || row['Data Final'] || ''),
      codprod: String(row['Código Sistema'] || row['Código'] || '').trim(),
      descricao: String(row['Descrição'] || '').trim(),
      unidade: String(row['Unidade'] || 'UN').trim(),
      codbarra: String(row['Código de barras'] || row['Código de Barras'] || '').trim(),
      ncm: String(row['NCM'] || '').trim(),
      departamento: String(row['Departamento'] || '').trim(),
      secao: String(row['Seção'] || '').trim(),
      categoria: String(row['Categoria'] || '').trim()
    }));

    const batchSize = 200;
    for (let i = 0; i < formatados.length; i += batchSize) {
      const lote = formatados.slice(i, i + batchSize);
      const { error: errLote } = await supabase.from('erp_entradas_mercadorias').insert(lote);
      if (errLote) throw errLote;
    }

    return {
      totalImportados: formatados.length,
      periodo: `${dataInicio} até ${dataFim}`
    };
  },

  // Cruzamento estrito: filtra apenas mercadorias do mesmo Departamento, Seção e Categoria da Auditoria
  async obterProdutosNaoExpostos(auditoriaId: string): Promise<ErpEntradaMercadoria[]> {
    // 1. Obtém dados do escopo da auditoria
    const aud = await this.obterAuditoriaPorId(auditoriaId);
    if (!aud) return [];

    // 2. Obtém os códigos de produtos já auditados como presentes
    const { data: itensAuditados } = await supabase
      .from('ruptura_itens')
      .select('produto_id, tem_estoque_gondola, produtos(codprod)')
      .eq('auditoria_id', auditoriaId);

    const codsPresentes = new Set(
      (itensAuditados || [])
        .filter((i: any) => i.tem_estoque_gondola)
        .map((i: any) => i.produtos?.codprod)
    );

    // 3. Monta query filtrando estritamente pelo escopo
    let query = supabase.from('erp_entradas_mercadorias').select('*');

    if (aud.departamento) {
      query = query.ilike('departamento', `%${aud.departamento.trim()}%`);
    }
    if (aud.secao && aud.secao !== 'Todas') {
      query = query.ilike('secao', `%${aud.secao.trim()}%`);
    }
    if (aud.categoria && aud.categoria !== 'Todas') {
      query = query.ilike('categoria', `%${aud.categoria.trim()}%`);
    }

    const { data: entradas, error } = await query.order('descricao', { ascending: true });
    if (error || !entradas) return [];

    // 4. Se o usuário informou uma Classe de Produto (ex: "2L"), aplica filtro refinado na descrição
    let filtrados = entradas;
    if (aud.classe_produto && aud.classe_produto.trim().length > 0) {
      const termoClasse = aud.classe_produto.trim().toLowerCase();
      filtrados = filtrados.filter((e) => e.descricao.toLowerCase().includes(termoClasse));
    }

    // 5. Retorna somente os itens do escopo que NÃO estão na gôndola
    return filtrados.filter((e) => !codsPresentes.has(e.codprod));
  }
};