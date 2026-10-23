// src/pages/AuditoriaPrecificacao/components/AbaAnalises.tsx
import { useEffect, useMemo, useState } from 'react';
import { BarraPaginacao, paginar } from '../../../components/ui/BarraPaginacao';
import { auditoriaService } from '../services/auditoriaService';
import { ROTULO_SITUACAO, SECOES_AUDITORIA, OPCAO_OUTRO } from '../types/auditoria.types';
import type { AuditoriaItemRegistro, SituacaoItem } from '../types/auditoria.types';
import { RelatorioAnalises } from './RelatorioAnalises';

type FiltroProblema = 'TODOS' | 'INCORRETO' | 'SEM_PRECO';
type SubAbaAnalises = 'VISAO' | 'RELATORIOS';

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (parte: number, total: number): number => (total === 0 ? 0 : (parte / total) * 100);
const fmtPct = (valor: number): string => `${valor.toFixed(1).replace('.', ',')}%`;

const corConformidade = (valor: number, total: number): string => {
  if (total === 0) return 'text-slate-400';
  if (valor >= 90) return 'text-emerald-700';
  if (valor >= 70) return 'text-amber-600';
  return 'text-rose-600';
};

const CLASSE_SITUACAO: Record<SituacaoItem, string> = {
  CORRETO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INCORRETO: 'bg-amber-100 text-amber-800 border-amber-200',
  SEM_PRECO: 'bg-sky-100 text-sky-700 border-sky-200'
};

interface ResumoSecao {
  secao: string;
  total: number;
  corretos: number;
  incorretos: number;
  semPreco: number;
  auditorias: Set<string>;
  etiquetasPendentes: number;
}

function Kpi({ rotulo, valor, detalhe, classe = 'text-slate-800' }: { rotulo: string; valor: string; detalhe?: string; classe?: string }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{rotulo}</span>
      <span className={`text-2xl font-black font-mono ${classe}`}>{valor}</span>
      {detalhe && <span className="text-[11px] text-slate-500">{detalhe}</span>}
    </div>
  );
}

