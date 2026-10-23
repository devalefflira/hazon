// src/pages/AuditoriaPrecificacao/components/margeamento/ItensParaCorrigir.tsx
import { useEffect, useMemo, useState } from 'react';
import { BarraPaginacao, paginar } from '../../../../components/ui/BarraPaginacao';
import { auditoriaService } from '../../services/auditoriaService';
import { CLASSIFICACOES_FORA_DA_FAIXA, ROTULO_CLASSIFICACAO, ROTULO_SITUACAO } from '../../types/auditoria.types';
import type { AuditoriaItemRegistro, ClassificacaoMargem, StatusCorrecao } from '../../types/auditoria.types';
import { CLASSE_CLASSIFICACAO_MARGEM } from '../../utils/margem';

type FiltroStatus = 'PENDENTES' | 'CORRIGIDOS' | 'TODOS';
type FiltroClassificacao = 'TODAS' | ClassificacaoMargem;

interface Mensagem {
  tipo: 'ok' | 'erro';
  texto: string;
}

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : `${Number(valor).toFixed(1).replace('.', ',')}%`;

/** Preço que atinge a meta de margem: custo / (1 - meta). */
const precoParaMeta = (custo: number, metaPct: number | null): number | null => {
  if (metaPct === null || metaPct >= 100) return null;
  return custo / (1 - metaPct / 100);
};

const dataCurta = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
};

