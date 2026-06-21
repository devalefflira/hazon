import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRegistroDTO, MotivoAvariaDTO, RegistrarAvariaPayload } from '../types/avarias.types';

export const avariasService = {
  // Lista todos os motivos de avaria para alimentar o seletor do formulário
  async listarMotivos(): Promise<MotivoAvariaDTO[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('id, descricao')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Lista o histórico de avarias registradas (da mais nova para a mais velha)
  async listarAvarias(): Promise<AvariaRegistroDTO[]> {
    const { data, error } = await supabase
      .from('avarias')
      .select(`
        *,
        usuarios ( nome ),
        produtos ( 
          descricao, 
          codigo_barras,
          unidades_medida:unidade_medida_id ( sigla )
        ),
        motivos_avaria ( descricao )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((a: any) => {
      const prod = a.produtos;
      
      let siglaUnidade = 'UN';
      if (prod?.unidades_medida) {
        siglaUnidade = Array.isArray(prod.unidades_medida)
          ? prod.unidades_medida[0]?.sigla || 'UN'
          : prod.unidades_medida.sigla || 'UN';
      }

      return {
        id: a.id,
        codigo_customizado: a.codigo_customizado,
        usuario_id: a.usuario_id,
        usuario_nome: a.usuarios?.nome || 'Operador',
        produto_id: a.produto_id,
        produto_descricao: prod?.descricao || 'Produto não identificado',
        produto_codigo_barras: prod?.codigo_barras || '',
        produto_unidade_medida: siglaUnidade,
        motivo_avaria_id: a.motivo_avaria_id,
        motivo_avaria_descricao: a.motivos_avaria?.descricao || 'Não informado',
        quantidade: Number(a.quantidade || 0),
        destinacao: a.destinacao,
        observacao: a.observacao,
        data_registro: a.data_registro,
        hora_registro: a.hora_registro,
        created_at: a.created_at
      };
    });
  },

  // Grava o registro da avaria gerando o código customizado incremental
  async registrarAvaria(payload: RegistrarAvariaPayload): Promise<void> {
    // 1. Descobre o contador sequencial atual para gerar o código amigável (Ex: #AV000001)
    const { count } = await supabase
      .from('avarias')
      .select('*', { count: 'exact', head: true });
    
    const proximoNumero = (count || 0) + 1;
    const codigoFormatado = `#AV${String(proximoNumero).padStart(6, '0')}`;

    // 2. Insere o registro definitivo na tabela de avarias
    const { error } = await supabase
      .from('avarias')
      .insert([{
        codigo_customizado: codigoFormatado,
        usuario_id: payload.usuario_id,
        produto_id: payload.produto_id,
        motivo_avaria_id: payload.motivo_avaria_id,
        quantidade: payload.quantidade,
        destinacao: payload.destinacao,
        observacao: payload.observacao?.trim().toUpperCase() || null,
        preco_custo_na_perda: 0.00 // Travado em zero conforme a ressalva da v1
      }]);

    if (error) throw error;
  }
};