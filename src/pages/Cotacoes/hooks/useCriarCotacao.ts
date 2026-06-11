import { useState } from 'react';
import { cotacoesService } from '../services/cotacoesService';
import type { CriarCotacaoPayload } from '../types/cotacoes.types';

export function useCriarCotacao() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const criarCotacao = async (payload: CriarCotacaoPayload) => {
    try {
      setLoading(true);
      setError(null);
      setSucesso(false);
      
      await cotacoesService.criarRodadaCotacao(payload);
      
      setSucesso(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar rodada de cotação.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { criarCotacao, loading, error, sucesso };
}