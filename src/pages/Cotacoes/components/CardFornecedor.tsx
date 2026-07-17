import type { FornecedorSugeridoDTO } from '../types/cotacoes.types';

interface CardFornecedorProps {
  fornecedor: FornecedorSugeridoDTO;
  selecionado: boolean;
  onToggle: (id: string) => void;
}

export function CardFornecedor({ fornecedor, selecionado, onToggle }: CardFornecedorProps) {
  return (
    <div 
      onClick={() => onToggle(fornecedor.fornecedor_id)}
      className={`p-3 border rounded-2xl mb-2 cursor-pointer transition-all ${
        selecionado ? 'border-[#09797a] bg-teal-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-gray-700 uppercase">{fornecedor.nome_fantasia}</span>
        <input type="checkbox" checked={selecionado} readOnly className="accent-[#09797a]" />
      </div>
      <p className="text-[10px] text-gray-400 font-medium mt-1">Vendedor: {fornecedor.vendedor_nome || 'Direto'} | CNPJ: {fornecedor.cnpj}</p>
    </div>
  );
}