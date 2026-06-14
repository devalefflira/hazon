import { useState, useEffect } from 'react';
import { cotacoesService } from '../services/cotacoesService';
import type { ItemFaltaCotacaoDTO } from '../types/cotacoes.types';

export function useFaltasPendentes() {
  const [faltas, setFaltas] = useState<ItemFaltaCotacaoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cotacoesService.listarFaltasPendentes()
      .then(setFaltas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { faltas, loading };
}