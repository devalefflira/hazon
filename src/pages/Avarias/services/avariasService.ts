// Arquivo: src/pages/Avarias/services/avariasService.ts
import { supabase } from '../../../lib/supabaseClient';
import type { AvariaRegistroDTO, MotivoAvariaDTO, RegistrarAvariaPayload } from '../types/avarias.types';

export const avariasService = {
  async listarMotivos(): Promise<MotivoAvariaDTO[]> {
    const { data, error } = await supabase
      .from('motivos_avaria')
      .select('id, descricao')
      .order('descricao', { ascending: true });

    if (error) throw error;
    return data || [];
  },

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
        motivos_avaria ( id, descricao )
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

  async registrarAvaria(payload: RegistrarAvariaPayload): Promise<void> {
    const { count } = await supabase
      .from('avarias')
      .select('*', { count: 'exact', head: true });
    
    const proximoNumero = (count || 0) + 1;
    const codigoFormatado = `#AV${String(proximoNumero).padStart(6, '0')}`;

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const dataLocal = `${ano}-${mes}-${dia}`;

    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    const segundo = String(agora.getSeconds()).padStart(2, '0');
    const horaLocal = `${hora}:${minuto}:${segundo}`;

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
        preco_custo_na_perda: 0.00,
        data_registro: dataLocal,
        hora_registro: horaLocal
      }]);

    if (error) throw error;
  }
};

export default avariasService; // Proteção adicional de exportação padrão