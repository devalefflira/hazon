// src/lib/theme/ThemeProvider.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import type { TemaHazon } from './themeContext';

const CHAVE_STORAGE = 'hazon_tema';

const obterTemaInicial = (): TemaHazon => {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch {
    // Storage indisponível (modo privado, bloqueio): segue pela preferência do sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
};

const aplicarNoDocumento = (tema: TemaHazon) => {
  const root = document.documentElement;
  root.classList.toggle('dark', tema === 'escuro');
  root.style.colorScheme = tema === 'escuro' ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', tema === 'escuro' ? '#0b1417' : '#09797a');
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<TemaHazon>(obterTemaInicial);

  useEffect(() => {
    aplicarNoDocumento(tema);
    try {
      localStorage.setItem(CHAVE_STORAGE, tema);
    } catch {
      // Sem storage, o tema vale apenas para a sessão atual.
    }
  }, [tema]);

  const definirTema = useCallback((novo: TemaHazon) => setTema(novo), []);

  const alternarTema = useCallback(
    () => setTema((atual) => (atual === 'escuro' ? 'claro' : 'escuro')),
    []
  );

  const valor = useMemo(
    () => ({ tema, alternarTema, definirTema }),
    [tema, alternarTema, definirTema]
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}
