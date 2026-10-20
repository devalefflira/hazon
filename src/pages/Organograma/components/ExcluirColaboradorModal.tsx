// src/pages/Organograma/components/ExcluirColaboradorModal.tsx
import { useState } from 'react';
import { organogramaService } from '../services/organogramaService';
import { coletarDescendentes } from '../utils/arvoreOrganograma';
import type { OrganogramaColaborador } from '../types/organograma.types';

interface ExcluirColaboradorModalProps {
  colaborador: OrganogramaColaborador;
  colaboradores: OrganogramaColaborador[];
  onSucesso: (mensagem: string) => void;
  onFechar: () => void;
}

function mensagemDeErro(err: unknown): string {
  const mensagem = (err as { message?: string } | null)?.message;
  return mensagem || 'Não foi possível excluir o colaborador.';
}

export function ExcluirColaboradorModal({
  colaborador,
  colaboradores,
  onSucesso,
  onFechar,
}: ExcluirColaboradorModalProps) {
  const subordinados = colaboradores.filter((c) => c.superior_id === colaborador.id);

  // Quem recebe os subordinados não pode estar abaixo do colaborador excluído.
  const bloqueados = new Set<string>([colaborador.id, ...coletarDescendentes(colaborador.id, colaboradores)]);
  const candidatos = colaboradores
    .filter((c) => !bloqueados.has(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const [novoSuperiorId, setNovoSuperiorId] = useState(colaborador.superior_id ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async () => {
    try {
      setSalvando(true);
      setErro('');
      if (subordinados.length > 0) {
        await organogramaService.reatribuirSubordinados(colaborador.id, novoSuperiorId || null);
      }
      await organogramaService.excluirColaborador(colaborador.id);
      onSucesso(`${colaborador.nome} foi removido do organograma.`);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-800">Excluir colaborador</h2>
          <p className="text-sm text-slate-600 mt-2">
            Remover <strong className="text-slate-900">{colaborador.nome}</strong> ({colaborador.cargo}) do
            organograma? Essa ação não pode ser desfeita.
          </p>
        </div>

        {subordinados.length > 0 && (
          <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
            <p className="text-xs text-amber-900 font-medium">
              Ele tem {subordinados.length} subordinado(s). Para quem eles passam a reportar?
            </p>
            <select
              value={novoSuperiorId}
              onChange={(e) => setNovoSuperiorId(e.target.value)}
              className="w-full h-11 rounded-xl border border-amber-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#09797a]"
            >
              <option value="">Nenhum (topo da hierarquia)</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>{`${c.nome} — ${c.cargo}`}</option>
              ))}
            </select>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
            {erro}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="h-11 px-4 rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-600 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase shadow-sm active:scale-95 transition-all disabled:opacity-40"
          >
            {salvando ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
