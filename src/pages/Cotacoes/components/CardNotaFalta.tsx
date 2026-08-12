// Arquivo: src/pages/Cotacoes/components/CardNotaFalta.tsx
import type { FaltaPendente } from '../hooks/useFaltasPendentes';

interface CardNotaFaltaProps {
  falta: FaltaPendente;
  selecionado: boolean;
  onToggle: (id: string) => void;
}

export function CardNotaFalta({ falta, selecionado, onToggle }: CardNotaFaltaProps) {
  const quantidade = falta.quantidade_restante ?? 0;

  return (
    <div
      onClick={() => onToggle(falta.id)}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex justify-between items-center ${
        selecionado
          ? 'bg-emerald-50/60 border-[#09797a] shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={() => {}}
          className="w-4 h-4 accent-[#09797a] rounded cursor-pointer"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-black text-[#09797a] bg-[#09797a]/10 px-2 py-0.5 rounded-md">
              {falta.codigo_customizado}
            </span>
            <span className="text-[10px] font-mono text-gray-400 font-bold">
              Cód: {falta.produto.codprod}
            </span>
          </div>

          <h4 className="font-black text-xs text-gray-800 uppercase mt-1">
            {falta.produto.descricao}
          </h4>

          <p className="text-[10px] text-gray-400 font-medium">
            EAN: {falta.produto.codbarra || 'SEM EAN'} | Dep: {falta.produto.departamento} {falta.produto.secao ? `› ${falta.produto.secao}` : ''}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-600 font-bold">
              Motivo: {falta.motivo.descricao}
            </span>
            {quantidade > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-md font-mono">
                Saldo: {quantidade} {falta.unidade_restante || 'UN'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <span className="text-[9px] font-mono text-gray-400 block">
          {new Date(falta.data_registro + 'T00:00:00').toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
}