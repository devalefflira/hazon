import { useState, useEffect } from 'react';
import { cotacoesService } from '../services/cotacoesService';
import type { FornecedorSugeridoDTO } from '../types/cotacoes.types';

export function useFornecedoresSugeridos(setorIds: string[]) {
  const [fornecedores, setFornecedores] = useState<FornecedorSugeridoDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // CORREÇÃO: Alterado de sectorIds para setorIds
    if (!setorIds || setorIds.length === 0) {
      setFornecedores([]);
      return;
    }
    
    async function carregar() {
      try {
        setLoading(true);
        const promessas = setorIds.map(id => cotacoesService.listarFornecedoresPorSetor(id));
        const resultados = await Promise.all(promessas);
        const listaPlana = resultados.flat();
        
        const map = new Map<string, FornecedorSugeridoDTO>();
        listaPlana.forEach(f => map.set(f.fornecedor_id, f));
        
        setFornecedores(Array.from(map.values()));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [setorIds]);

  return { 
    fornecedores, 
    proveedores: fornecedores, 
    loading 
  };
}