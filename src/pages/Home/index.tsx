// src/pages/Home/index.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface HomeProps {
  onNavegar?: (tela: string) => void;
  nomeUsuario?: string;
  perfilUsuario?: string;
  usuarioLogadoId?: string;
  permissoesDoUsuario?: string[];
  onLogout?: () => void;
  onNavegarParaNotificacoes?: () => void;
  onNavegarParaNotaFalta?: () => void;
  onNavegarParaAvarias?: () => void;
  onNavegarParaConsumoLoja?: () => void;
  onNavegarParaVencimentos?: () => void;
  [key: string]: any;
}

type MacroCategoriaId = 'indicadores' | 'comercial' | 'estoque' | 'administracao';

interface SubModuloItem {
  id: string;
  nome: string;
  descricao: string;
  tela: string;
  callbackProp?: string;
}

interface MetricasVisaoGeral {
  avariasItensDistintos: number;
  avariasTotalValor: number;
  vencimentosItensDistintos: number;
  trocasTotalQtd: number;
  consumoLojaTotalValor: number;
}

export default function Home(props: HomeProps) {
  const { 
    onNavegar, 
    nomeUsuario: nomeProp, 
    perfilUsuario: setorProp, 
    onLogout, 
    onNavegarParaNotificacoes,
    onNavegarParaNotaFalta,
    onNavegarParaAvarias,
    onNavegarParaConsumoLoja,
    onNavegarParaVencimentos
  } = props;

  // Estados de Interface
  const [menuAberto, setMenuAberto] = useState(false);
  const [categoriaAtivaNoMenu, setCategoriaAtivaNoMenu] = useState<MacroCategoriaId | null>(null);
  const [speedDialAberto, setSpeedDialAberto] = useState(false);
  const [carregandoMetricas, setCarregandoMetricas] = useState(true);

  // Métricas do Dashboard
  const [metricas, setMetricas] = useState<MetricasVisaoGeral>({
    avariasItensDistintos: 0,
    avariasTotalValor: 0,
    vencimentosItensDistintos: 0,
    trocasTotalQtd: 0,
    consumoLojaTotalValor: 0
  });

  const obterNomeESetor = () => {
    if (nomeProp) return { nome: nomeProp, setor: setorProp || 'Operação' };
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

  // Busca e cálculo exato das métricas reais
  const carregarMetricas = async () => {
    try {
      setCarregandoMetricas(true);

      // (A) Avarias: Itens distintos (Set de produto_id) + Valor Total em R$
      const { data: avariasData } = await supabase
        .from('avarias')
        .select('produto_id, quantidade, preco_custo_na_perda, destinacao');

      const produtosAvariadosDistintos = new Set<string>();
      let valorTotalAvarias = 0;

      (avariasData || []).forEach((item: any) => {
        if (item.produto_id) produtosAvariadosDistintos.add(item.produto_id);
        const qtd = Number(item.quantidade || 0);
        const preco = Number(item.preco_custo_na_perda || 0);
        valorTotalAvarias += qtd * preco;
      });

      // (B) Próximo do Vencimento: Quantidade de itens DISTINTOS a vencer em <= 30 dias
      const hoje = new Date();
      const limite30Dias = new Date();
      limite30Dias.setDate(hoje.getDate() + 30);
      const limite30DiasStr = limite30Dias.toISOString().split('T')[0];

      const { data: vencimentosData } = await supabase
        .from('vencimentos_controle')
        .select('produto_id, data_validade')
        .lte('data_validade', limite30DiasStr);

      const produtosVencendoDistintos = new Set<string>();
      (vencimentosData || []).forEach((item: any) => {
        if (item.produto_id) produtosVencendoDistintos.add(item.produto_id);
      });

      // (C) Itens para Troca: Total de pendentes
      const { count: trocasCount } = await supabase
        .from('trocas')
        .select('id', { count: 'exact', head: true })
        .eq('troca_realizada', false);

      // (D) Consumo Loja: Valor Total acumulado
      const { data: consumoMestre } = await supabase
        .from('consumo_loja_mestre')
        .select('valor_total');

      let totalConsumo = 0;
      (consumoMestre || []).forEach((item: any) => {
        totalConsumo += Number(item.valor_total || 0);
      });

      setMetricas({
        avariasItensDistintos: produtosAvariadosDistintos.size,
        avariasTotalValor: valorTotalAvarias,
        vencimentosItensDistintos: produtosVencendoDistintos.size,
        trocasTotalQtd: trocasCount || 0,
        consumoLojaTotalValor: totalConsumo
      });
    } catch (err) {
      console.error('Erro ao carregar dados da Visão Geral:', err);
    } finally {
      setCarregandoMetricas(false);
    }
  };

  useEffect(() => {
    carregarMetricas();
  }, []);

  const formatarMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Disparadores de Ação Rápida
  const handleAcaoRapida = (tipo: 'nota-falta' | 'avarias' | 'consumo-loja' | 'vencimentos') => {
    setSpeedDialAberto(false);
    setMenuAberto(false);

    if (tipo === 'nota-falta') {
      if (onNavegarParaNotaFalta) onNavegarParaNotaFalta();
      else if (onNavegar) onNavegar('nota-falta');
    } else if (tipo === 'avarias') {
      if (onNavegarParaAvarias) onNavegarParaAvarias();
      else if (onNavegar) onNavegar('avarias');
    } else if (tipo === 'consumo-loja') {
      if (onNavegarParaConsumoLoja) onNavegarParaConsumoLoja();
      else if (onNavegar) onNavegar('consumo-loja');
    } else if (tipo === 'vencimentos') {
      if (onNavegarParaVencimentos) onNavegarParaVencimentos();
      else if (onNavegar) onNavegar('vencimentos');
    }
  };

  // Estrutura dos Módulos do Menu Lateral
  const CATEGORIAS_MENU: Record<
    MacroCategoriaId,
    { titulo: string; iconeSvg: string; modulos: SubModuloItem[] }
  > = {
    indicadores: {
      titulo: 'Indicadores',
      iconeSvg: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
      modulos: [
        { id: 'dashboard', nome: 'Dashboard', descricao: 'Indicadores e métricas gerenciais', tela: 'dashboard', callbackProp: 'onNavegarParaDashboard' },
        { id: 'relatorios', nome: 'Relatórios', descricao: 'Emissão e auditoria em PDF', tela: 'relatorios', callbackProp: 'onNavegarParaRelatorios' },
        { id: 'tarefas', nome: 'Tarefas', descricao: 'Gestão de atividades operacionais', tela: 'tarefas', callbackProp: 'onNavegarParaTarefas' }
      ]
    },
    comercial: {
      titulo: 'Comercial',
      iconeSvg: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
      modulos: [
        { id: 'pedidos', nome: 'Pedidos', descricao: 'Formalização e ordens de compra', tela: 'pedidos', callbackProp: 'onNavegarParaPedidos' },
        { id: 'orcamentos', nome: 'Orçamentos', descricao: 'Propostas comerciais e vendas', tela: 'orcamentos', callbackProp: 'onNavegarParaOrcamentos' },
        { id: 'cotacoes', nome: 'Cotações', descricao: 'Tomada de preço com fornecedores', tela: 'cotacoes', callbackProp: 'onNavegarParaCotacoes' },
        { id: 'ofertas', nome: 'Ofertas', descricao: 'Campanhas, encartes e placas', tela: 'ofertas', callbackProp: 'onNavegarParaOfertas' },
        { id: 'clientes', nome: 'Clientes', descricao: 'Cadastro de compradores', tela: 'clientes', callbackProp: 'onNavegarParaClientes' },
        { id: 'vendedores', nome: 'Vendedores', descricao: 'Representantes e atendimento', tela: 'vendedores', callbackProp: 'onNavegarParaVendedores' }
      ]
    },
    estoque: {
      titulo: 'Estoque',
      iconeSvg: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9',
      modulos: [
        { id: 'produtos', nome: 'Produtos', descricao: 'Catálogo de códigos e custos', tela: 'produtos', callbackProp: 'onNavegarParaProdutos' },
        { id: 'inventario', nome: 'Inventário', descricao: 'Auditoria e contagem de itens', tela: 'inventario', callbackProp: 'onNavegarParaInventario' },
        { id: 'conf-cega', nome: 'Conf. Cega', descricao: 'Recebimento via XML de NF-e', tela: 'conf-cega', callbackProp: 'onNavegarParaConfCega' },
        { id: 'nota-falta', nome: 'Nota de Falta', descricao: 'Controle de ruptura de estoque', tela: 'nota-falta', callbackProp: 'onNavegarParaNotaFalta' },
        { id: 'avarias', nome: 'Avarias', descricao: 'Registro de quebras e perdas', tela: 'avarias', callbackProp: 'onNavegarParaAvarias' },
        { id: 'consumo-loja', nome: 'Consumo Loja', descricao: 'Controle de materiais internos', tela: 'consumo-loja', callbackProp: 'onNavegarParaConsumoLoja' },
        { id: 'trocas', nome: 'Trocas', descricao: 'Devoluções e reposições', tela: 'trocas', callbackProp: 'onNavegarParaTrocas' },
        { id: 'vencimentos', nome: 'Vencimentos', descricao: 'Controle de validade e lotes', tela: 'vencimentos', callbackProp: 'onNavegarParaVencimentos' },
        { id: 'temperatura', nome: 'Temperatura', descricao: 'Aferição de câmaras e balcões', tela: 'temperatura', callbackProp: 'onNavegarParaTemperatura' }
      ]
    },
    administracao: {
      titulo: 'Administração',
      iconeSvg: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z',
      modulos: [
        { id: 'usuarios', nome: 'Usuários', descricao: 'Colaboradores e credenciais', tela: 'usuarios', callbackProp: 'onNavegarParaUsuarios' },
        { id: 'permissoes', nome: 'Permissões', descricao: 'Matriz de acessos por módulo', tela: 'permissoes', callbackProp: 'onNavegarParaPermissoes' },
        { id: 'fornecedores', nome: 'Fornecedores', descricao: 'Cadastro de parceiros e CNPJs', tela: 'fornecedores', callbackProp: 'onNavegarParaFornecedores' },
        { id: 'categorias', nome: 'Categorias', descricao: 'Setores, locais e unidades', tela: 'categorias', callbackProp: 'onNavegarParaCategorias' }
      ]
    }
  };

  const handleExecutarNavegacao = (mod: SubModuloItem) => {
    setMenuAberto(false);
    setSpeedDialAberto(false);
    if (mod.callbackProp && typeof props[mod.callbackProp] === 'function') {
      props[mod.callbackProp]();
    } else if (onNavegar) {
      onNavegar(mod.tela);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex flex-col items-center select-none font-sans relative">
      <div className="w-full max-w-4xl bg-white rounded-3xl sm:rounded-4xl shadow-xl p-4 sm:p-7 flex flex-col gap-4 min-h-[calc(100vh-24px)] pb-24">
        
        {/* HEADER SUPERIOR */}
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
            {/* NOTIFICAÇÕES */}
            <button
              type="button"
              onClick={onNavegarParaNotificacoes || (() => onNavegar?.('notificacoes'))}
              className="relative p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-teal-800 transition-all active:scale-95 shadow-sm"
              title="Notificações"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            </button>

            {/* SAIR */}
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

        {/* VISÃO GERAL DA OPERAÇÃO */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Visão Geral da Operação
            </span>
            {carregandoMetricas && (
              <span className="text-[10px] font-bold text-teal-600 animate-pulse uppercase">
                Atualizando indicadores...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. ITENS AVARIADOS */}
            <div 
              onClick={() => onNavegarParaAvarias ? onNavegarParaAvarias() : onNavegar?.('avarias')}
              className="cursor-pointer bg-red-50/40 hover:bg-red-50/80 border border-red-200/80 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-800 uppercase tracking-wide">
                  Itens Avariados
                </span>
                <span className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                  ⊘
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {metricas.avariasItensDistintos}
                  </span>
                  <span className="text-xs text-slate-500 font-medium ml-1">itens distintos</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Avaria</span>
                  <span className="text-xs font-black text-red-700 font-mono">
                    {formatarMoeda(metricas.avariasTotalValor)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. PRÓXIMO DO VENCIMENTO (<= 30 DIAS) */}
            <div 
              onClick={() => onNavegarParaVencimentos ? onNavegarParaVencimentos() : onNavegar?.('vencimentos')}
              className="cursor-pointer bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wide">
                    Próximo do Vencimento
                  </span>
                  <span className="text-[10px] text-amber-600 block font-medium">
                    30 dias ou menos
                  </span>
                </div>
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                  🕒
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {metricas.vencimentosItensDistintos}
                </span>
                <span className="text-xs text-slate-500 font-medium ml-1">itens distintos</span>
              </div>
            </div>

            {/* 3. ITENS PARA TROCA */}
            <div 
              onClick={() => onNavegar?.('trocas')}
              className="cursor-pointer bg-blue-50/40 hover:bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-800 uppercase tracking-wide">
                  Itens para Troca
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                  🔄
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-800 font-mono">
                  {metricas.trocasTotalQtd}
                </span>
                <span className="text-xs text-slate-500 font-medium ml-1">itens pendentes</span>
              </div>
            </div>

            {/* 4. CONSUMO LOJA */}
            <div 
              onClick={() => onNavegarParaConsumoLoja ? onNavegarParaConsumoLoja() : onNavegar?.('consumo-loja')}
              className="cursor-pointer bg-teal-50/40 hover:bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 transition-all hover:shadow-md flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-800 uppercase tracking-wide">
                  Consumo Loja
                </span>
                <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold group-hover:scale-105 transition-transform">
                  🛒
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xl sm:text-2xl font-black text-teal-900 font-mono">
                  {formatarMoeda(metricas.consumoLojaTotalValor)}
                </span>
                <span className="text-[10px] text-teal-600 block font-medium">acumulado total</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. BACKDROP DO SPEED DIAL DE AÇÃO RÁPIDA */}
      {speedDialAberto && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-fadeIn"
          onClick={() => setSpeedDialAberto(false)}
        >
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 bg-white rounded-3xl p-3 shadow-2xl border border-slate-100 flex flex-col gap-1.5 z-50 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-black uppercase text-slate-400 px-2 py-1 text-center block">
              Ações Rápidas
            </span>

            {/* NOVA NOTA DE FALTA */}
            <button 
              type="button"
              onClick={() => handleAcaoRapida('nota-falta')}
              className="flex items-center gap-2.5 p-2.5 hover:bg-teal-50 rounded-2xl text-xs font-black text-slate-700 uppercase transition-all text-left"
            >
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs flex-shrink-0">📄</span>
              Nova Nota de Falta
            </button>

            {/* NOVA AVARIA */}
            <button 
              type="button"
              onClick={() => handleAcaoRapida('avarias')}
              className="flex items-center gap-2.5 p-2.5 hover:bg-teal-50 rounded-2xl text-xs font-black text-slate-700 uppercase transition-all text-left"
            >
              <span className="w-7 h-7 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-xs flex-shrink-0">⊘</span>
              Nova Avaria
            </button>

            {/* NOVO CONSUMO LOJA */}
            <button 
              type="button"
              onClick={() => handleAcaoRapida('consumo-loja')}
              className="flex items-center gap-2.5 p-2.5 hover:bg-teal-50 rounded-2xl text-xs font-black text-slate-700 uppercase transition-all text-left"
            >
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs flex-shrink-0">🛒</span>
              Novo Consumo Loja
            </button>

            {/* NOVO VENCIMENTO */}
            <button 
              type="button"
              onClick={() => handleAcaoRapida('vencimentos')}
              className="flex items-center gap-2.5 p-2.5 hover:bg-teal-50 rounded-2xl text-xs font-black text-slate-700 uppercase transition-all text-left"
            >
              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs flex-shrink-0">🕒</span>
              Novo Vencimento
            </button>
          </div>
        </div>
      )}

      {/* 3. BARRA INFERIOR FIXA */}
      <div className="fixed bottom-3 left-0 right-0 max-w-4xl mx-auto px-4 z-40">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-xl h-14 flex items-center justify-between px-5 relative">
          
          {/* Botão Hambúrguer (Esquerda) */}
          <button
            type="button"
            onClick={() => {
              setSpeedDialAberto(false);
              setMenuAberto(true);
            }}
            className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
            title="Abrir Menu de Módulos"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Botão Flutuante Central (+) */}
          <button
            type="button"
            onClick={() => setSpeedDialAberto(!speedDialAberto)}
            className={`absolute left-1/2 -top-5 -translate-x-1/2 w-13 h-13 rounded-full bg-[#09797a] hover:bg-[#075f60] text-white flex items-center justify-center shadow-lg shadow-teal-900/30 transition-transform active:scale-95 ${
              speedDialAberto ? 'rotate-45' : ''
            }`}
            title="Ação Rápida"
          >
            <span className="text-2xl font-black leading-none">+</span>
          </button>

          {/* Botão Recarregar Indicadores (Direita) */}
          <button
            type="button"
            onClick={carregarMetricas}
            className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
            title="Atualizar Indicadores"
          >
            <svg className={`w-4 h-4 ${carregandoMetricas ? 'animate-spin text-teal-700' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

        </div>
      </div>

      {/* 4. DRAWER LATERAL */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-slideRight">
            
            {/* Header do Drawer */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              {categoriaAtivaNoMenu ? (
                <button
                  type="button"
                  onClick={() => setCategoriaAtivaNoMenu(null)}
                  className="flex items-center gap-1.5 text-xs font-black text-[#09797a] uppercase"
                >
                  <span>←</span>
                  <span>Voltar</span>
                </button>
              ) : (
                <span className="font-black text-slate-800 text-sm uppercase tracking-wide">
                  Módulos Hazon
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setMenuAberto(false);
                  setCategoriaAtivaNoMenu(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Menu */}
            <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-1.5">
              {!categoriaAtivaNoMenu ? (
                (Object.keys(CATEGORIAS_MENU) as MacroCategoriaId[]).map((catKey) => {
                  const cat = CATEGORIAS_MENU[catKey];
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategoriaAtivaNoMenu(catKey)}
                      className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-teal-50/60 border border-slate-100 text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={cat.iconeSvg} />
                          </svg>
                        </span>
                        <span className="font-black text-xs uppercase text-slate-800 tracking-tight">
                          {cat.titulo}
                        </span>
                      </div>
                      <span className="text-slate-400 group-hover:text-[#09797a] text-xs font-black">
                        →
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                    {CATEGORIAS_MENU[categoriaAtivaNoMenu].titulo}
                  </span>
                  {CATEGORIAS_MENU[categoriaAtivaNoMenu].modulos.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleExecutarNavegacao(mod)}
                      className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 transition-all flex flex-col gap-0.5"
                    >
                      <span className="font-black text-xs text-slate-800 uppercase tracking-tight">
                        {mod.nome}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium truncate">
                        {mod.descricao}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do Drawer */}
            <div className="p-4 border-t border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Hazon ERP • v2.0
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}