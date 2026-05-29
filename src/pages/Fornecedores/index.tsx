import { useState, useEffect } from 'react';
import { fornecedoresService } from './services/fornecedoresService';
import CadastroFornecedor from './components/CadastroFornecedor';
import DetalhesFornecedor from './components/DetalhesFornecedor';

interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
}

interface FornecedoresProps {
  onVoltarParaHome: () => void;
}

export default function Fornecedores({ onVoltarParaHome }: FornecedoresProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  // Controle do fluxo de telas internos
  const [visao, setVisao] = useState<'lista' | 'cadastro' | 'detalhes'>('lista');
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<Fornecedor | null>(null);

  const carregarFornecedores = async () => {
    try {
      setLoading(true);
      setErro('');
      const dados = await fornecedoresService.listarFornecedores();
      setFornecedores(dados as Fornecedor[] || []);
    } catch (err) {
      setErro('Erro ao carregar catálogo de fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFornecedores();
  }, []);

  // Filtro inteligente em tempo real por Nome Fantasia ou por CNPJ
  const fornecedoresFiltrados = fornecedores.filter(f =>
    f.nome_fantasia.toLowerCase().includes(busca.toLowerCase()) ||
    f.cnpj.includes(busca.replace(/\D/g, ''))
  );

  const handleAbrirDetalhes = (fornecedor: Fornecedor) => {
    setFornecedorSelecionado(fornecedor);
    setVisao('detalhes');
  };

  const handleSucessoCadastro = () => {
    setVisao('lista');
    carregarFornecedores();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      {/* Ajustado tamanho max-w e min-h com colchetes para compatibilidade v4 */}
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">

        {/* CABEÇALHO DINÂMICO */}
        <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4">
          <button
            onClick={visao !== 'lista' ? () => setVisao('lista') : onVoltarParaHome}
            className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
            {visao === 'cadastro' ? 'Novo Fornecedor' : visao === 'detalhes' ? 'Detalhes' : 'Fornecedores'}
          </h1>
        </div>

        {erro && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 text-center font-medium">{erro}</div>}

        {/* FLUXO DE RENDERIZAÇÃO DAS VISÕES */}
        {visao === 'cadastro' && (
          <CadastroFornecedor onSucesso={handleSucessoCadastro} onCancelar={() => setVisao('lista')} />
        )}

        {visao === 'detalhes' && fornecedorSelecionado && (
          <DetalhesFornecedor fornecedor={fornecedorSelecionado} onFechar={() => { setVisao('lista'); setFornecedorSelecionado(null); }} />
        )}

        {visao === 'lista' && (
          <div className="flex flex-col flex-1 animate-fadeIn">
            {/* Barra de Busca */}
            <div className="w-full relative mb-4">
              <input
                type="text"
                placeholder="🔎 Buscar por fantasia ou CNPJ..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-10 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all shadow-inner text-gray-700"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                  ✕
                </button>
              )}
            </div>

            {/* Listagem em Cards - Ajustado max-h para rolagem perfeita no celular */}
            <div className="w-full flex flex-col gap-2.5 overflow-y-auto max-h-102.5 pr-0.5 flex-1">
              {loading ? (
                <div className="flex justify-center items-center py-12 w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
                </div>
              ) : fornecedoresFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-12 italic">Nenhum fornecedor cadastrado.</p>
              ) : (
                fornecedoresFiltrados.map((fornecedor) => (
                  <div
                    key={fornecedor.id}
                    onClick={() => handleAbrirDetalhes(fornecedor)}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-1 shadow-sm active:bg-gray-50 cursor-pointer border-l-4 border-l-[#09797a] transition-all"
                  >
                    <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide truncate">
                      {fornecedor.nome_fantasia}
                    </span>
                    <span className="text-xs text-gray-400 font-medium truncate">
                      {fornecedor.razao_social}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 mt-1 bg-gray-100 w-max px-2 py-0.5 rounded-md font-bold tracking-wider">
                      CNPJ: {fornecedor.cnpj}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* BOTÃO FLUTUANTE DE ADICIONAR (+) */}
            {!loading && (
              <button
                onClick={() => setVisao('cadastro')}
                className="absolute bottom-6 right-6 w-14 h-14 bg-[#09797a] text-white rounded-full flex justify-center items-center text-3xl shadow-lg active:scale-90 transition-all select-none z-10 font-light"
              >
                +
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}