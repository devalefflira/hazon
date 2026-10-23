// src/pages/AuditoriaPrecificacao/components/AbaEtiquetas.tsx
import { useEffect, useMemo, useState } from 'react';
import { BarraPaginacao, paginar } from '../../../components/ui/BarraPaginacao';
import { auditoriaService } from '../services/auditoriaService';
import { ROTULO_SITUACAO } from '../types/auditoria.types';
import type { AuditoriaItemRegistro } from '../types/auditoria.types';
import { gerarPdfEtiquetas } from '../utils/etiquetasPdf';

interface AbaEtiquetasProps {
  onContagemAlterada: (total: number) => void;
  nomeResponsavel: string;
}

interface Mensagem {
  tipo: 'ok' | 'erro';
  texto: string;
}

const moeda = (valor: number | null | undefined): string =>
  valor === null || valor === undefined ? '-' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataHora = (iso: string): string => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export function AbaEtiquetas({ onContagemAlterada, nomeResponsavel }: AbaEtiquetasProps) {
  const [pendentes, setPendentes] = useState<AuditoriaItemRegistro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(20);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pendentes;
    return pendentes.filter(
      (i) =>
        i.codprod.toLowerCase().includes(termo) ||
        i.descricao.toLowerCase().includes(termo) ||
        i.secao_local.toLowerCase().includes(termo)
    );
  }, [pendentes, busca]);

  const pag = paginar(filtrados, pagina, tamanho);
  const idsSelecionados = useMemo(() => Object.keys(selecionados).filter((id) => selecionados[id]), [selecionados]);

  const carregar = async () => {
    try {
      setCarregando(true);
      const lista = await auditoriaService.listarEtiquetasPendentes();
      setPendentes(lista);
      setSelecionados({});
      onContagemAlterada(lista.length);
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar as etiquetas pendentes.' });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const selecionarTodos = () => {
    const proximo = { ...selecionados };
    filtrados.forEach((i) => {
      proximo[i.id] = true;
    });
    setSelecionados(proximo);
  };

  const limparSelecao = () => setSelecionados({});

  const copiarTexto = async (texto: string, rotulo: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setMensagem({ tipo: 'ok', texto: `${rotulo} copiados. Cole na rotina de etiquetas do ERP.` });
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível copiar automaticamente. Selecione os códigos na tela e copie manualmente.' });
    }
  };

  const listaParaCopiar = (): AuditoriaItemRegistro[] => {
    const escolhidos = pendentes.filter((i) => selecionados[i.id]);
    return escolhidos.length > 0 ? escolhidos : filtrados;
  };

  const copiarCodigosLinha = () => {
    const lista = listaParaCopiar();
    void copiarTexto(lista.map((i) => i.codprod).join('\n'), `${lista.length} código(s)`);
  };

  const abrirPdf = () => {
    const lista = listaParaCopiar();
    const abriu = gerarPdfEtiquetas(lista, nomeResponsavel);
    setMensagem(
      abriu
        ? { tipo: 'ok', texto: `PDF com ${lista.length} etiqueta(s) aberto em nova aba.` }
        : { tipo: 'erro', texto: 'O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.' }
    );
  };

  const marcarImpressas = async () => {
    if (idsSelecionados.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Selecione os itens já impressos para dar baixa.' });
      return;
    }
    if (!window.confirm(`Dar baixa em ${idsSelecionados.length} etiqueta(s) como impressa(s)?`)) return;
    try {
      setCarregando(true);
      await auditoriaService.marcarEtiquetasImpressas(idsSelecionados);
      setMensagem({ tipo: 'ok', texto: `${idsSelecionados.length} etiqueta(s) marcada(s) como impressa(s).` });
      await carregar();
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao dar baixa nas etiquetas.' });
    } finally {
      setCarregando(false);
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
            <h2 className="text-sm font-black text-slate-800 uppercase">Etiquetas pendentes</h2>
            <p className="text-xs text-slate-500 mt-1">
              Produtos sem preço na gôndola e produtos com preço incorreto. Gere o PDF ou copie os códigos e cole na rotina de etiquetas do ERP.
            </p>
          </div>
          <span className="text-xs font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-1.5">
            {pendentes.length} pendente(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por código, descrição ou seção"
            className="sm:col-span-2 p-3 rounded-2xl border border-slate-200 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filtrados.length === 0}
              onClick={selecionarTodos}
              className="flex-1 px-3 py-2.5 rounded-2xl text-[11px] font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all disabled:opacity-40"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              disabled={idsSelecionados.length === 0}
              onClick={limparSelecao}
              className="flex-1 px-3 py-2.5 rounded-2xl text-[11px] font-bold bg-slate-100 text-slate-600 active:scale-95 transition-all disabled:opacity-40"
            >
              Limpar seleção
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={filtrados.length === 0}
            onClick={copiarCodigosLinha}
            className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-[#09797a] hover:bg-[#075f60] text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            Copiar códigos (1 por linha)
          </button>
          <button
            type="button"
            disabled={filtrados.length === 0}
            onClick={abrirPdf}
            className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-teal-50 text-[#09797a] border border-teal-200 active:scale-95 transition-all disabled:opacity-40"
          >
            Gerar PDF
          </button>
          <button
            type="button"
            disabled={idsSelecionados.length === 0 || carregando}
            onClick={marcarImpressas}
            className="ml-auto px-4 py-2.5 rounded-2xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            Dar baixa nos selecionados ({idsSelecionados.length})
          </button>
        </div>
        <p className="text-[10px] text-slate-400">
          Sem seleção, cópia e PDF usam todos os itens da busca. Com seleção, usam apenas os selecionados.
        </p>
      </section>

      {!carregando && filtrados.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm font-bold text-slate-400">
          Nenhuma etiqueta pendente.
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
            {pag.itens.map((item) => (
              <label
                key={item.id}
                className={`bg-white rounded-3xl border border-slate-200 border-l-4 border-l-sky-400 shadow-sm p-4 flex items-start gap-3 cursor-pointer transition-all hover:shadow-md ${selecionados[item.id] ? 'ring-2 ring-[#09797a]/40' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={!!selecionados[item.id]}
                  onChange={(e) => setSelecionados((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                  className="mt-1 w-5 h-5 accent-[#09797a] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="block font-mono text-lg font-black text-[#09797a]">{item.codprod}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                      {item.situacao === 'INCORRETO' ? 'Preço incorreto' : ROTULO_SITUACAO[item.situacao]}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 break-words">{item.descricao}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {item.secao_local} • auditado em {dataHora(item.auditado_em)}
                    {item.usuarios?.nome && <> • por {item.usuarios.nome}</>}
                  </p>
                  {item.situacao === 'INCORRETO' && item.preco_encontrado !== null && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sistema: <strong className="font-mono">{moeda(Number(item.preco_sistema))}</strong> • Gôndola:{' '}
                      <strong className="font-mono text-amber-700">{moeda(Number(item.preco_encontrado))}</strong>
                    </p>
                  )}
                </div>
              </label>
            ))}
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
    </div>
  );
}
