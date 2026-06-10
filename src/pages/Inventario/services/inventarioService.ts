import { supabase } from '../../../lib/supabaseClient';

export interface LocalCaptura {
  id: string;
  nome: string;
}

export interface InventarioAtivo {
  id: string;
  codigo_customizado: string;
  status: string;
  data_registro: string;
  hora_registro: string;
  usuario_id: string;
  usuarios?: { nome: string };
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
  // 1. Lista todos os inventários com junção na tabela de usuários para o histórico
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
        usuarios:usuario_id ( nome )
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
      .select('id, codigo_customizado, status, data_registro, hora_registro, usuario_id')
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
  }
};