import { supabase } from '../../../lib/supabaseClient';
import { normalizarChaveEscopo } from '../utils/escopoInventario';

export interface LocalCaptura {
  id: string;
  nome: string;
}

export interface EscopoInventario {
  departamento: string;
  secao: string;
  categoria: string | null;
}

export interface HierarquiaProduto {
  departamento: string;
  secao: string;
  categoria: string | null;
}

export interface InventarioAtivo {
  id: string;
  codigo_customizado: string;
  status: string;
  data_registro: string;
  hora_registro: string;
  usuario_id: string;
  usuarios?: { nome: string };
  departamento?: string | null;
  secao?: string | null;
  categoria?: string | null;
}

export interface ItemInventariado {
  id: string;
  quantidade_contabilizada: number;
  lote: string | null;
  data_validade: string | null;
  produtos: {
    codigo_barras: string;
    descricao: string;
  };
  locais_captura: {
    nome: string;
  };
}

export const inventarioService = {
  // 1. Lista todos os inventários trazendo dados do usuário, escopo e os locais dos itens vinculados
  async listarInventarios(): Promise<InventarioAtivo[]> {
    const { data, error } = await supabase
      .from('inventarios')
      .select(`
        id,
        codigo_customizado,
        status,
        data_registro,
        hora_registro,
        usuario_id,
        departamento,
        secao,
        categoria,
        usuarios:usuario_id ( nome ),
        inventario_itens (
          local_captura_id,
          locais_captura:local_captura_id ( nome )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as InventarioAtivo[];
  },

  // 2. Cria uma nova sessão mestre zerada
  async criarNovoInventario(usuarioId: string): Promise<InventarioAtivo> {
    const codigoGerado = `INV-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from('inventarios')
      .insert([
        {
          codigo_customizado: codigoGerado,
          usuario_id: usuarioId,
          status: 'Em Andamento'
        }
      ])
      .select('id, codigo_customizado, status, data_registro, hora_registro, usuario_id, departamento, secao, categoria')
      .single();

    if (error) throw error;
    return data;
  },

  // 3. Altera o status do mestre para 'Finalizado' travando edições
  async finalizarInventario(inventarioId: string) {
    const { error } = await supabase
      .from('inventarios')
      .update({ status: 'Finalizado' })
      .eq('id', inventarioId);

    if (error) throw error;
  },

  // 4. Deleta o inventário fisicamente do banco (Cancelar Coleta)
  async deletarInventario(inventarioId: string) {
    const { error } = await supabase
      .from('inventarios')
      .delete()
      .eq('id', inventarioId);

    if (error) throw error;
  },

  // 5. Lista os locais de captura
  async listarLocaisCaptura(): Promise<LocalCaptura[]> {
    const { data, error } = await supabase
      .from('locais_captura')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 6. Busca o produto por código de barras
  async buscarProdutoPorCodigo(codigo: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, codigo_barras, descricao')
      .eq('codigo_barras', codigo)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // 7. Lista os itens de contagem injetados em um inventário específico
  async listarItensDoInventario(inventarioId: string): Promise<ItemInventariado[]> {
    const { data, error } = await supabase
      .from('inventario_itens')
      .select(`
        id,
        quantidade_contabilizada,
        lote,
        data_validade,
        produtos:produto_id ( codigo_barras, descricao ),
        locais_captura:local_captura_id ( nome )
      `)
      .eq('inventario_id', inventarioId)
      .order('id', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ItemInventariado[];
  },

  // 8. Salva a bipada física no banco computando as variáveis completas do chão de loja
  async salvarItemContabilizado(item: {
    inventario_id: string;
    produto_id: string;
    quantidade_contabilizada: number;
    local_captura_id: string;
    lote?: string;
    data_validade?: string | null;
  }) {
    const { data, error } = await supabase
      .from('inventario_itens')
      .insert([
        {
          inventario_id: item.inventario_id,
          produto_id: item.produto_id,
          quantidade_contabilizada: item.quantidade_contabilizada,
          local_captura_id: item.local_captura_id,
          lote: item.lote || null,
          data_validade: item.data_validade || null
        }
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // 9. Lista a hierarquia Departamento > Seção > Categoria existente no cadastro de produtos
  //    (paginada, pois o PostgREST limita cada consulta a 1000 linhas)
  async listarHierarquiaProdutos(): Promise<HierarquiaProduto[]> {
    const TAMANHO_PAGINA = 1000;
    const mapa = new Map<string, HierarquiaProduto>();
    let inicio = 0;

    while (true) {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, departamento, secao, categoria')
        .order('id', { ascending: true })
        .range(inicio, inicio + TAMANHO_PAGINA - 1);

      if (error) throw error;

      const linhas = data || [];
      for (const linha of linhas) {
        const departamento = (linha.departamento ?? '').trim();
        const secao = (linha.secao ?? '').trim();
        const categoria = (linha.categoria ?? '').trim();
        if (!departamento || !secao) continue;

        const chave = [
          normalizarChaveEscopo(departamento),
          normalizarChaveEscopo(secao),
          normalizarChaveEscopo(categoria)
        ].join('|');

        if (!mapa.has(chave)) {
          mapa.set(chave, { departamento, secao, categoria: categoria || null });
        }
      }

      if (linhas.length < TAMANHO_PAGINA) break;
      inicio += TAMANHO_PAGINA;
    }

    return Array.from(mapa.values());
  },

  // 10. Grava o escopo (Departamento / Seção / Categoria) na sessão de inventário
  async definirEscopoInventario(inventarioId: string, escopo: EscopoInventario) {
    const { error } = await supabase
      .from('inventarios')
      .update({
        departamento: escopo.departamento,
        secao: escopo.secao,
        categoria: escopo.categoria
      })
      .eq('id', inventarioId);

    if (error) throw error;
  }
};
