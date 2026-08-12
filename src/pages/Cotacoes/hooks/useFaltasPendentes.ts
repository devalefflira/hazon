import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export interface FaltaPendente {
  id: string;
  codigo_customizado: string;
  data_registro: string;
  status_cotacao: string;
  quantidade_restante?: number;
  unidade_restante?: string;
  produto: {
    id: string;
    codprod: string;
    descricao: string;
    codbarra: string;
    unidade: string;
    departamento: string;
    secao: string;
    categoria: string;
  };
  motivo: {
    descricao: string;
  };
}

export function useFaltasPendentes() {
  const [faltas, setFaltas] = useState<FaltaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscarFaltasPendentes = async () => {
    try {
      setLoading(true);
      setErro(null);

      // Consulta adaptada à nova estrutura simplificada de produtos
      const { data, error } = await supabase
        .from('notas_falta')
        .select(`
          id,
          codigo_customizado,
          data_registro,
          status_cotacao,
          quantidade_restante,
          unidade_restante,
          produtos (
            id,
            codprod,
            descricao,
            codbarra,
            unidade,
            departamento,
            secao,
            categoria
          ),
          motivos_falta (
            descricao
          )
        `)
        .eq('status_cotacao', 'Pendente')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Trata e formata os dados garantindo valores padrão
      const faltasTratadas: FaltaPendente[] = (data || []).map((item: any) => {
        const prod = item.produtos || {};
        return {
          id: item.id,
          codigo_customizado: item.codigo_customizado,
          data_registro: item.data_registro,
          status_cotacao: item.status_cotacao,
          quantidade_restante: item.quantidade_restante || 0,
          unidade_restante: item.unidade_restante || 'UN',
          produto: {
            id: prod.id || '',
            codprod: prod.codprod || 'N/A',
            descricao: prod.descricao || 'PRODUTO NÃO ENCONTRADO',
            codbarra: prod.codbarra || '',
            unidade: prod.unidade || 'UN',
            departamento: prod.departamento || 'GERAL',
            secao: prod.secao || '',
            categoria: prod.categoria || ''
          },
          motivo: {
            descricao: item.motivos_falta?.descricao || 'Ruptura de Estoque'
          }
        };
      });

      setFaltas(faltasTratadas);
    } catch (err: any) {
      console.error('Erro ao buscar faltas pendentes:', err);
      setErro('Falha ao carregar as notas de falta pendentes de cotação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarFaltasPendentes();
  }, []);

  return { faltas, loading, erro, recarregar: buscarFaltasPendentes };
}