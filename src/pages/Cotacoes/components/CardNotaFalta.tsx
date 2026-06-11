import { ItemFaltaCotacaoDTO } from '../types/cotacoes.types';
import { BadgeStatusCotacao } from './BadgeStatusCotacao';

interface CardNotaFaltaProps {
  item: ItemFaltaCotacaoDTO;
  selecionado: boolean;
  onToggle: (id: string) => void;
}

export function CardNotaFalta({ item, selecionado, onToggle }: CardNotaFaltaProps) {
  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`p-3 mb-2 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
        selecionado ? 'border-[#09797a] bg-[#09797a]/5' : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      <input 
        type="checkbox" 
        checked={selecionado}
        readOnly
        className="w-5 h-5 text-[#09797a] rounded border-gray-300 focus:ring-[#09797a]"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <p className="text-sm font-bold text-gray-800 truncate pr-2">
            {item.produto_descricao}
          </p>
          <BadgeStatusCotacao status={item.status_cotacao} />
        </div>
        
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-gray-500 font-medium">EAN: {item.produto_codigo_barras}</span>
          <span className="text-[11px] text-gray-500">
            {item.setor_nome} &gt; {item.subsetor_nome}
          </span>
          <span className="text-[11px] text-red-600 font-medium mt-1">
            Motivo: {item.motivo_falta_descricao}
          </span>
        </div>
      </div>
    </div>
  );
}