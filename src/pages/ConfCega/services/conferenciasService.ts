import { supabase } from "../../../lib/supabaseClient";
import type { NotaImportadaXML } from "../types/conferencias.types";

export const conferenciasService = {
  async listarConferencias() {
    const { data, error } = await supabase
      .from("conferencias_mestre")
      .select(`
        *,
        fornecedor:fornecedores(*),
        usuario:usuarios(nome),
        conferencia_itens(*, produto:produtos(descricao))
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async criarConferenciaImportada(nota: NotaImportadaXML, usuarioId: string) {
    let fornecedorId: string | null = null;
    if (nota.cnpj) {
      const { data: fornExistente } = await supabase
        .from("fornecedores")
        .select("id")
        .eq("cnpj", nota.cnpj)
        .maybeSingle();

      if (fornExistente) {
        fornecedorId = fornExistente.id;
      } else {
        const { data: novoForn } = await supabase
          .from("fornecedores")
          .insert({
            cnpj: nota.cnpj,
            razao_social: nota.razaoSocial,
            nome_fantasia: nota.razaoSocial
          })
          .select("id")
          .single();
        if (novoForn) fornecedorId = novoForn.id;
      }
    }

    const codCustom = `CONF-${Date.now().toString().slice(-6)}`;

    const { data: confCriada, error: errConf } = await supabase
      .from("conferencias_mestre")
      .insert({
        codigo_customizado: codCustom,
        numero_nota_fiscal: nota.numeroNota,
        data_emissao_nota: nota.dataEmissao,
        usuario_id: usuarioId,
        fornecedor_id: fornecedorId,
        status: "Pendente"
      })
      .select()
      .single();

    if (errConf) throw errConf;

    // Cria registro de produto baseado estritamente na descrição da nota atual
    for (let i = 0; i < nota.itens.length; i++) {
      const it = nota.itens[i];
      const codUnicoItem = `ITEM-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

      const { data: novoProduto } = await supabase
        .from("produtos")
        .insert({
          codprod: codUnicoItem,
          descricao: it.xProd,
          unidade: "UN"
        })
        .select("id")
        .single();

      if (novoProduto) {
        await supabase.from("conferencia_itens").insert({
          conferencia_mestre_id: confCriada.id,
          produto_id: novoProduto.id,
          quantidade_contada: 0,
          unidade_medida: "UN",
          lote: it.lote || "",
          data_validade: it.dataValidade || null
        });
      }
    }

    return confCriada;
  },

  async salvarProgressoItens(
    conferenciaId: string,
    itensAtualizados: any[],
    status: "Em Andamento" | "Finalizada",
    usuarioFinalizadorId?: string
  ) {
    const updatePayload: Record<string, any> = { status };
    if (usuarioFinalizadorId) {
      updatePayload.usuario_id = usuarioFinalizadorId;
    }

    await supabase
      .from("conferencias_mestre")
      .update(updatePayload)
      .eq("id", conferenciaId);

    for (const item of itensAtualizados) {
      await supabase
        .from("conferencia_itens")
        .update({
          quantidade_contada: Number(item.quantidade_contada) || 0,
          lote: item.lote ? item.lote.toUpperCase() : null,
          data_validade: item.data_validade || null
        })
        .eq("id", item.id);
    }
  }
};