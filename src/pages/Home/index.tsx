// Arquivo: src/pages/Home/index.tsx
import { useState, useEffect } from 'react';

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
  onNavegarParaNotaFalta?: () => void;
  onNavegarParaCotacoes: () => void;
  onNavegarParaPedidos: () => void;
  onNavegarParaTarefas: () => void;
  onNavegarParaAvarias: () => void;
  onNavegarParaConfCega: () => void;
  onNavegarParaRelatorios: () => void;
  onNavegarParaTemperatura: () => void;
  onNavegarParaOrcamentos?: () => void;
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
  onNavegarParaNotaFalta,
  onNavegarParaCotacoes,
  onNavegarParaPedidos,
  onNavegarParaTarefas,
  onNavegarParaAvarias,
  onNavegarParaConfCega,
  onNavegarParaRelatorios,
  onNavegarParaTemperatura,
  onNavegarParaOrcamentos
}: HomeProps) {
  const [dataHora, setDataHora] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');

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
    { label: 'Orçamentos', icon: iconRelatorios }, // 👈 Adicionado ao menu
    { label: 'Avarias', icon: iconAvarias },
    { label: 'Pedidos', icon: iconPedidos },
    { label: 'Tarefas', icon: iconTarefas },
    { label: 'Conf. Cega', icon: iconConfCega },
    { label: 'Temperatura', icon: iconInventario },
    { label: 'Permissões', icon: iconPermissoes },
    { label: 'Categorias', icon: iconCategorias },
  ];

  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date();
      const formatador = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setDataHora(formatador.format(agora));

      const hora = agora.getHours();
      if (hora >= 5 && hora < 12) setSaudacao('Bom dia');
      else if (hora >= 12 && hora < 18) setSaudacao('Boa tarde');
      else setSaudacao('Boa noite');
    };

    atualizarRelogio();
    const intervalo = setInterval(atualizarRelogio, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const handleModuleClick = (label: string) => {
    const mapaModulos: Record<string, string> = {
      'Usuários': 'Usuarios',
      'Categorias': 'Categorias',
      'Permissões': 'Permissoes',
      'Fornecedores': 'Fornecedores',
      'Vendedores': 'Vendedores',
      'Produtos': 'Produtos',
      'Inventário': 'Inventario',
      'Nota de Falta': 'Nota de Falta',
      'Dashboard': 'Dashboard',
      'Relatórios': 'Relatorios',
      'Cotações': 'Cotacoes',
      'Orçamentos': 'Orcamentos', // 👈 Mapeado no controle de permissões
      'Avarias': 'Avarias',
      'Pedidos': 'Pedidos',
      'Tarefas': 'Tarefas',
      'Conf. Cega': 'Conf. Cega',
      'Temperatura': 'Temperatura'
    };

    const moduloChave = mapaModulos[label];
    const modulosLiberados = MATRIZ_PERMISSOES[perfilUsuario] || [];

    if (moduloChave && !modulosLiberados.includes(moduloChave)) {
      alert(`⚠️ Acesso Negado\nO seu perfil (${perfilUsuario}) não possui permissão para acessar o módulo de ${label}.`);
      return;
    }

    if (label === 'Categorias') onNavegarParaCategorias();
    else if (label === 'Usuários') onNavegarParaUsuarios();
    else if (label === 'Permissões') onNavegarParaPermissoes();
    else if (label === 'Fornecedores') onNavegarParaFornecedores();
    else if (label === 'Vendedores') onNavegarParaVendedores();
    else if (label === 'Produtos') onNavegarParaProdutos();
    else if (label === 'Inventário') onNavegarParaInventario();
    else if (label === 'Cotações') onNavegarParaCotacoes();         
    else if (label === 'Orçamentos') { // 👈 Rota disparada
      if (onNavegarParaOrcamentos) onNavegarParaOrcamentos();
    }
    else if (label === 'Pedidos') onNavegarParaPedidos();
    else if (label === 'Tarefas') onNavegarParaTarefas();
    else if (label === 'Avarias') onNavegarParaAvarias();
    else if (label === 'Conf. Cega') onNavegarParaConfCega();
    else if (label === 'Relatórios') onNavegarParaRelatorios(); 
    else if (label === 'Temperatura') onNavegarParaTemperatura();
    else if (label === 'Nota de Falta') {
      if (onNavegarParaNotaFalta) onNavegarParaNotaFalta();
    } else {
      alert(`O módulo "${label}" está liberado e será construído em breve!`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col">

        {/* CABEÇALHO */}
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex items-center">
            <img src={iconUserLogin} alt="Usuário Logado" className="w-12 h-12 mr-3 select-none" />
            <div className="flex flex-col">
              <span className="text-[#09797a] font-bold text-xl leading-tight">{nomeUsuario}</span>
              <span className="text-[#e07a5f] font-medium text-sm leading-tight">{perfilUsuario}</span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-full active:scale-90 transition-all">
            <img src={iconLogout} alt="Sair" className="w-8 h-8" />
          </button>
        </div>

        {/* SUBTITLE */}
        <div className="flex justify-between items-center w-full text-[#545454] font-medium text-xs mb-6 px-1">
          <span>{saudacao}. Qual o próximo passo?</span>
          <span>{dataHora}</span>
        </div>

        {/* MESH GRID */}
        <div className="grid grid-cols-3 gap-3 w-full overflow-y-auto max-h-[calc(100vh-160px)] pr-0.5">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => handleModuleClick(item.label)}
              className="bg-[#09797a] rounded-3xl aspect-square flex flex-col justify-center items-center p-2 hover:bg-[#075f60] active:scale-95 transition-all shadow-sm"
            >
              <img src={item.icon} alt={item.label} className="w-10 h-10 object-contain mb-2" />
              <span className="text-white text-[11px] font-bold tracking-wide text-center leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}