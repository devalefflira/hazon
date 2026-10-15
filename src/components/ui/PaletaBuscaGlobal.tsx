// src/components/ui/PaletaBuscaGlobal.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CATEGORIAS_TITULO, EVENTO_ABRIR_BUSCA, MODULOS } from '../../lib/navegacao/modulos';
import type { ModuloNavegacao } from '../../lib/navegacao/modulos';
import { useSessao } from '../../lib/sessao/useSessao';
import { temAcesso } from '../../lib/navegacao/permissoes';

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Busca global de módulos. Abre com Ctrl+K (ou Cmd+K), pelo evento EVENTO_ABRIR_BUSCA
 * e fecha com Esc. Só aparece com usuário logado.
 */
export function PaletaBuscaGlobal() {
  const navigate = useNavigate();
  const { usuario, permissoes } = useSessao();

  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const abrir = useCallback(() => {
    setTermo('');
    setIndice(0);
    setAberta(true);
  }, []);

  const fechar = useCallback(() => setAberta(false), []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (aberta) fechar();
        else abrir();
      } else if (e.key === 'Escape' && aberta) {
        fechar();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener(EVENTO_ABRIR_BUSCA, abrir);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(EVENTO_ABRIR_BUSCA, abrir);
    };
  }, [aberta, abrir, fechar]);

  useEffect(() => {
    if (aberta) inputRef.current?.focus();
  }, [aberta]);

  const modulosPermitidos = useMemo(
    () => MODULOS.filter((m) => temAcesso(m.caminho, permissoes)),
    [permissoes]
  );

  const resultados = useMemo(() => {
    const busca = normalizar(termo.trim());
    if (!busca) return modulosPermitidos;
    return modulosPermitidos.filter((m) =>
      normalizar(`${m.nome} ${m.descricao} ${CATEGORIAS_TITULO[m.categoria]}`).includes(busca)
    );
  }, [termo, modulosPermitidos]);

  const irPara = (modulo: ModuloNavegacao) => {
    fechar();
    navigate(modulo.caminho);
  };

  const onKeyDownInput = (e: KeyboardEvent<HTMLInputElement>) => {
    const ultimo = Math.max(resultados.length - 1, 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, ultimo));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[indice]) {
      e.preventDefault();
      irPara(resultados[indice]);
    }
  };

  if (!usuario || !aberta) return null;

  return (
    <div
      role="presentation"
      onClick={fechar}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 backdrop-blur-sm px-4 pt-[12vh]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar módulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setIndice(0);
            }}
            onKeyDown={onKeyDownInput}
            placeholder="Buscar módulo..."
            aria-label="Buscar módulo"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          <kbd className="hidden sm:inline text-[10px] font-bold text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto p-2">
          {resultados.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhum módulo encontrado.
            </li>
          )}

          {resultados.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => irPara(m)}
                onMouseEnter={() => setIndice(i)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex flex-col gap-0.5 transition-colors ${
                  i === indice
                    ? 'bg-teal-50 dark:bg-teal-900/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                  {m.nome}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {CATEGORIAS_TITULO[m.categoria]} · {m.descricao}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
