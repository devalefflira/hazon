import { useState, useEffect } from 'react';
import { usuariosService } from './services/usuariosService';
import CadastroUsuario from './components/CadastroUsuario';

interface Usuario {
  id: string;
  nome: string;
  setor: string;
  email: string;
  perfis: {
    nome: string;
  } | null;
}

interface UsuariosProps {
  onVoltarParaHome: () => void;
}

export default function Usuarios({ onVoltarParaHome }: UsuariosProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Controle de estado para exibição do formulário ou da listagem
  const [exibindoCadastro, setExibindoCadastro] = useState(false);
  
  // Estado do mecanismo de busca dinâmica (Search)
  const [busca, setBusca] = useState('');

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const dados = await usuariosService.listarUsuarios();
      setUsuarios(dados as unknown as Usuario[] || []);
    } catch (err) {
      setErro('Erro ao carregar listagem de usuários do Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // Filtro Dinâmico em Tempo Real (Filtra por Nome ou por Setor)
  const usuariosFiltrados = usuarios.filter(usuario => 
    usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
    usuario.setor.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSucessoCadastro = () => {
    setExibindoCadastro(false);
    carregarUsuarios(); // Dá o refresh automático na lista após salvar
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">
        
        {/* CABEÇALHO FIXO DO MÓDULO */}
        <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4">
          <button 
            onClick={exibindoCadastro ? () => setExibindoCadastro(false) : onVoltarParaHome}
            className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
            {exibindoCadastro ? 'Cadastrar Usuário' : 'Gestão de Usuários'}
          </h1>
        </div>

        {/* MENSAGEM DE ERRO GLOBAL */}
        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 font-medium text-center">
            {erro}
          </div>
        )}

        {/* FLUXO 1: EXIBINDO FORMULÁRIO DE CADASTRO */}
        {exibindoCadastro ? (
          <CadastroUsuario 
            onSucesso={handleSucessoCadastro} 
            onCancelar={() => setExibindoCadastro(false)} 
          />
        ) : (
          /* FLUXO 2: EXIBINDO LISTAGEM E BARRA DE PESQUISA */
          <div className="flex flex-col flex-1 animate-fadeIn">
            
            {/* Barra de Pesquisa Mobile */}
            <div className="w-full relative mb-4">
              <input
                type="text"
                placeholder="🔎 Buscar por nome ou setor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-10 h-11 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all shadow-inner text-gray-700"
              />
              {busca && (
                <button 
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Listagem com Rolagem Isolada */}
            <div className="w-full flex flex-col gap-2.5 overflow-y-auto max-h-102.5 pr-0.5 flex-1">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-12 w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
                </div>
              ) : usuariosFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-12 italic">Nenhum usuário correspondente encontrado.</p>
              ) : (
                usuariosFiltrados.map((user) => (
                  <div 
                    key={user.id} 
                    className="w-full bg-white border border-gray-100 rounded-2xl p-3.5 flex flex-col gap-1.5 shadow-sm hover:border-gray-200 transition-all border-l-4 border-l-[#09797a]"
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-bold text-sm text-gray-800 leading-tight">{user.nome}</span>
                      {/* Tag de Perfil Relacional com cor de destaque */}
                      <span className="bg-[#e07a5f]/10 text-[#e07a5f] text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-[#e07a5f]/20">
                        {user.perfis?.nome || 'Sem Perfil'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col text-xs text-gray-500 font-medium">
                      <span>🏢 Setor: <strong className="text-gray-700">{user.setor}</strong></span>
                      <span className="truncate mt-0.5">✉️ {user.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* BOTÃO FLUTUANTE DE ADICIONAR (+) ESTILO MATERIAL DESIGN */}
            {!loading && (
              <button
                onClick={() => setExibindoCadastro(true)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-[#09797a] hover:bg-[#075f60] text-white rounded-full flex justify-center items-center font-light text-3xl shadow-lg active:scale-90 transition-all select-none z-10"
                title="Cadastrar Novo Usuário"
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