import { useState, useEffect } from 'react';
import { cotacoesService } from '../services/cotacoesService';
import { FornecedorSugeridoDTO } from '../types/cotacoes.types';

export function useFornecedoresSugeridos(setoresIds: string[]) {
  const [fornecedores, setFornecedores] = useState<FornecedorSugeridoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarFornecedores = async () => {
      if (!setoresIds || setoresIds.length === 0) {
        setFornecedores([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Busca fornecedores para todos os setores únicos selecionados e unifica a lista
        const setoresUnicos = Array.from(new Set(setoresIds));
        const promessas = setoresUnicos.map(id => cotacoesService.listarFornecedoresPorSetor(id));
        const resultados = await Promise.all(promessas);
        
        // Achata o array e remove duplicidades de fornecedores que atendem múltiplos setores
        const todosFornecedores = resultados.flat();
        const fornecedoresUnicos = Array.from(
          new Map(todosFornecedores.map(f => [f.fornecedor_id, f])).values()
        );

        setFornecedores(fornecedoresUnicos);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar fornecedores sugeridos.');
      } finally {
        setLoading(false);
      }
    };

    carregarFornecedores();
  }, [JSON.stringify(setoresIds)]); // Dependência serializada para evitar re-render em arrays de mesma referência

  return { fornecedores, loading, error };
}