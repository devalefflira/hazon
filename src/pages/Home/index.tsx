import { MATRIZ_PERMISSOES } from '../../App';

interface HomeProps {
  nomeUsuario: string;
  perfilUsuario: string;
  onLogout: () => void;
  onNavegarParaCategorias: () => void;
  onNavegarParaUsuarios: () => void;
  onNavegarParaPermissoes: () => void;
  onNavegarParaFornecedores: () => void;
  onNavegarParaVendedores: () => void;
  onNavegarParaProdutos: () => void;
  onNavegarParaInventario: () => void;
  onNavegarParaNotaFalta?: () => void; // CORRIGIDO: Injetada a propriedade reativa de controle
}

export default function Home({
  nomeUsuario,
  perfilUsuario,
  onLogout,
  onNavegarParaCategorias,
  onNavegarParaUsuarios,
  onNavegarParaPermissoes,
  onNavegarParaFornecedores,
  onNavegarParaVendedores,
  onNavegarParaProdutos,
  onNavegarParaInventario,
  onNavegarParaNotaFalta
}: HomeProps) {

  // Sistema de barramento de segurança por perfil de usuário
  const modulosPermitidos = MATRIZ_PERMISSOES[perfilUsuario] || [];

  const verificarEAlternar = (nomeModulo: string, acao: () => void) => {
    if (modulosPermitidos.includes(nomeModulo)) {
      acao();
    } else {
      alert(`Seu perfil (${perfilUsuario}) não possui acesso ao módulo ${nomeModulo}.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-[380px] bg-white rounded-[32px] shadow-xl px-5 py-6 flex flex-col min-h-[600px] relative">
        
        {/* CABEÇALHO GESTOR */}
        <div className="flex justify-between items-center w-full mb-6 border-b border-gray-100 pb-4 select-none">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Olá, bem-vindo</span>
            <h2 className="text-[#09797a] font-black text-xl tracking-tight leading-none uppercase">{nomeUsuario}</h2>
            <span className="text-[9px] font-mono font-bold text-gray-400 mt-1 bg-gray-100 px-1.5 py-0.5 rounded w-max">{perfilUsuario}</span>
          </div>
          <button onClick={onLogout} className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-100 rounded-2xl active:scale-90 transition-all">
            <img src="/src/assets/icones/icon-logout.svg" alt="Logout" className="w-4 h-4" />
          </button>
        </div>

        {/* LAUNCHPAD DE MÓDULOS (MOBILE GRID) */}
        <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[460px] pr-0.5">
          
          {/* USUÁRIOS */}
          <button 
            onClick={() => verificarEAlternar('Usuarios', onNavegarParaUsuarios)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-usuarios.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Usuários</span>
          </button>

          {/* FORNECEDORES */}
          <button 
            onClick={() => verificarEAlternar('Fornecedores', onNavegarParaFornecedores)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-fornecedores.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Fornecedores</span>
          </button>

          {/* VENDEDORES */}
          <button 
            onClick={() => verificarEAlternar('Vendedores', onNavegarParaVendedores)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-vendedores.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Vendedores</span>
          </button>

          {/* PRODUTOS */}
          <button 
            onClick={() => verificarEAlternar('Produtos', onNavegarParaProdutos)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-produtos.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Produtos</span>
          </button>

          {/* INVENTÁRIO */}
          <button 
            onClick={() => verificarEAlternar('Inventario', onNavegarParaInventario)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-inventario.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Inventário</span>
          </button>

          {/* NOTA DE FALTA */}
          <button 
            onClick={() => {
              // CORRIGIDO: Vinculada a ação de navegação real injetada pelo router central
              if (onNavegarParaNotaFalta) {
                verificarEAlternar('Nota de Falta', onNavegarParaNotaFalta);
              } else {
                alert('Módulo indisponível no momento.');
              }
            }}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-nota-falta.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Nota de Falta</span>
          </button>

          {/* CONFIGURAÇÃO CEGA */}
          <button 
            onClick={() => alert('Módulo em desenvolvimento.')}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group opacity-60"
          >
            <div className="w-11 h-11 bg-gray-200 rounded-full flex justify-center items-center">
              <img src="/src/assets/icones/icon-conf-cega.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-tight">Conf. Cega</span>
          </button>

          {/* CATEGORIAS */}
          <button 
            onClick={() => verificarEAlternar('Categorias', onNavegarParaCategorias)}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group hover:border-[#09797a]/30"
          >
            <div className="w-11 h-11 bg-[#09797a]/10 rounded-full flex justify-center items-center group-hover:bg-[#09797a]/20 transition-all">
              <img src="/src/assets/icones/icon-categorias.svg" className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Categorias</span>
          </button>

        </div>
      </div>
    </div>
  );
}