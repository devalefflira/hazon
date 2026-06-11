import { useState, useEffect, useCallback } from 'react';
import { cotacoesService } from '../services/cotacoesService';
import { ItemFaltaCotacaoDTO } from '../types/cotacoes.types';

export function useFaltasPendentes() {
  const [faltas, setFaltas] = useState<ItemFaltaCotacaoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarFaltas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cotacoesService.listarFaltasPendentes();
      setFaltas(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar faltas pendentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarFaltas();
  }, [carregarFaltas]);

  return { faltas, loading, error, recarregar: carregarFaltas };
}