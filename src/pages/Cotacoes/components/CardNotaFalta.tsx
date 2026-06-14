import type { ItemFaltaCotacaoDTO } from '../types/cotacoes.types';

interface CardNotaFaltaProps {
  item: ItemFaltaCotacaoDTO;
  selecionado: boolean;
  onToggle: (id: string) => void;
}

export function CardNotaFalta({ item, selecionado, onToggle }: CardNotaFaltaProps) {
  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`p-3 border rounded-2xl mb-2 cursor-pointer transition-all ${
        selecionado ? 'border-[#09797a] bg-teal-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-gray-700 uppercase">{item.produto_descricao}</span>
        <input type="checkbox" checked={selecionado} readOnly className="accent-[#09797a]" />
      </div>
      <p className="text-[10px] text-gray-400 font-medium mt-1">Setor: {item.setor_nome} | Ref: {item.codigo_customizado}</p>
    </div>
  );
}