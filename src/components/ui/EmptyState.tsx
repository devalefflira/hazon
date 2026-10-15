// src/components/ui/EmptyState.tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}

export function EmptyState({ icone, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6 text-slate-500 dark:text-slate-400">
      {icone && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
          {icone}
        </div>
      )}
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{titulo}</p>
      {descricao && <p className="text-xs max-w-xs">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
