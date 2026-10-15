// src/components/ui/useToast.ts
import { useContext } from 'react';
import { ToastContext } from './toastContext';
import type { ToastContextValue } from './toastContext';

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  }
  return contexto;
}
