// src/lib/theme/useTheme.ts
import { useContext } from 'react';
import { ThemeContext } from './themeContext';
import type { ThemeContextValue } from './themeContext';

export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext);
  if (!contexto) {
    throw new Error('useTheme deve ser usado dentro de <ThemeProvider>.');
  }
  return contexto;
}
