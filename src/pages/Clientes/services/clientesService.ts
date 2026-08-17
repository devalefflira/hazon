// Arquivo: src/pages/Clientes/services/clientesService.ts
import { supabase } from '../../../lib/supabaseClient';

export const PASTAS_CLIENTES = [
  'Geral',
  'Padarias',
  'Mercados',
  'Açougues',
  'Bares & Restaurantes',
  'Barracas de Rua'
];

export const clientesService = {
  // 1. Listar Clientes
  async listarClientes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // 2. Criar Cliente
  async criarCliente(payload: {
    nome: string;
    cpf_cnpj?: string;
    contato_whatsapp: string;
    cidade?: string;
    estado?: string;
    endereco?: string;
    bairro?: string;
    numero?: string;
    ponto_referencia?: string;
    pasta: string;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        ...payload,
        bairro: payload.bairro || null,
        cidade: payload.cidade || 'Bom Jesus das Selvas',
        estado: payload.estado || 'Maranhão',
        ativo: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 3. Atualizar Cliente
  async atualizarCliente(id: string, payload: any): Promise<void> {
    const { error } = await supabase
      .from('clientes')
      .update({
        ...payload,
        bairro: payload.bairro || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  },

  // 4. Alterar Status (Ativo / Inativo)
  async alternarStatusCliente(id: string, ativoAtual: boolean): Promise<void> {
    const { error } = await supabase
      .from('clientes')
      .update({
        ativo: !ativoAtual,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }
};