// src/components/ui/ModalTelaCheia.tsx
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface ModalTelaCheiaProps {
  titulo: string;
  subtitulo?: string;
  onVoltar: () => void;
  acoes?: ReactNode;
  children: ReactNode;
}

export function ModalTelaCheia({ titulo, subtitulo, onVoltar, acoes, children }: ModalTelaCheiaProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 dark:bg-slate-950 backdrop-blur-sm">
      <PageHeader titulo={titulo} subtitulo={subtitulo} onVoltar={onVoltar} acoes={acoes} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
