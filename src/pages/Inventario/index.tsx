import { useState, useEffect } from 'react';
import { inventarioService } from './services/inventarioService';
// Importação isolada de tipos exigida pela flag verbatimModuleSyntax
import type { LocalCaptura, InventarioAtivo } from './services/inventarioService';
import CapturaItem from './components/CapturaItem';

// CORRIGIDO: Interface limpa e perfeitamente idêntica à raiz do App.tsx (Sem propriedades fantasmas)
interface UsuarioLogado {
  id: string;
  nome: string;
  perfil: string;
}

interface InventarioProps {
  onVoltarParaHome: () => void;
  usuarioLogado: UsuarioLogado | null; // Permite união estável com null para o roteador do App
}

export default function Inventario({ onVoltarParaHome, usuarioLogado }: InventarioProps) {
  // Estados de Controle de Infraestrutura
  const [inventarioAtivo, setInventarioAtivo] = useState<InventarioAtivo | null>(null);
  const [locais, setLocais] = useState<LocalCaptura[]>([]);
  const [localSelecionado, setLocalSelecionado] = useState<string>('');

  // Estados de Fluxo e UX
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Carga Inicial: Autenticação da Sessão Mestre baseada no operador ativo
  useEffect(() => {
    let montado = true;

    async function inicializarModulo() {
      // Barramento de segurança: se for nulo, corta a execução com erro amigável
      if (!usuarioLogado?.id) {
        if (montado) {
          setErro('Dados do operador ausentes. Por favor, refaça o login.');
          setLoading(false);
        }
        return;
      }

      try {
        if (montado) setLoading(true);
        if (montado) setErro('');

        // 1. Garante a existência de um Inventário "Em Andamento" usando o ID real do operador
        const sessao = await inventarioService.obterOuCriarInventarioAtivo(usuarioLogado.id);

        // 2. Busca os locais de captura do banco
        const dadosLocais = await inventarioService.listarLocaisCaptura();

        if (montado) {
          setInventarioAtivo(sessao);
          setLocais(dadosLocais);
        }
      } catch (err: any) {
        console.error("Erro no módulo de inventário:", err);
        if (montado) setErro('Falha ao conectar com o motor de inventários do Supabase.');
      } finally {
        if (montado) setLoading(false);
      }
    }

    inicializarModulo();

    return () => {
      montado = false;
    };
  }, [usuarioLogado]);

  const handleItemContabilizado = () => {
    console.log("Item registrado com sucesso no banco de dados.");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95[380px] bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150 relative">

        {/* CABEÇALHO DA INTERFACE */}
        <div className="flex items-center w-full mb-5 border-b border-gray-100 pb-4 select-none">
          <button
            onClick={onVoltarParaHome}
            className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-[#09797a] font-bold text-xl tracking-tight leading-tight">Inventário</h1>
            {inventarioAtivo && (
              <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider">
                SESSÃO: {inventarioAtivo.codigo_customizado}
              </span>
            )}
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-200 text-center font-medium animate-fadeIn">
            {erro}
          </div>
        )}

        {/* CONTAINER DINÂMICO DE RENDERIZAÇÃO */}
        <div className="flex flex-col flex-1">
          {loading ? (
            <div className="flex flex-col justify-center items-center flex-1 py-12 gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09797a]"></div>
              <span className="text-xs text-gray-400 font-medium italic">Autenticando sessão...</span>
            </div>
          ) : !localSelecionado ? (

            /* TELA DE SELEÇÃO MANDATÓRIA DO LOCAL DE TRABALHO */
            <div className="flex flex-col flex-1 justify-center items-center text-center px-2 animate-fadeIn">
              <div className="w-16 h-16 bg-[#09797a]/10 rounded-full flex justify-center items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#09797a" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </div>
              <h2 className="text-gray-700 font-extrabold text-base mb-1">Onde você está coletando?</h2>
              <p className="text-xs text-gray-400 font-medium mb-5">
                Selecione o local físico atual para liberar a área de contagem de mercadorias.
              </p>

              <div className="w-full flex flex-col gap-1 text-left">
                <label className="text-xs font-bold text-gray-500 pl-1">Local de Captura</label>
                <select
                  value={localSelecionado}
                  onChange={(e) => setLocalSelecionado(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 h-12 text-sm outline-none focus:border-[#09797a] focus:bg-white text-gray-700 font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <option value="">Selecione um local...</option>
                  {locais.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (

            /* TELA DE CONTAGEM ATIVA DE MERCADORIAS */
            <div className="flex flex-col flex-1 animate-fadeIn">
              {/* Badge Informativo do Local Atual */}
              <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-5 flex justify-between items-center select-none">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Local de Trabalho</span>
                  <span className="text-sm font-extrabold text-gray-700">
                    📍 {locais.find(l => l.id === localSelecionado)?.nome}
                  </span>
                </div>
                <button
                  onClick={() => setLocalSelecionado('')}
                  className="text-xs text-[#e07a5f] font-black hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 border border-dashed border-red-200"
                >
                  Alterar
                </button>
              </div>

              {inventarioAtivo && (
                <CapturaItem
                  inventarioId={inventarioAtivo.id}
                  localCapturaId={localSelecionado}
                  onItemSalvo={handleItemContabilizado}
                />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}