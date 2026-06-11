import type { CotacaoStatus, StatusNotaFalta } from '../types/cotacoes.types';

interface BadgeStatusCotacaoProps {
  status: CotacaoStatus | StatusNotaFalta;
}

export function BadgeStatusCotacao({ status }: BadgeStatusCotacaoProps) {
  const getEstilo = () => {
    switch (status) {
      case 'Pendente': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Em Cotação':
      case 'Aberta': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Em Análise': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Concluída':
      case 'Cotada': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelada':
      case 'Ignorada': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getEstilo()}`}>
      {status}
    </span>
  );
}