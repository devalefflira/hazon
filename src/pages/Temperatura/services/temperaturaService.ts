// Arquivo: src/pages/Temperatura/services/temperaturaService.ts
import { supabase } from '../../../lib/supabaseClient';
import type * as Types from '../types/temperatura.types';

export const temperaturaService = {
  async listarEquipamentos(): Promise<Types.EquipamentoFrioDTO[]> {
    const { data, error } = await supabase
      .from('temperatura_equipamentos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async cadastrarEquipamento(payload: Types.CriarEquipamentoPayload): Promise<void> {
    const { error } = await supabase
      .from('temperatura_equipamentos')
      .insert([{
        tipo_item: payload.tipo_item,
        nome: payload.nome.trim().toUpperCase(),
        categoria_frio: payload.categoria_frio, // <-- GRAVA A CATEGORIA NO BANCO
        temp_conforme: Number(payload.temp_conforme),
        temp_limite_tolerancia: Number(payload.temp_limite_tolerancia),
        temp_nao_conforme: Number(payload.temp_nao_conforme)
      }]);

    if (error) throw error;
  },

  async listarAfericoes(): Promise<Types.AfericaoTemperaturaDTO[]> {
    const { data, error } = await supabase
      .from('temperatura_afericoes')
      .select(`
        *,
        usuarios ( nome ),
        temperatura_equipamentos ( nome, tipo_item )
      `)
      .order('created_at', { ascending: false }) as any;

    if (error) throw error;

    return (data || []).map((a: any) => {
      // Força o TypeScript a converter o timestamp UTC do banco para o fuso horário local do celular/PC
      const dataLocal = new Date(a.created_at);
      const horaTratada = dataLocal.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

      return {
        id: a.id,
        codigo_customizado: a.codigo_customizado,
        equipamento_id: a.equipamento_id,
        equipamento_nome: a.temperatura_equipamentos?.nome || 'Equipamento Removido',
        equipamento_tipo: a.temperatura_equipamentos?.tipo_item || 'N/A',
        usuario_id: a.usuario_id,
        usuario_nome: a.usuarios?.nome || 'Operador',
        temperatura_aferida: Number(a.temperatura_aferida),
        status_resultado: a.status_resultado,
        foto_comprobatoria: a.foto_comprobatoria,
        data_registro: a.data_registro,
        hora_registro: horaTratada, // <-- AJUSTE AQUI: Substitui a string bruta pela hora convertida localmente
        created_at: a.created_at
      };
    });
  },

  async registrarAfericao(payload: Types.CriarAfericaoPayload): Promise<void> {
    const { data: equip, error: errEquip } = await supabase
      .from('temperatura_equipamentos')
      .select('*')
      .eq('id', payload.equipamento_id)
      .single();

    if (errEquip || !equip) throw new Error('Equipamento não localizado.');

    const temp = Number(payload.temperatura_aferida);
    let status: 'Conforme' | 'Limite de Tolerância' | 'Não Conforme' = 'Não Conforme';

    const diffConforme = Math.abs(temp - Number(equip.temp_conforme));
    const diffTolerancia = Math.abs(temp - Number(equip.temp_limite_tolerancia));
    const diffInconforme = Math.abs(temp - Number(equip.temp_nao_conforme));

    if (diffConforme <= diffTolerancia && diffConforme <= diffInconforme) {
      status = 'Conforme';
    } else if (diffTolerancia <= diffInconforme) {
      status = 'Limite de Tolerância';
    }

    const { count } = await supabase
      .from('temperatura_afericoes')
      .select('*', { count: 'exact', head: true });

    const codigoCustom = `#AF${String((count || 0) + 1).padStart(6, '0')}`;

    const { error } = await supabase
      .from('temperatura_afericoes')
      .insert([{
        codigo_customizado: codigoCustom,
        equipamento_id: payload.equipamento_id,
        usuario_id: payload.usuario_id,
        temperatura_aferida: temp,
        status_resultado: status,
        foto_comprobatoria: payload.foto_comprobatoria // Grava a string Base64 da imagem
      }]);

    if (error) throw error;
  }
};