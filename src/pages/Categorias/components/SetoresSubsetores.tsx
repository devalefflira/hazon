import { useState, useEffect } from 'react';
import { categoriasService } from '../services/categoriasService';

interface Subsetor {
  id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
  categorias_subsetores: Subsetor[];
}

export default function SetoresSubsetores() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados dos formulários
  const [novoSetor, setNovoSetor] = useState('');
  const [novoSubsetor, setNovoSubsetor] = useState('');
  const [setorPaiId, setSetorPaiId] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const dados = await categoriasService.listarSetoresComSubsetores();
      setSetores(dados as unknown as Setor[] || []);
    } catch (err) {
      setErro('Erro ao carregar dados do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleCadastrarSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoSetor.trim()) return;

    try {
      setSalvando(true);
      setErro('');
      await categoriasService.salvarSetor(novoSetor.trim());
      setNovoSetor('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Este setor já existe.' : 'Erro ao salvar o setor.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCadastrarSubsetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoSubsetor.trim() || !setorPaiId) return;

    try {
      setSalvando(true);
      setErro('');
      await categoriasService.salvarSubsetor(setorPaiId, novoSubsetor.trim());
      setNovoSubsetor('');
      await carregarDados();
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Este subsetor já existe neste setor.' : 'Erro ao salvar o subsetor.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
        <span className="text-sm text-gray-500 mt-3 font-medium">Buscando do banco...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* EXIBIÇÃO DE ERROS */}
      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
          {erro}
        </div>
      )}

      {/* PAINEL DE CADASTRO RÁPIDO */}
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-6 flex flex-col gap-3">
        
        {/* Adicionar Setor */}
        <form onSubmit={handleCadastrarSetor} className="w-full flex gap-2">
          <input
            type="text"
            placeholder="Novo Setor Pai"
            value={novoSetor}
            onChange={(e) => setNovoSetor(e.target.value)}
            disabled={salvando}
            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a]"
            required
          />
          <button
            type="submit"
            disabled={salvando}
            className="bg-[#09797a] text-white font-bold px-4 rounded-xl text-xs h-10 active:scale-95 transition-all disabled:bg-gray-300"
          >
            + Setor
          </button>
        </form>

        <div className="border-b border-gray-200"></div>

        {/* Adicionar Subsetor */}
        <form onSubmit={handleCadastrarSubsetor} className="w-full flex flex-col gap-2">
          <div className="w-full flex gap-2">
            <select
              value={setorPaiId}
              onChange={(e) => setSetorPaiId(e.target.value)}
              disabled={salvando}
              className="w-[45%] bg-white border border-gray-300 rounded-xl px-2 h-10 text-xs outline-none focus:border-[#09797a] text-gray-700"
              required
            >
              <option value="">Vincular ao Setor...</option>
              {setores.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Novo Subsetor"
              value={novoSubsetor}
              onChange={(e) => setNovoSubsetor(e.target.value)}
              disabled={salvando}
              className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a]"
              required
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-[#e07a5f] text-white font-bold rounded-xl text-xs h-10 active:scale-[0.98] transition-all disabled:bg-gray-300"
          >
            + Adicionar Subsetor Vinculado
          </button>
        </form>
      </div>

      {/* LISTAGEM LINEAR (ESTATÉGIA DE TÓPICOS FIXOS) */}
      <div className="w-full flex flex-col gap-4 overflow-y-auto max-h-87.5 pr-1 border border-gray-100 rounded-2xl p-3 bg-white shadow-inner">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none border-b border-gray-100 pb-1">
          Setores e Subsetores Cadastrados
        </h3>

        {setores.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum dado retornado do banco.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {setores.map((setor) => (
              <div key={setor.id} className="flex flex-col">
                {/* Nome do Setor (Título em Destaque) */}
                <span className="text-[#09797a] font-bold text-base border-b border-gray-100 pb-0.5 mb-1.5 flex items-center">
                  📁 {setor.nome}
                </span>

                {/* Lista Estática de Subsetores Relacionados */}
                {setor.categorias_subsetores && setor.categorias_subsetores.length > 0 ? (
                  <div className="flex flex-col pl-4 gap-1">
                    {setor.categorias_subsetores.map((sub) => (
                      <div key={sub.id} className="text-sm text-gray-700 font-medium flex items-center">
                        <span className="text-[#e07a5f] mr-2 text-xs">└─</span>
                        {sub.nome}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic pl-4">Nenhum subsetor atrelado.</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}