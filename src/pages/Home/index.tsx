import { useState, useEffect } from 'react';

// Importação dos ícones
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
}

export default function Home({ 
  nomeUsuario, 
  perfilUsuario, 
  onLogout, 
  onNavegarParaCategorias, 
  onNavegarParaUsuarios, 
  onNavegarParaPermissoes,
  onNavegarParaFornecedores // <--- Adicionado com sucesso aqui!
}: HomeProps) {
  // Estados para controlar a data/hora e a saudação dinamicamente
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
    { label: 'Avarias', icon: iconAvarias },
    { label: 'Pedidos', icon: iconPedidos },
    { label: 'Tarefas', icon: iconTarefas },
    { label: 'Conf. Cega', icon: iconConfCega },
    { label: 'Permissões', icon: iconPermissoes },
    { label: 'Categorias', icon: iconCategorias },
  ];

  // Efeito responsável por atualizar o relógio em tempo real
  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date();

      // 1. Formata a data e hora no padrão brasileiro (DD/MM/AAAA, HH:MM)
      const formatador = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      setDataHora(formatador.format(agora));

      // 2. Define a saudação baseada na hora atual do dispositivo
      const hora = agora.getHours();
      if (hora >= 5 && hora < 12) {
        setSaudacao('Bom dia');
      } else if (hora >= 12 && hora < 18) {
        setSaudacao('Boa tarde');
      } else {
        setSaudacao('Boa noite');
      }
    };

    // Executa imediatamente ao abrir a tela
    atualizarRelogio();

    // Cria um intervalo para atualizar o relógio a cada 30 segundos
    const intervalo = setInterval(atualizarRelogio, 30000);

    // Função de limpeza (Clean-up)
    return () => clearInterval(intervalo);
  }, []);

  const handleModuleClick = (label: string) => {
    // Mapeia o nome do botão da Home para a chave correspondente na nossa Matriz de Segurança
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
      'Avarias': 'Avarias',
      'Pedidos': 'Pedidos',
      'Tarefas': 'Tarefas',
      'Conf. Cega': 'Conf. Cega'
    };

    const moduloChave = mapaModulos[label];
    const modulosLiberados = MATRIZ_PERMISSOES[perfilUsuario] || [];

    // SE NÃO TIVER PERMISSÃO: Trava o operador na hora
    if (moduloChave && !modulosLiberados.includes(moduloChave)) {
      alert(`⚠️ Acesso Negado\nO seu perfil (${perfilUsuario}) não possui permissão para acessar o módulo de ${label}.`);
      return;
    }

    // SE TIVER PERMISSÃO: Direciona para as propriedades de navegação corretas
    if (label === 'Categorias') {
      onNavegarParaCategorias();
    } else if (label === 'Usuários') {
      onNavegarParaUsuarios();
    } else if (label === 'Permissões') {
      onNavegarParaPermissoes();
    } else if (label === 'Fornecedores') {
      onNavegarParaFornecedores();
    } else {
      alert(`O módulo "${label}" está liberado para o seu perfil e será construído em breve!`);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      {/* Ajustado tamanho max-w com colchetes para compatibilidade robusta */}
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col">

        {/* CABEÇALHO DINÂMICO */}
        <div className="flex justify-between items-center w-full mb-6">
          <div className="flex items-center">
            <img src={iconUserLogin} alt="Usuário Logado" className="w-12 h-12 mr-3 select-none" />
            <div className="flex flex-col">
              <span className="text-[#09797a] font-bold text-xl leading-tight">{nomeUsuario}</span>
              <span className="text-[#e07a5f] font-medium text-sm leading-tight">{perfilUsuario}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 hover:bg-red-50 rounded-full active:scale-90 transition-all"
            title="Sair do Sistema"
          >
            <img src={iconLogout} alt="Sair" className="w-8 h-8" />
          </button>
        </div>

        {/* SAUDAÇÃO E DATA/HORA DINÂMICAS */}
        <div className="flex justify-between items-center w-full text-[#545454] font-medium text-xs mb-6 px-1">
          <span>{saudacao}. O que vamos fazer agora?</span>
          <span>{dataHora}</span>
        </div>

        {/* GRADE DE BOTÕES (GRID LAUNCHPAD) */}
        <div className="grid grid-cols-3 gap-3 w-full overflow-y-auto max-h-[calc(100vh-160px)] pr-0.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => handleModuleClick(item.label)}
                className="bg-[#09797a] rounded-3xl aspect-square flex flex-col justify-center items-center p-2 hover:bg-[#075f60] active:scale-95 transition-all shadow-sm"
              >
                <img src={Icon} alt={item.label} className="w-10 h-10 object-contain mb-2 filter-none" />
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