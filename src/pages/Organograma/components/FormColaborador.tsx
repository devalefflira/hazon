// src/pages/Organograma/components/FormColaborador.tsx
import { useState } from 'react';
import { ModalTelaCheia } from '../../../components/ui/ModalTelaCheia';
import { organogramaService } from '../services/organogramaService';
import { coletarDescendentes } from '../utils/arvoreOrganograma';
import { NIVEIS_ORGANOGRAMA } from '../types/organograma.types';
import type { NivelOrganograma, OrganogramaColaborador, OrganogramaSetor } from '../types/organograma.types';

interface FormColaboradorProps {
  colaborador: OrganogramaColaborador | null;
  colaboradores: OrganogramaColaborador[];
  setores: OrganogramaSetor[];
  onSucesso: (mensagem: string) => void;
  onFechar: () => void;
}

const CLASSE_CAMPO =
  'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#09797a] focus:ring-2 focus:ring-teal-100';
const CLASSE_LABEL = 'text-[11px] font-black uppercase tracking-wide text-slate-500';

function mensagemDeErro(err: unknown, padrao: string): string {
  const mensagem = (err as { message?: string } | null)?.message;
  return mensagem || padrao;
}

export function FormColaborador({
  colaborador,
  colaboradores,
  setores,
  onSucesso,
  onFechar,
}: FormColaboradorProps) {
  const [nome, setNome] = useState(colaborador?.nome ?? '');
  const [cargo, setCargo] = useState(colaborador?.cargo ?? '');
  const [nivel, setNivel] = useState<NivelOrganograma>(colaborador?.nivel ?? 'Colaborador');
  const [setorId, setSetorId] = useState(colaborador?.setor_id ?? '');
  const [superiorId, setSuperiorId] = useState(colaborador?.superior_id ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Ninguém pode ser superior de si mesmo nem de alguém que está abaixo dele na hierarquia.
  const bloqueados = new Set<string>(
    colaborador ? [colaborador.id, ...coletarDescendentes(colaborador.id, colaboradores)] : []
  );
  const candidatosSuperior = colaboradores
    .filter((c) => !bloqueados.has(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const salvar = async () => {
    if (!nome.trim() || !cargo.trim()) {
      setErro('Informe nome e cargo.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      await organogramaService.salvarColaborador(colaborador?.id ?? null, {
        nome,
        cargo,
        nivel,
        setor_id: setorId || null,
        superior_id: superiorId || null,
      });
      onSucesso(colaborador ? 'Colaborador atualizado.' : 'Colaborador adicionado.');
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível salvar o colaborador.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalTelaCheia
      titulo={colaborador ? 'Editar colaborador' : 'Novo colaborador'}
      subtitulo="Setor, função e superior definem a posição no organograma"
      onVoltar={onFechar}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
        className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-nome" className={CLASSE_LABEL}>Nome *</label>
          <input
            id="org-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={CLASSE_CAMPO}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-cargo" className={CLASSE_LABEL}>Cargo / função *</label>
          <input
            id="org-cargo"
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex.: Encarregado de açougue"
            className={CLASSE_CAMPO}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-nivel" className={CLASSE_LABEL}>Nível</label>
          <select
            id="org-nivel"
            value={nivel}
            onChange={(e) => setNivel(e.target.value as NivelOrganograma)}
            className={CLASSE_CAMPO}
          >
            {NIVEIS_ORGANOGRAMA.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-setor" className={CLASSE_LABEL}>Setor</label>
          <select
            id="org-setor"
            value={setorId}
            onChange={(e) => setSetorId(e.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="">Sem setor</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-superior" className={CLASSE_LABEL}>Subordinado a</label>
          <select
            id="org-superior"
            value={superiorId}
            onChange={(e) => setSuperiorId(e.target.value)}
            className={CLASSE_CAMPO}
          >
            <option value="">Nenhum (topo da hierarquia)</option>
            {candidatosSuperior.map((c) => (
              <option key={c.id} value={c.id}>{`${c.nome} — ${c.cargo}`}</option>
            ))}
          </select>
        </div>

        {colaborador && (
          <p className="text-xs text-slate-500">
            Alterar o setor ou o superior move o colaborador no organograma. Os subordinados dele continuam com ele.
          </p>
        )}

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full h-12 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-40"
        >
          {salvando ? 'Salvando...' : colaborador ? 'Salvar alterações' : 'Adicionar ao organograma'}
        </button>
      </form>
    </ModalTelaCheia>
  );
}
