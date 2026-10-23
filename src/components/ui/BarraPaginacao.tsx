// src/components/ui/BarraPaginacao.tsx
export const OPCOES_TAMANHO_PAGINA_PADRAO = [20, 30, 50, 100, 200, 300];

/** Recorta a lista na página pedida, corrigindo a página se ela ficar fora do total (ex.: após filtrar). */
export function paginar<T>(lista: T[], pagina: number, tamanho: number): { itens: T[]; paginaAtual: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / tamanho));
  const paginaAtual = Math.min(Math.max(pagina, 1), totalPaginas);
  const inicio = (paginaAtual - 1) * tamanho;
  return { itens: lista.slice(inicio, inicio + tamanho), paginaAtual, totalPaginas };
}

function listaPaginas(atual: number, total: number): Array<number | '...'> {
  const paginas: Array<number | '...'> = [];
  const inicio = Math.max(1, atual - 2);
  const fim = Math.min(total, atual + 2);
  if (inicio > 1) {
    paginas.push(1);
    if (inicio > 2) paginas.push('...');
  }
  for (let p = inicio; p <= fim; p++) paginas.push(p);
  if (fim < total) {
    if (fim < total - 1) paginas.push('...');
    paginas.push(total);
  }
  return paginas;
}

interface BarraPaginacaoProps {
  total: number;
  pagina: number;
  tamanho: number;
  onPagina: (pagina: number) => void;
  onTamanho: (tamanho: number) => void;
  opcoes?: number[];
}

export function BarraPaginacao({ total, pagina, tamanho, onPagina, onTamanho, opcoes = OPCOES_TAMANHO_PAGINA_PADRAO }: BarraPaginacaoProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Math.min(pagina, totalPaginas);
  const inicio = total === 0 ? 0 : (atual - 1) * tamanho + 1;
  const fim = Math.min(atual * tamanho, total);
  const base = 'min-w-[36px] h-9 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
        <span className="font-bold">Exibir</span>
        <select
          value={tamanho}
          onChange={(e) => onTamanho(Number(e.target.value))}
          className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
        >
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <span className="text-slate-400">por página • {inicio}–{fim} de {total}</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={atual <= 1}
          onClick={() => onPagina(atual - 1)}
          className={`${base} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          ‹ Anterior
        </button>
        {listaPaginas(atual, totalPaginas).map((p, idx) =>
          p === '...' ? (
            <span key={`reticencias-${idx}`} className="px-2 text-slate-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPagina(p)}
              className={`${base} ${p === atual ? 'bg-[#09797a] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={atual >= totalPaginas}
          onClick={() => onPagina(atual + 1)}
          className={`${base} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          Próxima ›
        </button>
      </div>
    </div>
  );
}
