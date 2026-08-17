// src/pages/Home/index.tsx
import React, { useState } from 'react';

interface HomeProps {
  onNavegar?: (tela: string) => void;
  nomeUsuario?: string;
  perfilUsuario?: string;
  usuarioLogadoId?: string;
  permissoesDoUsuario?: string[];
  onLogout?: () => void;
  [key: string]: any;
}

type CategoriaAba = 'ANALYTICS' | 'SUPPLY_DEMAND' | 'WMS_ESTOQUE' | 'CONTROLE_ACESSO';

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

export default function Home(props: HomeProps) {
  const { onNavegar, nomeUsuario: nomeProp, perfilUsuario: setorProp, onLogout } = props;
  const [abaAtiva, setAbaAtiva] = useState<CategoriaAba>('ANALYTICS');

  // Recupera dados do usuário a partir das props ou do localStorage
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

  // Executa navegação compatível com qualquer formato de prop do App.tsx
  const handleAcessar = (mod: ModuloConfig) => {
    if (mod.callbackProp && typeof props[mod.callbackProp] === 'function') {
      props[mod.callbackProp]();
    } else if (onNavegar) {
      onNavegar(mod.tela);
    }
  };

  // Coleção de ícones SVG semânticos nativos
  const Icones = {
    Dashboard: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    Relatorios: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    Tarefas: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Pedidos: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75A1.125 1.125 0 0013.125 2.625H4.125A1.125 1.125 0 003 3.75v10.5h11.25z" />
      </svg>
    ),
    Orcamentos: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Cotacoes: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    Ofertas: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    Clientes: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    Vendedores: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    Produtos: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    Inventario: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    ConfCega: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
      </svg>
    ),
    NotaFalta: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    Avarias: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    Trocas: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    Vencimentos: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    Temperatura: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    Usuarios: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    Permissoes: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    Fornecedores: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    Categorias: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )
  };

  const MODULOS_POR_ABA: Record<CategoriaAba, ModuloConfig[]> = {
    ANALYTICS: [
      {
        id: 'dashboard',
        nome: 'DASHBOARD',
        descricao: 'Indicadores e Métricas Gerenciais',
        tela: 'dashboard',
        callbackProp: 'onNavegarParaDashboard',
        icone: Icones.Dashboard,
        bgGradiente: 'from-cyan-50 to-sky-50/50 hover:from-cyan-100/70 hover:to-sky-100/70',
        borderCor: 'border-cyan-200',
        iconeBg: 'bg-cyan-600 text-white',
        textoCor: 'text-cyan-950'
      },
      {
        id: 'relatorios',
        nome: 'RELATÓRIOS',
        descricao: 'Emissão e Auditoria em A4 PDF',
        tela: 'relatorios',
        callbackProp: 'onNavegarParaRelatorios',
        icone: Icones.Relatorios,
        bgGradiente: 'from-sky-50 to-blue-50/50 hover:from-sky-100/70 hover:to-blue-100/70',
        borderCor: 'border-sky-200',
        iconeBg: 'bg-sky-600 text-white',
        textoCor: 'text-sky-950'
      },
      {
        id: 'tarefas',
        nome: 'TAREFAS',
        descricao: 'Gestão de Atividades Operacionais',
        tela: 'tarefas',
        callbackProp: 'onNavegarParaTarefas',
        icone: Icones.Tarefas,
        bgGradiente: 'from-blue-50 to-indigo-50/50 hover:from-blue-100/70 hover:to-indigo-100/70',
        borderCor: 'border-blue-200',
        iconeBg: 'bg-blue-600 text-white',
        textoCor: 'text-blue-950'
      }
    ],
    SUPPLY_DEMAND: [
      {
        id: 'pedidos',
        nome: 'PEDIDOS',
        descricao: 'Formalização e Envio de Ordens',
        tela: 'pedidos',
        callbackProp: 'onNavegarParaPedidos',
        icone: Icones.Pedidos,
        bgGradiente: 'from-emerald-50 to-teal-50/50 hover:from-emerald-100/70 hover:to-teal-100/70',
        borderCor: 'border-emerald-200',
        iconeBg: 'bg-emerald-600 text-white',
        textoCor: 'text-emerald-950'
      },
      {
        id: 'orcamentos',
        nome: 'ORÇAMENTOS',
        descricao: 'Propostas Comerciais e Vendas',
        tela: 'orcamentos',
        callbackProp: 'onNavegarParaOrcamentos',
        icone: Icones.Orcamentos,
        bgGradiente: 'from-teal-50 to-green-50/50 hover:from-teal-100/70 hover:to-green-100/70',
        borderCor: 'border-teal-200',
        iconeBg: 'bg-teal-600 text-white',
        textoCor: 'text-teal-950'
      },
      {
        id: 'cotacoes',
        nome: 'COTAÇÕES',
        descricao: 'Tomada de Preço com Parceiros',
        tela: 'cotacoes',
        callbackProp: 'onNavegarParaCotacoes',
        icone: Icones.Cotacoes,
        bgGradiente: 'from-green-50 to-emerald-50/50 hover:from-green-100/70 hover:to-emerald-100/70',
        borderCor: 'border-green-200',
        iconeBg: 'bg-green-600 text-white',
        textoCor: 'text-green-950'
      },
      {
        id: 'ofertas',
        nome: 'OFERTAS',
        descricao: 'Campanhas, Encartes e Placas',
        tela: 'ofertas',
        callbackProp: 'onNavegarParaOfertas',
        icone: Icones.Ofertas,
        bgGradiente: 'from-lime-50 to-emerald-50/50 hover:from-lime-100/70 hover:to-emerald-100/70',
        borderCor: 'border-lime-200',
        iconeBg: 'bg-emerald-700 text-white',
        textoCor: 'text-emerald-950'
      },
      {
        id: 'clientes',
        nome: 'CLIENTES',
        descricao: 'Cadastro de Compradores e Pastas',
        tela: 'clientes',
        callbackProp: 'onNavegarParaClientes',
        icone: Icones.Clientes,
        bgGradiente: 'from-teal-50 to-cyan-50/50 hover:from-teal-100/70 hover:to-cyan-100/70',
        borderCor: 'border-teal-200',
        iconeBg: 'bg-teal-700 text-white',
        textoCor: 'text-teal-950'
      },
      {
        id: 'vendedores',
        nome: 'VENDEDORES',
        descricao: 'Representantes e Atendimento',
        tela: 'vendedores',
        callbackProp: 'onNavegarParaVendedores',
        icone: Icones.Vendedores,
        bgGradiente: 'from-emerald-50 to-green-50/50 hover:from-emerald-100/70 hover:to-green-100/70',
        borderCor: 'border-emerald-200',
        iconeBg: 'bg-green-700 text-white',
        textoCor: 'text-emerald-950'
      }
    ],
    WMS_ESTOQUE: [
      {
        id: 'produtos',
        nome: 'PRODUTOS',
        descricao: 'Catálogo, Códigos e Custos',
        tela: 'produtos',
        callbackProp: 'onNavegarParaProdutos',
        icone: Icones.Produtos,
        bgGradiente: 'from-amber-50 to-orange-50/50 hover:from-amber-100/70 hover:to-orange-100/70',
        borderCor: 'border-amber-200',
        iconeBg: 'bg-amber-600 text-white',
        textoCor: 'text-amber-950'
      },
      {
        id: 'inventario',
        nome: 'INVENTÁRIO',
        descricao: 'Auditoria e Contagem de Itens',
        tela: 'inventario',
        callbackProp: 'onNavegarParaInventario',
        icone: Icones.Inventario,
        bgGradiente: 'from-orange-50 to-amber-50/50 hover:from-orange-100/70 hover:to-amber-100/70',
        borderCor: 'border-orange-200',
        iconeBg: 'bg-orange-600 text-white',
        textoCor: 'text-orange-950'
      },
      {
        id: 'conf-cega',
        nome: 'CONF. CEGA',
        descricao: 'Recebimento via XML de NF-e',
        tela: 'conf-cega',
        callbackProp: 'onNavegarParaConfCega',
        icone: Icones.ConfCega,
        bgGradiente: 'from-yellow-50 to-amber-50/50 hover:from-yellow-100/70 hover:to-amber-100/70',
        borderCor: 'border-yellow-200',
        iconeBg: 'bg-amber-700 text-white',
        textoCor: 'text-amber-950'
      },
      {
        id: 'nota-falta',
        nome: 'NOTA DE FALTA',
        descricao: 'Controle de Ruptura de Estoque',
        tela: 'nota-falta',
        callbackProp: 'onNavegarParaNotaFalta',
        icone: Icones.NotaFalta,
        bgGradiente: 'from-rose-50 to-orange-50/50 hover:from-rose-100/70 hover:to-orange-100/70',
        borderCor: 'border-rose-200',
        iconeBg: 'bg-rose-600 text-white',
        textoCor: 'text-rose-950'
      },
      {
        id: 'avarias',
        nome: 'AVARIAS',
        descricao: 'Registro de Quebras e Perdas',
        tela: 'avarias',
        callbackProp: 'onNavegarParaAvarias',
        icone: Icones.Avarias,
        bgGradiente: 'from-red-50 to-amber-50/50 hover:from-red-100/70 hover:to-amber-100/70',
        borderCor: 'border-red-200',
        iconeBg: 'bg-red-600 text-white',
        textoCor: 'text-red-950'
      },
      {
        id: 'trocas',
        nome: 'TROCAS',
        descricao: 'Devoluções e Ressarcimentos',
        tela: 'trocas',
        callbackProp: 'onNavegarParaTrocas',
        icone: Icones.Trocas,
        bgGradiente: 'from-amber-50 to-yellow-50/50 hover:from-amber-100/70 hover:to-yellow-100/70',
        borderCor: 'border-amber-200',
        iconeBg: 'bg-amber-600 text-white',
        textoCor: 'text-amber-950'
      },
      {
        id: 'vencimentos',
        nome: 'VENCIMENTOS',
        descricao: 'Prazos de Validade e Lotes',
        tela: 'vencimentos',
        callbackProp: 'onNavegarParaVencimentos',
        icone: Icones.Vencimentos,
        bgGradiente: 'from-orange-50 to-red-50/50 hover:from-orange-100/70 hover:to-red-100/70',
        borderCor: 'border-orange-200',
        iconeBg: 'bg-orange-600 text-white',
        textoCor: 'text-orange-950'
      },
      {
        id: 'temperatura',
        nome: 'TEMPERATURA',
        descricao: 'Controle de Frio e Termômetros',
        tela: 'temperatura',
        callbackProp: 'onNavegarParaTemperatura',
        icone: Icones.Temperatura,
        bgGradiente: 'from-sky-50 to-amber-50/50 hover:from-sky-100/70 hover:to-amber-100/70',
        borderCor: 'border-sky-200',
        iconeBg: 'bg-sky-600 text-white',
        textoCor: 'text-sky-950'
      }
    ],
    CONTROLE_ACESSO: [
      {
        id: 'usuarios',
        nome: 'USUÁRIOS',
        descricao: 'Colaboradores e Credenciais',
        tela: 'usuarios',
        callbackProp: 'onNavegarParaUsuarios',
        icone: Icones.Usuarios,
        bgGradiente: 'from-indigo-50 to-violet-50/50 hover:from-indigo-100/70 hover:to-violet-100/70',
        borderCor: 'border-indigo-200',
        iconeBg: 'bg-indigo-600 text-white',
        textoCor: 'text-indigo-950'
      },
      {
        id: 'permissoes',
        nome: 'PERMISSÕES',
        descricao: 'Matriz de Acessos por Módulo',
        tela: 'permissoes',
        callbackProp: 'onNavegarParaPermissoes',
        icone: Icones.Permissoes,
        bgGradiente: 'from-purple-50 to-indigo-50/50 hover:from-purple-100/70 hover:to-indigo-100/70',
        borderCor: 'border-purple-200',
        iconeBg: 'bg-purple-600 text-white',
        textoCor: 'text-purple-950'
      },
      {
        id: 'fornecedores',
        nome: 'FORNECEDORES',
        descricao: 'Cadastro de Empresas e CNPJs',
        tela: 'fornecedores',
        callbackProp: 'onNavegarParaFornecedores',
        icone: Icones.Fornecedores,
        bgGradiente: 'from-violet-50 to-indigo-50/50 hover:from-violet-100/70 hover:to-indigo-100/70',
        borderCor: 'border-violet-200',
        iconeBg: 'bg-violet-600 text-white',
        textoCor: 'text-violet-950'
      },
      {
        id: 'categorias',
        nome: 'CATEGORIAS',
        descricao: 'Setores, Locais e Unidades',
        tela: 'categorias',
        callbackProp: 'onNavegarParaCategorias',
        icone: Icones.Categorias,
        bgGradiente: 'from-fuchsia-50 to-indigo-50/50 hover:from-fuchsia-100/70 hover:to-indigo-100/70',
        borderCor: 'border-fuchsia-200',
        iconeBg: 'bg-fuchsia-700 text-white',
        textoCor: 'text-fuchsia-950'
      }
    ]
  };

  const ABAS_CONFIG = [
    {
      id: 'ANALYTICS' as CategoriaAba,
      titulo: 'Analytics',
      corAtiva: 'bg-cyan-700 text-white shadow-md',
      badgeCor: 'bg-cyan-800 text-cyan-100'
    },
    {
      id: 'SUPPLY_DEMAND' as CategoriaAba,
      titulo: 'Supply Demand',
      corAtiva: 'bg-emerald-700 text-white shadow-md',
      badgeCor: 'bg-emerald-800 text-emerald-100'
    },
    {
      id: 'WMS_ESTOQUE' as CategoriaAba,
      titulo: 'WMS / Estoque',
      corAtiva: 'bg-amber-600 text-white shadow-md',
      badgeCor: 'bg-amber-700 text-amber-100'
    },
    {
      id: 'CONTROLE_ACESSO' as CategoriaAba,
      titulo: 'Controle & Acesso',
      corAtiva: 'bg-indigo-700 text-white shadow-md',
      badgeCor: 'bg-indigo-800 text-indigo-100'
    }
  ];

  const modulosExibicao = MODULOS_POR_ABA[abaAtiva];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-4xl shadow-xl px-5 py-6 sm:p-8 flex flex-col gap-6 min-h-[calc(100vh-32px)]">
        
        {/* HEADER / BOAS-VINDAS */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-800 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-teal-950 uppercase tracking-tight">
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

          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sair
            </button>
          )}
        </div>

        {/* 4 ABAS PRINCIPAIS */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-black">
          {ABAS_CONFIG.map((aba) => {
            const isAtiva = abaAtiva === aba.id;
            const count = MODULOS_POR_ABA[aba.id].length;

            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`py-3 px-3 rounded-xl uppercase transition-all flex items-center justify-center gap-2 ${
                  isAtiva
                    ? aba.corAtiva
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <span>{aba.titulo}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isAtiva ? aba.badgeCor : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* GRID DE LAUNCHPADS DA ABA SELECIONADA */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulosExibicao.map((mod) => (
              <div
                key={mod.id}
                onClick={() => handleAcessar(mod)}
                className={`cursor-pointer rounded-3xl p-5 border bg-gradient-to-br transition-all duration-200 transform hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[140px] ${mod.bgGradiente} ${mod.borderCor}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className={`font-black text-sm uppercase tracking-tight ${mod.textoCor}`}>
                      {mod.nome}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-snug">
                      {mod.descricao}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl shadow-sm flex-shrink-0 ${mod.iconeBg}`}>
                    {mod.icone}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-black/5 mt-3">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${mod.textoCor}`}>
                    Acessar Módulo
                  </span>
                  <span className={`text-sm font-black ${mod.textoCor}`}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400">
          Hazon ERP • Sistema Integrado de Gestão e Inteligência Operacional
        </div>

      </div>
    </div>
  );
}