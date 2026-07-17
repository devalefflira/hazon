import { useState, useEffect } from 'react';
import { produtosService } from './services/produtosService';
import { useCategorias } from '../../hooks/useCategorias';
import CadastroProduto from './components/CadastroProduto';

interface Produto {
  id: string;
  ean: string;
  descricao: string;
  setor: string;
  unidade: string;
}

export default function Produtos({ onVoltarParaHome }: { onVoltarParaHome: () => void }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('');
  const [exibindoCadastro, setExibindoCadastro] = useState(false);
  
  // Hook para carregar os setores para o filtro
  const { setores } = useCategorias();

  // Função principal de carga com filtros
  const carregarProdutos = async (termo: string, setorId: string) => {
    setLoading(true);
    try {
      const response = await produtosService.listarProdutos(0, 50, { 
        termo, 
        setorId 
      });
      setProdutos(response.data);
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para a busca
  useEffect(() => {
    const handler = setTimeout(() => {
      carregarProdutos(busca, setorFiltro);
    }, 500);
    return () => clearTimeout(handler);
  }, [busca, setorFiltro]);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">
        
        {/* Cabeçalho Fixo */}
        <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4">
          <button onClick={exibindoCadastro ? () => setExibindoCadastro(false) : onVoltarParaHome} className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
            {exibindoCadastro ? 'Novo Cadastro' : 'Produtos'}
          </h1>
        </div>

        {exibindoCadastro ? (
          <CadastroProduto 
            onSucesso={() => { setExibindoCadastro(false); carregarProdutos(busca, setorFiltro); }} 
            onCancelar={() => setExibindoCadastro(false)} 
          />
        ) : (
          <div className="flex flex-col flex-1 animate-fadeIn">
            {/* Filtros e Busca */}
            <div className="flex flex-col gap-2 mb-4">
              <input 
                type="text" 
                placeholder="🔎 Buscar por descrição ou EAN..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 h-12 text-sm outline-none focus:border-[#09797a]"
              />
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11 text-xs font-bold text-gray-600 outline-none"
                onChange={(e) => setSetorFiltro(e.target.value)}
              >
                <option value="">Todos os Setores</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            {/* Listagem */}
            <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-2 pr-1">
              {loading ? (
                <div className="flex justify-center items-center py-10 text-xs text-gray-400">Carregando...</div>
              ) : produtos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10 italic">Nenhum produto encontrado.</p>
              ) : produtos.map(p => (
                <div key={p.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm border-l-4 border-l-[#09797a]">
                  <p className="font-bold text-sm text-gray-800">{p.descricao}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">EAN: {p.ean}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 uppercase">{p.setor}</span>
                    <span className="bg-[#09797a]/10 px-2 py-0.5 rounded text-[10px] font-bold text-[#09797a] uppercase">{p.unidade}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Botão Flutuante */}
            <button 
              onClick={() => setExibindoCadastro(true)}
              className="absolute bottom-6 right-6 w-14 h-14 bg-[#09797a] text-white rounded-full shadow-lg text-3xl active:scale-90 transition-all flex items-center justify-center"
            >+</button>
          </div>
        )}
      </div>
    </div>
  );
}