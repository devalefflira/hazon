// src/lib/theme/themeContext.ts
import { createContext } from 'react';

export type TemaHazon = 'claro' | 'escuro';

export interface ThemeContextValue {
  tema: TemaHazon;
  alternarTema: () => void;
  definirTema: (novo: TemaHazon) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
