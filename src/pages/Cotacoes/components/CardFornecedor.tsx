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
        <p className="text-sm font-bold text-gray-800 truncate mb-0.5">
          {fornecedor.nome_fantasia}
        </p>
        <p className="text-[11px] text-gray-500 mb-1 truncate">
          {fornecedor.razao_social} • CNPJ: {fornecedor.cnpj}
        </p>
        
        {fornecedor.vendedor_nome && (
          <div className="bg-gray-50 rounded p-1.5 mt-1 border border-gray-100">
            <p className="text-[11px] text-gray-600 font-medium flex justify-between">
              <span>👤 {fornecedor.vendedor_nome}</span>
              {fornecedor.vendedor_telefone && (
                <span>📞 {fornecedor.vendedor_telefone}</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}