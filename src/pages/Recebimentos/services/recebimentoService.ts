// src/pages/Recebimentos/services/recebimentoService.ts
import { supabase } from '../../../lib/supabaseClient';
import { 
  LISTA_FASES_RECEBIMENTO, 
  type IniciarFluxoPayload, 
  type RecebimentoFluxoView, 
  type StatusGeralFluxo,
  type FotoRecebimento,
  type PausarTemporizadorPayload,
  type RetomarTemporizadorPayload
} from '../types/recebimento.types';

export const recebimentoService = {
  // 1. Busca preditiva de fornecedores
  async buscarFornecedores(termo: string) {
    if (!termo.trim()) return [];
    const p = termo.trim();
    const { data, error } = await supabase
      .from('fornecedores')
      .select('id, razao_social, nome_fantasia, cnpj')
      .or(`razao_social.ilike.%${p}%,nome_fantasia.ilike.%${p}%,cnpj.ilike.%${p}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  // 2. Criar novo fluxo
  async iniciarNovoFluxo(payload: IniciarFluxoPayload): Promise<string> {
    const agora = new Date();
    const agoraIso = agora.toISOString();
    const dataAtual = agora.toLocaleDateString('sv-SE');
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const codigoCustomizado = `FLX-${Date.now().toString().slice(-4)}`;

    let numeroFinal = payload.numero_documento?.trim() || '';
    let isGerado = Boolean(payload.is_numero_gerado);

    if (!numeroFinal || payload.tipo_documento === 'Caminhão da Casa') {
      numeroFinal = Math.floor(100000 + Math.random() * 900000).toString();
      isGerado = true;
    }

    const tempoLimite = payload.tipo_documento === 'Nota Fiscal' ? 60 : 180;

    const { data: fluxo, error: errFluxo } = await supabase
      .from('recebimento_fluxos')
      .insert([{
        codigo_customizado: codigoCustomizado,
        tipo_documento: payload.tipo_documento,
        numero_documento: numeroFinal,
        is_numero_gerado: isGerado,
        fornecedor_id: payload.fornecedor_id || null,
        fornecedor_nome_manual: payload.fornecedor_nome_manual || null,
        cor_veiculo: payload.cor_veiculo || null,
        nome_motorista: payload.nome_motorista || (payload.tipo_documento === 'Caminhão da Casa' ? 'Josenildo' : null),
        fase_atual: 1,
        status_geral: 'Em Andamento',
        criador_id: payload.usuario_id,
        data_registro: dataAtual,
        hora_registro: horaAtual
      }])
      .select('id')
      .single();

    if (errFluxo) throw errFluxo;

    const fasesInsert = LISTA_FASES_RECEBIMENTO.map((fase) => {
      const isPrimeira = fase.ordem === 1;
      const isLancamento = fase.ordem === 5 || fase.ordem === 6;

      return {
        fluxo_id: fluxo.id,
        ordem_fase: fase.ordem,
        nome_fase: fase.nome,
        status: isPrimeira ? 'Em Andamento' : 'Pendente',
        usuario_id: isPrimeira ? payload.usuario_id : null,
        iniciado_em: isPrimeira ? agoraIso : null,
        finalizado_em: null,
        tempo_limite_minutos: isLancamento ? tempoLimite : null,
        tempo_restante_segundos: isLancamento ? tempoLimite * 60 : null
      };
    });

    const { error: errFases } = await supabase
      .from('recebimento_fases')
      .insert(fasesInsert);

    if (errFases) throw errFases;

    return fluxo.id;
  },

  // 3. Listar fluxos com suporte a filtro de período
  async listarFluxos(
    statusAba: StatusGeralFluxo,
    filtros?: { dataInicio?: string; dataFim?: string }
  ): Promise<RecebimentoFluxoView[]> {
    let query = supabase
      .from('recebimento_fluxos')
      .select(`
        *,
        criador:usuarios!recebimento_fluxos_criador_fkey(nome),
        fornecedor:fornecedores(razao_social, nome_fantasia),
        recebimento_fases(
          id,
          fluxo_id,
          ordem_fase,
          nome_fase,
          status,
          usuario_id,
          iniciado_em,
          finalizado_em,
          tempo_limite_minutos,
          tempo_restante_segundos,
          link_relatorio,
          observacoes,
          usuario:usuarios(nome)
        ),
        recebimento_fotos(
          id,
          tipo_foto,
          foto_url,
          descricao
        )
      `)
      .eq('status_geral', statusAba);

    if (filtros?.dataInicio) {
      query = query.gte('data_registro', filtros.dataInicio);
    }
    if (filtros?.dataFim) {
      query = query.lte('data_registro', filtros.dataFim);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => {
      const forn = Array.isArray(row.fornecedor) ? row.fornecedor[0] : row.fornecedor;
      const criador = Array.isArray(row.criador) ? row.criador[0] : row.criador;

      const nomeFornecedorFinal = 
        forn?.nome_fantasia || 
        forn?.razao_social || 
        row.fornecedor_nome_manual || 
        (row.tipo_documento === 'Caminhão da Casa' ? `Caminhão ${row.cor_veiculo || ''}` : 'Não informado');

      const fasesOrdenadas = (row.recebimento_fases || [])
        .sort((a: any, b: any) => a.ordem_fase - b.ordem_fase)
        .map((f: any) => {
          const userFase = Array.isArray(f.usuario) ? f.usuario[0] : f.usuario;
          return {
            id: f.id,
            fluxo_id: f.fluxo_id,
            ordem_fase: f.ordem_fase,
            nome_fase: f.nome_fase,
            status: f.status,
            usuario_id: f.usuario_id,
            usuario_nome: userFase?.nome || 'Operador',
            iniciado_em: f.iniciado_em,
            finalizado_em: f.finalizado_em,
            tempo_limite_minutos: f.tempo_limite_minutos,
            tempo_restante_segundos: f.tempo_restante_segundos,
            link_relatorio: f.link_relatorio,
            observacoes: f.observacoes
          };
        });

      return {
        id: row.id,
        codigo_customizado: row.codigo_customizado,
        tipo_documento: row.tipo_documento,
        numero_documento: row.numero_documento,
        is_numero_gerado: row.is_numero_gerado,
        fornecedor_id: row.fornecedor_id,
        fornecedor_nome: nomeFornecedorFinal,
        cor_veiculo: row.cor_veiculo,
        nome_motorista: row.nome_motorista,
        fase_atual: row.fase_atual,
        status_geral: row.status_geral,
        criador_id: row.criador_id,
        criador_nome: criador?.nome || 'Conferente',
        data_registro: row.data_registro,
        hora_registro: row.hora_registro,
        fases: fasesOrdenadas,
        fotos: row.recebimento_fotos || []
      };
    });
  },

  // 4. Listar documentos prontos para Lançamento
  async listarNotasParaLancamento(): Promise<RecebimentoFluxoView[]> {
    const { data, error } = await supabase
      .from('recebimento_fluxos')
      .select(`
        *,
        criador:usuarios!recebimento_fluxos_criador_fkey(nome),
        fornecedor:fornecedores(razao_social, nome_fantasia),
        recebimento_fases(
          id,
          fluxo_id,
          ordem_fase,
          nome_fase,
          status,
          usuario_id,
          iniciado_em,
          finalizado_em,
          tempo_limite_minutos,
          tempo_restante_segundos,
          link_relatorio,
          observacoes,
          usuario:usuarios(nome)
        )
      `)
      .gte('fase_atual', 4)
      .lte('fase_atual', 6)
      .eq('status_geral', 'Em Andamento')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => {
      const forn = Array.isArray(row.fornecedor) ? row.fornecedor[0] : row.fornecedor;
      const criador = Array.isArray(row.criador) ? row.criador[0] : row.criador;

      return {
        id: row.id,
        codigo_customizado: row.codigo_customizado,
        tipo_documento: row.tipo_documento,
        numero_documento: row.numero_documento,
        is_numero_gerado: row.is_numero_gerado,
        fornecedor_id: row.fornecedor_id,
        fornecedor_nome: forn?.nome_fantasia || forn?.razao_social || row.fornecedor_nome_manual || 'Caminhão da Casa',
        cor_veiculo: row.cor_veiculo,
        nome_motorista: row.nome_motorista,
        fase_atual: row.fase_atual,
        status_geral: row.status_geral,
        criador_id: row.criador_id,
        criador_nome: criador?.nome || 'Conferente',
        data_registro: row.data_registro,
        hora_registro: row.hora_registro,
        fases: (row.recebimento_fases || []).sort((a: any, b: any) => a.ordem_fase - b.ordem_fase)
      };
    });
  },

  // 5. Avançar / Finalizar Fase Operacional
  async finalizarFaseEAvancar(params: {
    fluxoId: string;
    faseId: string;
    ordemAtual: number;
    usuarioId: string;
    linkRelatorio?: string;
  }) {
    const agora = new Date().toISOString();

    // Finaliza fase atual
    await supabase
      .from('recebimento_fases')
      .update({
        status: 'Finalizado',
        finalizado_em: agora,
        usuario_id: params.usuarioId,
        link_relatorio: params.linkRelatorio || null,
        updated_at: agora
      })
      .eq('id', params.faseId);

    // Se concluiu a Fase 6 (Finalizar Lançamento), limpa fotos temporárias
    if (params.ordemAtual === 6) {
      await this.excluirFotosFluxo(params.fluxoId);
    }

    // Se concluiu a Fase 8 (Finalizar Exposição na Gôndola), apaga o PDF do relatório
    if (params.ordemAtual === 8) {
      await supabase
        .from('recebimento_fases')
        .update({ link_relatorio: null, updated_at: agora })
        .eq('fluxo_id', params.fluxoId);
    }

    const proximaOrdem = params.ordemAtual + 1;

    if (proximaOrdem <= 8) {
      // Inicia próxima fase
      await supabase
        .from('recebimento_fases')
        .update({
          status: 'Em Andamento',
          iniciado_em: agora,
          usuario_id: params.usuarioId,
          updated_at: agora
        })
        .eq('fluxo_id', params.fluxoId)
        .eq('ordem_fase', proximaOrdem);

      await supabase
        .from('recebimento_fluxos')
        .update({
          fase_atual: proximaOrdem,
          updated_at: agora
        })
        .eq('id', params.fluxoId);
    } else {
      // Encerra todo o fluxo caso passe da fase 8
      await supabase
        .from('recebimento_fluxos')
        .update({
          fase_atual: 8,
          status_geral: 'Finalizado',
          updated_at: agora
        })
        .eq('id', params.fluxoId);
    }
  },

  // 6. Pausar ou Retomar Fluxo Completo
  async alternarStatusFluxo(fluxoId: string, novoStatus: 'Pausado' | 'Em Andamento') {
    const { error } = await supabase
      .from('recebimento_fluxos')
      .update({
        status_geral: novoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', fluxoId);

    if (error) throw error;
  },

  // 7. Salvar Fotos da Recepção de Documento
  async salvarFotosRecepcao(fluxoId: string, faseId: string, fotos: FotoRecebimento[]) {
    if (fotos.length === 0) return;
    const inserts = fotos.map((f) => ({
      fluxo_id: fluxoId,
      fase_id: faseId,
      tipo_foto: f.tipo_foto,
      foto_url: f.foto_url,
      descricao: f.descricao || null
    }));

    const { error } = await supabase
      .from('recebimento_fotos')
      .insert(inserts);

    if (error) throw error;
  },

  // 8. Buscar Fotos de um Fluxo
  async buscarFotosFluxo(fluxoId: string): Promise<FotoRecebimento[]> {
    const { data, error } = await supabase
      .from('recebimento_fotos')
      .select('id, tipo_foto, foto_url, descricao')
      .eq('fluxo_id', fluxoId);

    if (error) throw error;
    return data || [];
  },

  // 9. Excluir Fotos de um Fluxo
  async excluirFotosFluxo(fluxoId: string): Promise<void> {
    const { error } = await supabase
      .from('recebimento_fotos')
      .delete()
      .eq('fluxo_id', fluxoId);

    if (error) console.error('Aviso ao excluir fotos temporárias:', error);
  },

  // 10. Auditoria de Pausa do Temporizador de Lançamento
  async pausarTemporizadorLancamento(payload: PausarTemporizadorPayload): Promise<string> {
    const { data, error } = await supabase
      .from('recebimento_pausas')
      .insert([{
        fluxo_id: payload.fluxo_id,
        fase_id: payload.fase_id,
        usuario_id: payload.usuario_id,
        motivo_pausa: payload.motivo_pausa,
        motivo_pausa_detalhe: payload.motivo_pausa_detalhe || null
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async retomarTemporizadorLancamento(payload: RetomarTemporizadorPayload) {
    const { error } = await supabase
      .from('recebimento_pausas')
      .update({
        retomado_em: new Date().toISOString(),
        motivo_retomada: payload.motivo_retomada,
        motivo_retomada_detalhe: payload.motivo_retomada_detalhe || null
      })
      .eq('id', payload.pausa_id);

    if (error) throw error;
  }
};