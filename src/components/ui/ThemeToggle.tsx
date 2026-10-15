// src/components/ui/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { tema, alternarTema } = useTheme();
  const escuro = tema === 'escuro';

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={escuro ? 'Tema claro' : 'Tema escuro'}
      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all active:scale-95 bg-white border-slate-200 text-amber-500 hover:bg-teal-50 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-300 dark:hover:bg-slate-700 ${className}`}
    >
      {escuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
