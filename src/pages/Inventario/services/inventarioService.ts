import { supabase } from '../../../lib/supabaseClient';

export interface LocalCaptura {
  id: string;
  nome: string;
}

export interface InventarioAtivo {
  id: string;
  codigo_customizado: string;
  status: string;
}

export const inventarioService = {
  // 1. Busca ou Cria uma sessão de Inventário "Em Andamento" para o operador
  async obterOuCriarInventarioAtivo(usuarioId: string): Promise<InventarioAtivo> {
    // Tenta buscar um inventário que já esteja aberto por este usuário
    const { data: existente, error: errBusca } = await supabase
      .from('inventarios')
      .select('id, codigo_customizado, status')
      .eq('usuario_id', usuarioId)
      .eq('status', 'Em Andamento')
      .maybeSingle();

    if (errBusca) throw errBusca;
    if (existente) return existente;

    // Se não existir, gera um código customizado incremental baseado no timestamp
    const codigoGerado = `INV-${Date.now().toString().slice(-6)}`;

    const { data: novo, error: errInsercao } = await supabase
      .from('inventarios')
      .insert([
        {
          codigo_customizado: codigoGerado,
          usuario_id: usuarioId,
          status: 'Em Andamento'
        }
      ])
      .select('id, codigo_customizado, status')
      .single();

    if (errInsercao) throw errInsercao;
    return novo;
  },

  // 2. Busca os locais de captura reais cadastrados no banco
  async listarLocaisCaptura(): Promise<LocalCaptura[]> {
    const { data, error } = await supabase
      .from('locais_captura')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 3. Busca o produto pelo EAN (Ajustado de 'nome' para 'descricao' conforme o Schema!)
  async buscarProdutoPorCodigo(codigo: string) {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, codigo_barras, descricao, unidade_medida_id')
      .eq('codigo_barras', codigo)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // 4. Salva o item contabilizado vinculando as chaves estrangeiras corretas
  async salvarItemContabilizado(item: {
    inventario_id: string;
    produto_id: string;
    quantidade: number;
    local_captura_id: string;
  }) {
    const { data, error } = await supabase
      .from('inventario_itens')
      .insert([
        {
          inventario_id: item.inventario_id,
          produto_id: item.produto_id,
          quantidade_contabilizada: item.quantidade,
          local_captura_id: item.local_captura_id
        }
      ])
      .select();

    if (error) throw error;
    return data;
  }
};