function VisaoGeral() {
  const [itens, setItens] = useState<AuditoriaItemRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [secao, setSecao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroProblema, setFiltroProblema] = useState<FiltroProblema>('TODOS');
  const [filtroSecaoProblema, setFiltroSecaoProblema] = useState('TODOS');
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(20);

  useEffect(() => {
    const carregar = async () => {
      try {
        setCarregando(true);
        setErro(null);
        setItens(
          await auditoriaService.listarAnalises({
            secao: secao || undefined,
            dataInicio: dataInicio || undefined,
            dataFim: dataFim || undefined
          })
        );
        setFiltroSecaoProblema('TODOS');
        setPagina(1);
      } catch (err) {
        console.error(err);
        setErro('Não foi possível carregar as análises.');
      } finally {
        setCarregando(false);
      }
    };
    void carregar();
  }, [secao, dataInicio, dataFim]);

  const totais = useMemo(() => {
    const total = itens.length;
    const corretos = itens.filter((i) => i.situacao === 'CORRETO').length;
    const incorretos = itens.filter((i) => i.situacao === 'INCORRETO').length;
    const semPreco = itens.filter((i) => i.situacao === 'SEM_PRECO').length;
    const auditorias = new Set(itens.map((i) => i.auditoria_id)).size;
    const etiquetasPendentes = itens.filter((i) => i.etiqueta_pendente).length;
    return { total, corretos, incorretos, semPreco, auditorias, etiquetasPendentes };
  }, [itens]);

  const secoesComDivergencia = useMemo(
    () => Array.from(new Set(itens.filter((i) => i.situacao !== 'CORRETO').map((i) => i.secao_local))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [itens]
  );

  const porSecao = useMemo<ResumoSecao[]>(() => {
    const mapa = new Map<string, ResumoSecao>();
    itens.forEach((i) => {
      const atual =
        mapa.get(i.secao_local) ??
        ({ secao: i.secao_local, total: 0, corretos: 0, incorretos: 0, semPreco: 0, auditorias: new Set<string>(), etiquetasPendentes: 0 } as ResumoSecao);
      atual.total += 1;
      if (i.situacao === 'CORRETO') atual.corretos += 1;
      if (i.situacao === 'INCORRETO') atual.incorretos += 1;
      if (i.situacao === 'SEM_PRECO') atual.semPreco += 1;
      if (i.etiqueta_pendente) atual.etiquetasPendentes += 1;
      atual.auditorias.add(i.auditoria_id);
      mapa.set(i.secao_local, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => pct(a.corretos, a.total) - pct(b.corretos, b.total));
  }, [itens]);

  const problemas = useMemo(
    () =>
      itens.filter((i) => {
        if (i.situacao === 'CORRETO') return false;
        if (filtroProblema !== 'TODOS' && i.situacao !== filtroProblema) return false;
        if (filtroSecaoProblema !== 'TODOS' && i.secao_local !== filtroSecaoProblema) return false;
        return true;
      }),
    [itens, filtroProblema, filtroSecaoProblema]
  );

  const pag = paginar(problemas, pagina, tamanho);

  return (
    <div className="flex flex-col gap-4">
      {/* FILTROS */}
      <section className="bg-white rounded-3xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Seção / corredor</span>
          <select value={secao} onChange={(e) => setSecao(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold bg-white">
            <option value="">Todas</option>
            {SECOES_AUDITORIA.filter((s) => s !== OPCAO_OUTRO).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Data inicial</span>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Data final</span>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold" />
        </label>
        <button
          type="button"
          onClick={() => {
            setSecao('');
            setDataInicio('');
            setDataFim('');
          }}
          className="p-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all"
        >
          Limpar filtros
        </button>
      </section>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3">{erro}</div>}

      {!carregando && totais.total === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
          Nenhuma auditoria finalizada para os filtros escolhidos.
        </div>
      )}

      {totais.total > 0 && (
        <>
          {/* INDICADORES */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Kpi rotulo="Auditorias" valor={String(totais.auditorias)} detalhe="finalizadas no filtro" />
            <Kpi rotulo="Itens auditados" valor={String(totais.total)} />
            <Kpi
              rotulo="Conformidade"
              valor={fmtPct(pct(totais.corretos, totais.total))}
              detalhe={`${totais.corretos} correto(s)`}
              classe={corConformidade(pct(totais.corretos, totais.total), totais.total)}
            />
            <Kpi rotulo="Incorretos" valor={fmtPct(pct(totais.incorretos, totais.total))} detalhe={`${totais.incorretos} item(ns)`} classe="text-amber-700" />
            <Kpi rotulo="Sem preço" valor={fmtPct(pct(totais.semPreco, totais.total))} detalhe={`${totais.etiquetasPendentes} etiqueta(s) no filtro`} classe="text-sky-700" />
          </section>

          {/* COMPARATIVO POR SEÇÃO */}
          <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">Situação por seção</h2>
              <p className="text-xs text-slate-500 mt-1">Ordenado da seção com menor conformidade para a maior.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {porSecao.map((s) => {
                const conformidade = pct(s.corretos, s.total);
                return (
                  <article key={s.secao} className="rounded-3xl border border-slate-200 p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase">{s.secao}</h3>
                        <p className="text-[11px] text-slate-500">
                          {s.auditorias.size} auditoria(s) • {s.total} item(ns)
                        </p>
                      </div>
                      <span className={`text-xl font-black font-mono ${corConformidade(conformidade, s.total)}`}>{fmtPct(conformidade)}</span>
                    </div>

                    {/* Barra empilhada: corretos / incorretos / sem preço */}
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="bg-emerald-500 h-full" style={{ width: `${pct(s.corretos, s.total)}%` }} />
                      <div className="bg-amber-400 h-full" style={{ width: `${pct(s.incorretos, s.total)}%` }} />
                      <div className="bg-sky-400 h-full" style={{ width: `${pct(s.semPreco, s.total)}%` }} />
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">Corretos: {s.corretos}</span>
                      <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-100">Incorretos: {s.incorretos}</span>
                      <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">Sem preço: {s.semPreco}</span>
                      {s.etiquetasPendentes > 0 && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                          Etiquetas pendentes: {s.etiquetasPendentes}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* ITENS COM PROBLEMA */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-black text-slate-700 uppercase">Itens com divergência ({problemas.length})</h2>
              <div className="flex flex-wrap items-center gap-2">
                {(['TODOS', 'INCORRETO', 'SEM_PRECO'] as FiltroProblema[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFiltroProblema(f);
                      setPagina(1);
                    }}
                    className={`px-3 py-2 rounded-2xl text-[11px] font-black uppercase transition-all active:scale-95 ${
                      filtroProblema === f ? 'bg-[#09797a] text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {f === 'TODOS' ? 'Todos' : ROTULO_SITUACAO[f]}
                  </button>
                ))}
                <select
                  value={filtroSecaoProblema}
                  onChange={(e) => {
                    setFiltroSecaoProblema(e.target.value);
                    setPagina(1);
                  }}
                  className="px-3 py-2 rounded-2xl text-[11px] font-black uppercase bg-white text-slate-600 border border-slate-200"
                  aria-label="Filtrar divergências por seção"
                >
                  <option value="TODOS">Seção: TODOS</option>
                  {secoesComDivergencia.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <BarraPaginacao
              total={problemas.length}
              pagina={pag.paginaAtual}
              tamanho={tamanho}
              onPagina={setPagina}
              onTamanho={(t) => {
                setTamanho(t);
                setPagina(1);
              }}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {pag.itens.map((i) => {
                const diferenca =
                  i.situacao === 'INCORRETO' && i.preco_encontrado !== null ? Number(i.preco_encontrado) - Number(i.preco_sistema) : null;
                return (
                  <article key={i.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{i.codprod}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_SITUACAO[i.situacao]}`}>
                            {ROTULO_SITUACAO[i.situacao]}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-black text-slate-800 break-words">{i.descricao}</h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {[i.departamento, i.secao_produto, i.categoria].filter(Boolean).join(' › ') || 'Sem classificação'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-slate-50 p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Custo</span>
                        <span className="block text-sm font-black font-mono">{moeda(Number(i.custo_sistema))}</span>
                      </div>
                      <div className="rounded-2xl bg-teal-50 p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Sistema</span>
                        <span className="block text-sm font-black font-mono text-[#09797a]">{moeda(Number(i.preco_sistema))}</span>
                      </div>
                      <div className="rounded-2xl bg-amber-50 p-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Gôndola</span>
                        <span className="block text-sm font-black font-mono text-amber-700">
                          {i.preco_encontrado !== null ? moeda(Number(i.preco_encontrado)) : '-'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Seção: <strong className="text-slate-700">{i.secao_local}</strong> • {i.data_auditoria.split('-').reverse().join('/')}
                      {diferenca !== null && (
                        <>
                          {' '}• Diferença: <strong className={diferenca > 0 ? 'text-rose-600' : 'text-emerald-700'}>{moeda(diferenca)}</strong>
                        </>
                      )}
                      {i.etiqueta_pendente && <> • <strong className="text-sky-700">Aguardando etiqueta</strong></>}
                    </p>
                  </article>
                );
              })}
            </div>

            <BarraPaginacao
              total={problemas.length}
              pagina={pag.paginaAtual}
              tamanho={tamanho}
              onPagina={setPagina}
              onTamanho={(t) => {
                setTamanho(t);
                setPagina(1);
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}

export function AbaAnalises() {
  const [subAba, setSubAba] = useState<SubAbaAnalises>('VISAO');

  const rotulos: Array<{ id: SubAbaAnalises; texto: string }> = [
    { id: 'VISAO', texto: 'Visão geral' },
    { id: 'RELATORIOS', texto: 'Relatórios' }
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-2 flex-wrap">
        {rotulos.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSubAba(r.id)}
            className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase transition-all active:scale-95 ${
              subAba === r.id ? 'bg-[#09797a] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {r.texto}
          </button>
        ))}
      </nav>

      {subAba === 'VISAO' && <VisaoGeral />}
      {subAba === 'RELATORIOS' && <RelatorioAnalises />}
    </div>
  );
}
