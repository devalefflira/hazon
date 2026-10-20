// src/pages/Organograma/components/GerenciarSetores.tsx
import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ModalTelaCheia } from '../../../components/ui/ModalTelaCheia';
import { organogramaService } from '../services/organogramaService';
import type { OrganogramaColaborador, OrganogramaSetor } from '../types/organograma.types';

interface GerenciarSetoresProps {
  setores: OrganogramaSetor[];
  colaboradores: OrganogramaColaborador[];
  onAlterado: (mensagem: string) => void;
  onFechar: () => void;
}

const CLASSE_CAMPO =
  'h-10 flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#09797a] focus:ring-2 focus:ring-teal-100';

function mensagemDeErro(err: unknown): string {
  if ((err as { code?: string } | null)?.code === '23505') return 'Já existe um setor com este nome.';
  return (err as { message?: string } | null)?.message || 'Não foi possível concluir a operação.';
}

export function GerenciarSetores({ setores, colaboradores, onAlterado, onFechar }: GerenciarSetoresProps) {
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const contarColaboradores = (setorId: string) =>
    colaboradores.filter((c) => c.setor_id === setorId).length;

  const adicionar = async () => {
    if (!novoNome.trim()) return;
    try {
      setOcupado(true);
      setErro('');
      await organogramaService.salvarSetor(null, novoNome);
      setNovoNome('');
      onAlterado('Setor adicionado.');
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setOcupado(false);
    }
  };

  const iniciarEdicao = (setor: OrganogramaSetor) => {
    setEditandoId(setor.id);
    setNomeEdicao(setor.nome);
    setErro('');
  };

  const salvarEdicao = async () => {
    if (!editandoId || !nomeEdicao.trim()) return;
    try {
      setOcupado(true);
      setErro('');
      await organogramaService.salvarSetor(editandoId, nomeEdicao);
      setEditandoId(null);
      onAlterado('Setor renomeado.');
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async (setor: OrganogramaSetor) => {
    const quantidade = contarColaboradores(setor.id);
    const pergunta =
      quantidade > 0
        ? `O setor "${setor.nome}" tem ${quantidade} colaborador(es). Eles ficarão sem setor. Excluir mesmo assim?`
        : `Excluir o setor "${setor.nome}"?`;
    if (!window.confirm(pergunta)) return;

    try {
      setOcupado(true);
      setErro('');
      await organogramaService.excluirSetor(setor.id);
      onAlterado('Setor excluído.');
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ModalTelaCheia titulo="Setores" subtitulo="Áreas da operação usadas no organograma" onVoltar={onFechar}>
      <div className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adicionar();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do novo setor"
            className={CLASSE_CAMPO}
          />
          <button
            type="submit"
            disabled={ocupado || !novoNome.trim()}
            className="h-10 px-3 rounded-xl bg-[#09797a] hover:bg-[#075f60] text-white text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 shrink-0"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
            {erro}
          </div>
        )}

        {setores.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10 italic">Nenhum setor cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {setores.map((setor) => {
              const editando = editandoId === setor.id;
              const quantidade = contarColaboradores(setor.id);

              return (
                <li
                  key={setor.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm"
                >
                  {editando ? (
                    <>
                      <input
                        type="text"
                        value={nomeEdicao}
                        onChange={(e) => setNomeEdicao(e.target.value)}
                        className={CLASSE_CAMPO}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={salvarEdicao}
                        disabled={ocupado}
                        aria-label="Salvar nome do setor"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        aria-label="Cancelar edição"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <span className="block font-black text-sm text-slate-800 uppercase tracking-tight truncate">
                          {setor.nome}
                        </span>
                        <span className="text-xs text-slate-500">
                          {quantidade} {quantidade === 1 ? 'colaborador' : 'colaboradores'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(setor)}
                        aria-label={`Renomear ${setor.nome}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#09797a] active:scale-95 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => excluir(setor)}
                        disabled={ocupado}
                        aria-label={`Excluir ${setor.nome}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalTelaCheia>
  );
}
