// src/pages/Home/index.tsx
import React, { useState } from 'react';

interface HomeProps {
  onNavegar?: (tela: string) => void;
  nomeUsuario?: string;
  perfilUsuario?: string;
  usuarioLogadoId?: string;
  permissoesDoUsuario?: string[];
  onLogout?: () => void;
  onNavegarParaNotificacoes?: () => void;
  [key: string]: any;
}

type CategoriaLaunchpad = 'INDICADORES' | 'COMERCIAL' | 'ESTOQUE' | 'ADMINISTRACAO';

interface ModuloConfig {
  id: string;
  nome: string;
  descricao: string;
  tela: string;
  callbackProp?: string;
  icone: React.ReactNode;
  bgGradiente: string;
  borderCor: string;
  iconeBg: string;
  textoCor: string;
}

interface LaunchpadConfig {
  id: CategoriaLaunchpad;
  titulo: string;
  descricaoBreve: string;
  icone: React.ReactNode;
  corAtiva: string;
  borderAtiva: string;
  badgeAtiva: string;
  iconeCor: string;
}

export default function Home(props: HomeProps) {
  const { onNavegar, nomeUsuario: nomeProp, perfilUsuario: setorProp, onLogout, onNavegarParaNotificacoes } = props;
  const [categoriaAberta, setCategoriaAberta] = useState<CategoriaLaunchpad | null>(null);

  // Recupera nome e setor
  const obterNomeESetor = () => {
    if (nomeProp) {
      return { nome: nomeProp, setor: setorProp || 'Operação' };
    }
    const chaves = ['usuario_hazon', 'hazon_user', 'usuario', 'user'];
    for (const c of chaves) {
      try {
        const item = localStorage.getItem(c);
        if (item) {
          const parsed = JSON.parse(item);
          const nome = parsed.nome || parsed.name || parsed.usuario?.nome;
          const setor = parsed.setor || parsed.department || parsed.usuario?.setor;
          if (nome) return { nome, setor: setor || 'Operação' };
        }
      } catch (e) {}
    }
    return { nome: 'Usuário', setor: 'Operação' };
  };

  const { nome: nomeUsuario, setor: setorUsuario } = obterNomeESetor();

  const handleAcessar = (mod: ModuloConfig) => {
    if (mod.callbackProp && typeof props[mod.callbackProp] === 'function') {
      props[mod.callbackProp]();
    } else if (onNavegar) {
      onNavegar(mod.tela);
    }
  };

  const toggleCategoria = (cat: CategoriaLaunchpad) => {
    setCategoriaAberta((prev) => (prev === cat ? null : cat));
  };

  // SVGs dos Launchpads e Módulos
  const IconesLaunchpad = {
    Indicadores: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    Comercial: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    Estoque: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    Administracao: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  };

  const IconesModulos = {
    Dashboard: IconesLaunchpad.Indicadores,
    Relatorios: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    Tarefas: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Pedidos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625H4.125A1.125 1.125 0 003 3.75v10.5h11.25z" />
      </svg>
    ),
    Orcamentos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Cotacoes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    Ofertas: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    Clientes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    Vendedores: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    Produtos: IconesLaunchpad.Estoque,
    Inventario: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    ConfCega: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
      </svg>
    ),
    NotaFalta: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    Avarias: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    ConsumoLoja: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    Trocas: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    Vencimentos: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Temperatura: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    Usuarios: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    Permissoes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    Fornecedores: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    Categorias: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )
  };

  const LAUNCHPADS_CONFIG: LaunchpadConfig[] = [
    {
      id: 'INDICADORES',
      titulo: 'Indicadores',
      descricaoBreve: 'Dashboards, Auditoria e Tarefas',
      icone: IconesLaunchpad.Indicadores,
      corAtiva: 'bg-cyan-800 text-white shadow-lg',
      borderAtiva: 'border-cyan-600 ring-2 ring-cyan-500/30',
      badgeAtiva: 'bg-cyan-950 text-cyan-200',
      iconeCor: 'text-cyan-600'
    },
    {
      id: 'COMERCIAL',
      titulo: 'Comercial',
      descricaoBreve: 'Pedidos, Cotações, Ofertas e Vendas',
      icone: IconesLaunchpad.Comercial,
      corAtiva: 'bg-emerald-800 text-white shadow-lg',
      borderAtiva: 'border-emerald-600 ring-2 ring-emerald-500/30',
      badgeAtiva: 'bg-emerald-950 text-emerald-200',
      iconeCor: 'text-emerald-600'
    },
    {
      id: 'ESTOQUE',
      titulo: 'Estoque',
      descricaoBreve: 'Produtos, Inventário, Ruptura e Frio',
      icone: IconesLaunchpad.Estoque,
      corAtiva: 'bg-amber-700 text-white shadow-lg',
      borderAtiva: 'border-amber-600 ring-2 ring-amber-500/30',
      badgeAtiva: 'bg-amber-950 text-amber-200',
      iconeCor: 'text-amber-600'
    },
    {
      id: 'ADMINISTRACAO',
      titulo: 'Administração',
      descricaoBreve: 'Equipe, Fornecedores e Acessos',
      icone: IconesLaunchpad.Administracao,
      corAtiva: 'bg-indigo-800 text-white shadow-lg',
      borderAtiva: 'border-indigo-600 ring-2 ring-indigo-500/30',
      badgeAtiva: 'bg-indigo-950 text-indigo-200',
      iconeCor: 'text-indigo-600'
    }
  ];

  const MODULOS_POR_CATEGORIA: Record<CategoriaLaunchpad, ModuloConfig[]> = {
    INDICADORES: [
      {
        id: 'dashboard',
        nome: 'DASHBOARD',
        descricao: 'Indicadores e Métricas Gerenciais',
        tela: 'dashboard',
        callbackProp: 'onNavegarParaDashboard',
        icone: IconesModulos.Dashboard,
        bgGradiente: 'bg-white hover:bg-cyan-50/60',
        borderCor: 'border-slate-200 hover:border-cyan-300',
        iconeBg: 'bg-cyan-50 text-cyan-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'relatorios',
        nome: 'RELATÓRIOS',
        descricao: 'Emissão e Auditoria em A4 PDF',
        tela: 'relatorios',
        callbackProp: 'onNavegarParaRelatorios',
        icone: IconesModulos.Relatorios,
        bgGradiente: 'bg-white hover:bg-sky-50/60',
        borderCor: 'border-slate-200 hover:border-sky-300',
        iconeBg: 'bg-sky-50 text-sky-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'tarefas',
        nome: 'TAREFAS',
        descricao: 'Gestão de Atividades Operacionais',
        tela: 'tarefas',
        callbackProp: 'onNavegarParaTarefas',
        icone: IconesModulos.Tarefas,
        bgGradiente: 'bg-white hover:bg-blue-50/60',
        borderCor: 'border-slate-200 hover:border-blue-300',
        iconeBg: 'bg-blue-50 text-blue-700',
        textoCor: 'text-slate-800'
      }
    ],
    COMERCIAL: [
      {
        id: 'pedidos',
        nome: 'PEDIDOS',
        descricao: 'Formalização e Envio de Ordens',
        tela: 'pedidos',
        callbackProp: 'onNavegarParaPedidos',
        icone: IconesModulos.Pedidos,
        bgGradiente: 'bg-white hover:bg-emerald-50/60',
        borderCor: 'border-slate-200 hover:border-emerald-300',
        iconeBg: 'bg-emerald-50 text-emerald-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'orcamentos',
        nome: 'ORÇAMENTOS',
        descricao: 'Propostas Comerciais e Vendas',
        tela: 'orcamentos',
        callbackProp: 'onNavegarParaOrcamentos',
        icone: IconesModulos.Orcamentos,
        bgGradiente: 'bg-white hover:bg-teal-50/60',
        borderCor: 'border-slate-200 hover:border-teal-300',
        iconeBg: 'bg-teal-50 text-teal-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'cotacoes',
        nome: 'COTAÇÕES',
        descricao: 'Tomada de Preço com Parceiros',
        tela: 'cotacoes',
        callbackProp: 'onNavegarParaCotacoes',
        icone: IconesModulos.Cotacoes,
        bgGradiente: 'bg-white hover:bg-green-50/60',
        borderCor: 'border-slate-200 hover:border-green-300',
        iconeBg: 'bg-green-50 text-green-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'ofertas',
        nome: 'OFERTAS',
        descricao: 'Campanhas, Encartes e Placas',
        tela: 'ofertas',
        callbackProp: 'onNavegarParaOfertas',
        icone: IconesModulos.Ofertas,
        bgGradiente: 'bg-white hover:bg-lime-50/60',
        borderCor: 'border-slate-200 hover:border-lime-300',
        iconeBg: 'bg-lime-50 text-lime-800',
        textoCor: 'text-slate-800'
      },
      {
        id: 'clientes',
        nome: 'CLIENTES',
        descricao: 'Cadastro de Compradores e Pastas',
        tela: 'clientes',
        callbackProp: 'onNavegarParaClientes',
        icone: IconesModulos.Clientes,
        bgGradiente: 'bg-white hover:bg-teal-50/60',
        borderCor: 'border-slate-200 hover:border-teal-300',
        iconeBg: 'bg-teal-50 text-teal-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'vendedores',
        nome: 'VENDEDORES',
        descricao: 'Representantes e Atendimento',
        tela: 'vendedores',
        callbackProp: 'onNavegarParaVendedores',
        icone: IconesModulos.Vendedores,
        bgGradiente: 'bg-white hover:bg-emerald-50/60',
        borderCor: 'border-slate-200 hover:border-emerald-300',
        iconeBg: 'bg-emerald-50 text-emerald-700',
        textoCor: 'text-slate-800'
      }
    ],
    ESTOQUE: [
      {
        id: 'produtos',
        nome: 'PRODUTOS',
        descricao: 'Catálogo, Códigos e Custos',
        tela: 'produtos',
        callbackProp: 'onNavegarParaProdutos',
        icone: IconesModulos.Produtos,
        bgGradiente: 'bg-white hover:bg-amber-50/60',
        borderCor: 'border-slate-200 hover:border-amber-300',
        iconeBg: 'bg-amber-50 text-amber-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'inventario',
        nome: 'INVENTÁRIO',
        descricao: 'Auditoria e Contagem de Itens',
        tela: 'inventario',
        callbackProp: 'onNavegarParaInventario',
        icone: IconesModulos.Inventario,
        bgGradiente: 'bg-white hover:bg-orange-50/60',
        borderCor: 'border-slate-200 hover:border-orange-300',
        iconeBg: 'bg-orange-50 text-orange-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'conf-cega',
        nome: 'CONF. CEGA',
        descricao: 'Recebimento via XML de NF-e',
        tela: 'conf-cega',
        callbackProp: 'onNavegarParaConfCega',
        icone: IconesModulos.ConfCega,
        bgGradiente: 'bg-white hover:bg-yellow-50/60',
        borderCor: 'border-slate-200 hover:border-yellow-300',
        iconeBg: 'bg-yellow-50 text-yellow-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'nota-falta',
        nome: 'NOTA DE FALTA',
        descricao: 'Controle de Ruptura de Estoque',
        tela: 'nota-falta',
        callbackProp: 'onNavegarParaNotaFalta',
        icone: IconesModulos.NotaFalta,
        bgGradiente: 'bg-white hover:bg-rose-50/60',
        borderCor: 'border-slate-200 hover:border-rose-300',
        iconeBg: 'bg-rose-50 text-rose-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'avarias',
        nome: 'AVARIAS',
        descricao: 'Registro de Quebras e Perdas',
        tela: 'avarias',
        callbackProp: 'onNavegarParaAvarias',
        icone: IconesModulos.Avarias,
        bgGradiente: 'bg-white hover:bg-red-50/60',
        borderCor: 'border-slate-200 hover:border-red-300',
        iconeBg: 'bg-red-50 text-red-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'consumo-loja',
        nome: 'CONSUMO LOJA',
        descricao: 'Controle de Materiais Internos',
        tela: 'consumo-loja',
        callbackProp: 'onNavegarParaConsumoLoja',
        icone: IconesModulos.ConsumoLoja,
        bgGradiente: 'bg-white hover:bg-teal-50/60',
        borderCor: 'border-slate-200 hover:border-teal-300',
        iconeBg: 'bg-teal-50 text-teal-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'trocas',
        nome: 'TROCAS',
        descricao: 'Devoluções e Ressarcimentos',
        tela: 'trocas',
        callbackProp: 'onNavegarParaTrocas',
        icone: IconesModulos.Trocas,
        bgGradiente: 'bg-white hover:bg-amber-50/60',
        borderCor: 'border-slate-200 hover:border-amber-300',
        iconeBg: 'bg-amber-50 text-amber-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'vencimentos',
        nome: 'VENCIMENTOS',
        descricao: 'Prazos de Validade e Lotes',
        tela: 'vencimentos',
        callbackProp: 'onNavegarParaVencimentos',
        icone: IconesModulos.Vencimentos,
        bgGradiente: 'bg-white hover:bg-orange-50/60',
        borderCor: 'border-slate-200 hover:border-orange-300',
        iconeBg: 'bg-orange-50 text-orange-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'temperatura',
        nome: 'TEMPERATURA',
        descricao: 'Controle de Frio e Termômetros',
        tela: 'temperatura',
        callbackProp: 'onNavegarParaTemperatura',
        icone: IconesModulos.Temperatura,
        bgGradiente: 'bg-white hover:bg-sky-50/60',
        borderCor: 'border-slate-200 hover:border-sky-300',
        iconeBg: 'bg-sky-50 text-sky-700',
        textoCor: 'text-slate-800'
      }
    ],
    ADMINISTRACAO: [
      {
        id: 'usuarios',
        nome: 'USUÁRIOS',
        descricao: 'Colaboradores e Credenciais',
        tela: 'usuarios',
        callbackProp: 'onNavegarParaUsuarios',
        icone: IconesModulos.Usuarios,
        bgGradiente: 'bg-white hover:bg-indigo-50/60',
        borderCor: 'border-slate-200 hover:border-indigo-300',
        iconeBg: 'bg-indigo-50 text-indigo-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'permissoes',
        nome: 'PERMISSÕES',
        descricao: 'Matriz de Acessos por Módulo',
        tela: 'permissoes',
        callbackProp: 'onNavegarParaPermissoes',
        icone: IconesModulos.Permissoes,
        bgGradiente: 'bg-white hover:bg-purple-50/60',
        borderCor: 'border-slate-200 hover:border-purple-300',
        iconeBg: 'bg-purple-50 text-purple-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'fornecedores',
        nome: 'FORNECEDORES',
        descricao: 'Cadastro de Empresas e CNPJs',
        tela: 'fornecedores',
        callbackProp: 'onNavegarParaFornecedores',
        icone: IconesModulos.Fornecedores,
        bgGradiente: 'bg-white hover:bg-violet-50/60',
        borderCor: 'border-slate-200 hover:border-violet-300',
        iconeBg: 'bg-violet-50 text-violet-700',
        textoCor: 'text-slate-800'
      },
      {
        id: 'categorias',
        nome: 'CATEGORIAS',
        descricao: 'Setores, Locais e Unidades',
        tela: 'categorias',
        callbackProp: 'onNavegarParaCategorias',
        icone: IconesModulos.Categorias,
        bgGradiente: 'bg-white hover:bg-fuchsia-50/60',
        borderCor: 'border-slate-200 hover:border-fuchsia-300',
        iconeBg: 'bg-fuchsia-50 text-fuchsia-700',
        textoCor: 'text-slate-800'
      }
    ]
  };

  const modulosExibicao = categoriaAberta ? MODULOS_POR_CATEGORIA[categoriaAberta] : [];

  const handleIrParaNotificacoes = () => {
    if (onNavegarParaNotificacoes) {
      onNavegarParaNotificacoes();
    } else if (onNavegar) {
      onNavegar('notificacoes');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-5 min-h-[calc(100vh-24px)]">
        
        {/* HEADER / BOAS-VINDAS & AÇÕES */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-800 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-teal-950 uppercase tracking-tight">
                  HAZON ERP
                </h1>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Olá, <strong className="text-slate-800">{nomeUsuario}</strong> ({setorUsuario})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÃO NOTIFICAÇÕES (SINO) */}
            <button
              type="button"
              onClick={handleIrParaNotificacoes}
              className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-800 transition-all active:scale-95 shadow-sm"
              title="Notificações e Alertas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {/* Badge indicativo de notificações */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {/* BOTÃO SAIR */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sair
              </button>
            )}
          </div>
        </div>

        {/* 4 LAUNCHPADS DINÂMICOS */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 transition-all duration-300 ${
            categoriaAberta ? 'pt-0' : 'pt-2'
          }`}
        >
          {LAUNCHPADS_CONFIG.map((launch) => {
            const isAtivo = categoriaAberta === launch.id;
            const count = MODULOS_POR_CATEGORIA[launch.id].length;

            return (
              <button
                key={launch.id}
                type="button"
                onClick={() => toggleCategoria(launch.id)}
                className={`w-full rounded-2xl border transition-all duration-200 flex flex-col justify-between text-left active:scale-[0.98] ${
                  isAtivo
                    ? `${launch.corAtiva} ${launch.borderAtiva}`
                    : categoriaAberta
                    ? 'bg-slate-50 border-slate-200 text-slate-600 opacity-80 hover:opacity-100'
                    : 'bg-slate-50/80 hover:bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm hover:shadow-md'
                } ${categoriaAberta ? 'p-3' : 'p-4 sm:p-5 min-h-[95px] sm:min-h-[110px]'}`}
              >
                {/* Linha Superior: Ícone à Esquerda e Contador à Direita */}
                <div className="flex items-center justify-between w-full">
                  <div className={`flex items-center gap-2 ${isAtivo ? 'text-white' : launch.iconeCor}`}>
                    {launch.icone}
                    <span className="font-black text-xs sm:text-sm uppercase tracking-tight">
                      {launch.titulo}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black font-mono transition-all ${
                      isAtivo ? launch.badgeAtiva : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </div>

                {/* Descrição Sutil */}
                {!categoriaAberta && (
                  <p className="text-[11px] text-slate-400 font-medium mt-2 leading-tight hidden sm:block">
                    {launch.descricaoBreve}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTAINER DINÂMICO: MÓDULOS EXPANDIDOS EM CASCATA */}
        <div className="flex-1 overflow-y-auto">
          {categoriaAberta ? (
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Módulos de {LAUNCHPADS_CONFIG.find((c) => c.id === categoriaAberta)?.titulo}
                </span>
                <button
                  type="button"
                  onClick={() => setCategoriaAberta(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase underline"
                >
                  Recolher lista
                </button>
              </div>

              {/* Lista Vertical de Cards */}
              {modulosExibicao.map((mod, index) => (
                <div
                  key={mod.id}
                  onClick={() => handleAcessar(mod)}
                  style={{ animationDelay: `${index * 45}ms` }}
                  className={`animate-stagger-card cursor-pointer rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3 ${mod.bgGradiente} ${mod.borderCor}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${mod.iconeBg}`}>
                      {mod.icone}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-xs sm:text-sm text-slate-800 uppercase tracking-tight leading-tight">
                        {mod.nome}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {mod.descricao}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[#09797a] font-black text-xs flex-shrink-0 pl-2">
                    <span className="hidden sm:inline uppercase text-[10px] tracking-wider">Acessar</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Estado Inicial: Nenhum Launchpad selecionado */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 my-auto min-h-[220px]">
              <span className="text-3xl mb-2 opacity-50">👆</span>
              <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                Selecione uma categoria acima
              </h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Clique em um dos 4 Launchpads para visualizar e acessar os submódulos correspondentes.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="text-center border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          Hazon ERP • Sistema Integrado de Gestão e Inteligência Operacional
        </div>

      </div>
    </div>
  );
}