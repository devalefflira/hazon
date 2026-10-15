// src/components/ui/LoadingScreen.tsx
export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950"
    >
      <div className="w-10 h-10 rounded-full border-4 border-teal-100 dark:border-slate-800 border-t-[#09797a] animate-spin" />
      <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
        Carregando módulo...
      </span>
    </div>
  );
}