export function ItensParaCorrigir() {
  const [itens, setItens] = useState<AuditoriaItemRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('PENDENTES');
  const [filtroClassificacao, setFiltroClassificacao] = useState<FiltroClassificacao>('TODAS');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(20);

  const carregar = async () => {
    try {
      setCarregando(true);
      setItens(await auditoriaService.listarItensParaCorrigir());
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar os itens para correção.' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((i) => {
      const status: StatusCorrecao = i.correcao_status ?? 'Pendente';
      if (filtroStatus === 'PENDENTES' && status !== 'Pendente') return false;
      if (filtroStatus === 'CORRIGIDOS' && status !== 'Corrigido') return false;
      if (filtroClassificacao !== 'TODAS' && i.margem_classificacao !== filtroClassificacao) return false;
      if (termo) {
        const alvo = `${i.codprod} ${i.descricao} ${i.secao_local} ${i.departamento ?? ''} ${i.categoria ?? ''}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [itens, filtroStatus, filtroClassificacao, busca]);

  const contagens = useMemo(() => {
    const pendentes = itens.filter((i) => (i.correcao_status ?? 'Pendente') === 'Pendente').length;
    return { pendentes, corrigidos: itens.length - pendentes };
  }, [itens]);

  const pag = paginar(filtrados, pagina, tamanho);

  const alternarCorrecao = async (item: AuditoriaItemRegistro, corrigido: boolean) => {
    try {
      setSalvandoId(item.id);
      await auditoriaService.marcarCorrigido(item.id, corrigido);
      setItens((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, correcao_status: corrigido ? 'Corrigido' : 'Pendente', corrigido_em: corrigido ? new Date().toISOString() : null }
            : i
        )
      );
      setMensagem({ tipo: 'ok', texto: `${item.codprod} ${corrigido ? 'marcado como corrigido' : 'voltou para pendente'}.` });
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível atualizar o item.' });
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {mensagem && (
        <div className={`rounded-2xl p-3 text-xs font-bold border ${mensagem.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {mensagem.texto}
        </div>
      )}

      <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase">Itens para corrigir</h2>
            <p className="text-xs text-slate-500 mt-1">
              Produtos cuja margem ficou fora da faixa tolerável. Ajuste o preço no sistema e marque como corrigido.
            </p>
          </div>
          <span className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
            {contagens.pendentes} pendente(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por código, descrição, seção ou departamento"
            className="sm:col-span-2 p-3 rounded-2xl border border-slate-200 text-sm"
          />
          <select
            value={filtroClassificacao}
            onChange={(e) => {
              setFiltroClassificacao(e.target.value as FiltroClassificacao);
              setPagina(1);
            }}
            className="p-3 rounded-2xl border border-slate-200 text-sm font-bold bg-white"
          >
            <option value="TODAS">Todas as classificações</option>
            {CLASSIFICACOES_FORA_DA_FAIXA.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CLASSIFICACAO[c]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {(['PENDENTES', 'CORRIGIDOS', 'TODOS'] as FiltroStatus[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFiltroStatus(f);
                  setPagina(1);
                }}
                className={`flex-1 px-2 py-2.5 rounded-2xl text-[11px] font-black uppercase transition-all active:scale-95 ${
                  filtroStatus === f ? 'bg-[#09797a] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f === 'PENDENTES' ? `Pendentes (${contagens.pendentes})` : f === 'CORRIGIDOS' ? `Corrigidos (${contagens.corrigidos})` : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!carregando && filtrados.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
          Nenhum item para os filtros escolhidos.
        </div>
      )}

      {filtrados.length > 0 && (
        <>
          <BarraPaginacao
            total={filtrados.length}
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
              const status: StatusCorrecao = i.correcao_status ?? 'Pendente';
              const precoMeta = precoParaMeta(Number(i.custo_sistema), i.margem_meta_pct !== null ? Number(i.margem_meta_pct) : null);
              const classificacao = i.margem_classificacao;
              return (
                <article
                  key={i.id}
                  className={`bg-white rounded-3xl border border-slate-200 border-l-4 shadow-sm p-4 flex flex-col gap-3 ${
                    status === 'Corrigido' ? 'border-l-emerald-500 opacity-80' : 'border-l-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-black bg-slate-100 text-slate-700 rounded-lg px-2 py-1">{i.codprod}</span>
                        {classificacao && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_CLASSIFICACAO_MARGEM[classificacao]}`}>
                            {ROTULO_CLASSIFICACAO[classificacao]}
                          </span>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                          {ROTULO_SITUACAO[i.situacao]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-slate-800 break-words">{i.descricao}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {[i.departamento, i.secao_produto, i.categoria].filter(Boolean).join(' › ') || 'Sem classificação'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-2xl bg-slate-50 p-2.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Custo</span>
                      <span className="block text-sm font-black font-mono">{moeda(Number(i.custo_sistema))}</span>
                    </div>
                    <div className="rounded-2xl bg-teal-50 p-2.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Preço atual</span>
                      <span className="block text-sm font-black font-mono text-[#09797a]">{moeda(Number(i.preco_margem ?? i.preco_sistema))}</span>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-2.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Margem real / meta</span>
                      <span className="block text-sm font-black font-mono text-slate-800">
                        {fmtPct(i.margem_real_pct)} / {fmtPct(i.margem_meta_pct)}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-2.5">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Preço para a meta</span>
                      <span className="block text-sm font-black font-mono text-emerald-700">{moeda(precoMeta)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">
                      Seção: <strong className="text-slate-700">{i.secao_local}</strong> • auditado em {dataCurta(i.auditado_em)}
                      {i.corrigido_em && <> • corrigido em {dataCurta(i.corrigido_em)}</>}
                    </p>
                    <button
                      type="button"
                      disabled={salvandoId === i.id}
                      onClick={() => alternarCorrecao(i, status !== 'Corrigido')}
                      className={`px-4 py-2 rounded-2xl text-[11px] font-black uppercase active:scale-95 transition-all disabled:opacity-40 ${
                        status === 'Corrigido'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      }`}
                    >
                      {salvandoId === i.id ? 'Salvando...' : status === 'Corrigido' ? 'Reabrir' : 'Marcar como corrigido'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <BarraPaginacao
            total={filtrados.length}
            pagina={pag.paginaAtual}
            tamanho={tamanho}
            onPagina={setPagina}
            onTamanho={(t) => {
              setTamanho(t);
              setPagina(1);
            }}
          />
        </>
      )}

      {carregando && <p className="text-xs font-bold text-teal-600 animate-pulse px-1">Carregando...</p>}
    </div>
  );
}
