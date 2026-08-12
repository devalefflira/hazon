// Arquivo: src/pages/Cotacoes/hooks/useFornecedoresSugeridos.ts
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { FornecedorSugeridoDTO } from '../types/cotacoes.types';

export function useFornecedoresSugeridos(setoresIds: string[]) {
  const [fornecedores, setFornecedores] = useState<FornecedorSugeridoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const buscarFornecedores = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('fornecedores')
          .select(`
            id,
            razao_social,
            nome_fantasia,
            cnpj,
            vendedores (
              id,
              nome,
              telefone
            )
          `);

        if (error) throw error;

        // Formata os dados garantindo fallback de contato
        const fornecedoresTratados: FornecedorSugeridoDTO[] = (data || []).map((f: any) => {
          const vendedor = f.vendedores && f.vendedores.length > 0 ? f.vendedores[0] : null;
          return {
            fornecedor_id: f.id,
            razao_social: f.razao_social,
            nome_fantasia: f.nome_fantasia || f.razao_social,
            cnpj: f.cnpj,
            vendedor_id: vendedor?.id || null,
            vendedor_nome: vendedor?.nome || 'Contato Principal',
            vendedor_telefone: vendedor?.telefone || ''
          };
        });

        setFornecedores(fornecedoresTratados);
      } catch (err) {
        console.error('Erro ao buscar fornecedores sugeridos:', err);
      } finally {
        setLoading(false);
      }
    };

    buscarFornecedores();
  }, [JSON.stringify(setoresIds)]);

  return { fornecedores, loading };
}