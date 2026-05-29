import { useState, useEffect } from 'react';
import { permissoesService } from './services/permissoesService';

interface Perfil {
  id: string;
  nome: string;
}

interface PermissoesProps {
  onVoltarParaHome: () => void;
}

// Mapeamento oficial das regras de negócio do ERP Hazon
const MATRIZ_PERMISSOES: Record<string, string[]> = {
  'Administrador': [
    'Usuarios', 'Fornecedores', 'Vendedores', 'Produtos', 'Inventario', 
    'Nota de Falta', 'Dashboard', 'Relatorios', 'Cotacoes', 'Avarias', 
    'Pedidos', 'Tarefas', 'Conf. Cega', 'Permissoes', 'Categorias'
  ],
  'Gerencial': [
    'Inventario', 'Dashboard', 'Relatorios', 'Cotacoes', 'Avarias', 'Pedidos', 'Tarefas'
  ],
  'Operacional': [
    'Inventario', 'Nota de Falta', 'Avarias', 'Tarefas', 'Conf. Cega'
  ]
};

// Lista visual de todos os 15 módulos para renderização na tela
const LISTA_MODULOS = [
  { id: 'Usuarios', label: 'Gestão de Usuários' },
  { id: 'Fornecedores', label: 'Cadastro de Fornecedores' },
  { id: 'Vendedores', label: 'Cadastro de Vendedores' },
  { id: 'Produtos', label: 'Cadastro de Produtos' },
  { id: 'Inventario', label: 'Controle de Inventário' },
  { id: 'Nota de Falta', label: 'Nota de Falta' },
  { id: 'Dashboard', label: 'Dashboard Operacional' },
  { id: 'Relatorios', label: 'Painel de Relatórios' },
  { id: 'Cotacoes', label: 'Módulo de Cotações' },
  { id: 'Avarias', label: 'Registro de Avarias' },
  { id: 'Pedidos', label: 'Gestão de Pedidos' },
  { id: 'Tarefas', label: 'Painel de Tarefas' },
  { id: 'Conf. Cega', label: 'Conferência Cega' },
  { id: 'Permissoes', label: 'Níveis de Permissão' },
  { id: 'Categorias', label: 'Catálogo de Categorias' }
];

export default function Permissoes({ onVoltarParaHome }: PermissoesProps) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState('');
  const [nomePerfilSelecionado, setNomePerfilSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregarPerfis() {
      try {
        setLoading(true);
        const dados = await permissoesService.listarPerfis();
        setPerfis(dados || []);
      } catch (err) {
        setErro('Erro ao carregar a estrutura de perfis.');
      } finally {
        setLoading(false);
      }
    }
    carregarPerfis();
  }, []);

  // Monitora a mudança do select para capturar o nome amigável do perfil (Ex: Gerencial)
  const handleSelectPerfil = (id: string) => {
    setPerfilSelecionadoId(id);
    const p = perfis.find(item => item.id === id);
    setNomePerfilSelecionado(p ? p.nome : '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
      </div>
    );
  }

  // Captura os módulos liberados para o perfil atual baseado na nossa Matriz de Segurança
  const modulosLiberados = MATRIZ_PERMISSOES[nomePerfilSelecionado] || [];

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150">
        
        {/* CABEÇALHO */}
        <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4">
          <button 
            onClick={onVoltarParaHome}
            className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
            Diretrizes de Acesso
          </h1>
        </div>

        {erro && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 text-center">{erro}</div>}

        {/* SELETOR DE CARGO */}
        <div className="flex flex-col gap-1 w-full mb-5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1 select-none">Selecione o Cargo/Perfil</label>
          <select
            value={perfilSelecionadoId}
            onChange={(e) => handleSelectPerfil(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 h-12 text-sm outline-none focus:border-[#09797a] focus:bg-white transition-all text-gray-700 font-bold shadow-sm"
          >
            <option value="">Escolha um Perfil...</option>
            {perfis.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>

        {/* EXIBIÇÃO DAS PERMISSÕES DA MATRIZ */}
        <div className="flex flex-col flex-1">
          {!perfilSelecionadoId ? (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-center select-none text-gray-400 gap-2">
              <span className="text-3xl">🔒</span>
              <p className="text-xs font-semibold max-w-55">Escolha um perfil acima para auditar a matriz de acessos do ecossistema Hazon.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 animate-fadeIn">
              <div className="w-full flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider select-none border-b border-gray-100 pb-1.5 mb-2 px-1">
                <span>Módulo do ERP</span>
                <span>Status</span>
              </div>

              {/* LISTAGEM DE STATUS DA MATRIZ */}
              <div className="w-full flex flex-col gap-2 overflow-y-auto h-87.5 pr-0.5 mb-2">
                {LISTA_MODULOS.map(m => {
                  const temAcesso = modulosLiberados.includes(m.id);
                  return (
                    <div 
                      key={m.id}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 flex items-center justify-between shadow-sm select-none"
                    >
                      <span className="text-xs font-bold text-gray-700">{m.label}</span>
                      
                      {/* Badge dinâmico de Liberado ou Bloqueado */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wide ${
                        temAcesso 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                          : 'bg-red-50 text-red-500 border-red-100'
                      }`}>
                        {temAcesso ? 'Liberado' : 'Bloqueado'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}