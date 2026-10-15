// src/components/ui/PageHeader.tsx
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  onVoltar?: () => void;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, subtitulo, onVoltar, acoes }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        {onVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar"
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 truncate">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitulo}</p>
          )}
        </div>

        {acoes && <div className="flex items-center gap-2 shrink-0">{acoes}</div>}
      </div>
    </header>
  );
}
