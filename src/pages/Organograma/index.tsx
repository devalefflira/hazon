// src/pages/Organograma/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/useToast';
import { organogramaService } from './services/organogramaService';
import { FormColaborador } from './components/FormColaborador';
import { ExcluirColaboradorModal } from './components/ExcluirColaboradorModal';
import { GerenciarSetores } from './components/GerenciarSetores';
import { montarArvore } from './utils/arvoreOrganograma';
import type { NivelOrganograma, NoOrganograma, OrganogramaColaborador, OrganogramaSetor } from './types/organograma.types';

interface OrganogramaProps {
  onVoltarParaHome: () => void;
}

const COR_NIVEL: Record<NivelOrganograma, string> = {
  Diretoria: 'bg-slate-800 text-white border-slate-800',
  Gerencia: 'bg-teal-700 text-white border-teal-700',
  Encarregado: 'bg-teal-50 text-teal-800 border-teal-200',
  Colaborador: 'bg-slate-50 text-slate-600 border-slate-200',
};

/** Busca sem diferenciar maiúsculas e acentos. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface NoArvoreProps {
  no: NoOrganograma;
  recolhidos: Set<string>;
  visiveis: Set<string> | null;
  onAlternar: (id: string) => void;
  onEditar: (colaborador: OrganogramaColaborador) => void;
  onExcluir: (colaborador: OrganogramaColaborador) => void;
}

function NoArvore({ no, recolhidos, visiveis, onAlternar, onEditar, onExcluir }: NoArvoreProps) {
  const temEquipe = no.subordinados.length > 0;
  const aberto = visiveis ? true : !recolhidos.has(no.id);
  const filhos = no.subordinados.filter((f) => !visiveis || visiveis.has(f.id));

  return (
    <li className="flex flex-col">
      <div className="flex items-start gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <button
          type="button"
          onClick={() => onAlternar(no.id)}
          disabled={!temEquipe || !!visiveis}
          aria-label={aberto ? 'Recolher equipe' : 'Expandir equipe'}
          className="mt-0.5 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-0"
        >
          {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-sm text-slate-800 uppercase tracking-tight">{no.nome}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${COR_NIVEL[no.nivel]}`}>
              {no.nivel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{no.cargo}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {no.setor_nome && (
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                {no.setor_nome}
              </span>
            )}
            {temEquipe && (
              <span className="text-[10px] font-bold text-slate-500">
                {no.subordinados.length} {no.subordinados.length === 1 ? 'subordinado' : 'subordinados'}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditar(no)}
            aria-label={`Editar ${no.nome}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#09797a] active:scale-95 transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onExcluir(no)}
            aria-label={`Excluir ${no.nome}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {aberto && filhos.length > 0 && (
        <ul className="mt-2 ml-4 pl-4 border-l-2 border-teal-100 flex flex-col gap-2">
          {filhos.map((filho) => (
            <NoArvore
              key={filho.id}
              no={filho}
              recolhidos={recolhidos}
              visiveis={visiveis}
              onAlternar={onAlternar}
              onEditar={onEditar}
              onExcluir={onExcluir}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Organograma({ onVoltarParaHome }: OrganogramaProps) {
  const { mostrarAviso } = useToast();

  const [colaboradores, setColaboradores] = useState<OrganogramaColaborador[]>([]);
  const [setores, setSetores] = useState<OrganogramaSetor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const [formAberto, setFormAberto] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<OrganogramaColaborador | null>(null);
  const [colaboradorExcluindo, setColaboradorExcluindo] = useState<OrganogramaColaborador | null>(null);
  const [setoresAberto, setSetoresAberto] = useState(false);

  const carregarTudo = async () => {
    try {
      setCarregando(true);
      setErro('');
      const [listaSetores, listaColaboradores] = await Promise.all([
        organogramaService.listarSetores(),
        organogramaService.listarColaboradores(),
      ]);
      setSetores(listaSetores);
      setColaboradores(listaColaboradores);
    } catch (err) {
      console.error('Erro ao carregar o organograma:', err);
      setErro('Não foi possível carregar o organograma.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTudo();
  }, []);

  const aoAlterar = (mensagem: string) => {
    mostrarAviso(mensagem, 'sucesso');
    carregarTudo();
  };

  const arvore = useMemo(() => montarArvore(colaboradores, setores), [colaboradores, setores]);

  const idsComEquipe = useMemo(
    () => new Set(colaboradores.map((c) => c.superior_id).filter((id): id is string => !!id)),
    [colaboradores]
  );

  // Com busca ativa, mostra os resultados e o caminho de cada um até o topo.
  const visiveis = useMemo<Set<string> | null>(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return null;

    const mapa = new Map(colaboradores.map((c) => [c.id, c] as [string, OrganogramaColaborador]));
    const nomeDoSetor = new Map(setores.map((s) => [s.id, s.nome] as [string, string]));
    const resultado = new Set<string>();

    colaboradores.forEach((c) => {
      const setorNome = c.setor_id ? (nomeDoSetor.get(c.setor_id) ?? '') : '';
      if (!normalizar(`${c.nome} ${c.cargo} ${setorNome}`).includes(termo)) return;

      let atual: OrganogramaColaborador | undefined = c;
      while (atual && !resultado.has(atual.id)) {
        resultado.add(atual.id);
        atual = atual.superior_id ? mapa.get(atual.superior_id) : undefined;
      }
    });

    return resultado;
  }, [busca, colaboradores, setores]);

  const raizesVisiveis = arvore.filter((r) => !visiveis || visiveis.has(r.id));

  const abrirNovo = () => {
    setColaboradorEditando(null);
    setFormAberto(true);
  };

  const abrirEdicao = (colaborador: OrganogramaColaborador) => {
    setColaboradorEditando(colaborador);
    setFormAberto(true);
  };

  const alternarRecolhido = (id: string) => {
    setRecolhidos((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <PageHeader
        titulo="Organograma"
        subtitulo="Estrutura da equipe por setor e superior"
        onVoltar={onVoltarParaHome}
        acoes={
          <>
            <button
              type="button"
              onClick={() => setSetoresAberto(true)}
              aria-label="Gerenciar setores"
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase flex items-center gap-1.5 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Setores</span>
            </button>
            <button
              type="button"
              onClick={abrirNovo}
              aria-label="Novo colaborador"
              className="h-10 px-3 rounded-xl bg-[#09797a] hover:bg-[#075f60] text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </>
        }
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo ou setor..."
              className="w-full h-11 rounded-2xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none focus:border-[#09797a]"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRecolhidos(new Set())}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Expandir tudo
            </button>
            <button
              type="button"
              onClick={() => setRecolhidos(new Set(idsComEquipe))}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Recolher tudo
            </button>
          </div>
        </div>

        {!carregando && !erro && (
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
            {colaboradores.length} colaboradores · {setores.length} setores
          </p>
        )}

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
            {erro}
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 overflow-x-auto">
          {carregando ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]" />
            </div>
          ) : colaboradores.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12 italic">
              Nenhum colaborador cadastrado. Use o botão Novo para começar.
            </p>
          ) : raizesVisiveis.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12 italic">
              Nenhum colaborador encontrado para "{busca}".
            </p>
          ) : (
            <ul className="flex flex-col gap-2 min-w-[18rem]">
              {raizesVisiveis.map((raiz) => (
                <NoArvore
                  key={raiz.id}
                  no={raiz}
                  recolhidos={recolhidos}
                  visiveis={visiveis}
                  onAlternar={alternarRecolhido}
                  onEditar={abrirEdicao}
                  onExcluir={setColaboradorExcluindo}
                />
              ))}
            </ul>
          )}
        </div>
      </main>

      {formAberto && (
        <FormColaborador
          key={colaboradorEditando?.id ?? 'novo'}
          colaborador={colaboradorEditando}
          colaboradores={colaboradores}
          setores={setores}
          onSucesso={(mensagem) => {
            setFormAberto(false);
            aoAlterar(mensagem);
          }}
          onFechar={() => setFormAberto(false)}
        />
      )}

      {colaboradorExcluindo && (
        <ExcluirColaboradorModal
          colaborador={colaboradorExcluindo}
          colaboradores={colaboradores}
          onSucesso={(mensagem) => {
            setColaboradorExcluindo(null);
            aoAlterar(mensagem);
          }}
          onFechar={() => setColaboradorExcluindo(null)}
        />
      )}

      {setoresAberto && (
        <GerenciarSetores
          setores={setores}
          colaboradores={colaboradores}
          onAlterado={aoAlterar}
          onFechar={() => setSetoresAberto(false)}
        />
      )}
    </div>
  );
}
