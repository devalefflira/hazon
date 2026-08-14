// Arquivo: src/pages/Home/index.tsx
import { useState, useEffect } from 'react';
import { vencimentosService } from '../Vencimentos/services/vencimentosService';

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

interface HomeProps {
  nomeUsuario: string;
  perfilUsuario: string;
  usuarioLogadoId?: string;
  permissoesDoUsuario?: string[];
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
  onNavegarParaClientes?: () => void;
  onNavegarParaOfertas?: () => void;
  onNavegarParaVencimentos?: () => void;
  onNavegarParaTrocas?: () => void;
  onNavegarParaNotificacoes?: () => void;
}

export default function Home({
  nomeUsuario,
  perfilUsuario,
  usuarioLogadoId,
  permissoesDoUsuario = [],
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
  onNavegarParaOrcamentos,
  onNavegarParaClientes,
  onNavegarParaOfertas,
  onNavegarParaVencimentos,
  onNavegarParaTrocas,
  onNavegarParaNotificacoes
}: HomeProps) {
  const [dataHora, setDataHora] = useState('');
  const [saudacao, setSaudacao] = useState('Olá');
  const [qtdNotificacoesPendentes, setQtdNotificacoesPendentes] = useState(0);
  const [alertaModalAberto, setAlertaModalAberto] = useState(false);

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
    { label: 'Orçamentos', icon: iconRelatorios },
    { label: 'Avarias', icon: iconAvarias },
    { label: 'Trocas', icon: iconAvarias },
    { label: 'Pedidos', icon: iconPedidos },
    { label: 'Tarefas', icon: iconTarefas },
    { label: 'Conf. Cega', icon: iconConfCega },
    { label: 'Temperatura', icon: iconInventario },
    { label: 'Permissões', icon: iconPermissoes },
    { label: 'Categorias', icon: iconCategorias },
    { label: 'Clientes', icon: iconUsuarios },
    { label: 'Ofertas', icon: iconCotacoes },
    { label: 'Vencimentos', icon: iconNotaFalta }
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

  // Verifica notificações PENDENTES do usuário
  useEffect(() => {
    const checarNotificacoes = async () => {
      try {
        const idUser = usuarioLogadoId || JSON.parse(localStorage.getItem('hazon_user') || '{}')?.id;
        const lista = await vencimentosService.listarTodosVencimentos(idUser);
        
        const pendentes = lista.filter((i) => i.diasParaVencer >= 0 && i.diasParaVencer <= 90 && i.statusLeitura === 'Pendente');
        setQtdNotificacoesPendentes(pendentes.length);

        if (pendentes.length > 0) {
          setAlertaModalAberto(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checarNotificacoes();
  }, [usuarioLogadoId]);

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
      'Orçamentos': 'Orcamentos',
      'Avarias': 'Avarias',
      'Trocas': 'Trocas',
      'Pedidos': 'Pedidos',
      'Tarefas': 'Tarefas',
      'Conf. Cega': 'Conf. Cega',
      'Temperatura': 'Temperatura',
      'Clientes': 'Clientes',
      'Ofertas': 'Ofertas',
      'Vencimentos': 'Vencimentos'
    };

    const moduloChave = mapaModulos[label];
    const temAcesso = perfilUsuario === 'Administrador' || (moduloChave && permissoesDoUsuario.includes(moduloChave));

    if (moduloChave && !temAcesso) {
      alert(`⚠️ Acesso Negado\nO seu usuário não possui permissão para acessar o módulo de ${label}.`);
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
    else if (label === 'Orçamentos') { if (onNavegarParaOrcamentos) onNavegarParaOrcamentos(); }
    else if (label === 'Clientes') { if (onNavegarParaClientes) onNavegarParaClientes(); }
    else if (label === 'Ofertas') { if (onNavegarParaOfertas) onNavegarParaOfertas(); }
    else if (label === 'Vencimentos') { if (onNavegarParaVencimentos) onNavegarParaVencimentos(); }
    else if (label === 'Trocas') { if (onNavegarParaTrocas) onNavegarParaTrocas(); }
    else if (label === 'Pedidos') onNavegarParaPedidos();
    else if (label === 'Tarefas') onNavegarParaTarefas();
    else if (label === 'Avarias') onNavegarParaAvarias();
    else if (label === 'Conf. Cega') onNavegarParaConfCega();
    else if (label === 'Relatórios') onNavegarParaRelatorios();
    else if (label === 'Temperatura') onNavegarParaTemperatura();
    else if (label === 'Nota de Falta') { if (onNavegarParaNotaFalta) onNavegarParaNotaFalta(); }
    else {
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
          
          <div className="flex items-center gap-1">
            {/* SINO DE NOTIFICAÇÕES */}
            <button
              type="button"
              onClick={() => onNavegarParaNotificacoes && onNavegarParaNotificacoes()}
              className="p-2 hover:bg-emerald-50 rounded-full active:scale-90 transition-all relative"
              title="Notificações"
            >
              <span className="text-xl">🔔</span>
              {qtdNotificacoesPendentes > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {qtdNotificacoesPendentes > 99 ? '99+' : qtdNotificacoesPendentes}
                </span>
              )}
            </button>

            <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-full active:scale-90 transition-all">
              <img src={iconLogout} alt="Sair" className="w-8 h-8" />
            </button>
          </div>
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

      {/* MODAL ALERTA DE NOTIFICAÇÕES PENDENTES */}
      {alertaModalAberto && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 select-none">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              🔔
            </div>
            <div>
              <h3 className="text-[#09797a] font-black text-base uppercase">Você tem novas notificações!</h3>
              <p className="text-xs text-gray-500 font-bold mt-1">
                Existem <strong>{qtdNotificacoesPendentes}</strong> produtos pendentes de visualização com validade próxima.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAlertaModalAberto(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl text-xs font-bold uppercase"
              >
                Ignorar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAlertaModalAberto(false);
                  if (onNavegarParaNotificacoes) onNavegarParaNotificacoes();
                }}
                className="flex-1 py-3 bg-[#09797a] hover:bg-[#075f60] text-white rounded-2xl text-xs font-black uppercase shadow-md active:scale-95 transition-all"
              >
                Ir para Notificações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}