import { useState, useEffect } from 'react';
import { categoriasService } from '../services/categoriasService';

interface LocalCaptura {
  id: string;
  nome: string;
}

export default function LocaisCaptura() {
  const [locais, setLocais] = useState<LocalCaptura[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Estados do formulário de cadastro
  const [nomeLocal, setNomeLocal] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarLocais = async () => {
    try {
      setLoading(true);
      const dados = await categoriasService.listarLocaisCaptura();
      setLocais(dados as LocalCaptura[] || []);
    } catch (err) {
      setErro('Erro ao buscar os locais de captura do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLocais();
  }, []);

  const handleCadastrarLocal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeLocal.trim()) return;

    try {
      setSalvando(true);
      setErro('');

      await categoriasService.salvarLocalCaptura(nomeLocal.trim());
      
      // Limpa o campo após o sucesso
      setNomeLocal('');
      
      // Atualiza a listagem em tempo real
      await carregarLocais();
    } catch (err: any) {
      setErro(err.message?.includes('duplicate') ? 'Este local de captura já está cadastrado.' : 'Erro ao salvar o local de captura.');
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
    <div className="w-full flex flex-col animate-fadeIn">
      {/* MENSAGENS DE FEEDBACK/ERRO */}
      {erro && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
          {erro}
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO RÁPIDO */}
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-6 flex flex-col gap-3">
        <form onSubmit={handleCadastrarLocal} className="w-full flex gap-2">
          <input
            type="text"
            placeholder="Nome do Local (Ex: Câmara Fria)"
            value={nomeLocal}
            onChange={(e) => setNomeLocal(e.target.value)}
            disabled={salvando}
            className="flex-1 bg-white border border-gray-300 rounded-xl px-3 h-10 text-sm outline-none focus:border-[#09797a]"
            required
          />
          <button
            type="submit"
            disabled={salvando}
            className="bg-[#09797a] text-white font-bold px-4 rounded-xl text-xs h-10 active:scale-95 transition-all disabled:bg-gray-300"
          >
            {salvando ? '...' : '+ Local'}
          </button>
        </form>
      </div>

      {/* LISTAGEM LINEAR DOS LOCAIS */}
      <div className="w-full flex flex-col gap-2 overflow-y-auto max-h-87.5 pr-1 border border-gray-100 rounded-2xl p-3 bg-white shadow-inner">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider select-none border-b border-gray-100 pb-1 mb-1">
          Locais de Armazenamento/Venda
        </h3>

        {locais.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Nenhum local cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {locais.map((local) => (
              <div 
                key={local.id} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Ícone sutil de pin de localização em SVG incorporado */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#e07a5f" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  <span className="text-sm text-gray-800 font-bold select-none">
                    {local.nome}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}