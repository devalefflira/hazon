// src/components/ui/BotaoBuscaGlobal.tsx
import { Search } from 'lucide-react';
import { EVENTO_ABRIR_BUSCA } from '../../lib/navegacao/modulos';

export function BotaoBuscaGlobal({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA))}
      aria-label="Buscar módulo"
      title="Buscar módulo (Ctrl+K)"
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 bg-white border-slate-200 text-slate-600 hover:bg-teal-50 hover:text-[#09797a] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      <Search className="w-5 h-5" />
    </button>
  );
}
