// src/components/ui/ToastProvider.tsx
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ToastContext } from './toastContext';
import type { ToastTipo } from './toastContext';

interface ToastItem {
  id: number;
  mensagem: string;
  tipo: ToastTipo;
}

const DURACAO_MS = 3500;

const estilos: Record<ToastTipo, string> = {
  sucesso: 'bg-emerald-600 text-white',
  erro: 'bg-red-600 text-white',
  aviso: 'bg-amber-500 text-white',
  info: 'bg-[#09797a] text-white',
};

const icones: Record<ToastTipo, LucideIcon> = {
  sucesso: Check,
  erro: X,
  aviso: Info,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);
  const contadorRef = useRef(0);

  const remover = useCallback((id: number) => {
    setItens((atual) => atual.filter((item) => item.id !== id));
  }, []);

  const mostrarAviso = useCallback(
    (mensagem: string, tipo: ToastTipo = 'info') => {
      contadorRef.current += 1;
      const id = contadorRef.current;
      setItens((atual) => [...atual, { id, mensagem, tipo }]);
      window.setTimeout(() => remover(id), DURACAO_MS);
    },
    [remover]
  );

  const valor = useMemo(() => ({ mostrarAviso }), [mostrarAviso]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {itens.map((item) => {
          const Icone = icones[item.tipo];
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-2.5 w-full max-w-md px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-stagger-card ${estilos[item.tipo]}`}
            >
              <Icone className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0">{item.mensagem}</span>
              <button
                type="button"
                onClick={() => remover(item.id)}
                aria-label="Fechar aviso"
                className="p-1 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
