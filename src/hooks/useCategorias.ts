import { useState, useEffect } from 'react';
import { categoriasService } from '../pages/Categorias/services/categoriasService';

export const useCategorias = () => {
  const [setores, setSetores] = useState<any[]>([]);
  const [subsetores, setSubsetores] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]); // Adicionado
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // O local exato para a sua correção é aqui, dentro do try:
        const [unidadesData, setoresData] = await Promise.all([
          categoriasService.listarUnidadesMedida(),
          categoriasService.listarSetoresComSubsetores()
        ]);
        
        setUnidades(unidadesData || []);
        setSetores(setoresData || []);
        
        console.log("Dados carregados com sucesso");
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const carregarSubsetores = (setorId: string) => {
    if (!setorId) {
      setSubsetores([]);
      return;
    }
    const setorSelecionado = setores.find(s => s.id === setorId);
    setSubsetores(setorSelecionado?.categorias_subsetores || []);
  };

  return { setores, subsetores, unidades, loading, carregarSubsetores };
};