// src/components/ui/BarraAcaoFixa.tsx
import type { ReactNode } from 'react';

interface BarraAcaoFixaProps {
  children: ReactNode;
}

export function BarraAcaoFixa({ children }: BarraAcaoFixaProps) {
  return (
    <div
      className="sticky bottom-0 z-30 px-4 pt-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">{children}</div>
    </div>
  );
}
