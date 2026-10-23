// src/pages/AuditoriaPrecificacao/components/RelatorioAnalises.tsx
import { useEffect, useMemo, useState } from 'react';
import { BarraPaginacao, paginar } from '../../../components/ui/BarraPaginacao';
import { auditoriaService } from '../services/auditoriaService';
import {
  CLASSIFICACOES_FORA_DA_FAIXA,
  OPCAO_OUTRO,
  ROTULO_CLASSIFICACAO,
  ROTULO_SITUACAO,
  SECOES_AUDITORIA
} from '../types/auditoria.types';
import type { AuditoriaItemRegistro, SituacaoItem } from '../types/auditoria.types';
import { CLASSE_CLASSIFICACAO_MARGEM } from '../utils/margem';
import { gerarPdfRelatorio } from '../utils/relatorioPdf';

type FiltroSituacao = 'TODOS' | SituacaoItem;

const CLASSE_SITUACAO: Record<SituacaoItem, string> = {
  CORRETO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  INCORRETO: 'bg-amber-100 text-amber-800 border-amber-200',
  SEM_PRECO: 'bg-sky-100 text-sky-700 border-sky-200'
};

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (valor: number): string => `${valor.toFixed(1).replace('.', ',')}%`;
const pct = (parte: number, total: number): number => (total === 0 ? 0 : (parte / total) * 100);

