// src/pages/AuditoriaPrecificacao/components/AbaMargeamento.tsx
import { useState } from 'react';
import { ItensParaCorrigir } from './margeamento/ItensParaCorrigir';
import { ParametrosMargeamento } from './margeamento/ParametrosMargeamento';

type SubAbaMargeamento = 'PARAMETROS' | 'CORRIGIR';

interface AbaMargeamentoProps {
  nomeResponsavel: string;
}

export function AbaMargeamento({ nomeResponsavel }: AbaMargeamentoProps) {
  const [subAba, setSubAba] = useState<SubAbaMargeamento>('PARAMETROS');

  const rotulos: Array<{ id: SubAbaMargeamento; texto: string }> = [
    { id: 'PARAMETROS', texto: 'Parâmetros' },
    { id: 'CORRIGIR', texto: 'Itens para corrigir' }
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2 flex-wrap">
        {rotulos.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSubAba(r.id)}
            className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase transition-all active:scale-95 ${
              subAba === r.id ? 'bg-[#09797a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {r.texto}
          </button>
        ))}
      </nav>

      {subAba === 'PARAMETROS' && <ParametrosMargeamento />}
      {subAba === 'CORRIGIR' && <ItensParaCorrigir nomeResponsavel={nomeResponsavel} />}
    </div>
  );
}
