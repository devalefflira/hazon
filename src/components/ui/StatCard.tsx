// src/components/ui/StatCard.tsx
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

type TomStatCard = 'teal' | 'red' | 'amber' | 'slate';

interface StatCardProps {
  titulo: string;
  valor: ReactNode;
  icone?: ReactNode;
  tom?: TomStatCard;
  onClick?: () => void;
  carregando?: boolean;
}

const tons: Record<TomStatCard, string> = {
  teal: 'text-[#09797a] bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300',
  red: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-300',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300',
  slate: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
};

const baseClasses =
  'w-full min-w-0 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm';

export function StatCard({ titulo, valor, icone, tom = 'teal', onClick, carregando = false }: StatCardProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {titulo}
        </span>
        {icone && (
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tons[tom]}`}>
            {icone}
          </span>
        )}
      </div>

      {carregando ? (
        <Skeleton className="h-7 w-24 mt-3" />
      ) : (
        <div className="mt-2 text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 truncate">
          {valor}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} hover:border-[#09797a]/40 active:scale-95 transition-all`}
      >
        {conteudo}
      </button>
    );
  }

  return <div className={baseClasses}>{conteudo}</div>;
}