const valoresUnicos = (lista: Array<string | null>): string[] =>
  Array.from(new Set(lista.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

const maiorGrupo = (contagem: Map<string, number>): { nome: string; total: number } | null => {
  let melhor: { nome: string; total: number } | null = null;
  contagem.forEach((total, nome) => {
    if (!melhor || total > melhor.total) melhor = { nome, total };
  });
  return melhor;
};

export function RelatorioAnalises() {
  const [itens, setItens] = useState<AuditoriaItemRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [secao, setSecao] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [categoria, setCategoria] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('TODOS');
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(20);
  const [mensagemPdf, setMensagemPdf] = useState<string | null>(null);

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
        setDepartamento('');
        setCategoria('');
        setPagina(1);
      } catch (err) {
        console.error(err);
        setErro('Não foi possível gerar o relatório.');
      } finally {
        setCarregando(false);
      }
    };
    void carregar();
  }, [secao, dataInicio, dataFim]);

  const opcoesDepartamento = useMemo(() => valoresUnicos(itens.map((i) => i.departamento)), [itens]);
  const opcoesCategoria = useMemo(() => valoresUnicos(itens.map((i) => i.categoria)), [itens]);

  const filtrados = useMemo(
    () =>
      itens.filter(
        (i) =>
          (!departamento || i.departamento === departamento) &&
          (!categoria || i.categoria === categoria) &&
          (situacao === 'TODOS' || i.situacao === situacao)
      ),
    [itens, departamento, categoria, situacao]
  );

  const resumo = useMemo(() => {
    const total = filtrados.length;
    const corretos = filtrados.filter((i) => i.situacao === 'CORRETO').length;
    const incorretos = filtrados.filter((i) => i.situacao === 'INCORRETO').length;
    const semPreco = filtrados.filter((i) => i.situacao === 'SEM_PRECO').length;
    const auditorias = new Set(filtrados.map((i) => i.auditoria_id)).size;
    const comGondola = filtrados.filter((i) => i.situacao === 'INCORRETO' && i.preco_encontrado !== null);
    const diferencaMedia =
      comGondola.length > 0
        ? comGondola.reduce((soma, i) => soma + (Number(i.preco_encontrado) - Number(i.preco_sistema)), 0) / comGondola.length
        : null;
    const aguardandoEtiqueta = filtrados.filter((i) => i.etiqueta_pendente).length;
    const foraDaFaixa = filtrados.filter(
      (i) => i.margem_classificacao !== null && CLASSIFICACOES_FORA_DA_FAIXA.includes(i.margem_classificacao)
    ).length;

    const divergenciasPorSecao = new Map<string, number>();
    const divergenciasPorDepartamento = new Map<string, number>();
    filtrados
      .filter((i) => i.situacao !== 'CORRETO')
      .forEach((i) => {
        divergenciasPorSecao.set(i.secao_local, (divergenciasPorSecao.get(i.secao_local) ?? 0) + 1);
        const dep = i.departamento || 'Sem departamento';
        divergenciasPorDepartamento.set(dep, (divergenciasPorDepartamento.get(dep) ?? 0) + 1);
      });

    return {
      total,
      corretos,
      incorretos,
      semPreco,
      auditorias,
      diferencaMedia,
      aguardandoEtiqueta,
      foraDaFaixa,
      divergencias: incorretos + semPreco,
      topSecao: maiorGrupo(divergenciasPorSecao),
      topDepartamento: maiorGrupo(divergenciasPorDepartamento)
    };
  }, [filtrados]);

  const pontosPrincipais = useMemo<string[]>(() => {
    if (resumo.total === 0) return [];
    const pontos: string[] = [
      `${resumo.total} item(ns) auditado(s) em ${resumo.auditorias} auditoria(s), com conformidade de ${fmtPct(pct(resumo.corretos, resumo.total))}.`,
      `${resumo.incorretos} incorreto(s) e ${resumo.semPreco} sem preço: ${fmtPct(pct(resumo.divergencias, resumo.total))} dos itens com divergência.`
    ];
    if (resumo.diferencaMedia !== null) {
      pontos.push(
        `Diferença média no preço dos incorretos: ${moeda(resumo.diferencaMedia)} (${resumo.diferencaMedia > 0 ? 'gôndola acima' : 'gôndola abaixo'} do sistema).`
      );
    }
    if (resumo.topSecao) pontos.push(`Seção com mais divergências: ${resumo.topSecao.nome} (${resumo.topSecao.total} item(ns)).`);
    if (resumo.topDepartamento) {
      pontos.push(`Departamento com mais divergências: ${resumo.topDepartamento.nome} (${resumo.topDepartamento.total} item(ns)).`);
    }
    pontos.push(`${resumo.aguardandoEtiqueta} etiqueta(s) aguardando impressão.`);
    pontos.push(`${resumo.foraDaFaixa} item(ns) com margem fora da faixa tolerável, encaminhados para correção.`);
    return pontos;
  }, [resumo]);

  const pag = paginar(filtrados, pagina, tamanho);

  const exportarPdf = () => {
    const formatar = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
    const periodo = dataInicio || dataFim ? `${formatar(dataInicio) || 'início'} a ${formatar(dataFim) || 'hoje'}` : 'Todo o período';
    const abriu = gerarPdfRelatorio({
      itens: filtrados,
      pontos: pontosPrincipais,
      filtros: {
        periodo,
        secao: secao || 'Todas',
        departamento: departamento || 'Todos',
        categoria: categoria || 'Todas',
        situacao: situacao === 'TODOS' ? 'Todos' : ROTULO_SITUACAO[situacao]
      }
    });
    setMensagemPdf(abriu ? null : 'O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.');
  };

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setSecao('');
    setDepartamento('');
    setCategoria('');
    setSituacao('TODOS');
    setPagina(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* FILTROS */}
      <section className="bg-white rounded-3xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Data inicial</span>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Data final</span>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Seção</span>
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
          <span className="text-[10px] font-bold text-slate-500 uppercase">Situação</span>
          <select value={situacao} onChange={(e) => setSituacao(e.target.value as FiltroSituacao)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold bg-white">
            <option value="TODOS">Todos</option>
            <option value="INCORRETO">{ROTULO_SITUACAO.INCORRETO}</option>
            <option value="SEM_PRECO">{ROTULO_SITUACAO.SEM_PRECO}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Departamento</span>
          <select value={departamento} onChange={(e) => setDepartamento(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold bg-white">
            <option value="">Todos</option>
            {opcoesDepartamento.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="p-3 rounded-2xl border border-slate-200 text-sm font-bold bg-white">
            <option value="">Todas</option>
            {opcoesCategoria.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={limparFiltros}
          className="p-3 rounded-2xl text-xs font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all"
        >
          Limpar filtros
        </button>
      </section>

      {erro && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3">{erro}</div>}
      {carregando && <p className="text-xs font-bold text-teal-600 animate-pulse px-1">Gerando relatório...</p>}
      {mensagemPdf && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl p-3">{mensagemPdf}</div>}

      {!carregando && resumo.total === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
          Nenhum item de auditoria finalizada para os filtros escolhidos.
        </div>
      )}

      {resumo.total > 0 && (
        <>
          {/* PONTOS PRINCIPAIS */}
          <section className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3 border-l-4 border-l-[#09797a]">
            <h2 className="text-sm font-black text-slate-800 uppercase">Pontos principais</h2>
            <ul className="flex flex-col gap-2">
              {pontosPrincipais.map((p) => (
                <li key={p} className="text-xs text-slate-700 flex gap-2">
                  <span className="text-[#09797a] font-black">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* DETALHAMENTO */}
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <h2 className="text-xs font-black text-slate-700 uppercase">Detalhamento ({filtrados.length} item(ns))</h2>
              <button
                type="button"
                onClick={exportarPdf}
                className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all"
              >
                Gerar PDF
              </button>
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

            <div className="overflow-x-auto whitespace-nowrap bg-white rounded-3xl shadow-sm border border-slate-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-black">Código</th>
                    <th className="px-3 py-2.5 font-black">Descrição</th>
                    <th className="px-3 py-2.5 font-black">Departamento</th>
                    <th className="px-3 py-2.5 font-black">Categoria</th>
                    <th className="px-3 py-2.5 font-black">Seção</th>
                    <th className="px-3 py-2.5 font-black">Situação</th>
                    <th className="px-3 py-2.5 font-black text-right">Custo</th>
                    <th className="px-3 py-2.5 font-black text-right">Sistema</th>
                    <th className="px-3 py-2.5 font-black text-right">Gôndola</th>
                    <th className="px-3 py-2.5 font-black text-right">Margem</th>
                    <th className="px-3 py-2.5 font-black">Classificação</th>
                    <th className="px-3 py-2.5 font-black">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pag.itens.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-black text-slate-700">{i.codprod}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800">{i.descricao}</td>
                      <td className="px-3 py-2.5 text-slate-600">{i.departamento ?? '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{i.categoria ?? '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{i.secao_local}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_SITUACAO[i.situacao]}`}>
                          {ROTULO_SITUACAO[i.situacao]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{moeda(Number(i.custo_sistema))}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{moeda(Number(i.preco_sistema))}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-700">
                        {i.preco_encontrado !== null ? moeda(Number(i.preco_encontrado)) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {i.margem_real_pct !== null ? fmtPct(Number(i.margem_real_pct)) : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        {i.margem_classificacao ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${CLASSE_CLASSIFICACAO_MARGEM[i.margem_classificacao]}`}>
                            {ROTULO_CLASSIFICACAO[i.margem_classificacao]}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{i.data_auditoria.split('-').reverse().join('/')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          </section>
        </>
      )}
    </div>
  );
}
