// Importando os ícones do caminho correto
import iconUserLogin from '../../assets/icones/icon-user-login.svg';
import iconLogout from '../../assets/icones/icon-logout.svg';

import iconUsuarios from '../../assets/icones/icon-usuarios.svg';
import iconFornecedores from '../../assets/icones/icon-fornecedores.svg';
import iconVendedores from '../../assets/icones/icon-vendedores.svg';
import iconProdutos from '../../assets/icones/icon-produtos.svg';
import iconInventario from '../../assets/icones/icon-inventario.svg';
import iconNotaFalta from '../../assets/icones/icon-nota-falta.svg';
import iconDashboard from '../../assets/icones/icon-dashboard.svg';
import iconRelatorios from '../../assets/icones/icon-relatorios.svg';
import iconCotacoes from '../../assets/icones/icon-cotacoes.svg';
import iconAvarias from '../../assets/icones/icon-avarias.svg';
import iconPedidos from '../../assets/icones/icon-pedidos.svg';
import iconTarefas from '../../assets/icones/icon-tarefas.svg';
import iconConfCega from '../../assets/icones/icon-conf-cega.svg';
import iconPermissoes from '../../assets/icones/icon-permissoes.svg';
import iconCategorias from '../../assets/icones/icon-categorias.svg';

export default function Home() {
  // Lista de dados dos botões do painel para evitar repetição de código (DRY - Don't Repeat Yourself)
  const menuItems = [
    { label: 'Usuários', icon: iconUsuarios },
    { label: 'Fornecedores', icon: iconFornecedores },
    { label: 'Vendedores', icon: iconVendedores },
    { label: 'Produtos', icon: iconProdutos },
    { label: 'Inventário', icon: iconInventario },
    { label: 'Nota de Falta', icon: iconNotaFalta },
    { label: 'Dashboard', icon: iconDashboard },
    { label: 'Relatórios', icon: iconRelatorios },
    { label: 'Cotações', icon: iconCotacoes },
    { label: 'Avarias', icon: iconAvarias },
    { label: 'Pedidos', icon: iconPedidos },
    { label: 'Tarefas', icon: iconTarefas },
    { label: 'Conf. Cega', icon: iconConfCega },
    { label: 'Permissões', icon: iconPermissoes },
    { label: 'Categorias', icon: iconCategorias },
  ];

  const handleModuleClick = (label: string) => {
    alert(`Abrindo o módulo: ${label}`);
  };

  const handleLogout = () => {
    alert('Saindo do sistema...');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      
      {/* CARD DO CELULAR NA HOME */}
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col">
        
        {/* CABEÇALHO (USUÁRIO E LOGOUT) */}
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex items-center">
            <img src={iconUserLogin} alt="Usuário Logado" className="w-12 h-12 mr-3 select-none" />
            <div className="flex flex-col">
              <span className="text-[#09797a] font-bold text-xl leading-tight">Aleff</span>
              <span className="text-[#e07a5f] font-medium text-sm leading-tight">Administrador</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 rounded-full active:scale-90 transition-all"
            title="Sair do Sistema"
          >
            <img src={iconLogout} alt="Sair" className="w-8 h-8" />
          </button>
        </div>

        {/* SAUDAÇÃO E DATA/HORA */}
        <div className="flex justify-between items-center w-full text-[#545454] font-medium text-xs mb-6 px-1">
          <span>Boa noite. O que vamos fazer agora?</span>
          <span>26/05/2026, 22:50</span>
        </div>

        {/* GRADE DE BOTÕES (GRID LAUNCHPAD) */}
        {/* 'grid-cols-3' cria exatamente as 3 colunas horizontais do design */}
        <div className="grid grid-cols-3 gap-3 w-full overflow-y-auto max-h-[calc(100vh-160px)] pr-0.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handleModuleClick(item.label)}
                className="bg-[#09797a] rounded-3xl aspect-square flex flex-col justify-center items-center p-2 hover:bg-[#075f60] active:scale-95 transition-all shadow-sm"
              >
                {/* ÍCONE DO MÓDULO */}
                <img 
                  src={Icon} 
                  alt={item.label} 
                  className="w-10 h-10 object-contain mb-2 filter-none" 
                  style={{ color: '#f4f1de' }} 
                />
                {/* TEXTO DO MÓDULO */}
                <span className="text-white text-[11px] font-bold tracking-wide text-center leading-tight wrap-break-word max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}