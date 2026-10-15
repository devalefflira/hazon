// src/lib/sessao/useSessao.ts
import { useContext } from 'react';
import { SessaoContext } from './sessaoContext';
import type { SessaoContextValue } from './sessaoContext';

export function useSessao(): SessaoContextValue {
  const contexto = useContext(SessaoContext);
  if (!contexto) {
    throw new Error('useSessao deve ser usado dentro de <SessaoProvider>.');
  }
  return contexto;
}
