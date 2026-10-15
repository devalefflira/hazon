// src/components/ui/toastContext.ts
import { createContext } from 'react';

export type ToastTipo = 'sucesso' | 'erro' | 'aviso' | 'info';

export interface ToastContextValue {
  mostrarAviso: (mensagem: string, tipo?: ToastTipo) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
