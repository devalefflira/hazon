import { useState } from 'react';
import SetoresSubsetores from './components/SetoresSubsetores';
import UnidadesMedida from './components/UnidadesMedida';
import LocaisCaptura from './components/LocaisCaptura';
import MotivosStatus from './components/MotivosStatus';

// Tipos de sub-telas possíveis para o controle de estado
type SubTela = 'menu' | 'setores' | 'unidades' | 'locais' | 'motivos';

interface CategoriasHubProps {
  onVoltarParaHome: () => void;
}

export default function CategoriasHub({ onVoltarParaHome }: CategoriasHubProps) {
  // Estado que controla qual sub-tela está ativa na mão do operador
  const [subTelaAtiva, setSubTelaAtiva] = useState<SubTela>('menu');

  // Função auxiliar para renderizar os títulos dinamicamente no cabeçalho
  const obterTituloCabeçalho = () => {
    switch (subTelaAtiva) {
      case 'setores': return 'Setores e Subsetores';
      case 'unidades': return 'Unidades de Medida';
      case 'locais': return 'Locais de Captura';
      case 'motivos': return 'Motivos e Status';
      default: return 'Catálogo de Categorias';
    }
  };

  const handleVoltar = () => {
    if (subTelaAtiva === 'menu') {
      onVoltarParaHome(); // Volta para o Launchpad Principal
    } else {
      setSubTelaAtiva('menu'); // Volta para o menu interno de categorias
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 font-sans selection:bg-transparent">
      <div className="w-full max-w-95 bg-white rounded-4xl shadow-xl px-5 py-6 flex flex-col min-h-150">
        
        {/* CABEÇALHO FIXO DO MÓDULO */}
        <div className="flex items-center w-full mb-8 border-b border-gray-100 pb-4">
          <button 
            onClick={handleVoltar}
            className="p-2 hover:bg-gray-100 rounded-full active:scale-90 transition-all mr-2"
          >
            {/* Ícone de Seta de Voltar simples e responsivo em SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#09797a" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7m-7.5 7h16.5" />
            </svg>
          </button>
          <h1 className="text-[#09797a] font-bold text-xl tracking-tight select-none">
            {obterTituloCabeçalho()}
          </h1>
        </div>

        {/* RECONHECIMENTO DE TELA ATIVA */}
        {subTelaAtiva === 'menu' && (
          <div className="flex flex-col gap-4 w-full animate-fadeIn">
            <p className="text-sm text-[#545454] font-medium mb-2 px-1">
              Selecione qual tabela do banco de dados você deseja gerenciar ou alimentar:
            </p>

            {/* Opção 1: Setores */}
            <button 
              onClick={() => setSubTelaAtiva('setores')}
              className="w-full bg-[#09797a] text-white p-4 rounded-2xl font-bold text-left flex justify-between items-center hover:bg-[#075f60] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>1. Setores & Subsetores</span>
              <span className="text-xl">➔</span>
            </button>

            {/* Opção 2: Unidades */}
            <button 
              onClick={() => setSubTelaAtiva('unidades')}
              className="w-full bg-[#09797a] text-white p-4 rounded-2xl font-bold text-left flex justify-between items-center hover:bg-[#075f60] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>2. Unidades de Medida</span>
              <span className="text-xl">➔</span>
            </button>

            {/* Opção 3: Locais */}
            <button 
              onClick={() => setSubTelaAtiva('locais')}
              className="w-full bg-[#09797a] text-white p-4 rounded-2xl font-bold text-left flex justify-between items-center hover:bg-[#075f60] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>3. Locais de Captura</span>
              <span className="text-xl">➔</span>
            </button>

            {/* Opção 4: Motivos e Status */}
            <button 
              onClick={() => setSubTelaAtiva('motivos')}
              className="w-full bg-[#09797a] text-white p-4 rounded-2xl font-bold text-left flex justify-between items-center hover:bg-[#075f60] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>4. Motivos & Regras de Status</span>
              <span className="text-xl">➔</span>
            </button>
          </div>
        )}

        {/* AS SUB-TELAS COMPONENTIZADAS ENTRARÃO AQUI NA PRÓXIMA ETAPA */}
        {subTelaAtiva === 'setores' && <SetoresSubsetores />}
        
        {subTelaAtiva === 'unidades' && <UnidadesMedida />}
        
        {subTelaAtiva === 'locais' && <LocaisCaptura />}

        {subTelaAtiva === 'motivos' && <MotivosStatus />}

      </div>
    </div>
  );
}