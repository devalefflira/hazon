// src/components/layout/AppShell.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CATEGORIAS_TITULO, EVENTO_ABRIR_BUSCA, MODULOS } from '../../lib/navegacao/modulos';
import type { CategoriaModulo } from '../../lib/navegacao/modulos';
import { temAcesso } from '../../lib/navegacao/permissoes';
import { useSessao } from '../../lib/sessao/useSessao';
import { ThemeToggle } from '../ui/ThemeToggle';

const ORDEM_CATEGORIAS: CategoriaModulo[] = ['indicadores', 'comercial', 'estoque', 'administracao'];

// Atalhos da barra inferior do celular (o botão "Mais" abre a busca de módulos)
const ATALHOS_MOBILE: { caminho: string; rotulo: string }[] = [
  { caminho: '/recebimentos', rotulo: 'Receber' },
  { caminho: '/nota-falta', rotulo: 'Falta' },
  { caminho: '/avarias', rotulo: 'Avarias' },
];

const abrirBusca = () => window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA));

function SidebarDesktop() {
  const { permissoes } = useSessao();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col sticky top-0 h-dvh bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="h-16 px-4 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
        <NavLink to="/home" className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#09797a] text-white flex items-center justify-center font-black shrink-0">
            H
          </span>
          <span className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-slate-100 truncate">
            Hazon ERP
          </span>
        </NavLink>
        <ThemeToggle className="w-9 h-9" />
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={abrirBusca}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-[#09797a]/40 active:scale-95 transition-all"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left truncate">Buscar módulo</span>
          <kbd className="text-[10px] font-bold border border-slate-200 dark:border-slate-600 rounded px-1">Ctrl K</kbd>
        </button>
      </div>

      <nav aria-label="Módulos" className="flex-1 overflow-y-auto px-3 pb-4 flex flex-col gap-4">
        {ORDEM_CATEGORIAS.map((categoria) => {
          const itens = MODULOS.filter(
            (m) => m.categoria === categoria && temAcesso(m.caminho, permissoes)
          );
          if (itens.length === 0) return null;

          return (
            <div key={categoria} className="flex flex-col gap-0.5">
              <span className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {CATEGORIAS_TITULO[categoria]}
              </span>
              {itens.map((m) => (
                <NavLink
                  key={m.id}
                  to={m.caminho}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-[#09797a] dark:bg-teal-900/30 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {m.nome}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function BarraInferiorMobile() {
  const { permissoes } = useSessao();
  const atalhos = ATALHOS_MOBILE.filter((a) => temAcesso(a.caminho, permissoes));

  const classeItem = (ativo: boolean) =>
    `w-full h-14 flex items-center justify-center px-1 rounded-xl text-[11px] font-bold truncate transition-all active:scale-95 ${
      ativo
        ? 'text-[#09797a] bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300'
        : 'text-slate-500 dark:text-slate-400'
    }`;

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch gap-1 px-2 py-1 max-w-3xl mx-auto">
        <li className="flex-1 min-w-0">
          <NavLink to="/home" className={({ isActive }) => classeItem(isActive)}>
            Início
          </NavLink>
        </li>
        {atalhos.map((a) => (
          <li key={a.caminho} className="flex-1 min-w-0">
            <NavLink to={a.caminho} className={({ isActive }) => classeItem(isActive)}>
              {a.rotulo}
            </NavLink>
          </li>
        ))}
        <li className="flex-1 min-w-0">
          <button type="button" onClick={abrirBusca} className={classeItem(false)}>
            Mais
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Layout das telas de módulo: barra lateral no desktop e barra inferior no celular.
 * Sem usuário logado, apenas renderiza a rota (a proteção fica em RotaProtegida).
 */
export function ShellAutenticado() {
  const { usuario } = useSessao();

  if (!usuario) return <Outlet />;

  return (
    <div className="min-h-dvh flex bg-slate-100 dark:bg-slate-950">
      <SidebarDesktop />
      <div className="flex-1 min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet />
      </div>
      <BarraInferiorMobile />
    </div>
  );
}
