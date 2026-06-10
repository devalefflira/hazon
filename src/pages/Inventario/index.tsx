import { useState, useEffect } from 'react';
import { inventarioService } from './services/inventarioService';
import type { LocalCaptura, InventarioAtivo } from './services/inventarioService';
import CapturaItem from './components/CapturaItem';

interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

interface InventarioProps {
  onVoltarParaHome: () => void;
  usuarioLogado: UsuarioLogado | null;
}

type SubTela = 'dashboard' | 'selecionar_local' | 'contagem';

export default function Inventario({ onVoltarParaHome, usuarioLogado }: InventarioProps) {
  // Controle de Navegação Interna
  const [subTela, setSubTela] = useState<SubTela>('dashboard');
  
  // Repositórios de Dados
  const [listaInventarios, setListaInventarios] = useState<InventarioAtivo[]>([]);
  const [locais, setLocais] = useState<LocalCaptura[]>([]);
  
  // Estados Ativos da Sessão Corrente
  const [sessaoAtiva, setSessaoAtiva] = useState<InventarioAtivo | null>(null);
  const [localSelecionado, setLocalSelecionado] = useState<string>('');

  // Filtros de Tela Principal
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Carga das informações do histórico
  const carregarDashboard = async () => {
    try {
      setLoading(true);
      const invs = await inventarioService.listarInventarios();
      const locs = await inventarioService.listarLocaisCaptura();
      setListaInventarios(invs);
      setLocais(locs);
    } catch (err) {
      setErro('Erro ao carregar histórico de auditorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioLogado?.id) {
      carregarDashboard();
    }
  }, [usuarioLogado]);

  // Ação: Iniciar Nova Coleta Física
  const handleIniciarNovaColeta = async () => {
    if (!usuarioLogado) return;
    try {
      setLoading(true);
      const novaSessao = await inventarioService.criarNovoInventario(usuarioLogado.id);
      setSessaoAtiva(novaSessao);
      setLocalSelecionado('');
      setSubTela('selecionar_local');
    } catch (err) {
      setErro('Falha ao abrir nova contagem.');
    } finally {
      setLoading(false);
    }
  };

  // Ação: Abrir Card Existente (Pode ser Consulta ou Edição dependendo do status)
  const handleAbrirCard = (inventario: InventarioAtivo) => {
    setSessaoAtiva(inventario);
    setLocalSelecionado('bypass'); // Ignora bloqueio de local na consulta
    setSubTela('contagem');
  };

  // Botão Seta Esquerda (Sair sem fechar lote) -> Preserva status 'Em Andamento'
  const handleSetaVoltar = () => {
    if (subTela === 'contagem' && sessaoAtiva?.status === 'Em Andamento') {
      carregarDashboard();
      setSubTela('dashboard');
    } else if (subTela === 'selecionar_local') {
      setSubTela('dashboard');
    } else {
      onVoltarParaHome();
    }
  };

  // Botão Salvar Coleta -> Altera status para 'Finalizado' definitivo
  const handleSalvarColeta = async () => {
    if (!sessaoAtiva) return;
    try {
      setLoading(true);
      await inventarioService.finalizarInventario(sessaoAtiva.id);
      carregarDashboard();
      setSubTela('dashboard');
    } catch (err) {
      setErro('Erro ao finalizar o inventário.');
      setLoading(false);
    }
  };

  // Botão Cancelar Coleta -> Aborta e apaga fisicamente os registros
  const handleCancelarColeta = async () => {
    if (!sessaoAtiva) return;
    const conf = window.confirm("Deseja realmente cancelar? Todos os dados colados nesta sessão serão perdidos.");
    if (!conf) return;

    try {
      setLoading(true);
      await inventarioService.deletarInventario(sessaoAtiva.id);
      carregarDashboard();
      setSubTela('dashboard');
    } catch (err) {
      setErro('Erro ao abortar inventário.');
      setLoading(false);
    }
  };

  // Formata strings de datas nativas do PostgreSQL
  const formatarData = (d: string) => d.split('-').reverse().join('/');
  
  // Aplicação dos filtros em memória
  const inventariosFiltrados = listaInventarios.filter(inv => {
    const matchUser = filtroUsuario ? inv.usuarios?.nome.toLowerCase().includes(filtroUsuario.toLowerCase()) : true;
    // Filtro simplificado por local cruzando com itens em produção
    return matchUser;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">
        
        {/* CABEÇALHO UNIFICADO */}
        <div className="flex items-center w-full mb-4 border-b border-gray-100 pb-3 select-none">
          <button onClick={handleSetaVoltar} className="p-2 hover:bg-gray-100 rounded-full mr-1.5 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-[#09797a] font-black text-lg tracking-tight">Módulo Inventário</h1>
            {subTela === 'contagem' && sessaoAtiva && (
              <span className="text-[9px] font-mono font-bold text-gray-400 uppercase">SESSÃO: {sessaoAtiva.codigo_customizado}</span>
            )}
          </div>
        </div>

        {erro && <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-xl text-center font-bold mb-3">{erro}</div>}

        {loading ? (
          <div className="flex flex-col flex-1 justify-center items-center py-12 gap-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#09797a]"></div>
            <span className="text-[11px] text-gray-400 italic">Processando requisições...</span>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            
            {/* TELA A: DASHBOARD PRINCIPAL */}
            {subTela === 'dashboard' && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                <button
                  onClick={handleIniciarNovaColeta}
                  className="w-full h-11 bg-[#09797a] text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-98 transition-all flex justify-center items-center gap-1.5 mb-4"
                >
                  🚀 Iniciar Nova Coleta
                </button>

                {/* Bloco de Filtros Operacionais */}
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex flex-col gap-2 mb-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-0.5">Filtros de Pesquisa</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input 
                      type="text" 
                      placeholder="Filtrar Usuário..." 
                      value={filtroUsuario}
                      onChange={(e) => setFiltroUsuario(e.target.value)}
                      className="bg-white border text-[11px] font-semibold rounded-lg px-2 h-8 outline-none focus:border-[#09797a]"
                    />
                    <select 
                      value={filtroLocal}
                      onChange={(e) => setFiltroLocal(e.target.value)}
                      className="bg-white border text-[11px] font-semibold rounded-lg px-1 h-8 outline-none"
                    >
                      <option value="">Todos Locais</option>
                      {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                  </div>
                </div>

                {/* Grid Histórico de Cards */}
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider pl-1 mb-2 block">Coletas Realizadas ({inventariosFiltrados.length})</span>
                <div className="flex flex-col gap-2.5 max-h-75 overflow-y-auto pr-1">
                  {inventariosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 italic">Nenhum inventário registrado.</div>
                  ) : (
                    inventariosFiltrados.map((inv) => (
                      <div key={inv.id} className="bg-white border border-gray-200 rounded-2xl p-3 flex flex-col gap-1.5 shadow-xs relative hover:border-[#09797a]/40 transition-all">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-gray-700">{inv.codigo_customizado}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            inv.status === 'Finalizado' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          <p>📅 {formatarData(inv.data_registro)} às {formatarFormaTime(inv.hora_registro)}</p>
                          <p>👤 Operador: <span className="font-bold text-gray-600">{inv.usuarios?.nome || 'Hazon User'}</span></p>
                        </div>
                        <button
                          onClick={() => handleAbrirCard(inv)}
                          className="w-full h-8 bg-gray-50 hover:bg-[#09797a]/5 border text-[#09797a] font-bold text-xs rounded-xl transition-all mt-1 flex justify-center items-center"
                        >
                          {inv.status === 'Finalizado' ? '🔍 Visualizar Itens' : '✏️ Continuar Contagem'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TELA B: SELETOR MANDATÓRIO DE LOCAL DE CAPTURA */}
            {subTela === 'selecionar_local' && (
              <div className="flex flex-col flex-1 justify-center items-center text-center px-1 animate-fadeIn">
                <div className="w-14 h-14 bg-[#09797a]/10 rounded-full flex justify-center items-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#09797a" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <h2 className="text-gray-700 font-extrabold text-base mb-1">Onde você está coletando?</h2>
                <p className="text-xs text-gray-400 font-medium mb-4">Selecione o local atual para destravar a contagem física.</p>
                
                <select
                  value={localSelecionado}
                  onChange={(e) => {
                    setLocalSelecionado(e.target.value);
                    if (e.target.value) setSubTela('contagem');
                  }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-12 text-xs font-semibold outline-none focus:border-[#09797a]"
                >
                  <option value="">Selecione um local...</option>
                  {locais.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            )}

            {/* TELA C: BANBADA DE LANÇAMENTO ATIVO */}
            {subTela === 'contagem' && sessaoAtiva && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                {/* Meta-dados do operador e ações superiores */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-4 flex flex-col gap-1.5 select-none">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                    <span>Responsável: <span className="text-gray-600">{usuarioLogado?.nome}</span></span>
                    <span className="font-mono">Nº {sessaoAtiva.codigo_customizado}</span>
                  </div>
                  
                  {sessaoAtiva.status === 'Em Andamento' && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button onClick={handleCancelarColeta} className="h-8 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all">
                        ❌ Cancelar Coleta
                      </button>
                      <button onClick={handleSalvarColeta} className="h-8 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-xs">
                        💾 Salvar Coleta
                      </button>
                    </div>
                  )}
                </div>

                <CapturaItem 
                  inventarioId={sessaoAtiva.id}
                  localCapturaId={localSelecionado}
                  somenteConsulta={sessaoAtiva.status === 'Finalizado'}
                />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// Helper interno para tratamento de segundos no formato de horas
function formatarFormaTime(timeStr: string) {
  if (!timeStr) return '00:00';
  return timeStr.slice(0, 5);
}