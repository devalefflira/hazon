// src/components/ui/SegmentedTabs.tsx
export interface OpcaoAba<T extends string> {
  id: T;
  label: string;
  contador?: number;
}

interface SegmentedTabsProps<T extends string> {
  opcoes: OpcaoAba<T>[];
  valor: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  opcoes,
  valor,
  onChange,
  className = '',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl overflow-x-auto whitespace-nowrap ${className}`}
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.id === valor;
        return (
          <button
            key={opcao.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(opcao.id)}
            className={`flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              ativo
                ? 'bg-white dark:bg-slate-900 text-[#09797a] shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {opcao.label}
            {opcao.contador !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  ativo
                    ? 'bg-teal-50 text-[#09797a] dark:bg-teal-900/40 dark:text-teal-300'
                    : 'bg-slate-300/60 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {opcao.contador}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
